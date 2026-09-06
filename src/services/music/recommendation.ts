import { trackById, tracks } from '@/data/music/catalog'
import { isPlayable } from './playback'
import type { GeneratedPlaylist, MusicIntent, ScoredTrack, Track } from './types'

/**
 * Scoring, not shuffling.
 *
 * Every track in the catalogue is measured against the intent and the list is
 * the top of that ranking, so the same request always produces the same
 * playlist. Weights are declared once, below, and the reasons a track scored
 * are kept alongside it for the assistant to talk about.
 */

export const WEIGHTS = {
  mood: 25,
  activity: 20,
  feeling: 15,
  weather: 10,
  timeOfDay: 10,
  energy: 16,
  valence: 12,
  genre: 10,
  tag: 5,
  artist: 18,
  /** Subtracted when a request explicitly ruled something out. */
  avoided: 30,
} as const

/** 0 when the values are a hundred apart, `weight` when identical. */
function proximity(a: number, b: number, weight: number): number {
  return (1 - Math.abs(a - b) / 100) * weight
}

function overlap<T>(a: readonly T[], b: readonly T[]): number {
  if (!a.length || !b.length) return 0
  const shared = a.filter((x) => b.includes(x)).length
  return shared / Math.min(a.length, b.length)
}

export function scoreTrack(track: Track, intent: MusicIntent): ScoredTrack {
  let score = 0
  const reasons: string[] = []

  const moodHit = overlap(intent.moods, track.moods)
  if (moodHit) {
    score += moodHit * WEIGHTS.mood
    reasons.push(`mood: ${track.moods.filter((m) => intent.moods.includes(m)).join(', ')}`)
  }

  const activityHit = overlap(intent.activities, track.activities)
  if (activityHit) {
    score += activityHit * WEIGHTS.activity
    reasons.push(`for ${track.activities.filter((a) => intent.activities.includes(a)).join(', ')}`)
  }

  const feelingHit = overlap(intent.feelings, track.feelings)
  if (feelingHit) {
    score += feelingHit * WEIGHTS.feeling
    reasons.push(`gives ${track.feelings.filter((f) => intent.feelings.includes(f)).join(', ')}`)
  }

  const weatherHit = overlap(intent.weather, track.weather ?? [])
  if (weatherHit) {
    score += weatherHit * WEIGHTS.weather
    reasons.push(`suits ${intent.weather.join(', ')}`)
  }

  const timeHit = overlap(intent.timeOfDay, track.timeOfDay ?? [])
  if (timeHit) {
    score += timeHit * WEIGHTS.timeOfDay
    reasons.push(`fits the ${intent.timeOfDay.join('/')}`)
  }

  if (intent.energy !== undefined) {
    const near = proximity(track.energy, intent.energy, WEIGHTS.energy)
    score += near
    if (near > WEIGHTS.energy * 0.8) reasons.push('energy matches')
  }

  if (intent.valence !== undefined) {
    score += proximity(track.valence, intent.valence, WEIGHTS.valence)
  }

  if (intent.artists.length) {
    if (intent.artists.includes(track.artist)) {
      score += WEIGHTS.artist
      reasons.push(`by ${track.artist}`)
    } else if (
      // Adjacent: shares a genre with someone they named.
      tracks.some((t) => intent.artists.includes(t.artist) && t.genres.some((g) => track.genres.includes(g)))
    ) {
      score += WEIGHTS.artist * 0.3
    }
  }

  const genreHit = overlap(intent.genres, track.genres)
  if (genreHit) {
    score += genreHit * WEIGHTS.genre
    reasons.push(`genre: ${track.genres.filter((g) => intent.genres.includes(g)).join(', ')}`)
  }

  const words = intent.rawQuery
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
  const tagHit = overlap(
    words,
    (track.tags ?? []).flatMap((t) => t.split(' ')),
  )
  if (tagHit) score += tagHit * WEIGHTS.tag

  // Explicit exclusions outweigh any single positive signal, so "no techno"
  // really does mean no techno.
  if (intent.avoidMoods.some((m) => track.moods.includes(m))) {
    score -= WEIGHTS.avoided
    reasons.push('ruled out by mood')
  }
  if (intent.avoidGenres.some((g) => track.genres.includes(g))) {
    score -= WEIGHTS.avoided
    reasons.push('ruled out by genre')
  }

  return { track, score, reasons }
}

export interface RankOptions {
  limit?: number
  /** Cap on how many tracks one artist can take. */
  perArtist?: number
  exclude?: string[]
}

export function rankTracks(intent: MusicIntent, options: RankOptions = {}): ScoredTrack[] {
  const { limit = 12, perArtist = 3, exclude = [] } = options

  const ranked = tracks
    .filter((t) => isPlayable(t) && !exclude.includes(t.id))
    .map((t) => scoreTrack(t, intent))
    .sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title))

  const used = new Map<string, number>()
  const picked: ScoredTrack[] = []
  for (const candidate of ranked) {
    if (picked.length >= limit) break
    const count = used.get(candidate.track.artist) ?? 0
    if (count >= perArtist) continue
    used.set(candidate.track.artist, count + 1)
    picked.push(candidate)
  }
  return picked
}

/** Tracks that sit near a given one — used for "more like this". */
export function similarTo(trackId: string, limit = 8): Track[] {
  const seed = trackById[trackId]
  if (!seed) return []

  return tracks
    .filter((t) => t.id !== seed.id && isPlayable(t))
    .map((t) => ({
      track: t,
      distance:
        Math.abs(t.energy - seed.energy) / 100 +
        Math.abs(t.valence - seed.valence) / 100 +
        (1 - overlap(seed.moods, t.moods)) +
        (1 - overlap(seed.genres, t.genres)) * 0.8 +
        (1 - overlap(seed.activities, t.activities)) * 0.6,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.track)
}

/* ---------------- sequencing and naming ---------------- */

/** Order the list so it travels toward where the listener said they wanted to be. */
function sequence(picked: Track[], intent: MusicIntent): Track[] {
  if (picked.length < 3 || intent.energy === undefined) return picked
  const opening = picked[0]
  const rest = picked.slice(1)
  const climbing = intent.energy > opening.energy
  rest.sort((a, b) => (climbing ? a.energy - b.energy : b.energy - a.energy))
  return [opening, ...rest]
}

const TITLE_BANK: Record<string, string[]> = {
  calm: ['Level Ground', 'Nothing Pending', 'Soft Landing', 'Room Tone'],
  peaceful: ['Still Water', 'Wide Open', 'Clean Air', 'Long Exhale'],
  melancholic: ['Blue Hour', 'Low Tide', 'Grey Light', 'The Quiet Part'],
  lonely: ['One Set of Footsteps', 'Empty Streets', 'Nobody Awake', 'Small Hours'],
  nostalgic: ['That Summer', 'Faded Print', 'Old Rotation', 'Long Since'],
  focused: ['Deep Focus', 'Heads Down', 'Quietly Becoming', 'Page Count'],
  happy: ['Good Light', 'All Green', 'Up And Out', 'Bright Side Up'],
  uplifting: ['Lift Off', 'Open Windows', 'Better Than Yesterday', 'Full Volume'],
  energetic: ['Redline', 'No Brakes', 'Peak Hour', 'Full Send'],
  confident: ['Main Character', 'Camera On', 'Loud Walk', 'Front Row'],
  romantic: ['Close Range', 'Slow Burn', 'Low Lamp', 'Two Chairs'],
  dreamy: ['Half Asleep', 'Soft Focus', 'Weightless', 'Somewhere Blue'],
  dark: ['After Hours', 'Low Ceiling', 'Unlit', 'Deep End'],
  cinematic: ['Long Exposure', 'Wide Shot', 'Second Act', 'Establishing Shot'],
  hopeful: ['Morning Momentum', 'Coming Round', 'First Light', 'Green Light'],
}

const ACTIVITY_TITLES: Record<string, string[]> = {
  studying: ['Deep Focus', 'Quiet Hours', 'Second Coffee', 'Page Count'],
  coding: ['Flow State', 'Heads Down', 'Compile Time', 'Open Tab'],
  working: ['Do Not Disturb', 'Desk Weather', 'Focus Block', 'Heads Down'],
  'night drive': ['Midnight Drive', 'Empty Motorway', 'Headlights Only', 'Exit 14'],
  driving: ['Coast Road', 'Long Way Round', 'Night Mileage', 'Open Road'],
  walking: ['Pavement Hours', 'City On Foot', 'Long Way Home', 'Twelve Blocks'],
  gym: ['Last Three Reps', 'Heavy Day', 'Set Six', 'No Negotiation'],
  relaxing: ['Soft Sunday', 'Nothing Scheduled', 'Off Duty', 'Slow Afternoon'],
  sleeping: ['Lights Out', 'Wind Down', 'Small Hours', 'Slow Breathing'],
  reading: ['Chapter Nine', 'Armchair Weather', 'Paper Hours', 'Quiet Corner'],
  traveling: ['Window Seat', 'Somewhere New', 'Departure Board', 'In Transit'],
  cooking: ['Kitchen Radio', 'Low Heat', 'Sunday Sauce', 'Dinner For One'],
  gaming: ['One More Game', 'Late Queue', 'Third Lobby', 'Respawn'],
}

/** Deterministic pick, so the same request keeps the same name. */
function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length]
}

function hashIntent(intent: MusicIntent): number {
  const raw = [intent.rawQuery, ...intent.moods, ...intent.activities, ...intent.feelings, intent.energy ?? ''].join(
    '|',
  )
  let h = 2166136261
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function titleFor(intent: MusicIntent, seed: number): string {
  const activity = intent.activities[0]
  const activityNames = activity ? ACTIVITY_TITLES[activity] : undefined
  const moodNames = intent.moods[0] ? TITLE_BANK[intent.moods[0]] : undefined
  const rainy = intent.weather.includes('rain')

  if (rainy && activityNames) return `Rainy ${pick(activityNames, seed)}`
  if (activityNames && (!moodNames || seed % 5 > 1)) return pick(activityNames, seed)
  if (moodNames) return pick(moodNames, seed)
  return pick(['Right Now', 'Present Tense', 'This Hour', 'Unfiled'], seed)
}

function subtitleFor(intent: MusicIntent): string {
  const activity = intent.activities[0]
  const feeling = intent.feelings[0]
  const mood = intent.moods[0]
  if (activity && feeling) return `For ${activity}, on the way to ${feeling}`
  if (activity) return `Your soundtrack for ${activity}`
  if (mood && feeling) return `${mood} now, ${feeling} by the end`
  if (mood) return `Built around feeling ${mood}`
  return 'Built from what you told us'
}

function descriptionFor(picked: Track[], intent: MusicIntent): string {
  if (!picked.length) return 'Nothing in the catalogue matched that yet.'

  const counts = new Map<string, number>()
  picked.forEach((t) => t.genres.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)))
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g)

  const avgEnergy = Math.round(picked.reduce((s, t) => s + t.energy, 0) / picked.length)
  const drive = avgEnergy > 70 ? 'high and stays there' : avgEnergy < 35 ? 'low on purpose' : 'mid, with room to move'

  const opens = picked[0]
  const closes = picked[picked.length - 1]
  const arc =
    closes.energy - opens.energy > 15
      ? `It opens with ${opens.title} and climbs — ${closes.title} is louder than anything before it.`
      : opens.energy - closes.energy > 15
        ? `It opens with ${opens.title} and comes down slowly, closing on ${closes.title}.`
        : `It holds one temperature from ${opens.title} through to ${closes.title}.`

  const bits = [`${picked.length} tracks, mostly ${top.join(' and ')}.`, `Energy sits ${drive}.`, arc]
  if (intent.weather.includes('rain')) bits.push('Weighted toward the ones that suit rain.')
  if (intent.avoidGenres.length) bits.push(`Kept clear of ${intent.avoidGenres.join(' and ')}.`)
  return bits.join(' ')
}

export interface PlaylistOptions {
  size?: number
  exclude?: string[]
}

export function generatePlaylist(intent: MusicIntent, options: PlaylistOptions = {}): GeneratedPlaylist {
  const { size = 12, exclude } = options
  const ranked = rankTracks(intent, { limit: size, exclude })
  const ordered = sequence(
    ranked.map((r) => r.track),
    intent,
  )

  const seed = hashIntent(intent)
  const counts = new Map<string, number>()
  ordered.forEach((t) => t.genres.forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1)))

  return {
    id: `pl-${seed.toString(36)}-${Date.now().toString(36).slice(-4)}`,
    title: titleFor(intent, seed),
    subtitle: subtitleFor(intent),
    description: descriptionFor(ordered, intent),
    trackIds: ordered.map((t) => t.id),
    intent,
    hue: ordered[0]?.hue ?? '#FF6A45',
    energy: ordered.length ? Math.round(ordered.reduce((s, t) => s + t.energy, 0) / ordered.length) : 50,
    valence: ordered.length ? Math.round(ordered.reduce((s, t) => s + t.valence, 0) / ordered.length) : 50,
    genres: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g),
    createdAt: Date.now(),
  }
}

/** The lines shown while a playlist is being built. They reference real inputs. */
export function buildStages(intent: MusicIntent): string[] {
  const mood = intent.moods[0] ?? 'your mood'
  const activity = intent.activities[0] ?? 'the moment'
  const feeling = intent.feelings[0] ?? 'where you want to land'
  return [
    intent.rawQuery.trim() ? 'Reading what you wrote' : 'Reading your moment',
    `Placing ${mood} on the map`,
    `Weighing ${tracks.length} tracks against ${activity}`,
    `Finding the route to ${feeling}`,
    'Sequencing the set',
  ]
}
