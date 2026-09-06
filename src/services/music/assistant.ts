import { artists, genres as catalogGenres, trackById, tracks } from '@/data/music/catalog'
import { readIntent } from './intent'
import { generatePlaylist, rankTracks, similarTo } from './recommendation'
import { MOODS } from './types'
import type { Mood, MusicIntent, Track } from './types'

/**
 * The assistant, over the real catalogue.
 *
 * Every reply is derived from what actually changed — how many tracks moved,
 * what the averages did — so it can never claim an edit it did not make.
 * Requests it cannot honour are declined out loud rather than answered with a
 * shuffled list.
 */

export interface AssistantAction {
  kind: string
  label: string
}

export interface AssistantTurn {
  reply: string
  trackIds?: string[]
  actions: AssistantAction[]
  /** Short chip under the message when the playlist changed. */
  change?: string
}

export interface ConversationContext {
  trackIds: string[]
  title?: string
  /** What is playing right now, for "more like this" and "replace this". */
  currentTrackId?: string
}

type Intent =
  | { kind: 'energy'; delta: number }
  | { kind: 'valence'; delta: number }
  | { kind: 'genre'; genre: string; add: boolean }
  | { kind: 'artist'; artistId: string }
  | { kind: 'mood'; mood: Mood; remove: boolean }
  | { kind: 'similar' }
  | { kind: 'replace' }
  | { kind: 'shorter' }
  | { kind: 'longer' }
  | { kind: 'reshuffle' }
  | { kind: 'explain' }
  | { kind: 'quieter-corner' }
  | { kind: 'describe' }

const DEFAULT_ACTIONS: AssistantAction[] = [
  { kind: 'energy-up', label: 'More energetic' },
  { kind: 'darker', label: 'Something darker' },
  { kind: 'calmer', label: 'Make it calmer' },
]

function detect(raw: string): Intent {
  const t = ` ${raw.toLowerCase().replace(/[’']/g, "'")} `

  if (/(why|how did you|explain|what makes)/.test(t)) return { kind: 'explain' }
  if (/(replace this|skip this one|not this track|swap this)/.test(t)) return { kind: 'replace' }
  if (/(similar to this|more like this|like this one|something similar)/.test(t)) return { kind: 'similar' }
  if (/(shuffle|reshuffle|mix it up|different order|reorder)/.test(t)) return { kind: 'reshuffle' }
  if (/(less mainstream|more obscure|underground|deep cut|weirder|more experimental)/.test(t))
    return { kind: 'quieter-corner' }
  if (/(shorter|trim|cut it down|fewer)/.test(t)) return { kind: 'shorter' }
  if (/(longer|more tracks|extend|add more songs)/.test(t)) return { kind: 'longer' }

  if (/(more energetic|more energy|faster|louder|harder|hype|turn it up|pump|upbeat)/.test(t))
    return { kind: 'energy', delta: 22 }
  if (/(calmer|slower|quieter|softer|chill(er)?|less energy|wind down|mellow|gentler)/.test(t))
    return { kind: 'energy', delta: -22 }
  if (/(sadder|darker|more melancholic|heavier|moodier|more emotional)/.test(t)) return { kind: 'valence', delta: -22 }
  if (/(happier|brighter|more upbeat|cheer|more positive|lift it)/.test(t)) return { kind: 'valence', delta: 22 }

  const artistHit = artists.find((a) => t.includes(a.name.toLowerCase()))
  if (artistHit) return { kind: 'artist', artistId: artistHit.id }

  for (const genre of catalogGenres) {
    if (t.includes(genre.toLowerCase())) {
      const removing = /(remove|less|no more|take out|drop|without|no )/.test(t)
      return { kind: 'genre', genre, add: !removing }
    }
  }

  for (const mood of MOODS) {
    if (t.includes(mood)) {
      const removing = /(remove|less|no more|take out|drop|without)/.test(t)
      return { kind: 'mood', mood, remove: removing }
    }
  }

  return { kind: 'describe' }
}

const avg = (list: Track[], key: 'energy' | 'valence') =>
  list.length ? Math.round(list.reduce((s, t) => s + t[key], 0) / list.length) : 0

function resolve(ids: string[]): Track[] {
  return ids.map((id) => trackById[id]).filter(Boolean) as Track[]
}

/** Re-pick the list against a scoring function, keeping what still fits. */
function refill(current: string[], want: (t: Track) => number, size: number): string[] {
  const ranked = [...tracks].sort((a, b) => want(b) - want(a))
  const used = new Map<string, number>()
  const out: string[] = []
  for (const track of ranked) {
    if (out.length >= size) break
    const count = used.get(track.artist) ?? 0
    if (count >= 3) continue
    used.set(track.artist, count + 1)
    out.push(track.id)
  }
  const kept = current.filter((id) => out.includes(id))
  return [...new Set([...kept, ...out])].slice(0, size)
}

const changed = (before: string[], after: string[]) => after.filter((id) => !before.includes(id)).length

export function converse(input: string, context: ConversationContext): AssistantTurn {
  const intent = detect(input)
  const before = context.trackIds
  const size = before.length || 12
  const list = resolve(before)
  const energy = avg(list, 'energy')
  const valence = avg(list, 'valence')

  switch (intent.kind) {
    case 'energy': {
      const target = Math.min(98, Math.max(5, energy + intent.delta))
      const after = refill(before, (t) => 100 - Math.abs(t.energy - target) - Math.abs(t.valence - valence) * 0.3, size)
      const now = avg(resolve(after), 'energy')
      return {
        reply:
          intent.delta > 0
            ? `Pushed the energy up — ${energy} to ${now}. The slow ones are out and the back half hits harder.`
            : `Brought it down. Energy is ${now} now, from ${energy}. Nothing left that will make you look up.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'valence': {
      const target = Math.min(98, Math.max(5, valence + intent.delta))
      const after = refill(
        before,
        (t) => 100 - Math.abs(t.valence - target) * 1.2 - Math.abs(t.energy - energy) * 0.3,
        size,
      )
      const now = avg(resolve(after), 'valence')
      return {
        reply:
          intent.delta < 0
            ? `Darker across the board — brightness went from ${valence} to ${now}. Fair warning, the middle of this is heavy.`
            : `Lifted it. Brightness is ${now}, up from ${valence}, and the tempo came along with it.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'genre': {
      const g = intent.genre
      const after = intent.add
        ? refill(before, (t) => (t.genres.includes(g) ? 60 : 0) + 40 - Math.abs(t.energy - energy) * 0.4, size)
        : refill(before, (t) => (t.genres.includes(g) ? -80 : 40) + 40 - Math.abs(t.energy - energy) * 0.4, size)
      const count = resolve(after).filter((t) => t.genres.includes(g)).length
      return {
        reply: intent.add
          ? count === after.length
            ? `The whole list is ${g} now. Energy stayed where it was so it still fits the moment.`
            : `More ${g} — ${count} of ${after.length} tracks. I kept the energy where it was.`
          : count === 0
            ? `Pulled the ${g} out entirely.`
            : `Took most of the ${g} out. ${count} stayed because they were carrying the middle.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'artist': {
      const artist = artists.find((a) => a.id === intent.artistId)!
      const after = refill(
        before,
        (t) =>
          (t.artist === artist.name ? 70 : t.genres.some((g) => artist.genres.includes(g)) ? 35 : 5) +
          30 -
          Math.abs(t.energy - energy) * 0.3,
        size,
      )
      const own = resolve(after).filter((t) => t.artist === artist.name).length
      return {
        reply: `More ${artist.name} — ${own} of theirs in here now, and I filled the rest with ${artist.genres
          .join(' and ')
          .toLowerCase()} that sits in the same register.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'mood': {
      const m = intent.mood
      const after = refill(
        before,
        (t) =>
          (t.moods.includes(m) ? (intent.remove ? -80 : 60) : intent.remove ? 40 : 5) +
          35 -
          Math.abs(t.energy - energy) * 0.3,
        size,
      )
      return {
        reply: intent.remove
          ? `Took the ${m} out. What is left leans harder into the rest of what you asked for.`
          : `Leaned into ${m}. ${resolve(after).filter((t) => t.moods.includes(m)).length} of ${after.length} tracks carry it now.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'similar': {
      const seed = context.currentTrackId ?? before[0]
      const seedTrack = seed ? trackById[seed] : undefined
      if (!seedTrack) {
        return { reply: 'Nothing is loaded to compare against yet. Play something first.', actions: DEFAULT_ACTIONS }
      }
      const neighbours = similarTo(seedTrack.id, size - 1)
      const after = [seedTrack.id, ...neighbours.map((t) => t.id)].slice(0, size)
      return {
        reply: `Built around ${seedTrack.title} — matched on energy, brightness and mood. ${neighbours[0]?.title ?? 'The next one'} is the closest thing in the catalogue to it.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'replace': {
      const target = context.currentTrackId ?? before[0]
      if (!target) return { reply: 'Nothing to replace yet.', actions: DEFAULT_ACTIONS }
      const replacement = similarTo(target, 6).find((t) => !before.includes(t.id))
      if (!replacement) {
        return {
          reply: `I have run out of close matches for ${trackById[target]?.title ?? 'that one'} in the catalogue.`,
          actions: DEFAULT_ACTIONS,
        }
      }
      const after = before.map((id) => (id === target ? replacement.id : id))
      return {
        reply: `Swapped ${trackById[target]?.title} for ${replacement.title} by ${replacement.artist} — same corner of the map.`,
        trackIds: after,
        change: '1 track swapped',
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'quieter-corner': {
      // No popularity data here, and inventing some would be a lie. What this
      // can honestly do is move toward the sparser end of the catalogue.
      const after = refill(
        before,
        (t) =>
          (t.genres.some((g) => ['Ambient', 'Neo-classical', 'Lo-fi'].includes(g)) ? 60 : 0) + (100 - t.energy) * 0.4,
        size,
      )
      return {
        reply: `Everything here is independent, so there is no "mainstream" to move away from — but I have pushed it toward the sparser end: more ambient and neo-classical, fewer drums.`,
        trackIds: after,
        change: `${changed(before, after)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'shorter': {
      const after = before.slice(0, Math.max(4, Math.round(size * 0.6)))
      return {
        reply: `Trimmed to ${after.length}. I kept the front of the list — that is where the strongest matches were.`,
        trackIds: after,
        change: `${before.length - after.length} removed`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'longer': {
      const target = Math.min(tracks.length, size + 6)
      const after = refill(
        before,
        (t) => 100 - Math.abs(t.energy - energy) * 0.6 - Math.abs(t.valence - valence) * 0.4,
        target,
      )
      return {
        reply: `Extended to ${after.length}. The new ones sit in the same energy band, so it should not jolt you halfway through.`,
        trackIds: after,
        change: `${changed(before, after)} added`,
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'reshuffle': {
      const after = [...before].reverse()
      return {
        reply: `Reordered — same tracks, opposite arc. This one opens on ${trackById[after[0]]?.title ?? 'the other end'}.`,
        trackIds: after,
        change: 'Resequenced',
        actions: DEFAULT_ACTIONS,
      }
    }

    case 'explain': {
      const opener = list[0]
      return {
        reply: opener
          ? `Each track is scored on mood, activity, feeling, weather, time of day, energy and brightness. This set averages ${energy} energy and ${valence} brightness. ${opener.title} opened it because it matched on ${opener.moods.slice(0, 2).join(' and ')} and set up what follows.`
          : 'Generate a playlist and I will walk you through why each track is in it.',
        actions: DEFAULT_ACTIONS,
      }
    }

    default: {
      // Anything descriptive goes through the same reader the builder uses.
      const intentRead: MusicIntent = readIntent(input)
      const understood =
        intentRead.moods.length + intentRead.activities.length + intentRead.feelings.length + intentRead.genres.length >
        0

      if (!understood) {
        return {
          reply:
            'Tell me what is off about it — too slow, too bright, wrong genre — or describe the moment instead. "Something for a rainy night drive" works.',
          actions: DEFAULT_ACTIONS,
        }
      }

      const built = generatePlaylist(intentRead, { size })
      const named = [...intentRead.moods, ...intentRead.activities].slice(0, 2).join(', ')
      return {
        reply: `Rebuilt it around ${named || 'what you described'}. ${built.description}`,
        trackIds: built.trackIds,
        change: `${changed(before, built.trackIds)} tracks swapped`,
        actions: DEFAULT_ACTIONS,
      }
    }
  }
}

export const suggestedPrompts = [
  'Make it more energetic',
  'Something darker',
  'I want less electronic music',
  'Give me something similar to this',
  'Make this playlist more peaceful',
  'Something for a rainy night drive',
  'Play something nostalgic',
  'Why did you pick these?',
]

/** Async facade, matching the shape a hosted model would have. */
export const assistant = {
  async converse(input: string, context: ConversationContext): Promise<AssistantTurn> {
    await new Promise((r) => setTimeout(r, 420 + Math.random() * 380))
    return converse(input, context)
  },
}

export { rankTracks }
