import { moodById } from './moods'

export interface ProfileStat {
  label: string
  value: string
  hint: string
}

export const profile = {
  name: 'Zakaria',
  handle: '@zakaria',
  since: 'Listening since March 2024',
  /** What the product claims to have learned. Phrased as observation, not flattery. */
  read: 'You listen low and late. Most of your sessions start after 10pm and drop in energy from there.',
  topMoods: ['melancholic', 'calm', 'focused', 'cinematic'] as const,
  topGenres: [
    { name: 'Ambient', share: 0.28 },
    { name: 'Lo-fi', share: 0.22 },
    { name: 'Neo-classical', share: 0.18 },
    { name: 'Cinematic', share: 0.14 },
    { name: 'Synthwave', share: 0.11 },
    { name: 'Techno', share: 0.07 },
  ],
  topArtists: ['halcyon-field', 'aya-moreau', 'north-meridian', 'sable-and-pine', 'vera-lune', 'kite-season'],
  stats: [
    { label: 'Moments scored', value: '184', hint: 'playlists generated' },
    { label: 'Listening time', value: '412h', hint: 'past twelve months' },
    { label: 'Median start', value: '22:40', hint: 'when you press play' },
    { label: 'Average energy', value: '41', hint: 'lower than 78% of listeners' },
  ] satisfies ProfileStat[],
  /** Twelve months of listening, one value per month, 0-100 energy. */
  energyByMonth: [52, 48, 44, 50, 61, 68, 72, 64, 47, 38, 34, 41],
  recentMoments: [
    { at: 'Last night, 01:12', moodId: 'lonely', activity: 'Walking', playlistId: 'pl-after-hours' },
    { at: 'Thursday, 18:30', moodId: 'energetic', activity: 'Working out', playlistId: 'pl-last-three-reps' },
    { at: 'Tuesday, 09:05', moodId: 'focused', activity: 'Coding', playlistId: 'pl-flow-state' },
    { at: 'Sunday, 11:20', moodId: 'calm', activity: 'Relaxing', playlistId: 'pl-soft-sunday' },
  ],
}

export const profileMoodHue = moodById[profile.topMoods[0]].hue
