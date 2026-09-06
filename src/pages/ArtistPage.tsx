import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Art, Button, Chip, EmptyState, Metric } from '@/components/ui'
import { TrackList } from '@/components/music/TrackList'
import { artists, totalDuration } from '@/data'
import { artistTracks, lookup } from '@/services/music'
import { usePlayer } from '@/state/PlayerContext'
import { useAccent } from '@/hooks'
import { runtime } from '@/lib/util'
import { Link } from 'react-router-dom'

export function ArtistPage() {
  const { id } = useParams()
  const player = usePlayer()
  const navigate = useNavigate()
  const artist = id ? lookup.artist(id) : undefined
  useAccent(artist?.hue)

  const tracks = useMemo(() => (artist ? artistTracks(artist.id) : []), [artist])

  if (!artist) {
    return (
      <div className="section shell">
        <EmptyState
          title="No artist by that name."
          body="The catalogue in this demo runs to twenty-two artists. Search will find any of them."
          action={<Button to="/discover">Back to Discover</Button>}
        />
      </div>
    )
  }

  const playing = player.playing && player.source === artist.name
  const related = artists
    .filter((a) => a.id !== artist.id && a.genres.some((g) => artist.genres.includes(g)))
    .slice(0, 6)
  const avgEnergy = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.energy, 0) / tracks.length) : 0

  return (
    <div className="artistpage">
      <header className="arthead">
        <div className="arthead__art" aria-hidden="true">
          <Art seed={artist.id} hue={artist.hue} />
        </div>
        <div className="shell arthead__inner">
          <p className="eyebrow">Artist</p>
          <h1 className="display display--page">{artist.name}</h1>
          <p className="lede">{artist.genres.join(' / ')}</p>

          <div className="arthead__metrics">
            <Metric label="Albums" value={String(artist.albums.length)} hint={artist.albums[0]} />
            <Metric label="In catalogue" value={String(tracks.length)} hint="tracks" />
            <Metric label="Average energy" value={String(avgEnergy)} />
            <Metric label="Runtime" value={runtime(totalDuration(tracks.map((t) => t.id)))} />
          </div>

          <div className="arthead__actions">
            <Button
              size="lg"
              icon={playing ? 'pause' : 'play'}
              onClick={() =>
                playing
                  ? player.pause()
                  : player.playQueue(
                      tracks.map((t) => t.id),
                      0,
                      artist.name,
                    )
              }
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon="wand"
              onClick={() => navigate(`/create?note=${encodeURIComponent(`Give me more songs like ${artist.name}`)}`)}
            >
              Build around {artist.name.split(' ')[0]}
            </Button>
          </div>
        </div>
      </header>

      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">In the catalogue</p>
            <h2 className="display display--2">Everything we have.</h2>
          </div>
        </div>
        <TrackList tracks={tracks} source={artist.name} />
      </section>

      {related.length > 0 && (
        <section className="section shell">
          <div className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">Adjacent</p>
              <h2 className="display display--2">Sits in the same register.</h2>
            </div>
          </div>
          <div className="artistgrid">
            {related.map((a) => (
              <Link
                key={a.id}
                to={`/artist/${a.id}`}
                className="artistcard"
                style={{ ['--card-hue' as string]: a.hue }}
              >
                <span className="artistcard__art">
                  <Art seed={a.id} hue={a.hue} detail={false} />
                </span>
                <span className="artistcard__name">{a.name}</span>
                <span className="artistcard__meta mono">{a.genres[0]}</span>
              </Link>
            ))}
          </div>
          <div className="chipwrap" style={{ marginTop: 'var(--s-6)' }}>
            {artist.genres.map((g) => (
              <Chip key={g} label={g} as="span" size="sm" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
