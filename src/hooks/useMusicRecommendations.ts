import { useCallback, useMemo } from 'react'
import { generatePlaylist, rankTracks, readIntent, similarTo } from '@/services/music'
import type { GeneratedPlaylist, MusicIntent, PlaylistOptions, Track } from '@/services/music'

/**
 * The recommender, as the pages use it.
 *
 * Everything is synchronous and deterministic — the same request always gives
 * the same playlist — so a component can call it during render to preview a
 * result without any loading state.
 */
export function useMusicRecommendations() {
  const read = useCallback((query: string): MusicIntent => readIntent(query), [])

  const generate = useCallback(
    (intent: MusicIntent, options?: PlaylistOptions): GeneratedPlaylist => generatePlaylist(intent, options),
    [],
  )

  const rank = useCallback(
    (intent: MusicIntent, limit = 12): Track[] => rankTracks(intent, { limit }).map((r) => r.track),
    [],
  )

  const similar = useCallback((trackId: string, limit = 8): Track[] => similarTo(trackId, limit), [])

  return useMemo(() => ({ read, generate, rank, similar }), [read, generate, rank, similar])
}
