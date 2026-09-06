import type { Activity, ActivityCard, Feeling, FeelingCard } from './types'

/**
 * What you're doing shifts the energy target more than anything else — you
 * cannot run to a ballad — so these carry the strongest energy hints in the
 * whole vocabulary. All values are 0–100.
 */
export const activities: ActivityCard[] = [
  {
    id: 'studying',
    name: 'Studying',
    energy: 36,
    photo: '1524995997946-a1c2e315a42f',
    keywords: ['focus', 'exam', 'library', 'notes'],
  },
  {
    id: 'working',
    name: 'Working',
    energy: 46,
    photo: '1511379938547-c1f69419868d',
    keywords: ['deep work', 'deadline', 'office'],
  },
  {
    id: 'coding',
    name: 'Coding',
    energy: 46,
    photo: '1517430816045-df4b7de11d1d',
    keywords: ['flow', 'debugging', 'building'],
  },
  {
    id: 'driving',
    name: 'Driving',
    energy: 60,
    photo: '1449824913935-59a10b8d2000',
    keywords: ['highway', 'road', 'windows down'],
  },
  {
    id: 'night drive',
    name: 'Night drive',
    energy: 66,
    photo: '1493514789931-586cb221d7a7',
    keywords: ['midnight', 'empty roads', 'headlights'],
  },
  {
    id: 'walking',
    name: 'Walking',
    energy: 50,
    photo: '1517673132405-a56a62b18caf',
    keywords: ['city', 'headphones', 'streets', 'wander'],
  },
  {
    id: 'gym',
    name: 'Working out',
    energy: 90,
    photo: '1571019614242-c5c5dee9f50b',
    keywords: ['gym', 'lift', 'run', 'reps'],
  },
  {
    id: 'relaxing',
    name: 'Relaxing',
    energy: 26,
    photo: '1470071459604-3b5ec3a7fe05',
    keywords: ['unwind', 'sunday', 'nothing', 'slow'],
  },
  {
    id: 'sleeping',
    name: 'Falling asleep',
    energy: 10,
    photo: '1520206183501-b80df61043c2',
    keywords: ['bed', 'insomnia', 'wind down', 'dark'],
  },
  {
    id: 'reading',
    name: 'Reading',
    energy: 26,
    photo: '1481627834876-b7833e8f5570',
    keywords: ['book', 'quiet', 'rain', 'armchair'],
  },
  {
    id: 'traveling',
    name: 'Travelling',
    energy: 50,
    photo: '1488646953014-85cb44e25828',
    keywords: ['flight', 'train', 'window seat', 'somewhere new'],
  },
  {
    id: 'cooking',
    name: 'Cooking',
    energy: 55,
    photo: '1466637574441-749b8f19452f',
    keywords: ['kitchen', 'dinner', 'sunday'],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    energy: 70,
    photo: '1511512578047-dfb367046420',
    keywords: ['late night', 'grind', 'lobby'],
  },
]

export const activityById = Object.fromEntries(activities.map((a) => [a.id, a])) as Record<Activity, ActivityCard>

/** Where you want to end up — the destination, not the starting point. */
export const feelings: FeelingCard[] = [
  { id: 'peace', name: 'Peace', hue: '#7FA88C', energy: 20, valence: 64, keywords: ['settle', 'breathe', 'steady'] },
  {
    id: 'relaxation',
    name: 'Relaxation',
    hue: '#7FA88C',
    energy: 24,
    valence: 60,
    keywords: ['unwind', 'slow', 'off duty'],
  },
  { id: 'focus', name: 'Focus', hue: '#4FB6A5', energy: 42, valence: 54, keywords: ['locked in', 'clear', 'sharp'] },
  { id: 'comfort', name: 'Comfort', hue: '#D98E4A', energy: 32, valence: 56, keywords: ['warm', 'safe', 'held'] },
  {
    id: 'nostalgia',
    name: 'Nostalgia',
    hue: '#D98E4A',
    energy: 40,
    valence: 46,
    keywords: ['back then', 'remember', 'faded'],
  },
  {
    id: 'happiness',
    name: 'Happiness',
    hue: '#FFB03A',
    energy: 64,
    valence: 86,
    keywords: ['light', 'good', 'bright'],
  },
  { id: 'freedom', name: 'Freedom', hue: '#57C4E5', energy: 70, valence: 78, keywords: ['open', 'wide', 'gone'] },
  {
    id: 'adventure',
    name: 'Adventure',
    hue: '#57C4E5',
    energy: 64,
    valence: 60,
    keywords: ['explore', 'journey', 'somewhere new'],
  },
  {
    id: 'motivation',
    name: 'Motivation',
    hue: '#FF7A2F',
    energy: 88,
    valence: 68,
    keywords: ['fired up', 'ready', 'move'],
  },
  {
    id: 'confidence',
    name: 'Confidence',
    hue: '#C77DFF',
    energy: 80,
    valence: 72,
    keywords: ['untouchable', 'strut', 'won'],
  },
]

export const feelingById = Object.fromEntries(feelings.map((f) => [f.id, f])) as Record<Feeling, FeelingCard>

export const weatherOptions = [
  { id: 'rain', name: 'Rain' },
  { id: 'sunny', name: 'Sun' },
  { id: 'cloudy', name: 'Cloud' },
  { id: 'snow', name: 'Snow' },
  { id: 'storm', name: 'Storm' },
] as const

export const timeOptions = [
  { id: 'morning', name: 'Morning' },
  { id: 'afternoon', name: 'Afternoon' },
  { id: 'evening', name: 'Evening' },
  { id: 'night', name: 'Night' },
] as const
