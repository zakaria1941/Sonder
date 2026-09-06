import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getTrack, tracks } from '@/services/music'
import type { Track } from '@/services/music/types'
import { clamp } from '@/lib/util'
import { useMusicPlayer } from '@/hooks/useMusicPlayer'

/**
 * The music player store, and the only source of truth for playback.
 *
 * The queue, index, repeat mode, shuffle and volume live here; position,
 * duration and the playing flag are read straight off the HTMLAudioElement
 * owned by useMusicPlayer. Nothing in this file counts time — if the UI says
 * 1:32, the decoder is at 1:32.
 */

export type RepeatMode = 'off' | 'playlist' | 'track'

interface MusicPlayerState {
  currentTrack: Track | null
  queue: string[]
  currentIndex: number
  isPlaying: boolean
  /** Seconds elapsed, from the audio element. */
  currentTime: number
  /** Real decoded length of what is playing. */
  duration: number
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null
  repeatMode: RepeatMode
  shuffle: boolean
}

/**
 * The names the existing interface already uses. Kept as aliases so the
 * player, track rows and pages did not have to change to get real audio.
 */
interface PlayerApi extends MusicPlayerState {
  track: Track | null
  index: number
  playing: boolean
  position: number
  loading: boolean
  muted: boolean
  repeat: boolean
  favorites: string[]
  source: string
  expanded: boolean

  playQueue: (ids: string[], startAt?: number, source?: string) => void
  toggle: () => void
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  /** Cycles off → playlist → track. */
  toggleRepeat: () => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
  setExpanded: (v: boolean) => void
  dismissError: () => void
}

const PlayerContext = createContext<PlayerApi | null>(null)

const FAV_KEY = 'sonder.favorites'
const PREFS_KEY = 'sonder.player.v2'

interface Prefs {
  volume: number
  muted: boolean
  repeatMode: RepeatMode
  shuffle: boolean
}

const DEFAULT_PREFS: Prefs = { volume: 0.72, muted: false, repeatMode: 'off', shuffle: false }

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* private mode, cleared storage — favourites just start empty */
  }
  return ['rainfall-window', 'neon-rain', 'drift']
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      volume: clamp(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_PREFS.volume, 0, 1),
      muted: Boolean(parsed.muted),
      repeatMode: (['off', 'playlist', 'track'] as const).includes(parsed.repeatMode as RepeatMode)
        ? (parsed.repeatMode as RepeatMode)
        : 'off',
      shuffle: Boolean(parsed.shuffle),
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadPrefs())

  const [queue, setQueue] = useState<string[]>(() => tracks.slice(0, 8).map((t) => t.id))
  const [index, setIndex] = useState(0)
  const [volume, setVolumeState] = useState(initial.current.volume)
  const [muted, setMuted] = useState(initial.current.muted)
  const [shuffle, setShuffle] = useState(initial.current.shuffle)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(initial.current.repeatMode)
  const [favorites, setFavorites] = useState<string[]>(loadFavorites)
  const [source, setSource] = useState('Tonight’s rotation')
  const [expanded, setExpanded] = useState(false)

  const track = queue[index] ? (getTrack(queue[index]) ?? null) : null

  const queueRef = useRef(queue)
  queueRef.current = queue
  const indexRef = useRef(index)
  indexRef.current = index
  const shuffleRef = useRef(shuffle)
  shuffleRef.current = shuffle
  const repeatRef = useRef(repeatMode)
  repeatRef.current = repeatMode

  const advanceRef = useRef<(autoplay: boolean) => void>(() => {})

  const audio = useMusicPlayer({
    volume,
    muted,
    onEnded: () => advanceRef.current(true),
  })

  const { load: loadAudio, seek: seekAudio, pause: pauseAudio, toggle: toggleAudio, hasSource } = audio

  /* ---------------- queue movement ---------------- */

  const goTo = useCallback(
    (target: number, autoplay: boolean) => {
      const ids = queueRef.current
      if (!ids.length) return
      const i = clamp(target, 0, ids.length - 1)
      setIndex(i)
      loadAudio(getTrack(ids[i]) ?? null, autoplay)
    },
    [loadAudio],
  )

  const advance = useCallback(
    (autoplay: boolean) => {
      const ids = queueRef.current
      const i = indexRef.current
      if (!ids.length) return

      // Repeating one track never leaves it, however the queue is set up.
      if (repeatRef.current === 'track') {
        seekAudio(0)
        if (autoplay) audio.play()
        return
      }

      if (shuffleRef.current && ids.length > 1) {
        let n = i
        while (n === i) n = Math.floor(Math.random() * ids.length)
        goTo(n, autoplay)
        return
      }

      if (i + 1 >= ids.length) {
        if (repeatRef.current === 'playlist') goTo(0, autoplay)
        else pauseAudio()
        return
      }

      goTo(i + 1, autoplay)
    },
    [goTo, pauseAudio, seekAudio, audio],
  )
  advanceRef.current = advance

  /**
   * Attach the opening track without playing it, so its real duration shows
   * in the transport before anyone presses anything. Keyed on whether
   * anything is loaded, so it heals after a remount.
   */
  useEffect(() => {
    if (!track || hasSource()) return
    loadAudio(track, false)
  }, [track, hasSource, loadAudio])

  /* ---------------- persistence ---------------- */

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(favorites))
    } catch {
      /* nothing to do — favourites stay in memory for this session */
    }
  }, [favorites])

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, muted, repeatMode, shuffle }))
    } catch {
      /* preferences just reset next session */
    }
  }, [volume, muted, repeatMode, shuffle])

  /* ---------------- transport ---------------- */

  const playQueue = useCallback(
    (ids: string[], startAt = 0, src = 'Sonder') => {
      if (!ids.length) return
      const i = clamp(startAt, 0, ids.length - 1)
      setQueue(ids)
      queueRef.current = ids
      setIndex(i)
      indexRef.current = i
      setSource(src)
      // Synchronous, inside the click that asked for it — which is what
      // browsers require before they will let anything make sound.
      loadAudio(getTrack(ids[i]) ?? null, true)
    },
    [loadAudio],
  )

  const positionRef = useRef(audio.position)
  positionRef.current = audio.position

  const api = useMemo<PlayerApi>(
    () => ({
      // canonical names
      currentTrack: track,
      queue,
      currentIndex: index,
      isPlaying: audio.playing,
      currentTime: audio.position,
      duration: audio.duration || track?.duration || 0,
      volume,
      isMuted: muted,
      isLoading: audio.loading,
      error: audio.error,
      repeatMode,
      shuffle,

      // names the existing interface uses
      track,
      index,
      playing: audio.playing,
      position: audio.position,
      loading: audio.loading,
      muted,
      repeat: repeatMode !== 'off',
      favorites,
      source,
      expanded,

      playQueue,
      toggle: () => {
        if (!hasSource()) {
          loadAudio(track, true)
          return
        }
        toggleAudio()
      },
      play: audio.play,
      pause: pauseAudio,
      next: () => {
        // A deliberate skip moves on even in single-track repeat.
        const ids = queueRef.current
        const i = indexRef.current
        if (shuffleRef.current && ids.length > 1) return advance(audio.playing)
        if (i + 1 >= ids.length) {
          if (repeatRef.current === 'playlist') goTo(0, audio.playing)
          else pauseAudio()
          return
        }
        goTo(i + 1, audio.playing)
      },
      prev: () => {
        // The usual convention: restart first, step back only if you meant it.
        if (positionRef.current > 3) {
          seekAudio(0)
          return
        }
        goTo(indexRef.current - 1, audio.playing)
      },
      seek: seekAudio,
      setVolume: (v) => {
        setVolumeState(clamp(v, 0, 1))
        if (v > 0) setMuted(false)
      },
      toggleMute: () => setMuted((m) => !m),
      toggleShuffle: () => setShuffle((s) => !s),
      toggleRepeat: () => setRepeatMode((m) => (m === 'off' ? 'playlist' : m === 'playlist' ? 'track' : 'off')),
      toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      isFavorite: (id) => favorites.includes(id),
      setExpanded,
      dismissError: audio.dismissError,
    }),
    [
      track,
      queue,
      index,
      audio,
      volume,
      muted,
      repeatMode,
      shuffle,
      favorites,
      source,
      expanded,
      playQueue,
      advance,
      goTo,
      hasSource,
      loadAudio,
      toggleAudio,
      pauseAudio,
      seekAudio,
    ],
  )

  return <PlayerContext.Provider value={api}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
