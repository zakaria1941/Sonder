import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Chip, Cover, EmptyState, Reveal, Signal } from '@/components/ui'
import { TrackList } from '@/components/music/TrackList'
import { CollectionCard } from '@/components/playlist/Cards'
import { collections, totalDuration } from '@/data'
import { lookup, tracksFor } from '@/services/music'
import { usePlayer } from '@/state/PlayerContext'
import { useAccent } from '@/hooks'
import { runtime } from '@/lib/util'

export function CollectionPage() {
  const { id } = useParams()
  const player = usePlayer()
  const navigate = useNavigate()
  const collection = id ? lookup.collection(id) : undefined
  useAccent(collection?.hue)

  const tracks = useMemo(() => (collection ? tracksFor(collection.trackIds) : []), [collection])

  if (!collection) {
    return (
      <div className="section shell">
        <EmptyState
          title="No collection here."
          body="This one has been retired. Discover has twelve others."
          action={<Button to="/discover">Back to Discover</Button>}
        />
      </div>
    )
  }

  const playing = player.playing && player.source === collection.title
  const others = collections.filter((c) => c.id !== collection.id).slice(0, 4)

  return (
    <div className="coll">
      <header className="collhead">
        <div className="collhead__media" aria-hidden="true">
          <Cover
            photoId={collection.coverPhoto}
            hue={collection.hue}
            seed={collection.id}
            width={2000}
            grade={0.8}
            eager
          />
        </div>
        <div className="shell collhead__inner">
          <p className="eyebrow">Collection</p>
          <h1 className="display display--page">{collection.title}</h1>
          <p className="collhead__tagline mono">{collection.tagline}</p>
          <p className="lede">{collection.description}</p>

          <div className="collhead__meta">
            <span className="mono">{tracks.length} tracks</span>
            <span className="mono">{runtime(totalDuration(collection.trackIds))}</span>
            <div className="collhead__tags">
              {collection.tags.map((t) => (
                <Chip key={t} label={t} as="span" size="sm" />
              ))}
            </div>
          </div>

          <div className="collhead__actions">
            <Button
              size="lg"
              icon={playing ? 'pause' : 'play'}
              onClick={() => (playing ? player.pause() : player.playQueue(collection.trackIds, 0, collection.title))}
            >
              {playing ? 'Pause' : 'Play collection'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon="wand"
              onClick={() =>
                navigate(
                  `/create?note=${encodeURIComponent(`Something like ${collection.title} — ${collection.tagline.toLowerCase()}`)}`,
                )
              }
            >
              Make it personal
            </Button>
          </div>
        </div>
        <Signal className="collhead__signal" amplitude={0.44} complexity={0.45} speed={0.7} height={100} />
      </header>

      <section className="section shell">
        <TrackList tracks={tracks} source={collection.title} />
      </section>

      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Adjacent</p>
            <h2 className="display display--2">Close to this one.</h2>
          </div>
        </div>
        <div className="discover__grid">
          {others.map((c, i) => (
            <Reveal key={c.id} delay={i * 40}>
              <CollectionCard collection={c} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  )
}
