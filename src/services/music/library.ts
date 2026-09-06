import { collections, moods, playlists } from '@/data'
import type { Collection, MoodCard, Playlist } from '@/data/types'
import { artistById, trackById } from '@/data/music/catalog'
import type { Track } from './types'

/**
 * Lookups over the app's own objects — playlists, collections, moods.
 * These are Sonder's, not the catalogue's, which is why they live apart from
 * the track queries.
 */

export function tracksFor(ids: string[]): Track[] {
  return ids.map((id) => trackById[id]).filter(Boolean) as Track[]
}

export function artistTracks(artistId: string): Track[] {
  const artist = artistById[artistId]
  return artist ? tracksFor(artist.trackIds) : []
}

export const lookup = {
  playlist: (id: string): Playlist | undefined => playlists.find((p) => p.id === id),
  collection: (id: string): Collection | undefined => collections.find((c) => c.id === id),
  mood: (id: string): MoodCard | undefined => moods.find((m) => m.id === id),
  artist: (id: string) => artistById[id],
}

/** Playlists that share tracks or a mood with this one. */
export function relatedPlaylists(playlist: Playlist, limit = 4): Playlist[] {
  return playlists
    .filter((p) => p.id !== playlist.id)
    .map((p) => ({
      p,
      shared: p.trackIds.filter((t) => playlist.trackIds.includes(t)).length + (p.moodId === playlist.moodId ? 2 : 0),
    }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((x) => x.p)
}

/** Rough "listening right now" figure for the hero ticker. Stable per hour. */
export function liveListeners(): number {
  const base = 3400
  const hour = new Date().getHours()
  const curve = Math.sin(((hour - 3) / 24) * Math.PI * 2) * 0.4 + 1
  return Math.round(base * curve)
}
