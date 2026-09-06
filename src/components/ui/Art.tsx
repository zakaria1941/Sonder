import { useMemo } from 'react'
import { hash, seeded } from '@/lib/util'
import { cx } from '@/lib/util'

/**
 * Generated cover art.
 *
 * Sixty tracks with sixty unrelated stock photos would look like a
 * scraped database. Every sleeve here is built from the same three
 * parts — a graded field, one circular form, and a row of signal bars —
 * so the catalogue reads as one label's output. The seed is the track
 * id, so a sleeve never changes between reloads.
 */

export interface ArtProps {
  seed: string
  hue: string
  size?: number | string
  className?: string
  /** Adds the label ring and bars. Off for very small sizes. */
  detail?: boolean
  radius?: number
}

export function Art({ seed, hue, size = '100%', className, detail = true, radius = 0 }: ArtProps) {
  const geom = useMemo(() => {
    const rand = seeded(hash(seed))
    const angle = Math.round(rand() * 360)
    const cx0 = 28 + rand() * 44
    const cy0 = 24 + rand() * 40
    const r0 = 18 + rand() * 20
    const arcRotation = Math.round(rand() * 360)
    const bars = Array.from({ length: 9 }, () => 0.18 + rand() * 0.82)
    const offsetY = 62 + rand() * 14
    const eclipse = rand() > 0.45
    const ringWidth = 0.8 + rand() * 1.6
    return { angle, cx0, cy0, r0, arcRotation, bars, offsetY, eclipse, ringWidth }
  }, [seed])

  const id = `a${hash(seed).toString(36)}`

  return (
    <svg
      className={cx('art', className)}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Generated cover art"
      preserveAspectRatio="xMidYMid slice"
      style={{ borderRadius: radius || undefined }}
    >
      <defs>
        <linearGradient id={`${id}-bg`} gradientTransform={`rotate(${geom.angle} 0.5 0.5)`}>
          <stop offset="0%" stopColor={hue} stopOpacity="0.72" />
          <stop offset="52%" stopColor="#0b0d16" stopOpacity="1" />
          <stop offset="100%" stopColor="#04050a" stopOpacity="1" />
        </linearGradient>
        <radialGradient id={`${id}-orb`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={hue} stopOpacity="0.95" />
          <stop offset="62%" stopColor={hue} stopOpacity="0.32" />
          <stop offset="100%" stopColor={hue} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="100" height="100" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        <rect width="100" height="100" fill={`url(#${id}-bg)`} />
        <circle cx={geom.cx0} cy={geom.cy0} r={geom.r0} fill={`url(#${id}-orb)`} />

        {detail && (
          <>
            {/* The label ring — a nod to the centre of a record. */}
            <circle
              cx={geom.cx0}
              cy={geom.cy0}
              r={geom.r0 * 0.62}
              fill="none"
              stroke={geom.eclipse ? '#efebe3' : hue}
              strokeOpacity={geom.eclipse ? 0.34 : 0.7}
              strokeWidth={geom.ringWidth}
            />
            {/* Signal bars — the same shape the player draws. */}
            <g transform={`translate(12 ${geom.offsetY})`}>
              {geom.bars.map((v, i) => (
                <rect
                  key={i}
                  x={i * 8.4}
                  y={-v * 13}
                  width="2.4"
                  height={v * 26}
                  rx="1.2"
                  fill="#efebe3"
                  opacity={0.16 + v * 0.42}
                />
              ))}
            </g>
          </>
        )}
      </g>
    </svg>
  )
}
