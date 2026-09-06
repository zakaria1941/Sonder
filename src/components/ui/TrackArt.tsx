import { useState } from 'react'
import { Art } from './Art'

/**
 * A track's own artwork when the record carries one, the generated sleeve
 * otherwise. The fallback is seeded off the track id, so a sleeve always
 * belongs to its track and never changes between reloads.
 */
export function TrackArt({
  artwork,
  seed,
  hue,
  detail = true,
  radius = 0,
}: {
  artwork?: string | null
  seed: string
  hue: string
  detail?: boolean
  radius?: number
}) {
  const [failed, setFailed] = useState(false)

  if (!artwork || failed) return <Art seed={seed} hue={hue} detail={detail} radius={radius} />

  return (
    <img
      className="trackart"
      src={artwork}
      alt=""
      loading="lazy"
      decoding="async"
      style={{ borderRadius: radius || undefined }}
      onError={() => setFailed(true)}
    />
  )
}
