import { Link } from 'react-router-dom'
import { Equalizer, Icon, TrackArt } from '@/components/ui'
import { artistIdFor } from '@/data'
import type { Track } from '@/services/music/types'
import { usePlayer } from '@/state/PlayerContext'
import { cx, duration } from '@/lib/util'

interface TrackRowProps {
  track: Track
  index: number
  queue: string[]
  source: string
  /** Hides the album column on narrow layouts like the assistant panel. */
  compact?: boolean
  onRemove?: (id: string) => void
}

export function TrackRow({ track, index, queue, source, compact, onRemove }: TrackRowProps) {
  const player = usePlayer()
  const isCurrent = player.track?.id === track.id
  const isPlaying = isCurrent && player.playing
  const fav = player.isFavorite(track.id)

  const start = () => {
    if (isCurrent) {
      player.toggle()
      return
    }
    const at = queue.indexOf(track.id)
    player.playQueue(queue, at < 0 ? 0 : at, source)
  }

  return (
    <li className={cx('track', isCurrent && 'is-current', compact && 'track--compact')}>
      <button
        type="button"
        className="track__index"
        onClick={start}
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {isPlaying ? (
          <Equalizer />
        ) : (
          <>
            <span className="track__num mono tabular">{String(index + 1).padStart(2, '0')}</span>
            <Icon name="play" size={15} className="track__playicon" />
          </>
        )}
      </button>

      <div className="track__art" aria-hidden="true">
        <TrackArt artwork={track.albumArt} seed={track.id} hue={track.hue} detail={false} />
      </div>

      <div className="track__main">
        <span className="track__title">{track.title}</span>
        <Link to={`/artist/${artistIdFor(track.artist)}`} className="track__artist">
          {track.artist}
        </Link>
      </div>

      {!compact && (
        <span className="track__album" title={track.album}>
          {track.album}
        </span>
      )}

      <span className="track__energy" aria-hidden="true" title={`Energy ${track.energy}`}>
        <span className="track__energybar" style={{ transform: `scaleX(${track.energy / 100})` }} />
      </span>

      <button
        type="button"
        className={cx('track__fav', fav && 'is-on')}
        onClick={() => player.toggleFavorite(track.id)}
        aria-label={fav ? `Remove ${track.title} from favourites` : `Add ${track.title} to favourites`}
      >
        <Icon name={fav ? 'heart-filled' : 'heart'} size={16} />
      </button>

      <span className="track__time mono tabular">{duration(track.duration)}</span>

      {onRemove ? (
        <button
          type="button"
          className="track__more"
          onClick={() => onRemove(track.id)}
          aria-label={`Remove ${track.title}`}
        >
          <Icon name="close" size={16} />
        </button>
      ) : (
        <button type="button" className="track__more" aria-label={`More options for ${track.title}`}>
          <Icon name="more" size={16} />
        </button>
      )}
    </li>
  )
}

export function TrackList({
  tracks,
  source,
  compact,
  onRemove,
  header = true,
}: {
  tracks: Track[]
  source: string
  compact?: boolean
  onRemove?: (id: string) => void
  header?: boolean
}) {
  const queue = tracks.map((t) => t.id)

  return (
    <div className={cx('tracklist', compact && 'tracklist--compact')}>
      {header && !compact && (
        <div className="tracklist__head mono" aria-hidden="true">
          <span>#</span>
          <span />
          <span>Title</span>
          <span>Album</span>
          <span>Energy</span>
          <span />
          <span>
            <Icon name="clock" size={13} />
          </span>
          <span />
        </div>
      )}
      <ol className="tracklist__rows">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            queue={queue}
            source={source}
            compact={compact}
            onRemove={onRemove}
          />
        ))}
      </ol>
    </div>
  )
}
