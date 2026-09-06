import type { Track } from './types'

/**
 * Deciding whether a track can actually be played, before the player tries.
 *
 * A record with no usable audio is never handed to the audio element — it is
 * reported as unavailable instead, so the interface can never imply that
 * something is playing when nothing is.
 */

/** Anything that looks like a stand-in rather than a real file. */
const PLACEHOLDER = /(^$|example\.com|placeholder|TODO|CHANGEME|your-audio-here)/i

export interface PlayabilityResult {
  playable: boolean
  reason?: string
}

export function checkPlayable(track: Track | undefined | null): PlayabilityResult {
  if (!track) return { playable: false, reason: 'That track is not in the catalogue.' }

  const url = track.audioUrl?.trim() ?? ''
  if (!url || PLACEHOLDER.test(url)) {
    return { playable: false, reason: `“${track.title}” has no audio file yet.` }
  }

  const isAbsolute = /^https?:\/\//i.test(url)
  const isRooted = url.startsWith('/')
  if (!isAbsolute && !isRooted) {
    return { playable: false, reason: `“${track.title}” has an audio path the browser cannot resolve.` }
  }

  return { playable: true }
}

export function isPlayable(track: Track | undefined | null): boolean {
  return checkPlayable(track).playable
}

/** Local files win when both exist — no network, no CORS, no latency. */
export function preferredUrl(track: Track): string {
  return track.audioUrl
}

/**
 * Turns a MediaError into something worth reading. The audio element's own
 * codes are the only reliable signal for 404 / CORS / codec failures.
 */
export function describeMediaError(error: MediaError | null, track?: Track | null): string {
  const name = track ? `“${track.title}”` : 'this track'
  switch (error?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return `Playback of ${name} was cancelled.`
    case MediaError.MEDIA_ERR_NETWORK:
      return `Lost the connection while loading ${name}.`
    case MediaError.MEDIA_ERR_DECODE:
      return `${name} could not be decoded by this browser.`
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return `Unable to play ${name}. The file may be missing or blocked.`
    default:
      return `Unable to play ${name}.`
  }
}
