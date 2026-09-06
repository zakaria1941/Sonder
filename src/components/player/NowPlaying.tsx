import { useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon, Signal, TrackArt } from '@/components/ui'
import { usePlayer } from '@/state/PlayerContext'
import { artistIdFor } from '@/data'
import { clamp, cx, duration } from '@/lib/util'
import { useMediaQuery, usePresence, useScrollLock } from '@/hooks'

/** The seek bar is the Signal again — same waveform, now measuring time. */
function Seek({ compact = false }: { compact?: boolean }) {
  const { track, position, duration: trackLength, seek } = usePlayer()
  const railRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Real decoded length; the catalogue value only covers the moment before
  // metadata arrives.
  const total = trackLength || track?.duration || 1
  const progress = clamp(position / total, 0, 1)

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = railRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      seek(ratio * total)
    },
    [seek, total],
  )

  return (
    <div className={cx('seek', compact && 'seek--compact')}>
      <span className="seek__time mono tabular">{duration(position)}</span>
      <div
        ref={railRef}
        className="seek__rail"
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${duration(position)} of ${duration(total)}`}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          seekFromEvent(e.clientX)
        }}
        onPointerMove={(e) => dragging.current && seekFromEvent(e.clientX)}
        onPointerUp={(e) => {
          dragging.current = false
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(position + 5)
          if (e.key === 'ArrowLeft') seek(position - 5)
        }}
      >
        <Signal
          variant="bars"
          progress={progress}
          amplitude={0.34 + ((track?.energy ?? 40) / 100) * 0.5}
          complexity={(track?.energy ?? 40) / 100}
          speed={0.6}
          height={compact ? 22 : 26}
          barWidth={2}
          barGap={2}
          glow={false}
          dim
          seed={(track?.id.length ?? 3) % 7}
        />
        <span className="seek__head" style={{ left: `${progress * 100}%` }} />
      </div>
      <span className="seek__time mono tabular">{duration(total)}</span>
    </div>
  )
}

function Transport({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { playing, toggle, next, prev, shuffle, repeat, repeatMode, toggleShuffle, toggleRepeat, loading } = usePlayer()
  return (
    <div className={cx('transport', `transport--${size}`)}>
      <button
        type="button"
        className={cx('transport__side', shuffle && 'is-on')}
        onClick={toggleShuffle}
        aria-label="Shuffle"
        aria-pressed={shuffle}
      >
        <Icon name="shuffle" size={17} />
      </button>
      <button type="button" className="transport__step" onClick={prev} aria-label="Previous track">
        <Icon name="prev" size={size === 'lg' ? 26 : 20} />
      </button>
      <button
        type="button"
        className={cx('transport__play', loading && 'is-loading')}
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        aria-busy={loading}
      >
        <Icon name={playing ? 'pause' : 'play'} size={size === 'lg' ? 26 : 19} />
      </button>
      <button type="button" className="transport__step" onClick={next} aria-label="Next track">
        <Icon name="next" size={size === 'lg' ? 26 : 20} />
      </button>
      <button
        type="button"
        className={cx('transport__side', repeat && 'is-on', repeatMode === 'track' && 'is-one')}
        onClick={toggleRepeat}
        aria-label={repeatMode === 'track' ? 'Repeat track' : repeatMode === 'playlist' ? 'Repeat playlist' : 'Repeat'}
        aria-pressed={repeat}
      >
        <Icon name="repeat" size={17} />
      </button>
    </div>
  )
}

function Volume() {
  const { volume, muted, setVolume, toggleMute } = usePlayer()
  return (
    <div className="volume">
      <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="volume__btn">
        <Icon name={muted || volume === 0 ? 'volume-off' : 'volume'} size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
        className="volume__range"
        style={{ ['--fill' as string]: `${(muted ? 0 : volume) * 100}%` }}
      />
    </div>
  )
}

export function NowPlaying() {
  const player = usePlayer()
  const { track, playing, expanded, setExpanded, isFavorite, toggleFavorite } = player
  const isMobile = useMediaQuery('(max-width: 860px)')
  const sheet = usePresence(expanded, 300)
  useScrollLock(expanded)

  if (!track) return null

  const artist = track.artist
  const fav = isFavorite(track.id)

  /* ---------------- mobile ---------------- */
  if (isMobile) {
    return (
      <>
        <div className="miniplayer" style={{ ['--accent' as string]: track.hue }}>
          <button type="button" className="miniplayer__open" onClick={() => setExpanded(true)} aria-label="Open player">
            <span className="miniplayer__art">
              <TrackArt artwork={track.albumArt} seed={track.id} hue={track.hue} detail={false} />
            </span>
            <span className="miniplayer__text">
              <span className="miniplayer__title">{track.title}</span>
              <span className="miniplayer__artist">{artist}</span>
            </span>
          </button>
          <button
            type="button"
            className={cx('miniplayer__fav', fav && 'is-on')}
            onClick={() => toggleFavorite(track.id)}
            aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Icon name={fav ? 'heart-filled' : 'heart'} size={19} />
          </button>
          <button
            type="button"
            className={cx('miniplayer__play', player.loading && 'is-loading')}
            onClick={player.toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            aria-busy={player.loading}
          >
            <Icon name={playing ? 'pause' : 'play'} size={19} />
          </button>
          <span
            className="miniplayer__progress"
            style={{
              transform: `scaleX(${clamp(player.position / (player.duration || track.duration), 0, 1)})`,
            }}
          />
        </div>

        {sheet.present && (
          <div
            className={cx('fullplayer', sheet.closing && 'is-closing')}
            style={{ ['--accent' as string]: track.hue }}
          >
            <div className="fullplayer__bg">
              <TrackArt artwork={track.albumArt} seed={track.id} hue={track.hue} />
            </div>
            <div className="fullplayer__inner">
              <header className="fullplayer__head">
                <button type="button" onClick={() => setExpanded(false)} aria-label="Close player">
                  <Icon name="chevron-down" size={22} />
                </button>
                <span className="mono">{player.source}</span>
                <button type="button" aria-label="More options">
                  <Icon name="more" size={20} />
                </button>
              </header>

              <div className="fullplayer__art">
                <TrackArt artwork={track.albumArt} seed={track.id} hue={track.hue} radius={14} />
              </div>

              <div className="fullplayer__meta">
                <div>
                  <h2 className="display display--2">{track.title}</h2>
                  <Link
                    to={`/artist/${artistIdFor(track.artist)}`}
                    className="fullplayer__artist"
                    onClick={() => setExpanded(false)}
                  >
                    {artist}
                  </Link>
                </div>
                <button
                  type="button"
                  className={cx('fullplayer__fav', fav && 'is-on')}
                  onClick={() => toggleFavorite(track.id)}
                  aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Icon name={fav ? 'heart-filled' : 'heart'} size={24} />
                </button>
              </div>

              <Seek />
              <Transport size="lg" />

              <p className="fullplayer__album mono">
                {track.album} · {track.artist} · {track.genres.join(' / ')}
              </p>
            </div>
          </div>
        )}
      </>
    )
  }

  /* ---------------- desktop ---------------- */
  return (
    <div className="player" style={{ ['--accent' as string]: track.hue }}>
      <div className="player__left">
        <span className="player__art">
          <TrackArt artwork={track.albumArt} seed={track.id} hue={track.hue} detail={false} />
        </span>
        <span className="player__text">
          <span className="player__title">{track.title}</span>
          <Link to={`/artist/${artistIdFor(track.artist)}`} className="player__artist">
            {artist}
          </Link>
        </span>
        <button
          type="button"
          className={cx('player__fav', fav && 'is-on')}
          onClick={() => toggleFavorite(track.id)}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Icon name={fav ? 'heart-filled' : 'heart'} size={17} />
        </button>
      </div>

      <div className="player__center">
        <Transport />
        <Seek />
      </div>

      <div className="player__right">
        <span className="player__source mono" title={player.source}>
          {player.source}
        </span>
        <Volume />
      </div>
    </div>
  )
}
