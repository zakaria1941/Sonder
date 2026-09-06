"""
Generates the demo audio in public/audio/.

Every file here is synthesised from scratch by this script, so the repository
carries no third-party audio and no licensing question: the output is original
work produced by the project itself. Ten pieces span the same energy/valence
space the recommender scores against, so a melancholic ballad and a gym track
get audibly different stand-in audio.

    pip install numpy lameenc
    python tools/generate-demo-audio.py

Writing new files also rewrites the durations and audioUrl fields in
src/data/songs.ts, so the catalogue never claims a length the audio does not
have. Replace these with your own MP3s at any time — keep the filenames and
re-run with --map-only to re-sync the data.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "audio"
SONGS_TS = ROOT / "src" / "data" / "songs.ts"

# ---------------------------------------------------------------- note helpers

NOTE_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

MINOR = [0, 2, 3, 5, 7, 8, 10]
MAJOR = [0, 2, 4, 5, 7, 9, 11]
DORIAN = [0, 2, 3, 5, 7, 9, 10]

SCALES = {"minor": MINOR, "major": MAJOR, "dorian": DORIAN}


def note_hz(name: str, octave: int) -> float:
    """'A', 4 -> 440.0"""
    semitones = NOTE_BASE[name[0]] + (1 if name.endswith("#") else -1 if name.endswith("b") else 0)
    midi = 12 * (octave + 1) + semitones
    return 440.0 * (2 ** ((midi - 69) / 12))


def degree_hz(root_hz: float, scale: list[int], degree: int) -> float:
    octave, step = divmod(degree, len(scale))
    return root_hz * (2 ** (octave + scale[step] / 12))


# ------------------------------------------------------------------ primitives


def env_ad(n: int, attack: float, decay: float, curve: float = 3.0) -> np.ndarray:
    """Percussive attack/decay envelope."""
    a = max(1, int(attack * SR))
    out = np.empty(n, dtype=np.float32)
    a = min(a, n)
    out[:a] = np.linspace(0.0, 1.0, a, dtype=np.float32)
    rest = n - a
    if rest > 0:
        t = np.linspace(0.0, 1.0, rest, dtype=np.float32)
        out[a:] = np.exp(-curve * t / max(decay, 1e-4) * 0.5)
    return out


def env_asr(n: int, attack: float, release: float) -> np.ndarray:
    """Sustained envelope for pads."""
    a = min(max(1, int(attack * SR)), n // 2)
    r = min(max(1, int(release * SR)), n - a)
    out = np.ones(n, dtype=np.float32)
    out[:a] = np.linspace(0.0, 1.0, a, dtype=np.float32) ** 1.6
    out[n - r :] *= np.linspace(1.0, 0.0, r, dtype=np.float32) ** 1.4
    return out


def harmonic_tone(freq: float, n: int, partials: int, tilt: float, detune: float = 0.0) -> np.ndarray:
    """Band-limited additive tone. `tilt` controls how fast partials fall away."""
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros(n, dtype=np.float32)
    for k in range(1, partials + 1):
        f = freq * k * (1.0 + detune * (k - 1) * 0.0007)
        if f > SR * 0.45:
            break
        out += (np.sin(2 * np.pi * f * t + k * 1.37) / (k**tilt)).astype(np.float32)
    peak = np.max(np.abs(out))
    return out / peak if peak > 0 else out


def fft_lowpass(x: np.ndarray, cutoff: float, slope: float = 2.0) -> np.ndarray:
    """Static lowpass in the frequency domain — no scipy needed."""
    n = len(x)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1.0 / (1.0 + (freqs / max(cutoff, 1.0)) ** (2 * slope))
    return np.fft.irfft(spec, n).astype(np.float32)


def fft_bandpass(x: np.ndarray, low: float, high: float) -> np.ndarray:
    n = len(x)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    lo = 1.0 / (1.0 + (max(low, 1.0) / np.maximum(freqs, 1.0)) ** 4)
    hi = 1.0 / (1.0 + (freqs / max(high, 1.0)) ** 4)
    return np.fft.irfft(spec * lo * hi, n).astype(np.float32)


def add_at(buf: np.ndarray, sig: np.ndarray, start: int, gain: float = 1.0) -> None:
    end = min(len(buf), start + len(sig))
    if start >= len(buf) or end <= start:
        return
    buf[start:end] += sig[: end - start] * gain


def delay_taps(x: np.ndarray, time: float, feedback: float, taps: int = 4) -> np.ndarray:
    out = x.copy()
    step = int(time * SR)
    gain = feedback
    for i in range(1, taps + 1):
        shift = step * i
        if shift >= len(x):
            break
        out[shift:] += x[: len(x) - shift] * gain
        gain *= feedback
    return out


# -------------------------------------------------------------------- drum kit


def kick(dur: float = 0.3) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sweep = 48 + 90 * np.exp(-28 * t)
    phase = 2 * np.pi * np.cumsum(sweep) / SR
    body = np.sin(phase).astype(np.float32) * env_ad(n, 0.001, 0.16, 5.0)
    click = np.random.default_rng(1).normal(0, 1, n).astype(np.float32) * env_ad(n, 0.0005, 0.008, 9.0)
    return np.tanh((body + click * 0.25) * 1.6).astype(np.float32)


def snare(rng: np.random.Generator, dur: float = 0.22) -> np.ndarray:
    n = int(dur * SR)
    noise = rng.normal(0, 1, n).astype(np.float32)
    body = fft_bandpass(noise, 900, 7000) * env_ad(n, 0.001, 0.09, 6.0)
    tone = harmonic_tone(190, n, 3, 1.4) * env_ad(n, 0.001, 0.05, 7.0)
    return (body * 0.9 + tone * 0.35).astype(np.float32)


def hat(rng: np.random.Generator, dur: float = 0.06, open_hat: bool = False) -> np.ndarray:
    n = int((dur if not open_hat else dur * 4) * SR)
    noise = rng.normal(0, 1, n).astype(np.float32)
    return (fft_bandpass(noise, 6500, 15000) * env_ad(n, 0.0004, 0.03 if not open_hat else 0.14, 8.0)).astype(
        np.float32
    )


# ------------------------------------------------------------------ the pieces


class Piece:
    def __init__(
        self,
        slug: str,
        title: str,
        energy: float,
        valence: float,
        bpm: int,
        root: str,
        octave: int,
        scale: str,
        seconds: int,
        progression: list[int],
        drums: str,
        seed: int,
    ) -> None:
        self.slug = slug
        self.title = title
        # Catalogue units are 0-100; the synthesis maths wants 0..1.
        self.energy = energy / 100
        self.valence = valence / 100
        self.bpm = bpm
        self.root = root
        self.octave = octave
        self.scale = SCALES[scale]
        self.seconds = seconds
        self.progression = progression
        self.drums = drums
        self.seed = seed


PIECES = [
    # slug, title, energy, valence, bpm, root, octave, scale, seconds, progression, drums, seed
    Piece("drift", "Drift", 12, 30, 62, "A", 3, "minor", 52, [0, 5, 3, 4], "none", 11),
    Piece("long-exhale", "Long Exhale", 15, 42, 58, "D", 3, "minor", 56, [0, 4, 5, 3], "none", 13),
    Piece("undertow", "Undertow", 24, 16, 68, "C", 3, "minor", 54, [0, 6, 4, 5], "sparse", 23),
    Piece("rainfall-window", "Rainfall Window", 26, 28, 66, "E", 3, "minor", 58, [0, 3, 5, 4], "sparse", 29),
    Piece("paper-boats", "Paper Boats", 30, 46, 72, "F", 3, "minor", 52, [0, 5, 3, 6], "sparse", 31),
    Piece("ember", "Ember", 32, 58, 74, "D", 3, "dorian", 54, [0, 3, 5, 4], "sparse", 37),
    Piece("slow-tide", "Slow Tide", 35, 34, 70, "G", 3, "minor", 60, [0, 4, 6, 5], "sparse", 43),
    Piece("quiet-hours", "Quiet Hours", 38, 50, 76, "A", 3, "minor", 56, [0, 5, 4, 3], "light", 47),
    Piece("lantern", "Lantern", 44, 74, 84, "F", 3, "major", 50, [0, 4, 5, 3], "light", 41),
    Piece("second-coffee", "Second Coffee", 48, 68, 88, "C", 3, "major", 52, [0, 3, 4, 5], "light", 59),
    Piece("meridian", "Meridian", 54, 40, 92, "G", 3, "minor", 58, [0, 5, 6, 4], "light", 53),
    Piece("glasswork", "Glasswork", 50, 54, 96, "B", 3, "major", 54, [0, 4, 3, 5], "light", 61),
    Piece("afterglow", "Afterglow", 60, 64, 98, "B", 3, "major", 54, [0, 3, 4, 5], "steady", 67),
    Piece("golden-hour", "Golden Hour", 63, 78, 100, "D", 3, "major", 52, [0, 4, 5, 3], "steady", 73),
    Piece("night-errand", "Night Errand", 66, 44, 104, "E", 3, "minor", 56, [0, 6, 5, 4], "steady", 79),
    Piece("neon-rain", "Neon Rain", 70, 38, 108, "A", 3, "minor", 58, [0, 5, 3, 6], "steady", 89),
    Piece("pulse", "Pulse", 74, 48, 112, "E", 2, "minor", 56, [0, 5, 3, 6], "steady", 71),
    Piece("coast-road", "Coast Road", 78, 72, 116, "A", 3, "major", 54, [0, 4, 5, 3], "driving", 97),
    Piece("neon", "Neon", 82, 70, 120, "A", 3, "major", 52, [0, 4, 5, 3], "driving", 83),
    Piece("overpass", "Overpass", 86, 52, 124, "F", 3, "minor", 54, [0, 6, 4, 5], "driving", 101),
    Piece("kinetic", "Kinetic", 90, 54, 128, "F", 2, "minor", 50, [0, 6, 5, 4], "driving", 103),
    Piece("ignition", "Ignition", 93, 60, 132, "D", 2, "minor", 50, [0, 5, 6, 3], "hard", 107),
    Piece("redline", "Redline", 96, 50, 140, "D", 2, "minor", 48, [0, 5, 6, 3], "hard", 109),
    Piece("afterburn", "Afterburn", 99, 44, 146, "C", 2, "minor", 46, [0, 6, 5, 4], "hard", 113),
]


def render(p: Piece) -> np.ndarray:
    rng = np.random.default_rng(p.seed)
    n = int(p.seconds * SR)
    beat = 60.0 / p.bpm
    bar = beat * 4
    root = note_hz(p.root, p.octave)

    left = np.zeros(n, dtype=np.float32)
    right = np.zeros(n, dtype=np.float32)
    pluck_bus = np.zeros(n, dtype=np.float32)

    bars = int(math.ceil(p.seconds / bar))
    bright = 500 + p.valence * 2600 + p.energy * 900

    for b in range(bars):
        chord_root_deg = p.progression[b % len(p.progression)]
        start = int(b * bar * SR)
        length = min(int(bar * SR) + int(0.6 * SR), n - start)
        if length <= 0:
            break

        # ---- pad: triad, two octaves, gently detuned across the stereo field
        pad = np.zeros(length, dtype=np.float32)
        pad_r = np.zeros(length, dtype=np.float32)
        for i, step in enumerate((0, 2, 4, 7)):
            f = degree_hz(root, p.scale, chord_root_deg + step)
            voice = harmonic_tone(f, length, 9, 1.25, detune=1.0)
            voice_r = harmonic_tone(f * 1.0018, length, 9, 1.25, detune=-1.0)
            pad += voice * (0.9 if i < 3 else 0.45)
            pad_r += voice_r * (0.9 if i < 3 else 0.45)
        env = env_asr(length, 0.35 + (1 - p.energy) * 0.5, 0.7)
        pad = fft_lowpass(pad * env, bright, 1.6)
        pad_r = fft_lowpass(pad_r * env, bright * 0.94, 1.6)
        pad_gain = 0.30 - p.energy * 0.09
        add_at(left, pad, start, pad_gain)
        add_at(right, pad_r, start, pad_gain)

        # ---- bass: root on the downbeat, plus a push before the next bar
        bass_hits = [0.0] if p.energy < 0.4 else [0.0, beat * 2, beat * 3.5]
        for off in bass_hits:
            bl = int(min(beat * 1.6, bar) * SR)
            f = degree_hz(root, p.scale, chord_root_deg) / 2
            tone = harmonic_tone(f, bl, 4, 1.9)
            sig = np.tanh(tone * env_ad(bl, 0.006, 0.42, 2.6) * 1.4).astype(np.float32)
            at = start + int(off * SR)
            add_at(left, sig, at, 0.34)
            add_at(right, sig, at, 0.34)

        # ---- pluck: a short motif drawn from the chord, panned per note
        if p.energy > 0.22:
            steps = 8 if p.energy < 0.7 else 16
            for s in range(steps):
                if rng.random() > (0.42 + p.energy * 0.4):
                    continue
                deg = chord_root_deg + int(rng.choice([0, 2, 4, 7, 9]))
                f = degree_hz(root, p.scale, deg) * 2
                nl = int(beat * 0.9 * SR)
                sig = harmonic_tone(f, nl, 6, 1.8) * env_ad(nl, 0.003, 0.2, 4.5)
                at = start + int(s * (bar / steps) * SR)
                add_at(pluck_bus, sig.astype(np.float32), at, 0.16 + p.valence * 0.1)

        # ---- drums
        if p.drums != "none":
            add_at(left, kick(), start, 0.55)
            add_at(right, kick(), start, 0.55)
            if p.drums in ("steady", "driving", "hard"):
                for q in (1, 2, 3):
                    add_at(left, kick(), start + int(q * beat * SR), 0.5)
                    add_at(right, kick(), start + int(q * beat * SR), 0.5)
            if p.drums in ("light", "steady", "driving", "hard"):
                for q in (1, 3):
                    sn = snare(rng)
                    add_at(left, sn, start + int(q * beat * SR), 0.3)
                    add_at(right, sn, start + int(q * beat * SR), 0.3)
            if p.drums in ("sparse", "light", "steady", "driving", "hard"):
                div = 2 if p.energy < 0.6 else 4
                for q in range(div * 4):
                    if p.drums == "sparse" and q % 2:
                        continue
                    h = hat(rng, open_hat=(p.drums in ("driving", "hard") and q % (div * 2) == div))
                    at = start + int(q * (beat / div) * SR)
                    add_at(left, h, at, 0.12)
                    add_at(right, h, at, 0.10)

    # pluck gets the delay, and a little stereo spread
    echoed = delay_taps(pluck_bus, beat * 0.75, 0.34)
    left += echoed
    right += np.concatenate([np.zeros(int(0.011 * SR), dtype=np.float32), echoed])[:n] * 0.92

    stereo = np.stack([left, right], axis=1)

    # master: soft clip, fades, headroom
    stereo = np.tanh(stereo * 1.15).astype(np.float32)
    fade_in = int(1.2 * SR)
    fade_out = int(2.0 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None] ** 1.5
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)[:, None] ** 1.5
    peak = float(np.max(np.abs(stereo)))
    if peak > 0:
        stereo *= 0.89 / peak
    return stereo


def encode_mp3(stereo: np.ndarray, path: Path, bitrate: int = 112) -> None:
    import lameenc

    pcm = np.clip(stereo, -1.0, 1.0)
    pcm = (pcm * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(3)
    data = enc.encode(pcm.tobytes())
    data += enc.flush()
    path.write_bytes(bytes(data))


# ------------------------------------------------------- wiring into the data

TRACKS_TS = ROOT / "src" / "data" / "music" / "tracks.ts"

SONG_BLOCK = re.compile(r"\{\s*\n\s*id: '[^']+',.*?\n  \}", re.S)
AUDIO_URL = re.compile(r"audioUrl: '/audio/([a-z0-9-]+)\.mp3'")


def resync_durations(durations: dict[str, int]) -> int:
    """Rewrite `duration` in tracks.ts so it always equals the real file length."""
    if not TRACKS_TS.exists():
        print(f"  (skipped duration sync — {TRACKS_TS.name} does not exist yet)")
        return 0

    src = TRACKS_TS.read_text(encoding="utf-8")
    touched = 0
    missing: list[str] = []

    def replace(match: "re.Match[str]") -> str:
        nonlocal touched
        block = match.group(0)
        found = AUDIO_URL.search(block)
        if not found:
            return block
        slug = found.group(1)
        if slug not in durations:
            missing.append(slug)
            return block
        touched += 1
        return re.sub(r"duration: \d+", f"duration: {durations[slug]}", block, count=1)

    out = SONG_BLOCK.sub(replace, src)
    TRACKS_TS.write_text(out, encoding="utf-8")
    for slug in sorted(set(missing)):
        print(f"  !! {slug}.mp3 is referenced by the catalogue but was not rendered")
    return touched


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sync-only", action="store_true", help="skip rendering, just re-sync durations")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    durations: dict[str, int] = {}

    for piece in PIECES:
        path = OUT_DIR / f"{piece.slug}.mp3"
        if args.sync_only:
            durations[piece.slug] = piece.seconds
            continue
        audio = render(piece)
        encode_mp3(audio, path)
        durations[piece.slug] = int(round(len(audio) / SR))
        size_kb = path.stat().st_size / 1024
        print(f"  {piece.slug:<16} {piece.bpm:>3} bpm  {durations[piece.slug]:>3}s  {size_kb:>6.0f} KB")

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(
            [
                {
                    "slug": p.slug,
                    "title": p.title,
                    "duration": durations[p.slug],
                    "bpm": p.bpm,
                    "energy": round(p.energy * 100),
                    "valence": round(p.valence * 100),
                }
                for p in PIECES
            ],
            indent=2,
        ),
        encoding="utf-8",
    )

    synced = resync_durations(durations)
    print(f"\n{len(durations)} pieces rendered, {synced} catalogue durations synced")
    return 0


if __name__ == "__main__":
    sys.exit(main())
