import { useMemo } from 'react'
import { collections, moods, playlists } from '@/data'
import { searchCatalog } from '@/services/music'
import type { SearchHit } from '@/services/music'

/**
 * Results for the search overlay: the catalogue, plus Sonder's own objects.
 *
 * Every track hit is a real record, so selecting one plays the file it names.
 */

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function sonderHits(query: string): SearchHit[] {
  const hits: SearchHit[] = []
  for (const p of playlists) {
    if (matches(p.title, query) || matches(p.subtitle, query))
      hits.push({
        kind: 'playlist',
        id: p.id,
        title: p.title,
        meta: `Playlist · ${p.trackIds.length} tracks`,
        hue: p.hue,
        photo: p.coverPhoto,
        score: 2.2,
      })
  }
  for (const c of collections) {
    if (matches(c.title, query) || matches(c.tagline, query))
      hits.push({
        kind: 'collection',
        id: c.id,
        title: c.title,
        meta: `Collection · ${c.tagline}`,
        hue: c.hue,
        photo: c.coverPhoto,
        score: 2.1,
      })
  }
  for (const m of moods) {
    if (matches(m.name, query) || matches(m.blurb, query))
      hits.push({
        kind: 'mood',
        id: m.id,
        title: m.name,
        meta: `Mood · ${m.blurb}`,
        hue: m.hue,
        photo: m.photo,
        score: 2.4,
      })
  }
  return hits
}

export interface SearchState {
  hits: SearchHit[]
  loading: boolean
  error: string | null
}

export function useSearch(query: string): SearchState {
  const trimmed = query.trim()

  return useMemo<SearchState>(() => {
    if (!trimmed) return { hits: [], loading: false, error: null }
    const hits = [...searchCatalog(trimmed, 12), ...sonderHits(trimmed)].sort((a, b) => b.score - a.score).slice(0, 16)
    return { hits, loading: false, error: null }
  }, [trimmed])
}
