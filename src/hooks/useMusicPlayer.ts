import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '@/lib/util'
import { checkPlayable, describeMediaError } from '@/services/music/playback'
import type { Track } from '@/services/music/types'

/**
 * One HTMLAudioElement, wrapped.
 *
 * The element is the source of truth for everything time-related: position,
 * duration and playing state are read back off it rather than tracked
 * alongside it, so the UI can never drift from what you are actually hearing.
 * There is no timer in here.
 *
 * Playback that has to survive iOS must start inside the user gesture that
 * asked for it, so `load(src, true)` sets the source and calls play()
 * synchronously rather than waiting for a canplay event.
 */

export interface MusicPlayerState {
  /** Seconds elapsed, straight from audio.currentTime. */
  position: number
  /** Seconds, from the decoded file. 0 until metadata arrives. */
  duration: number
  playing: boolean
  /** Buffering, seeking, or waiting for a newly selected source. */
  loading: boolean
  error: string | null
}

export interface MusicPlayerApi extends MusicPlayerState {
  /**
   * Point the element at a track. `autoplay` must come from a user gesture.
   * A record with no usable audio is refused here rather than handed to the
   * element, so the transport never mimes playback.
   */
  load: (track: Track | null, autoplay: boolean) => void
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
  dismissError: () => void
  /** True once a source has been attached, so callers know whether to load first. */
  hasSource: () => boolean
}

interface Options {
  volume: number
  muted: boolean
  onEnded: () => void
}

const LOAD_FAILED = 'Unable to play this track.'
const BLOCKED = 'Your browser blocked playback. Press play again to start.'

export function useMusicPlayer({ volume, muted, onEnded }: Options): MusicPlayerApi {
  const [audio] = useState<HTMLAudioElement | null>(() => {
    if (typeof Audio === 'undefined') return null
    const el = new Audio()
    el.preload = 'metadata'
    return el
  })

  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endedRef = useRef(onEnded)
  endedRef.current = onEnded

  /** Only used to name the track in error messages. */
  const trackRef = useRef<Track | null>(null)

  /** Bumped on every load so a stale play() rejection cannot raise a false error. */
  const generation = useRef(0)

  /* ---------------- wire the element up ---------------- */

  useEffect(() => {
    if (!audio) return

    const onTime = () => setPosition(audio.currentTime)
    const onMeta = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
      setLoading(false)
    }
    const onPlay = () => {
      setPlaying(true)
      setError(null)
    }
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onReady = () => setLoading(false)
    const onEndedEvent = () => {
      setPlaying(false)
      endedRef.current()
    }
    const onErrorEvent = () => {
      setLoading(false)
      setPlaying(false)
      // An empty src is how we clear the element; that is not a failure.
      if (audio.getAttribute('src')) setError(describeMediaError(audio.error, trackRef.current))
    }
    const onEmptied = () => {
      setPosition(0)
      setDuration(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('seeking', onTime)
    audio.addEventListener('seeked', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onReady)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('stalled', onWaiting)
    audio.addEventListener('canplay', onReady)
    audio.addEventListener('ended', onEndedEvent)
    audio.addEventListener('error', onErrorEvent)
    audio.addEventListener('emptied', onEmptied)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('seeking', onTime)
      audio.removeEventListener('seeked', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('playing', onReady)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('stalled', onWaiting)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('ended', onEndedEvent)
      audio.removeEventListener('error', onErrorEvent)
      audio.removeEventListener('emptied', onEmptied)
    }
  }, [audio])

  /**
   * Put the element in the document. Playback works detached, but being in the
   * DOM is what makes it show up in devtools and in the browser's own media
   * controls, and it is removed again with the provider so audio never
   * outlives the app.
   */
  useEffect(() => {
    if (!audio) return
    audio.setAttribute('data-sonder-audio', '')
    audio.hidden = true
    document.body.appendChild(audio)
    return () => {
      // Pausing is what actually stops sound; leaving the source alone keeps a
      // remount (StrictMode does one in dev) from wiping the loaded track.
      audio.pause()
      audio.remove()
    }
  }, [audio])

  useEffect(() => {
    if (audio) audio.volume = clamp(volume, 0, 1)
  }, [audio, volume])

  useEffect(() => {
    if (audio) audio.muted = muted
  }, [audio, muted])

  /* ---------------- controls ---------------- */

  const attemptPlay = useCallback(() => {
    if (!audio) return
    const mine = generation.current
    const started = audio.play()
    if (!started) return
    started.catch((err: DOMException) => {
      // A newer load superseded this request — not something to report.
      if (err.name === 'AbortError' || mine !== generation.current) return
      setPlaying(false)
      setError(err.name === 'NotAllowedError' ? BLOCKED : LOAD_FAILED)
    })
  }, [audio])

  const load = useCallback(
    (track: Track | null, autoplay: boolean) => {
      if (!audio) return
      generation.current += 1
      trackRef.current = track
      setError(null)
      setPosition(0)

      if (!track) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        setDuration(0)
        return
      }

      const check = checkPlayable(track)
      if (!check.playable) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        setDuration(0)
        setLoading(false)
        setError(check.reason ?? LOAD_FAILED)
        return
      }

      const src = track.audioUrl

      const changed = !audio.currentSrc.endsWith(src) && !audio.src.endsWith(src)
      if (changed) {
        audio.pause()
        audio.src = src
        audio.load()
        setDuration(0)
        setLoading(true)
      } else {
        audio.currentTime = 0
      }

      // Called straight out of the click handler, which is what iOS requires.
      if (autoplay) attemptPlay()
    },
    [audio, attemptPlay],
  )

  const play = useCallback(() => attemptPlay(), [attemptPlay])
  const pause = useCallback(() => audio?.pause(), [audio])

  const toggle = useCallback(() => {
    if (!audio) return
    if (audio.paused) attemptPlay()
    else audio.pause()
  }, [audio, attemptPlay])

  const seek = useCallback(
    (seconds: number) => {
      if (!audio) return
      const total = Number.isFinite(audio.duration) ? audio.duration : 0
      if (!total) return
      const target = clamp(seconds, 0, total)
      audio.currentTime = target
      // Mirror it immediately so dragging stays responsive; `seeked` confirms.
      setPosition(target)
    },
    [audio],
  )

  const dismissError = useCallback(() => setError(null), [])
  const hasSource = useCallback(() => Boolean(audio?.getAttribute('src')), [audio])

  return {
    position,
    duration,
    playing,
    loading,
    error,
    load,
    play,
    pause,
    toggle,
    seek,
    dismissError,
    hasSource,
  }
}
