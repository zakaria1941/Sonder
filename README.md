# Sonder

**Music for the moment you're actually in.**

Tell Sonder how you feel, what you're doing, and what you want to feel. It reads the
input, scores the catalogue against it, and builds a playlist for that specific moment —
then lets you argue with the result.

```bash
npm install
npm run dev      # http://localhost:5180
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5180 |
| `npm run build` | Type-check then production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | ESLint over `src/` |

---

## The idea

The whole interface is built around one claim: a feeling has a shape, and so does a
sound. That claim shows up as **the Signal** — a single waveform component that breathes
under the hero, reacts as you pick a mood, becomes the progress meter while a playlist is
being built, and ends up as the seek bar in the player. Same component, same maths, four
jobs.

The second device is **mood-driven colour**. Every mood owns a hue. Selecting one rewrites
`--accent` on the document root, and because every accent in the product derives from that
one variable, the entire interface repaints — buttons, rules, the waveform, the player,
the nav underline.

## Stack

Vite · React 19 · TypeScript (strict) · React Router 7 · hand-written CSS.

No UI kit and no animation library. Motion is CSS keyframes with no `fill-mode`, so the
resting state of every element is its visible one — if animations never run (reduced
motion, a backgrounded tab, a frozen frame loop) the content is simply there. Overlays
that need an exit animation use the small `usePresence` hook in `src/hooks`.

## Layout

```
src/
  components/
    layout/     app shell, top nav, mobile tab bar, ⌘K search
    music/      track list and rows
    playlist/   playlist, collection and mood cards
    player/     desktop bar, mobile mini player, full-screen sheet
    ui/         Signal, Art, Cover, Icon, buttons, chips
  pages/        Home, Discover, Create, Playlist, Collection, Artist, Library, Assistant, Profile
  data/         moods, activities, feelings, playlists, collections, profile
  data/music/   tracks.ts (the catalogue) + derived indexes
  services/music/
    types.ts          Track, MusicIntent, the mood/feeling/activity unions
    sources.ts        source registry (local | external)
    catalog.ts        queries, attribution, validateMusicCatalog()
    library.ts        playlist / collection / mood lookups
    search.ts         search across every field of a track
    intent.ts         a sentence -> MusicIntent, clusters and negation
    recommendation.ts scoring, sequencing, playlist naming
    assistant.ts      the chat layer, over the same catalogue
    playback.ts       is this track actually playable?
  state/        PlayerContext (the music player store), LibraryContext
  styles/       tokens, base, then one file per surface
```

## Imagery

Photography is Unsplash, loaded through their delivery API. Every image runs through the
same duotone — the photo supplies luminance, the mood supplies the colour — which is what
makes a pile of unrelated stock shots read as one commissioned shoot.

Album and track art is **generated**, not photographed: a deterministic gradient field, one
circular form, and a row of signal bars, seeded off the track id. Sleeves therefore look
like one label's output, always belong to their track, and never change between reloads.
A track may override it with a real `albumArt` — see MUSIC_CATALOG.md §9.

## Audio

Playback is real, and it is local. A single `HTMLAudioElement`, owned by
`useMusicPlayer` in `src/hooks/useMusicPlayer.ts`, is the source of truth for
everything time-related — `currentTime`, `duration` and the playing flag are
read back off the element rather than tracked alongside it, so the timer cannot
drift from what you are hearing. There is no interval anywhere in the playback
path.

`PlayerContext` is the music player store. It owns the queue, index, repeat
mode, shuffle, volume and favourites; the element owns the clock.

Wired to real media events: `timeupdate`, `loadedmetadata`, `durationchange`,
`play`, `playing`, `pause`, `waiting`, `stalled`, `canplay`, `ended`, `error`,
`emptied`.

- **Repeat** cycles off → playlist → track from the existing button; single-track
  repeat carries a small `1`.
- **Previous** restarts the current track if you are more than three seconds in,
  and steps back otherwise.
- **Ended** advances the queue, or wraps, or stops, depending on the repeat mode.
- **A track with no usable audio is never handed to the element.** It is refused
  by `checkPlayable()` and reported, so the transport can never mime playback.
- Playback starts inside the click that asked for it, which is what browsers
  require. A blocked `play()` is caught and reported rather than swallowed.

No account, no API key, no service to be down.

## The catalogue

24 tracks by 8 artists, in `src/data/music/tracks.ts`. Every record describes the
file it points at: the title, artist and duration belong to the audio at its
`audioUrl` and nothing else.

The audio shipped here is **original instrumental music generated by
`tools/generate-demo-audio.py`** and released under CC0, so the repository
carries no third-party audio and no licence to honour. The artist names are the
project's own aliases for that output — they are not real performers and the
catalogue does not claim otherwise.

**[MUSIC_CATALOG.md](MUSIC_CATALOG.md)** covers where audio files go, how to add
a track, what metadata is required, how licensing and attribution work, how to
test a track, how scoring works, and why commercial recordings must not be added
without rights.

A development-only validator runs on boot and prints either
`[catalog] 24 tracks, 8 artists, no issues` or a grouped list of problems.

## Recommendation

`src/services/music/`. The same request always produces the same playlist —
every track is scored against the intent, never shuffled.

Reading a sentence is about *feeling*, not keywords. Phrases map to clusters and
a negation pass handles the "but not…" half:

> *"I feel sad but I don't want depressing music"*
> → moods `[melancholic, lonely]`, avoid `[dark]`, valence target lifted to 54

Weights, sequencing and the full scoring table are documented in
[MUSIC_CATALOG.md §7](MUSIC_CATALOG.md#7-how-recommendation-scoring-works).

`readIntent` is the seam a language model would slot into later: same input,
same output shape, no other file has to change.

## What is still mocked

- **The listening history** on the profile page.
- **Persistence.** `localStorage` for the library, liked songs and the player
  preferences (volume, mute, repeat, shuffle).
- **The connect chips** on the profile are inert placeholders.
