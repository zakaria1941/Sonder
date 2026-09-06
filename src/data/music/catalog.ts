import { tracks } from './tracks'
import type { Activity, Feeling, Mood, Track } from '@/services/music/types'

/**
 * Indexes derived from the catalogue. Everything here is computed from
 * `tracks.ts`, so adding a record is the only step needed to make it
 * searchable, recommendable and playable.
 */

export { tracks }

export const trackById: Record<string, Track> = Object.fromEntries(tracks.map((t) => [t.id, t]))

export interface CatalogArtist {
  id: string
  name: string
  genres: string[]
  albums: string[]
  trackIds: string[]
  /** Average energy across their catalogue, 0–100. */
  energy: number
  hue: string
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const artists: CatalogArtist[] = (() => {
  const grouped = new Map<string, Track[]>()
  for (const track of tracks) {
    const key = track.artist
    const list = grouped.get(key)
    if (list) list.push(track)
    else grouped.set(key, [track])
  }

  return [...grouped.entries()].map(([name, list]) => ({
    id: slug(name),
    name,
    genres: [...new Set(list.flatMap((t) => t.genres))],
    albums: [...new Set(list.map((t) => t.album).filter(Boolean) as string[])],
    trackIds: list.map((t) => t.id),
    energy: Math.round(list.reduce((sum, t) => sum + t.energy, 0) / list.length),
    hue: list[0].hue,
  }))
})()

export const artistById: Record<string, CatalogArtist> = Object.fromEntries(artists.map((a) => [a.id, a]))

export function artistIdFor(name: string): string {
  return slug(name)
}

export const genres: string[] = [...new Set(tracks.flatMap((t) => t.genres))].sort()

export const catalogMoods: Mood[] = [...new Set(tracks.flatMap((t) => t.moods))]
export const catalogActivities: Activity[] = [...new Set(tracks.flatMap((t) => t.activities))]
export const catalogFeelings: Feeling[] = [...new Set(tracks.flatMap((t) => t.feelings))]

export function totalDuration(trackIds: string[]): number {
  return trackIds.reduce((sum, id) => sum + (trackById[id]?.duration ?? 0), 0)
}
