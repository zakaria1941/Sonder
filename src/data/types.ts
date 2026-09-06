import type { Activity, Feeling, Mood, TimeOfDay, Weather } from '@/services/music/types'

/**
 * The interface's vocabulary.
 *
 * `Track` and the mood/feeling/activity unions live in services/music — they
 * are the domain. What is here is how those ideas are *presented*: the copy,
 * the photograph and the hue each one paints the interface with.
 */

export type { Track, Activity, Feeling, Mood, TimeOfDay, Weather } from '@/services/music/types'

export interface MoodCard {
  id: Mood
  name: string
  /** Accent hue this mood paints the interface with. */
  hue: string
  /** One line the interface can speak in. */
  blurb: string
  /** 0–100. How much drive the mood carries. */
  energy: number
  /** 0–100. Emotional brightness. */
  valence: number
  photo: string
  keywords: string[]
}

export interface ActivityCard {
  id: Activity
  name: string
  /** 0–100. Nudges the energy of anything generated for it. */
  energy: number
  photo: string
  keywords: string[]
}

export interface FeelingCard {
  id: Feeling
  name: string
  hue: string
  energy: number
  valence: number
  keywords: string[]
}

export interface Playlist {
  id: string
  title: string
  subtitle: string
  description: string
  coverPhoto: string
  hue: string
  moodId: Mood
  trackIds: string[]
  /** Present on playlists built for a specific moment. */
  moment?: Moment
  createdAt: number
  system?: boolean
  favorite?: boolean
}

export interface Collection {
  id: string
  title: string
  tagline: string
  description: string
  hue: string
  coverPhoto: string
  trackIds: string[]
  tags: string[]
}

/** The record of what was asked for, kept with a generated playlist. */
export interface Moment {
  moodId?: Mood
  feelingId?: Feeling
  activityId?: Activity
  genres: string[]
  weather: Weather[]
  timeOfDay: TimeOfDay[]
  /** 0–100 */
  energy: number
  note: string
}

export const ERAS = ['Any', '2020s', '2010s', '2000s', '90s', 'Classics'] as const
