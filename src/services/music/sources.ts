import type { MusicSource } from './types'

/**
 * Where audio can come from.
 *
 * Registering a source rather than hard-coding URLs is what lets a future
 * provider — Jamendo, a licensed library, user uploads — be added without
 * touching the player or the recommender.
 */

export const sources: MusicSource[] = [
  {
    id: 'sonder-originals',
    name: 'Sonder Originals',
    type: 'local',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
]

export const sourceById: Record<string, MusicSource> = Object.fromEntries(sources.map((s) => [s.id, s]))

export function getSource(id: string): MusicSource | undefined {
  return sourceById[id]
}

/** Local audio needs no network permission and cannot be blocked by CORS. */
export function isLocal(id: string): boolean {
  return sourceById[id]?.type === 'local'
}
