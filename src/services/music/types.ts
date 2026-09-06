/**
 * The music domain.
 *
 * One rule governs everything here: what the interface says is what plays.
 * A Track's title, artist and duration describe the file at `audioUrl` and
 * nothing else, so there is no way for the catalogue to drift from the audio.
 */

export type Mood =
  | 'calm'
  | 'melancholic'
  | 'nostalgic'
  | 'happy'
  | 'dreamy'
  | 'romantic'
  | 'focused'
  | 'energetic'
  | 'peaceful'
  | 'confident'
  | 'lonely'
  | 'hopeful'
  | 'dark'
  | 'cinematic'
  | 'uplifting'

export type Feeling =
  | 'comfort'
  | 'motivation'
  | 'freedom'
  | 'nostalgia'
  | 'peace'
  | 'confidence'
  | 'focus'
  | 'relaxation'
  | 'adventure'
  | 'happiness'

export type Activity =
  | 'studying'
  | 'working'
  | 'coding'
  | 'driving'
  | 'night drive'
  | 'walking'
  | 'gym'
  | 'relaxing'
  | 'sleeping'
  | 'reading'
  | 'traveling'
  | 'cooking'
  | 'gaming'

export type Weather = 'rain' | 'sunny' | 'cloudy' | 'snow' | 'storm'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/** Where a track's audio comes from. Local files are the reliable path. */
export type SourceKind = 'local' | 'external'

export interface MusicSource {
  id: string
  name: string
  type: SourceKind
  /** Shown wherever the catalogue is credited. */
  license?: string
  licenseUrl?: string
}

export interface Track {
  id: string

  title: string
  artist: string

  album?: string
  /** Absolute or root-relative image. Omit to use the generated sleeve. */
  albumArt?: string

  audioUrl: string

  /** Seconds. Always the real length of the file at `audioUrl`. */
  duration: number

  genre?: string
  genres: string[]

  moods: Mood[]
  activities: Activity[]
  feelings: Feeling[]

  /** 0–100. How much drive the track carries. */
  energy: number
  /** 0–100. Emotional brightness: low is heavy, high is bright. */
  valence: number

  weather?: Weather[]
  timeOfDay?: TimeOfDay[]

  tags?: string[]
  description?: string

  source: SourceKind
  /** Which entry in the source registry this came from. */
  sourceId: string

  license?: string
  licenseUrl?: string
  attribution?: string
  attributionUrl?: string

  isExplicit?: boolean

  /** Accent the interface paints itself with while this track is in play. */
  hue: string
}

/* ------------------------------------------------------------------ intent */

/** What the listener asked for, once it has been read. */
export interface MusicIntent {
  rawQuery: string
  moods: Mood[]
  feelings: Feeling[]
  activities: Activity[]
  genres: string[]
  weather: Weather[]
  timeOfDay: TimeOfDay[]
  /** 0–100 targets, when the request implied one. */
  energy?: number
  valence?: number
  /** Artists named explicitly. */
  artists: string[]
  /** Read out of the "but not…" half of a request. */
  avoidMoods: Mood[]
  avoidGenres: string[]
  /** How much of the request we actually understood, 0–1. */
  confidence: number
  /** What was understood, in plain language. */
  read: string
}

/* --------------------------------------------------------------- playlists */

export interface ScoredTrack {
  track: Track
  score: number
  /** Which criteria contributed, for debugging and for the assistant. */
  reasons: string[]
}

export interface GeneratedPlaylist {
  id: string
  title: string
  subtitle: string
  description: string
  trackIds: string[]
  intent: MusicIntent
  hue: string
  energy: number
  valence: number
  genres: string[]
  createdAt: number
}

/* ------------------------------------------------------------ vocabularies */

export const MOODS: Mood[] = [
  'calm',
  'melancholic',
  'nostalgic',
  'happy',
  'dreamy',
  'romantic',
  'focused',
  'energetic',
  'peaceful',
  'confident',
  'lonely',
  'hopeful',
  'dark',
  'cinematic',
  'uplifting',
]

export const FEELINGS: Feeling[] = [
  'comfort',
  'motivation',
  'freedom',
  'nostalgia',
  'peace',
  'confidence',
  'focus',
  'relaxation',
  'adventure',
  'happiness',
]

export const ACTIVITIES: Activity[] = [
  'studying',
  'working',
  'coding',
  'driving',
  'night drive',
  'walking',
  'gym',
  'relaxing',
  'sleeping',
  'reading',
  'traveling',
  'cooking',
  'gaming',
]

export const WEATHER: Weather[] = ['rain', 'sunny', 'cloudy', 'snow', 'storm']

export const TIMES_OF_DAY: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night']
