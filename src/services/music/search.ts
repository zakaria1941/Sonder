import { artists, tracks } from '@/data/music/catalog'
import type { Track } from './types'

/**
 * Catalogue search.
 *
 * Every field a listener might type is searchable — title, artist, genre,
 * mood, feeling, activity, tag — because "rain", "focus" and "drive" are all
 * reasonable things to type into a music search and none of them are titles.
 */

export type SearchKind = 'track' | 'artist' | 'playlist' | 'mood' | 'collection'

export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  meta: string
  hue: string
  /** Unsplash id, for the app's own artwork. */
  photo?: string
  /** Absolute URL, for real album art. */
  image?: string
  score: number
}

function rank(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (h === n) return 3
  if (h.startsWith(n)) return 2
  if (h.includes(n)) return 1
  return 0
}

/** Any metadata match counts, but a title match counts for more. */
function scoreTrack(track: Track, query: string): { score: number; why: string } | null {
  const title = rank(track.title, query)
  if (title) return { score: title + 2, why: `${track.artist} · ${track.album ?? 'Single'}` }

  const artist = rank(track.artist, query)
  if (artist) return { score: artist + 1.6, why: `${track.artist} · ${track.album ?? 'Single'}` }

  const album = track.album ? rank(track.album, query) : 0
  if (album) return { score: album + 1.2, why: `${track.artist} · ${track.album}` }

  const n = query.toLowerCase()
  const genre = track.genres.find((g) => g.toLowerCase().includes(n))
  if (genre) return { score: 1.4, why: `${track.artist} · ${genre}` }

  const mood = track.moods.find((m) => m.includes(n))
  if (mood) return { score: 1.3, why: `${track.artist} · ${mood}` }

  const feeling = track.feelings.find((f) => f.includes(n))
  if (feeling) return { score: 1.2, why: `${track.artist} · for ${feeling}` }

  const activity = track.activities.find((a) => a.includes(n))
  if (activity) return { score: 1.2, why: `${track.artist} · for ${activity}` }

  const tag = track.tags?.find((t) => t.includes(n))
  if (tag) return { score: 1.1, why: `${track.artist} · ${tag}` }

  const weather = track.weather?.find((w) => w.includes(n))
  if (weather) return { score: 1.05, why: `${track.artist} · suits ${weather}` }

  const time = track.timeOfDay?.find((t) => t.includes(n))
  if (time) return { score: 1.0, why: `${track.artist} · ${time}` }

  return null
}

export function searchTracks(query: string, limit = 12): Track[] {
  const q = query.trim()
  if (!q) return []
  return tracks
    .map((t) => ({ t, hit: scoreTrack(t, q) }))
    .filter((x) => x.hit)
    .sort((a, b) => b.hit!.score - a.hit!.score)
    .slice(0, limit)
    .map((x) => x.t)
}

/** Catalogue-only hits. Sonder's own objects are added by the caller. */
export function searchCatalog(query: string, limit = 12): SearchHit[] {
  const q = query.trim()
  if (!q) return []

  const hits: SearchHit[] = []

  for (const track of tracks) {
    const hit = scoreTrack(track, q)
    if (hit) {
      hits.push({ kind: 'track', id: track.id, title: track.title, meta: hit.why, hue: track.hue, score: hit.score })
    }
  }

  for (const artist of artists) {
    const score = rank(artist.name, q)
    if (score) {
      hits.push({
        kind: 'artist',
        id: artist.id,
        title: artist.name,
        meta: `Artist · ${artist.genres.slice(0, 2).join(', ')}`,
        hue: artist.hue,
        score: score + 1.8,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
