import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { playlists as seeded } from '@/data'
import type { Playlist } from '@/data/types'

/**
 * Everything the listener has made or saved. Seeded playlists are
 * merged with anything generated during the session and persisted to
 * localStorage so a refresh does not wipe the demo.
 */

interface LibraryApi {
  all: Playlist[]
  generated: Playlist[]
  get: (id: string) => Playlist | undefined
  add: (playlist: Playlist) => void
  rename: (id: string, title: string) => void
  remove: (id: string) => void
  toggleFavorite: (id: string) => void
  replaceTracks: (id: string, trackIds: string[]) => void
  /** The most recent thing the AI produced, for the assistant to work on. */
  latest: Playlist | undefined
}

const LibraryContext = createContext<LibraryApi | null>(null)

const KEY = 'sonder.library.v1'

interface Persisted {
  generated: Playlist[]
  overrides: Record<string, { title?: string; favorite?: boolean; trackIds?: string[] }>
  removed: string[]
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Persisted
  } catch {
    /* fall through to a clean library */
  }
  return { generated: [], overrides: {}, removed: [] }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* session-only library is an acceptable fallback */
    }
  }, [state])

  const all = useMemo(() => {
    const merged = [...state.generated, ...seeded]
      .filter((p) => !state.removed.includes(p.id))
      .map((p) => {
        const o = state.overrides[p.id]
        return o
          ? {
              ...p,
              ...(o.title ? { title: o.title } : {}),
              ...(o.favorite !== undefined ? { favorite: o.favorite } : {}),
              ...(o.trackIds ? { trackIds: o.trackIds } : {}),
            }
          : p
      })
    return merged.sort((a, b) => b.createdAt - a.createdAt)
  }, [state])

  const patch = useCallback((id: string, changes: Persisted['overrides'][string]) => {
    setState((s) => ({ ...s, overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...changes } } }))
  }, [])

  const api = useMemo<LibraryApi>(
    () => ({
      all,
      generated: all.filter((p) => !p.system),
      latest: all.find((p) => !p.system),
      get: (id) => all.find((p) => p.id === id),
      add: (playlist) => setState((s) => ({ ...s, generated: [playlist, ...s.generated] })),
      rename: (id, title) => patch(id, { title }),
      remove: (id) =>
        setState((s) => ({
          ...s,
          removed: [...s.removed, id],
          generated: s.generated.filter((p) => p.id !== id),
        })),
      toggleFavorite: (id) => {
        const current = all.find((p) => p.id === id)
        patch(id, { favorite: !current?.favorite })
      },
      replaceTracks: (id, trackIds) => patch(id, { trackIds }),
    }),
    [all, patch],
  )

  return <LibraryContext.Provider value={api}>{children}</LibraryContext.Provider>
}

export function useLibrary(): LibraryApi {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider')
  return ctx
}
