import { artistById, artists, genres, totalDuration, trackById, tracks } from '@/data/music/catalog'
import { getSource, sources } from './sources'
import { checkPlayable } from './playback'
import { ACTIVITIES, FEELINGS, MOODS, TIMES_OF_DAY, WEATHER } from './types'
import type { Track } from './types'

/**
 * The query surface over the catalogue, plus the validator that keeps it
 * honest. Nothing here reaches for the network — the catalogue ships with
 * the app.
 */

export { tracks, trackById, artists, artistById, genres, totalDuration, sources }

export function getTrack(id: string): Track | undefined {
  return trackById[id]
}

export function getTracks(ids: string[]): Track[] {
  return ids.map((id) => trackById[id]).filter(Boolean) as Track[]
}

export function tracksByArtist(artistId: string): Track[] {
  const artist = artistById[artistId]
  return artist ? getTracks(artist.trackIds) : []
}

export function tracksWithMood(mood: string, limit = 20): Track[] {
  return tracks.filter((t) => (t.moods as string[]).includes(mood)).slice(0, limit)
}

/* ---------------- attribution ---------------- */

export interface Attribution {
  text: string
  license?: string
  licenseUrl?: string
  url?: string
  sourceName?: string
}

/**
 * What has to be shown to use a track legitimately. Kept as one helper so a
 * credits panel, an export or a tooltip all say the same thing.
 */
export function getTrackAttribution(track: Track): Attribution {
  const source = getSource(track.sourceId)
  const parts = [track.attribution ?? `${track.title} by ${track.artist}`]
  if (track.license) parts.push(`(${track.license})`)

  return {
    text: parts.join(' '),
    license: track.license,
    licenseUrl: track.licenseUrl,
    url: track.attributionUrl,
    sourceName: source?.name,
  }
}

/** Every distinct licence in play, for a credits screen. */
export function catalogLicenses(): Array<{ license: string; licenseUrl?: string; count: number }> {
  const seen = new Map<string, { license: string; licenseUrl?: string; count: number }>()
  for (const track of tracks) {
    const key = track.license ?? 'Unspecified'
    const entry = seen.get(key)
    if (entry) entry.count += 1
    else seen.set(key, { license: key, licenseUrl: track.licenseUrl, count: 1 })
  }
  return [...seen.values()].sort((a, b) => b.count - a.count)
}

/* ---------------- validation ---------------- */

export interface CatalogIssue {
  trackId: string
  field: string
  message: string
}

/**
 * Development-only sanity check on the catalogue. Runs on boot in dev and is
 * never surfaced in the product; it exists so a bad record is caught while
 * editing rather than when someone presses play.
 */
export function validateMusicCatalog(): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const seenIds = new Set<string>()
  const seenUrls = new Map<string, string>()

  const push = (trackId: string, field: string, message: string) => issues.push({ trackId, field, message })

  for (const track of tracks) {
    const id = track.id || '(missing id)'

    if (!track.id) push(id, 'id', 'missing id')
    else if (seenIds.has(track.id)) push(id, 'id', 'duplicate id')
    else seenIds.add(track.id)

    if (!track.title?.trim()) push(id, 'title', 'missing title')
    if (!track.artist?.trim()) push(id, 'artist', 'missing artist')

    const playable = checkPlayable(track)
    if (!playable.playable) push(id, 'audioUrl', playable.reason ?? 'unusable audio url')

    if (track.audioUrl) {
      const owner = seenUrls.get(track.audioUrl)
      if (owner) push(id, 'audioUrl', `shares an audio file with "${owner}"`)
      else seenUrls.set(track.audioUrl, track.title)
    }

    if (!Number.isFinite(track.duration) || track.duration <= 0)
      push(id, 'duration', 'duration must be a positive number of seconds')
    else if (track.duration > 60 * 30) push(id, 'duration', 'duration looks wrong (over 30 minutes)')

    if (!track.moods?.length) push(id, 'moods', 'needs at least one mood')
    else {
      for (const mood of track.moods) if (!MOODS.includes(mood)) push(id, 'moods', `unknown mood "${mood}"`)
    }
    for (const feeling of track.feelings ?? []) {
      if (!FEELINGS.includes(feeling)) push(id, 'feelings', `unknown feeling "${feeling}"`)
    }
    for (const activity of track.activities ?? []) {
      if (!ACTIVITIES.includes(activity)) push(id, 'activities', `unknown activity "${activity}"`)
    }
    for (const w of track.weather ?? []) if (!WEATHER.includes(w)) push(id, 'weather', `unknown weather "${w}"`)
    for (const t of track.timeOfDay ?? []) if (!TIMES_OF_DAY.includes(t)) push(id, 'timeOfDay', `unknown time "${t}"`)

    if (!Number.isFinite(track.energy) || track.energy < 0 || track.energy > 100)
      push(id, 'energy', 'energy must be 0–100')
    if (!Number.isFinite(track.valence) || track.valence < 0 || track.valence > 100)
      push(id, 'valence', 'valence must be 0–100')

    if (!getSource(track.sourceId)) push(id, 'sourceId', `unknown source "${track.sourceId}"`)
    if (track.license && !track.licenseUrl) push(id, 'licenseUrl', 'a licence should link to its terms')
    if (!track.license) push(id, 'license', 'no licence recorded — do not ship this track')
  }

  return issues
}

/** Called once from the entry point; a no-op in production builds. */
export function reportCatalogIssues(): void {
  if (!import.meta.env.DEV) return
  const issues = validateMusicCatalog()
  if (!issues.length) {
    console.info(`[catalog] ${tracks.length} tracks, ${artists.length} artists, no issues`)
    return
  }
  console.group(`[catalog] ${issues.length} issue${issues.length === 1 ? '' : 's'}`)
  for (const issue of issues) console.warn(`${issue.trackId} · ${issue.field}: ${issue.message}`)
  console.groupEnd()
}
