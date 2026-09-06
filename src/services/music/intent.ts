import { genres as catalogGenres } from '@/data/music/catalog'
import type { Activity, Feeling, Mood, MusicIntent, TimeOfDay, Weather } from './types'

/**
 * Reading a sentence into a MusicIntent.
 *
 * The point is to understand the *feeling*, not to match the word. "I feel
 * lonely but I want something comforting" is not a request for lonely music;
 * it is melancholy asking for comfort, and the two pull the target in
 * different directions. Clusters carry that meaning, and a negation pass
 * catches the "but not…" half that would otherwise invert the result.
 *
 * Entirely local — no API call is needed for any of this. `readIntent` is the
 * seam a language model would slot into later: same input, same output shape.
 */

interface Signal {
  moods?: Mood[]
  feelings?: Feeling[]
  activities?: Activity[]
  genres?: string[]
  weather?: Weather[]
  timeOfDay?: TimeOfDay[]
  /** 0–100 targets. */
  energy?: number
  valence?: number
}

interface Phrase extends Signal {
  match: string[]
}

/* ---------------- how a feeling is described ---------------- */

const FEELING_CLUSTERS: Phrase[] = [
  {
    match: [
      'peaceful',
      'calm',
      'calming',
      'relaxed',
      'relaxing',
      'chill',
      'chilled',
      'mellow',
      'serene',
      'soothing',
      'unwind',
      'quiet',
      'still',
    ],
    moods: ['calm', 'peaceful'],
    feelings: ['peace', 'relaxation'],
    energy: 22,
    valence: 55,
  },
  {
    match: [
      'sad',
      'lonely',
      'alone',
      'heartbroken',
      'heartbreak',
      'melancholic',
      'melancholy',
      'blue',
      'down',
      'low',
      'crying',
      'grief',
      'empty',
      'miss someone',
      'in my feelings',
    ],
    moods: ['melancholic', 'lonely'],
    feelings: ['comfort'],
    energy: 26,
    valence: 22,
  },
  {
    match: [
      'motivated',
      'motivation',
      'powerful',
      'energetic',
      'energy',
      'pumped',
      'hyped',
      'fired up',
      'ready to work',
      'strong',
      'unstoppable',
      'go hard',
      'push',
    ],
    moods: ['energetic', 'confident'],
    feelings: ['motivation', 'confidence'],
    energy: 88,
    valence: 62,
  },
  {
    match: ['confident', 'confidence', 'main character', 'untouchable', 'swagger'],
    moods: ['confident'],
    feelings: ['confidence'],
    energy: 78,
    valence: 68,
  },
  {
    match: [
      'nostalgic',
      'nostalgia',
      'memories',
      'old times',
      'miss the past',
      'back then',
      'remember when',
      'throwback',
      'homesick',
    ],
    moods: ['nostalgic'],
    feelings: ['nostalgia'],
    energy: 40,
    valence: 45,
  },
  {
    match: [
      'focus',
      'focused',
      'concentrate',
      'concentration',
      'deep work',
      'locked in',
      'productive',
      'get things done',
      'flow',
    ],
    moods: ['focused'],
    feelings: ['focus'],
    energy: 42,
    valence: 52,
  },
  {
    match: ['happy', 'happiness', 'good mood', 'joyful', 'cheerful', 'upbeat', 'feel good', 'bright'],
    moods: ['happy', 'uplifting'],
    feelings: ['happiness'],
    energy: 62,
    valence: 84,
  },
  {
    match: ['hopeful', 'optimistic', 'looking up', 'better days', 'hope'],
    moods: ['hopeful'],
    feelings: ['happiness'],
    valence: 72,
  },
  {
    match: ['dreamy', 'floaty', 'ethereal', 'hazy', 'drifting', 'weightless', 'washed out'],
    moods: ['dreamy'],
    valence: 55,
  },
  {
    match: ['romantic', 'in love', 'date night', 'crush', 'intimate', 'someone special'],
    moods: ['romantic'],
    feelings: ['comfort'],
    valence: 70,
    energy: 45,
  },
  {
    match: ['dark', 'darker', 'moody', 'brooding', 'ominous', 'sinister', 'heavy', 'depressing', 'bleak'],
    moods: ['dark'],
    valence: 24,
  },
  {
    match: ['cinematic', 'epic', 'filmic', 'atmospheric', 'widescreen', 'like a movie', 'soundtrack'],
    moods: ['cinematic'],
  },
  {
    match: ['comfort', 'comforting', 'cosy', 'cozy', 'warm', 'safe', 'held', 'gentle'],
    feelings: ['comfort'],
    valence: 55,
  },
  {
    match: ['free', 'freedom', 'open road', 'escape', 'get away', 'wide open'],
    moods: ['uplifting'],
    feelings: ['freedom'],
    valence: 72,
    energy: 68,
  },
  {
    match: ['adventure', 'explore', 'exploring', 'journey', 'somewhere new', 'wander'],
    feelings: ['adventure'],
    energy: 60,
  },
]

/* ---------------- what you are doing ---------------- */

const ACTIVITY_PHRASES: Phrase[] = [
  {
    match: ['night drive', 'late night drive', 'driving at night', 'drive at night', 'midnight drive'],
    activities: ['night drive'],
    energy: 66,
    timeOfDay: ['night'],
  },
  {
    match: ['studying', 'study', 'exam', 'revision', 'homework', 'coursework'],
    activities: ['studying'],
    energy: 36,
    feelings: ['focus'],
  },
  {
    match: ['coding', 'programming', 'debugging', 'writing code', 'building something'],
    activities: ['coding'],
    energy: 46,
    feelings: ['focus'],
  },
  {
    match: ['working', 'work', 'at my desk', 'deadline', 'office', 'deep work'],
    activities: ['working'],
    energy: 46,
    feelings: ['focus'],
  },
  {
    match: ['gym', 'workout', 'work out', 'working out', 'lifting', 'running', 'training', 'exercise', 'treadmill'],
    activities: ['gym'],
    energy: 90,
    feelings: ['motivation'],
  },
  {
    match: ['driving', 'drive', 'highway', 'motorway', 'road trip', 'in the car', 'commute'],
    activities: ['driving'],
    energy: 60,
  },
  { match: ['walking', 'walk', 'stroll', 'on foot', 'wandering'], activities: ['walking'], energy: 50 },
  { match: ['relaxing', 'unwinding', 'doing nothing', 'lounging', 'lazy'], activities: ['relaxing'], energy: 26 },
  {
    match: ['sleeping', 'sleep', 'falling asleep', 'insomnia', 'in bed', 'wind down', 'bedtime'],
    activities: ['sleeping'],
    energy: 10,
  },
  { match: ['reading', 'read', 'with a book', 'novel'], activities: ['reading'], energy: 26 },
  {
    match: ['traveling', 'travelling', 'flight', 'flying', 'train', 'airport', 'window seat'],
    activities: ['traveling'],
    energy: 50,
  },
  { match: ['cooking', 'making dinner', 'in the kitchen', 'baking'], activities: ['cooking'], energy: 55 },
  { match: ['gaming', 'playing games', 'ranked', 'grinding'], activities: ['gaming'], energy: 70 },
]

/* ---------------- the world outside ---------------- */

const WEATHER_PHRASES: Phrase[] = [
  { match: ['raining', 'rainy', 'rain', 'drizzle', 'downpour', 'wet outside'], weather: ['rain'] },
  { match: ['thunder', 'storm', 'stormy', 'lightning'], weather: ['storm'] },
  { match: ['snowing', 'snowy', 'snow'], weather: ['snow'] },
  { match: ['sunny', 'sunshine', 'clear skies', 'blue sky', 'bright out'], weather: ['sunny'] },
  { match: ['cloudy', 'overcast', 'grey day', 'gray day', 'grey outside'], weather: ['cloudy'] },
]

const TIME_PHRASES: Phrase[] = [
  {
    match: ['late night', 'midnight', '2am', '3am', '1am', 'small hours', 'after dark', 'at night', 'tonight', 'night'],
    timeOfDay: ['night'],
  },
  { match: ['morning', 'sunrise', 'dawn', 'early'], timeOfDay: ['morning'] },
  { match: ['afternoon', 'midday', 'lunchtime'], timeOfDay: ['afternoon'] },
  { match: ['evening', 'sunset', 'dusk', 'golden hour'], timeOfDay: ['evening'] },
]

const GENRE_SYNONYMS: Record<string, string> = {
  lofi: 'Lo-fi',
  'lo fi': 'Lo-fi',
  'lo-fi': 'Lo-fi',
  ambient: 'Ambient',
  drone: 'Ambient',
  techno: 'Techno',
  house: 'House',
  synthwave: 'Synthwave',
  retrowave: 'Synthwave',
  'dream pop': 'Dream Pop',
  shoegaze: 'Dream Pop',
  classical: 'Neo-classical',
  'neo-classical': 'Neo-classical',
  neoclassical: 'Neo-classical',
  piano: 'Neo-classical',
  electronic: 'Electronic',
  electronica: 'Electronic',
  cinematic: 'Cinematic',
  soundtrack: 'Cinematic',
}

/* ---------------- negation ---------------- */

/** Everything after one of these, up to the next clause break, is a "not that". */
const NEGATORS = [
  "don't want",
  'dont want',
  'do not want',
  "doesn't have to be",
  'not too',
  'nothing too',
  'nothing',
  'no more',
  'without',
  'avoid',
  'less ',
  'but not',
  'except',
  'rather not',
]

const CLAUSE_BREAK = /[,.;]|\band\b|\bbut\b/

function splitPolarity(text: string): { positive: string; negative: string } {
  let positive = text
  let negative = ''

  for (const marker of NEGATORS) {
    let from = positive.indexOf(marker)
    while (from !== -1) {
      const after = positive.slice(from + marker.length)
      const breakAt = after.search(CLAUSE_BREAK)
      const span = breakAt === -1 ? after : after.slice(0, breakAt)
      negative += ` ${span}`
      positive = positive.slice(0, from) + ' ' + (breakAt === -1 ? '' : after.slice(breakAt))
      from = positive.indexOf(marker)
    }
  }

  return { positive, negative }
}

/* ---------------- reading ---------------- */

function hits(text: string, phrases: Phrase[]): Phrase[] {
  const padded = ` ${text} `
  return phrases.filter((p) => p.match.some((m) => padded.includes(` ${m}`)))
}

function findGenres(text: string): string[] {
  const found = new Set<string>()
  for (const [needle, genre] of Object.entries(GENRE_SYNONYMS)) {
    if (text.includes(needle)) found.add(genre)
  }
  for (const genre of catalogGenres) {
    if (text.includes(genre.toLowerCase())) found.add(genre)
  }
  return [...found]
}

export function currentTimeOfDay(now = new Date()): TimeOfDay {
  const hour = now.getHours()
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export interface ReadOptions {
  /** Defaults to the wall clock, so "right now" means something. */
  now?: Date
  /** Skip inferring the time of day when the caller already knows it. */
  inferTimeOfDay?: boolean
}

export function readIntent(rawQuery: string, options: ReadOptions = {}): MusicIntent {
  const text = rawQuery.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
  const { positive, negative } = splitPolarity(text)

  const collected = [
    ...hits(positive, FEELING_CLUSTERS),
    ...hits(positive, ACTIVITY_PHRASES),
    ...hits(positive, WEATHER_PHRASES),
    ...hits(positive, TIME_PHRASES),
  ]
  const rejected = [...hits(negative, FEELING_CLUSTERS), ...hits(negative, ACTIVITY_PHRASES)]

  const moods = unique(collected.flatMap((p) => p.moods ?? []))
  const feelings = unique(collected.flatMap((p) => p.feelings ?? []))
  let activities = unique(collected.flatMap((p) => p.activities ?? []))
  // "late night drive" matches the generic phrase too; the specific one wins,
  // otherwise the broader activity drags in tracks tagged for plain driving.
  if (activities.includes('night drive')) activities = activities.filter((a) => a !== 'driving')
  const weather = unique(collected.flatMap((p) => p.weather ?? []))
  let timeOfDay = unique(collected.flatMap((p) => p.timeOfDay ?? []))

  const avoidMoods = unique(rejected.flatMap((p) => p.moods ?? [])).filter((m) => !moods.includes(m))
  const avoidGenres = findGenres(negative)
  const wantedGenres = findGenres(positive).filter((g) => !avoidGenres.includes(g))

  // An activity sets the pace more reliably than a mood does — you cannot run
  // to a ballad — so it takes precedence when both have an opinion.
  const activityEnergy = average(
    collected
      .filter((p) => p.activities?.length)
      .map((p) => p.energy!)
      .filter(Boolean),
  )
  const feelingEnergy = average(
    collected
      .filter((p) => !p.activities?.length)
      .map((p) => p.energy!)
      .filter(Boolean),
  )
  let energy = activityEnergy ?? feelingEnergy
  let valence = average(collected.map((p) => p.valence!).filter((v) => v !== undefined))

  // "sad but nothing depressing" — keep the mood, lift the target.
  const rejectedValence = average(rejected.map((p) => p.valence!).filter((v) => v !== undefined))
  if (rejectedValence !== undefined) {
    valence = Math.min(100, Math.max(valence ?? 50, rejectedValence + 30))
  }
  const rejectedEnergy = average(rejected.map((p) => p.energy!).filter(Boolean))
  if (rejectedEnergy !== undefined && energy !== undefined && Math.abs(energy - rejectedEnergy) < 20) {
    energy = rejectedEnergy > 50 ? Math.max(10, rejectedEnergy - 35) : Math.min(95, rejectedEnergy + 35)
  }

  if (!timeOfDay.length && options.inferTimeOfDay !== false) {
    timeOfDay = [currentTimeOfDay(options.now)]
  }

  const signals = moods.length + feelings.length + activities.length + weather.length + wantedGenres.length
  const confidence = Math.min(0.97, 0.35 + signals * 0.12)

  return {
    rawQuery,
    moods,
    feelings,
    activities,
    genres: wantedGenres,
    weather,
    timeOfDay,
    energy,
    valence,
    artists: [],
    avoidMoods,
    avoidGenres,
    confidence,
    read: describeIntent({ moods, feelings, activities, weather, energy, avoidMoods, avoidGenres }),
  }
}

function describeIntent(parts: {
  moods: Mood[]
  feelings: Feeling[]
  activities: Activity[]
  weather: Weather[]
  energy?: number
  avoidMoods: Mood[]
  avoidGenres: string[]
}): string {
  const said: string[] = []
  if (parts.moods.length) said.push(`feeling ${parts.moods.slice(0, 2).join(' and ')}`)
  if (parts.activities.length) said.push(parts.activities[0])
  if (parts.feelings.length) said.push(`wants ${parts.feelings[0]}`)
  if (parts.weather.length) said.push(parts.weather[0])
  if (parts.avoidMoods.length) said.push(`not ${parts.avoidMoods[0]}`)
  if (parts.avoidGenres.length) said.push(`no ${parts.avoidGenres[0]}`)

  if (!said.length) return 'Not much to go on, so this leans on the catalogue as a whole.'
  const drive = parts.energy === undefined ? 'mid' : parts.energy > 70 ? 'high' : parts.energy < 35 ? 'low' : 'mid'
  return `Read: ${said.join(', ')}. Targeting ${drive} energy.`
}

/** Build an intent from the structured pickers rather than a sentence. */
export function intentFromSelection(selection: {
  moods?: Mood[]
  feelings?: Feeling[]
  activities?: Activity[]
  genres?: string[]
  artists?: string[]
  weather?: Weather[]
  timeOfDay?: TimeOfDay[]
  energy?: number
  note?: string
  now?: Date
}): MusicIntent {
  const fromText = selection.note?.trim() ? readIntent(selection.note, { now: selection.now }) : null

  const moods = unique([...(selection.moods ?? []), ...(fromText?.moods ?? [])])
  const feelings = unique([...(selection.feelings ?? []), ...(fromText?.feelings ?? [])])
  const activities = unique([...(selection.activities ?? []), ...(fromText?.activities ?? [])])
  const genres = unique([...(selection.genres ?? []), ...(fromText?.genres ?? [])])
  const weather = unique([...(selection.weather ?? []), ...(fromText?.weather ?? [])])
  const timeOfDay = unique([
    ...(selection.timeOfDay ?? []),
    ...(fromText?.timeOfDay ?? []),
    ...(selection.timeOfDay?.length || fromText?.timeOfDay?.length ? [] : [currentTimeOfDay(selection.now)]),
  ])

  const energy = selection.energy ?? fromText?.energy
  const valence = fromText?.valence

  return {
    rawQuery: selection.note ?? '',
    moods,
    feelings,
    activities,
    genres,
    weather,
    timeOfDay,
    energy,
    valence,
    artists: unique([...(selection.artists ?? []), ...(fromText?.artists ?? [])]),
    avoidMoods: fromText?.avoidMoods ?? [],
    avoidGenres: fromText?.avoidGenres ?? [],
    confidence:
      fromText?.confidence ?? Math.min(0.95, 0.35 + (moods.length + activities.length + feelings.length) * 0.15),
    read:
      fromText?.read ??
      describeIntent({ moods, feelings, activities, weather, energy, avoidMoods: [], avoidGenres: [] }),
  }
}
