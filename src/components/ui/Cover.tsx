import { useState } from 'react'
import { Art } from './Art'
import { cx, photo } from '@/lib/util'

/**
 * Photography, graded.
 *
 * Every image in the product runs through the same duotone — the photo
 * supplies luminance, the mood supplies the colour. That is what makes a
 * pile of unrelated stock shots look like one commissioned shoot. If a
 * photo fails to load, the generated sleeve takes its place rather than
 * leaving a hole.
 */

export interface CoverProps {
  photoId?: string
  hue: string
  seed: string
  alt?: string
  width?: number
  className?: string
  /** Strength of the colour grade, 0..1. Lower keeps more of the photo. */
  grade?: number
  /** Adds a bottom-up scrim so text sits legibly on top. */
  scrim?: boolean
  eager?: boolean
}

export function Cover({
  photoId,
  hue,
  seed,
  alt = '',
  width = 800,
  className,
  grade = 0.72,
  scrim = false,
  eager = false,
}: CoverProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(photoId ? 'loading' : 'failed')

  return (
    <div
      className={cx('cover', scrim && 'cover--scrim', state === 'ready' && 'is-ready', className)}
      style={{ ['--cover-hue' as string]: hue, ['--cover-grade' as string]: grade }}
    >
      <div className="cover__base">
        <Art seed={seed} hue={hue} detail={false} />
      </div>

      {photoId && state !== 'failed' && (
        <img
          className="cover__img"
          src={photo(photoId, width)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
        />
      )}

      <span className="cover__wash" aria-hidden="true" />
    </div>
  )
}
