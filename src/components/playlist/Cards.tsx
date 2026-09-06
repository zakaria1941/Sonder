import { Link } from 'react-router-dom'
import { Cover, Icon } from '@/components/ui'
import type { Collection, MoodCard, Playlist } from '@/data/types'
import { usePlayer } from '@/state/PlayerContext'
import { totalDuration } from '@/data'
import { cx, runtime } from '@/lib/util'

/* ---------------- Playlist card ---------------- */

export function PlaylistCard({ playlist, size = 'md' }: { playlist: Playlist; size?: 'sm' | 'md' | 'lg' }) {
  const player = usePlayer()
  const active = player.source === playlist.title && player.playing

  return (
    <article className={cx('pcard', `pcard--${size}`)} style={{ ['--card-hue' as string]: playlist.hue }}>
      <Link to={`/playlist/${playlist.id}`} className="pcard__link">
        <div className="pcard__art">
          <Cover photoId={playlist.coverPhoto} hue={playlist.hue} seed={playlist.id} width={640} scrim />
          <span className="pcard__badge mono">{playlist.trackIds.length} tracks</span>
        </div>
        <div className="pcard__text">
          <h3 className="pcard__title display display--3">{playlist.title}</h3>
          <p className="pcard__sub">{playlist.subtitle}</p>
          <p className="pcard__meta mono">{runtime(totalDuration(playlist.trackIds))}</p>
        </div>
      </Link>

      <button
        type="button"
        className={cx('pcard__play', active && 'is-playing')}
        aria-label={active ? `Pause ${playlist.title}` : `Play ${playlist.title}`}
        onClick={(e) => {
          e.preventDefault()
          if (active) player.pause()
          else player.playQueue(playlist.trackIds, 0, playlist.title)
        }}
      >
        <Icon name={active ? 'pause' : 'play'} size={17} />
      </button>
    </article>
  )
}

/* ---------------- Collection card ---------------- */

export function CollectionCard({ collection, wide = false }: { collection: Collection; wide?: boolean }) {
  return (
    <Link
      to={`/collection/${collection.id}`}
      className={cx('ccard', wide && 'ccard--wide')}
      style={{ ['--card-hue' as string]: collection.hue }}
    >
      <div className="ccard__art">
        <Cover
          photoId={collection.coverPhoto}
          hue={collection.hue}
          seed={collection.id}
          width={wide ? 1000 : 640}
          scrim
        />
      </div>
      <div className="ccard__body">
        <p className="ccard__tagline mono">{collection.tagline}</p>
        <h3 className="ccard__title display">{collection.title}</h3>
        <p className="ccard__desc">{collection.description}</p>
        <span className="ccard__go">
          <Icon name="arrow-right" size={16} />
        </span>
      </div>
    </Link>
  )
}

/* ---------------- Mood card ---------------- */

export function MoodCard({ mood, onSelect, selected }: { mood: MoodCard; onSelect?: () => void; selected?: boolean }) {
  const body = (
    <>
      <span className="moodcard__art">
        <Cover photoId={mood.photo} hue={mood.hue} seed={mood.id} width={400} grade={0.85} />
      </span>
      <span className="moodcard__text">
        <span className="moodcard__name">{mood.name}</span>
        <span className="moodcard__blurb">{mood.blurb}</span>
      </span>
      <span className="moodcard__energy" aria-hidden="true">
        <span style={{ transform: `scaleX(${mood.energy / 100})` }} />
      </span>
    </>
  )

  const style = { ['--card-hue' as string]: mood.hue }

  if (onSelect) {
    return (
      <button
        type="button"
        className={cx('moodcard', selected && 'is-selected')}
        style={style}
        onClick={onSelect}
        aria-pressed={selected}
      >
        {body}
      </button>
    )
  }

  return (
    <Link to={`/create?mood=${mood.id}`} className="moodcard" style={style}>
      {body}
    </Link>
  )
}
