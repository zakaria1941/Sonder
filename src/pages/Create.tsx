import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Chip, Icon, Signal } from '@/components/ui'
import { MoodCard } from '@/components/playlist/Cards'
import {
  activities,
  activityById,
  artists,
  feelingById,
  feelings,
  genres as allGenres,
  moodById,
  moods,
  timeOptions,
  weatherOptions,
} from '@/data'
import { buildStages, currentTimeOfDay, generatePlaylist, intentFromSelection, readIntent } from '@/services/music'
import type { Activity, Feeling, Mood, TimeOfDay, Weather } from '@/services/music/types'
import { useLibrary } from '@/state/LibraryContext'
import { useAccent, useReducedMotion } from '@/hooks'
import { clamp, cx } from '@/lib/util'

const NOTE_EXAMPLES = [
  'I want something peaceful for studying while it’s raining at night…',
  'I need something for a late night drive…',
  'I feel sad but I don’t want depressing music…',
]

export function Create() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const library = useLibrary()
  const reduced = useReducedMotion()

  const [moodId, setMoodId] = useState<Mood | undefined>((params.get('mood') as Mood) ?? undefined)
  const [activityId, setActivityId] = useState<Activity | undefined>((params.get('activity') as Activity) ?? undefined)
  const [feelingId, setFeelingId] = useState<Feeling | undefined>(undefined)
  const [genres, setGenres] = useState<string[]>([])
  const [artistNames, setArtistNames] = useState<string[]>([])
  const [weather, setWeather] = useState<Weather | undefined>(undefined)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => currentTimeOfDay())
  const [note, setNote] = useState(params.get('note') ?? '')
  const [energy, setEnergy] = useState(50)
  const [energyTouched, setEnergyTouched] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'building'>('idle')
  const [stage, setStage] = useState(0)

  // A pasted note pre-fills the form, so the page opens already understood.
  const appliedNote = useRef(false)
  useEffect(() => {
    const incoming = params.get('note')
    if (!incoming || appliedNote.current) return
    appliedNote.current = true
    const read = readIntent(incoming)
    if (read.moods[0]) setMoodId(read.moods[0])
    if (read.activities[0]) setActivityId(read.activities[0])
    if (read.feelings[0]) setFeelingId(read.feelings[0])
    if (read.genres.length) setGenres(read.genres)
    if (read.weather[0]) setWeather(read.weather[0])
    if (read.timeOfDay[0]) setTimeOfDay(read.timeOfDay[0])
    if (read.energy !== undefined) setEnergy(read.energy)
  }, [params])

  // Energy follows your picks until you move the slider yourself.
  const derivedEnergy = useMemo(() => {
    if (activityId) return activityById[activityId].energy
    if (feelingId) return feelingById[feelingId].energy
    if (moodId) return moodById[moodId].energy
    return 50
  }, [activityId, feelingId, moodId])

  useEffect(() => {
    if (!energyTouched) setEnergy(derivedEnergy)
  }, [derivedEnergy, energyTouched])

  const hue = moodId ? moodById[moodId].hue : feelingId ? feelingById[feelingId].hue : undefined
  useAccent(hue)

  const intent = useMemo(
    () =>
      intentFromSelection({
        moods: moodId ? [moodId] : [],
        feelings: feelingId ? [feelingId] : [],
        activities: activityId ? [activityId] : [],
        genres,
        artists: artistNames,
        weather: weather ? [weather] : [],
        timeOfDay: [timeOfDay],
        energy,
        note,
      }),
    [moodId, feelingId, activityId, genres, artistNames, weather, timeOfDay, energy, note],
  )

  const filled = [moodId, activityId, feelingId, genres.length || undefined, note.trim() || undefined].filter(
    Boolean,
  ).length
  const ready = filled > 0

  const stages = useMemo(() => buildStages(intent), [intent])

  const generate = () => {
    if (!ready || phase !== 'idle') return
    setPhase('building')
    setStage(0)
    const per = reduced ? 180 : 720
    stages.forEach((_, i) => window.setTimeout(() => setStage(i), i * per))
    window.setTimeout(
      () => {
        const built = generatePlaylist(intent)
        library.add({
          id: built.id,
          title: built.title,
          subtitle: built.subtitle,
          description: built.description,
          coverPhoto: moodId ? moodById[moodId].photo : moods[0].photo,
          hue: built.hue,
          moodId: built.intent.moods[0] ?? moodId ?? 'calm',
          trackIds: built.trackIds,
          moment: {
            moodId,
            feelingId,
            activityId,
            genres,
            weather: weather ? [weather] : [],
            timeOfDay: [timeOfDay],
            energy,
            note,
          },
          createdAt: built.createdAt,
        })
        setPhase('idle')
        navigate(`/playlist/${built.id}`, { state: { fresh: true } })
      },
      stages.length * per + (reduced ? 120 : 620),
    )
  }

  const toggle = <T,>(list: T[], value: T, setter: (v: T[]) => void, max = 99) => {
    if (list.includes(value)) setter(list.filter((v) => v !== value))
    else setter([...list, value].slice(-max))
  }

  return (
    <div className="create">
      <div className="create__grid shell">
        {/* ---------------- Live summary ---------------- */}
        <aside className="moment">
          <div className="moment__inner">
            <p className="eyebrow">Your moment</p>

            <h2 className="display display--2 moment__title">
              {moodId ? moodById[moodId].name : 'Undecided'}
              {activityId && <span className="moment__and"> while {activityById[activityId].name.toLowerCase()}</span>}
            </h2>

            <p className="moment__blurb">
              {moodId ? moodById[moodId].blurb : 'Pick a mood and this whole page follows it.'}
            </p>

            <Signal
              className="moment__signal"
              amplitude={0.25 + (energy / 100) * 0.68}
              complexity={energy / 100}
              speed={0.5 + energy / 100}
              height={92}
            />

            <dl className="moment__facts">
              <div>
                <dt className="mono">Energy</dt>
                <dd className="tabular">{energy}</dd>
              </div>
              <div>
                <dt className="mono">Target</dt>
                <dd>{feelingId ? feelingById[feelingId].name : '—'}</dd>
              </div>
              <div>
                <dt className="mono">Weather</dt>
                <dd>{weather ? weatherOptions.find((w) => w.id === weather)?.name : '—'}</dd>
              </div>
              <div>
                <dt className="mono">Time</dt>
                <dd>{timeOptions.find((t) => t.id === timeOfDay)?.name}</dd>
              </div>
            </dl>

            {(genres.length > 0 || artistNames.length > 0) && (
              <div className="moment__tags">
                {genres.map((g) => (
                  <Chip key={g} label={g} as="span" size="sm" />
                ))}
                {artistNames.map((a) => (
                  <Chip key={a} label={a} as="span" size="sm" />
                ))}
              </div>
            )}

            <div className="moment__progress" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={cx(i < filled && 'is-on')} />
              ))}
            </div>

            <Button size="lg" full onClick={generate} disabled={!ready}>
              {ready ? 'Create my playlist' : 'Tell us something first'}
            </Button>
            <p className="moment__hint">
              {ready ? 'Takes about four seconds.' : 'A mood, an activity, or a sentence — any one is enough.'}
            </p>
          </div>
        </aside>

        {/* ---------------- Steps ---------------- */}
        <div className="create__steps">
          <header className="create__head">
            <p className="eyebrow">Create</p>
            <h1 className="display display--1">Let’s find your sound.</h1>
            <p className="lede">
              Answer as much or as little as you like. One honest sentence at the bottom beats filling in every field.
            </p>
          </header>

          <Section title="How do you feel right now?" hint="Where you are, not where you want to be.">
            <div className="moodgrid moodgrid--compact">
              {moods.map((m) => (
                <MoodCard
                  key={m.id}
                  mood={m}
                  selected={moodId === m.id}
                  onSelect={() => setMoodId(moodId === m.id ? undefined : m.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="What are you doing?" hint="This sets the pace more than anything else.">
            <div className="chipwrap">
              {activities.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={activityId === a.id}
                  onClick={() => setActivityId(activityId === a.id ? undefined : a.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="What do you want to feel?" hint="The playlist travels from where you are to here.">
            <div className="chipwrap">
              {feelings.map((f) => (
                <Chip
                  key={f.id}
                  label={f.name}
                  hue={f.hue}
                  selected={feelingId === f.id}
                  onClick={() => setFeelingId(feelingId === f.id ? undefined : f.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="Anything specific?" hint="Optional. Leave it blank and we work it out from the rest.">
            <div className="prefs">
              <div className="prefs__block">
                <p className="prefs__label mono">Genres</p>
                <div className="chipwrap">
                  {allGenres.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      size="sm"
                      selected={genres.includes(g)}
                      onClick={() => toggle(genres, g, setGenres, 4)}
                    />
                  ))}
                </div>
              </div>

              <div className="prefs__block">
                <p className="prefs__label mono">Artists you like</p>
                <div className="chipwrap">
                  {artists.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      size="sm"
                      selected={artistNames.includes(a.name)}
                      onClick={() => toggle(artistNames, a.name, setArtistNames, 3)}
                    />
                  ))}
                </div>
              </div>

              <div className="prefs__row">
                <div className="prefs__block">
                  <p className="prefs__label mono">Weather</p>
                  <div className="chipwrap">
                    {weatherOptions.map((w) => (
                      <Chip
                        key={w.id}
                        label={w.name}
                        size="sm"
                        selected={weather === w.id}
                        onClick={() => setWeather(weather === w.id ? undefined : w.id)}
                      />
                    ))}
                  </div>
                </div>

                <div className="prefs__block">
                  <p className="prefs__label mono">Time of day</p>
                  <div className="chipwrap">
                    {timeOptions.map((t) => (
                      <Chip
                        key={t.id}
                        label={t.name}
                        size="sm"
                        selected={timeOfDay === t.id}
                        onClick={() => setTimeOfDay(t.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="prefs__block">
                <div className="prefs__energyhead">
                  <p className="prefs__label mono">Energy</p>
                  <span className="mono tabular prefs__energyval">{energy}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={energy}
                  onChange={(e) => {
                    setEnergyTouched(true)
                    setEnergy(clamp(Number(e.target.value), 0, 100))
                  }}
                  className="energyslider"
                  style={{ ['--fill' as string]: `${energy}%` }}
                  aria-label="Energy"
                />
                <div className="prefs__scale mono">
                  <span>Barely there</span>
                  <span>Wall of sound</span>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Tell us about your moment." hint="The part that actually makes this work.">
            <div className="notefield">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell us about your moment…"
                rows={4}
                maxLength={400}
                aria-label="Describe your moment"
              />
              <span className="notefield__count mono tabular">{note.length}/400</span>
            </div>
            <div className="notefield__examples">
              {NOTE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="notefield__example"
                  onClick={() => setNote(ex.replace('…', ''))}
                >
                  <Icon name="plus" size={13} />
                  {ex}
                </button>
              ))}
            </div>
          </Section>

          <div className="create__foot">
            <Button size="lg" onClick={generate} disabled={!ready}>
              Create my playlist
            </Button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                setMoodId(undefined)
                setActivityId(undefined)
                setFeelingId(undefined)
                setGenres([])
                setArtistNames([])
                setWeather(undefined)
                setTimeOfDay(currentTimeOfDay())
                setNote('')
                setEnergyTouched(false)
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Generation takeover ---------------- */}
      {phase === 'building' && (
        <div className="generating" role="status" aria-live="polite">
          <div className="generating__inner">
            <Signal
              amplitude={0.3 + stage * 0.16}
              complexity={0.3 + stage * 0.14}
              speed={1 + stage * 0.4}
              height={220}
            />

            <div className="generating__stages">
              {stages.map((s, i) => (
                <p key={s} className={cx('generating__stage', i === stage && 'is-active', i < stage && 'is-done')}>
                  <span className="generating__dot" />
                  {s}
                </p>
              ))}
            </div>

            <p className="generating__note mono">
              {moodId ? moodById[moodId].name : 'Your mood'} ·{' '}
              {activityId ? activityById[activityId].name : 'this moment'} · energy {energy}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="cstep">
      <header className="cstep__head">
        <h2 className="display display--3">{title}</h2>
        <p className="cstep__hint">{hint}</p>
      </header>
      {children}
    </section>
  )
}
