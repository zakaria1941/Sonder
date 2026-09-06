import { useMemo, useState } from 'react'
import { Button, Chip, EmptyState, Reveal } from '@/components/ui'
import { PlaylistCard } from '@/components/playlist/Cards'
import { getTrack, totalDuration } from '@/services/music'
import { useLibrary } from '@/state/LibraryContext'
import { usePlayer } from '@/state/PlayerContext'
import { TrackList } from '@/components/music/TrackList'
import { runtime } from '@/lib/util'
import type { Track } from '@/services/music/types'

const TABS = ['All', 'Made by Sonder', 'Favourites', 'Liked songs'] as const

export function Library() {
  const library = useLibrary()
  const player = usePlayer()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')

  const shown = useMemo(() => {
    switch (tab) {
      case 'Made by Sonder':
        return library.all.filter((p) => !p.system)
      case 'Favourites':
        return library.all.filter((p) => p.favorite)
      default:
        return library.all
    }
  }, [library.all, tab])

  const likedTracks = useMemo(
    () => player.favorites.map((id) => getTrack(id)).filter(Boolean) as Track[],
    [player.favorites],
  )

  const totalRuntime = runtime(library.all.reduce((s, p) => s + totalDuration(p.trackIds), 0))

  return (
    <div className="library">
      <header className="libhead shell">
        <div>
          <p className="eyebrow">Your library</p>
          <h1 className="display display--page">Everything you’ve kept.</h1>
          <p className="lede">
            {library.all.length} playlists · {totalRuntime} · {player.favorites.length} liked songs
          </p>
        </div>
        <Button to="/create" size="lg" icon="wand">
          New playlist
        </Button>
      </header>

      <div className="shell libtabs">
        {TABS.map((t) => (
          <Chip key={t} label={t} size="sm" selected={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      <section className="section shell library__body">
        {tab === 'Liked songs' ? (
          likedTracks.length ? (
            <>
              <div className="section-head">
                <div className="section-head__text">
                  <p className="eyebrow">Liked songs</p>
                  <h2 className="display display--2">{likedTracks.length} tracks you kept.</h2>
                </div>
                <Button
                  icon="play"
                  onClick={() =>
                    player.playQueue(
                      likedTracks.map((t) => t.id),
                      0,
                      'Liked songs',
                    )
                  }
                >
                  Play all
                </Button>
              </div>
              <TrackList tracks={likedTracks} source="Liked songs" />
            </>
          ) : (
            <EmptyState
              icon="heart"
              title="Nothing liked yet."
              body="Tap the heart on any track and it lands here. Start with a playlist and see what sticks."
              action={<Button to="/discover">Browse collections</Button>}
            />
          )
        ) : shown.length ? (
          <div className="library__grid">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={i * 30}>
                <PlaylistCard playlist={p} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="wand"
            title={tab === 'Favourites' ? 'No favourites yet.' : 'Nothing built yet.'}
            body={
              tab === 'Favourites'
                ? 'Heart a playlist and it shows up here, ready for the next time that mood comes round.'
                : 'Tell Sonder how you feel and it will score the moment. It takes about four seconds.'
            }
            action={<Button to="/create">Create a playlist</Button>}
          />
        )}
      </section>
    </div>
  )
}
