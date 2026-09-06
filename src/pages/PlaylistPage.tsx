import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Chip, Cover, EmptyState, Icon, Reveal, Signal } from '@/components/ui'
import { TrackList } from '@/components/music/TrackList'
import { PlaylistCard } from '@/components/playlist/Cards'
import { activityById, feelingById, moodById, totalDuration } from '@/data'
import { relatedPlaylists, tracksFor } from '@/services/music'
import { useLibrary } from '@/state/LibraryContext'
import { usePlayer } from '@/state/PlayerContext'
import { useAccent } from '@/hooks'
import { cx, runtime } from '@/lib/util'

export function PlaylistPage() {
  const { id } = useParams()
  const library = useLibrary()
  const player = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh ?? false

  const playlist = id ? library.get(id) : undefined
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')

  useAccent(playlist?.hue)

  const tracks = useMemo(() => (playlist ? tracksFor(playlist.trackIds) : []), [playlist])
  const related = useMemo(() => (playlist ? relatedPlaylists(playlist) : []), [playlist])

  if (!playlist) {
    return (
      <div className="section shell">
        <EmptyState
          title="That playlist is gone."
          body="It was either removed or never existed. Your library still has everything else."
          action={<Button to="/library">Back to your library</Button>}
        />
      </div>
    )
  }

  const isPlaying = player.playing && player.source === playlist.title
  const avgEnergy = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.energy, 0) / tracks.length) : 0
  const avgValence = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.valence, 0) / tracks.length) : 0
  const mood = moodById[playlist.moodId]
  const genreCounts = new Map<string, number>()
  tracks.forEach((t) => t.genres.forEach((g) => genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)))
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)

  const stats = [
    { label: 'Mood', value: mood?.name ?? '—' },
    { label: 'Energy', value: String(avgEnergy) },
    { label: 'Brightness', value: String(avgValence) },
    { label: 'Tracks', value: String(tracks.length) },
    { label: 'Runtime', value: runtime(totalDuration(playlist.trackIds)) },
  ]

  return (
    <div className="pl">
      {/* ---------------- Header ---------------- */}
      <header className="plhead">
        <div className="plhead__bg" aria-hidden="true">
          <Cover photoId={playlist.coverPhoto} hue={playlist.hue} seed={playlist.id} width={2000} grade={0.88} eager />
        </div>

        <div className="plhead__inner shell">
          <div className={cx('plhead__cover', fresh && 'is-fresh')}>
            <Cover photoId={playlist.coverPhoto} hue={playlist.hue} seed={playlist.id} width={900} eager />
          </div>

          <div className={cx('plhead__text', fresh && 'is-fresh')}>
            <p className="eyebrow">{playlist.moment ? 'Scored for you' : 'Playlist'}</p>

            {renaming ? (
              <form
                className="plhead__rename"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (draft.trim()) library.rename(playlist.id, draft.trim())
                  setRenaming(false)
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => setRenaming(false)}
                  className="display display--1"
                  aria-label="Playlist name"
                />
              </form>
            ) : (
              <h1 className="display display--1 plhead__title">{playlist.title}</h1>
            )}

            <p className="plhead__sub">{playlist.subtitle}</p>
            <p className="plhead__desc">{playlist.description}</p>

            {playlist.moment && <MomentSlip moment={playlist.moment} />}

            <dl className="plstats">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="mono">{s.label}</dt>
                  <dd className="tabular">{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className="plhead__actions">
              <Button
                size="lg"
                icon={isPlaying ? 'pause' : 'play'}
                onClick={() => (isPlaying ? player.pause() : player.playQueue(playlist.trackIds, 0, playlist.title))}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon="wand"
                onClick={() => navigate('/assistant', { state: { playlistId: playlist.id } })}
              >
                Refine with Muse
              </Button>
              <button
                type="button"
                className={cx('plhead__icon', playlist.favorite && 'is-on')}
                onClick={() => library.toggleFavorite(playlist.id)}
                aria-label={playlist.favorite ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Icon name={playlist.favorite ? 'heart-filled' : 'heart'} size={20} />
              </button>
              <button
                type="button"
                className="plhead__icon"
                onClick={() => {
                  setDraft(playlist.title)
                  setRenaming(true)
                }}
                aria-label="Rename playlist"
              >
                <Icon name="edit" size={19} />
              </button>
              <button
                type="button"
                className="plhead__icon plhead__icon--danger"
                onClick={() => {
                  library.remove(playlist.id)
                  navigate('/library')
                }}
                aria-label="Delete playlist"
              >
                <Icon name="trash" size={19} />
              </button>
            </div>

            <div className="plhead__tags">
              {topGenres.map((g) => (
                <Chip key={g} label={g} as="span" size="sm" />
              ))}
            </div>
          </div>
        </div>

        <Signal
          className="plhead__signal"
          amplitude={0.28 + (avgEnergy / 100) * 0.6}
          complexity={avgEnergy / 100}
          speed={0.7}
          height={110}
        />
      </header>

      {/* ---------------- Tracks ---------------- */}
      <section className="section shell pl__body">
        <TrackList tracks={tracks} source={playlist.title} />

        <Reveal className="pl__refine">
          <div>
            <p className="eyebrow">Not quite it?</p>
            <h2 className="display display--2">Tell Muse what’s wrong with it.</h2>
            <p className="lede">
              “Make it sadder”, “more like Frank Ocean”, “less mainstream”, “add more R&amp;B”. It rebuilds the list in
              place and tells you what changed.
            </p>
          </div>
          <Button size="lg" icon="wand" onClick={() => navigate('/assistant', { state: { playlistId: playlist.id } })}>
            Open Muse
          </Button>
        </Reveal>
      </section>

      {/* ---------------- Related ---------------- */}
      {related.length > 0 && (
        <section className="section shell">
          <div className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">Next</p>
              <h2 className="display display--2">If this one worked.</h2>
            </div>
          </div>
          <div className="rail hide-scroll">
            {related.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** The record of what was asked for — printed like a ticket stub. */
function MomentSlip({ moment }: { moment: NonNullable<import('@/data/types').Playlist['moment']> }) {
  const rows = [
    moment.moodId && ['Feeling', moodById[moment.moodId]?.name],
    moment.activityId && ['Doing', activityById[moment.activityId]?.name],
    moment.feelingId && ['Wants', feelingById[moment.feelingId]?.name],
    moment.weather.length > 0 && ['Weather', moment.weather.join(', ')],
    moment.timeOfDay.length > 0 && ['Time', moment.timeOfDay.join(', ')],
  ].filter(Boolean) as Array<[string, string]>

  return (
    <div className="slip">
      <p className="slip__label mono">The moment</p>
      {moment.note && <p className="slip__note">“{moment.note}”</p>}
      <dl className="slip__rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="mono">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
