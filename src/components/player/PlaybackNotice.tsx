import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui'
import { usePlayer } from '@/state/PlayerContext'
import { usePresence } from '@/hooks'
import { cx } from '@/lib/util'

/**
 * The one thing the player could not say before: that a track failed.
 * Sits above the transport, borrows the same tokens, and clears itself.
 */
export function PlaybackNotice() {
  const { error, dismissError } = usePlayer()
  const { present, closing } = usePresence(Boolean(error), 220)
  // Held separately so the text does not vanish mid fade-out.
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!error) return
    setMessage(error)
    const id = window.setTimeout(dismissError, 6000)
    return () => window.clearTimeout(id)
  }, [error, dismissError])

  if (!present) return null

  return (
    <div className={cx('notice', closing && 'is-closing')} role="status" aria-live="polite">
      <span className="notice__mark" aria-hidden="true">
        <Icon name="volume-off" size={15} />
      </span>
      <span className="notice__text">{message}</span>
      <button type="button" className="notice__close" onClick={dismissError} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}
