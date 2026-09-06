import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Art, Cover, Icon, TrackArt } from '@/components/ui'
import type { SearchHit } from '@/services/music'
import { useSearch } from '@/hooks/useSearch'
import { artistById, moods, playlists, tracks } from '@/data'
import { usePlayer } from '@/state/PlayerContext'
import { usePresence, useScrollLock } from '@/hooks'
import { cx } from '@/lib/util'

const RECENT = ['Frank Ocean', 'Late Night', 'After Dark', 'Deep Focus']

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const player = usePlayer()
  const { present, closing } = usePresence(open, 220)
  useScrollLock(open)

  const { hits } = useSearch(query)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const id = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(id)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  const go = (hit: SearchHit) => {
    switch (hit.kind) {
      case 'track':
        onClose()
        player.playQueue([hit.id], 0, 'Search')
        break
      case 'playlist':
        onClose()
        navigate(`/playlist/${hit.id}`)
        break
      case 'collection':
        onClose()
        navigate(`/collection/${hit.id}`)
        break
      case 'mood':
        onClose()
        navigate(`/create?mood=${hit.id}`)
        break
      case 'artist':
        onClose()
        navigate(`/artist/${hit.id}`)
        break
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (!hits.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % hits.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + hits.length) % hits.length)
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      go(hits[active])
    }
  }

  if (!present) return null

  return (
    <div className={cx('searchlayer', closing && 'is-closing')} onKeyDown={onKeyDown}>
      <button type="button" className="searchlayer__scrim" onClick={onClose} aria-label="Close search" />

      <div className="searchbox" role="dialog" aria-modal="true" aria-label="Search Sonder">
        <div className="searchbox__field">
          <Icon name="search" size={19} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artists, songs, moods, playlists"
            aria-label="Search"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="searchbox__esc mono" onClick={onClose}>
            Esc
          </button>
        </div>

        <div className="searchbox__body hide-scroll">
          {!query.trim() && (
            <>
              <p className="searchbox__group mono">Recent</p>
              <div className="searchbox__recent">
                {RECENT.map((r) => (
                  <button key={r} type="button" className="chip chip--sm" onClick={() => setQuery(r)}>
                    <span className="chip__label">{r}</span>
                  </button>
                ))}
              </div>

              <p className="searchbox__group mono">Jump to a mood</p>
              <div className="searchbox__moods">
                {moods.slice(0, 8).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="searchmood"
                    style={{ ['--chip-hue' as string]: m.hue }}
                    onClick={() => {
                      onClose()
                      navigate(`/create?mood=${m.id}`)
                    }}
                  >
                    <span className="searchmood__dot" />
                    {m.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {query.trim() && hits.length === 0 && (
            <div className="searchbox__none">
              <p className="display display--3">Nothing matches “{query}”.</p>
              <p className="lede">Try an artist, a mood, or describe the moment instead — “driving at night” works.</p>
            </div>
          )}

          {hits.length > 0 && (
            <ul className="searchbox__results">
              {hits.map((hit, i) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    type="button"
                    className={cx('searchhit', i === active && 'is-active')}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(hit)}
                  >
                    <span className="searchhit__art">
                      {hit.image ? (
                        <TrackArt artwork={hit.image} seed={hit.id} hue={hit.hue} detail={false} />
                      ) : hit.photo ? (
                        <Cover photoId={hit.photo} hue={hit.hue} seed={hit.id} width={120} />
                      ) : (
                        <Art seed={hit.id} hue={hit.hue} detail={false} />
                      )}
                    </span>
                    <span className="searchhit__text">
                      <span className="searchhit__title">{hit.title}</span>
                      <span className="searchhit__meta">{hit.meta}</span>
                    </span>
                    <span className="searchhit__kind mono">{hit.kind}</span>
                    <Icon name="arrow-right" size={16} className="searchhit__go" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="searchbox__foot">
          <span className="mono">
            {tracks.length} tracks · {playlists.length} playlists · {Object.keys(artistById).length} artists
          </span>
          <span className="mono searchbox__keys">
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move <kbd>↵</kbd> to open
          </span>
        </footer>
      </div>
    </div>
  )
}
