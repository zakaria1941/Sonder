import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Chip, Cover, Icon, Reveal, Signal } from '@/components/ui'
import { CollectionCard, MoodCard, PlaylistCard } from '@/components/playlist/Cards'
import { activityById, artistById, collections, feelingById, moodById, moods, profile } from '@/data'
import { generatePlaylist, getTrack, liveListeners, readIntent } from '@/services/music'
import { useLibrary } from '@/state/LibraryContext'
import { usePlayer } from '@/state/PlayerContext'
import { useTypewriter } from '@/hooks'
import { duration, photo } from '@/lib/util'

const HERO_PHOTO = '1517673132405-a56a62b18caf'

const HERO_EXAMPLES = [
  'I want something calm while coding at night.',
  'Something for a late night drive in the rain.',
  'I’m studying and need to stay focused.',
  'I feel sad but I don’t want depressing music.',
  'Give me something cinematic for travelling.',
  'I want something energetic for the gym.',
]

export function Home() {
  const [note, setNote] = useState('')
  const navigate = useNavigate()
  const library = useLibrary()
  const player = usePlayer()
  const placeholder = useTypewriter(HERO_EXAMPLES, note.length === 0)
  const listeners = useMemo(() => liveListeners(), [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/create${note.trim() ? `?note=${encodeURIComponent(note.trim())}` : ''}`)
  }

  const featured = library.all.slice(0, 6)

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="hero__media" aria-hidden="true">
          <img src={photo(HERO_PHOTO, 2000, { q: 78 })} alt="" fetchPriority="high" />
          <span className="hero__grade" />
        </div>

        <div className="hero__inner shell">
          <p className="hero__ticker mono">
            <span className="hero__pulse" />
            Live · {listeners.toLocaleString()} moments scored tonight
          </p>

          <h1 className="display display--hero hero__title">
            Tell us how you feel.
            <br />
            We’ll find the sound.
          </h1>

          <p className="lede hero__lede">
            Describe your mood, your moment, or what you’re doing right now. Sonder reads it and builds the soundtrack
            that fits.
          </p>

          <form className="hero__form" onSubmit={submit}>
            <div className="hero__field">
              <Icon name="wand" size={18} className="hero__fieldicon" />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={placeholder || 'Tell us about your moment…'}
                aria-label="Describe your moment"
                maxLength={220}
              />
              <button type="submit" className="hero__send" aria-label="Create my playlist">
                <Icon name="arrow-right" size={18} />
              </button>
            </div>
            <div className="hero__cta">
              <Button type="submit" size="lg">
                Create my playlist
              </Button>
              <Button to="/discover" variant="ghost" size="lg" iconRight="arrow-right">
                Explore moods
              </Button>
            </div>
          </form>
        </div>

        <Signal className="hero__signal" amplitude={0.5} complexity={0.42} speed={0.8} height={140} />
      </section>

      {/* ---------------- Moods ---------------- */}
      <section className="section shell" id="moods">
        <Reveal className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Start here</p>
            <h2 className="display display--1">What are we feeling today?</h2>
            <p className="lede">
              Fifteen places to start. Pick the one that fits and the rest of the interface follows it — colour, pacing,
              everything.
            </p>
          </div>
          <Button to="/create" variant="outline" iconRight="arrow-right">
            Build it properly
          </Button>
        </Reveal>

        <div className="moodgrid">
          {moods.map((m, i) => (
            <Reveal key={m.id} delay={i * 26}>
              <MoodCard mood={m} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- The read ---------------- */}
      <ReadDemo />

      {/* ---------------- Collections ---------------- */}
      <section className="section shell">
        <Reveal className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Curated</p>
            <h2 className="display display--1">Find your next mood.</h2>
            <p className="lede">Collections built around a feeling rather than a genre. Start anywhere.</p>
          </div>
          <Button to="/discover" variant="outline" iconRight="arrow-right">
            All collections
          </Button>
        </Reveal>

        <div className="home__collections">
          {collections.slice(0, 5).map((c, i) => (
            <Reveal key={c.id} delay={i * 40} className={i === 0 ? 'home__collections-lead' : undefined}>
              <CollectionCard collection={c} wide={i === 0} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Rotation ---------------- */}
      <section className="section shell">
        <Reveal className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Tonight</p>
            <h2 className="display display--1">In rotation.</h2>
            <p className="lede">What Sonder has been building for people at this hour.</p>
          </div>
          <Button to="/library" variant="outline" iconRight="arrow-right">
            Your library
          </Button>
        </Reveal>

        <div className="home__rail rail hide-scroll">
          {featured.map((p, i) => (
            <Reveal key={p.id} delay={i * 40}>
              <PlaylistCard playlist={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Profile teaser ---------------- */}
      <section className="section shell">
        <Reveal className="teaser">
          <div className="teaser__text">
            <p className="eyebrow">Your music profile</p>
            <h2 className="display display--2">{profile.read}</h2>
            <div className="teaser__chips">
              {profile.topMoods.map((id) => (
                <Chip key={id} label={moodById[id].name} hue={moodById[id].hue} as="span" size="sm" />
              ))}
              {profile.topArtists.slice(0, 3).map((id) => (
                <Chip key={id} label={artistById[id]?.name ?? id} as="span" size="sm" />
              ))}
            </div>
            <Button to="/profile" variant="outline" iconRight="arrow-right">
              See the whole picture
            </Button>
          </div>
          <div className="teaser__viz" aria-hidden="true">
            <Signal amplitude={0.62} complexity={0.3} speed={0.5} height={190} />
            <div className="teaser__months">
              {profile.energyByMonth.map((v, i) => (
                <span key={i} style={{ height: `${18 + v * 82}%` }} />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Closing ---------------- */}
      <section className="closer">
        <div className="shell closer__inner">
          <p className="eyebrow eyebrow--bare mono">Sonder</p>
          <h2 className="display display--1">One moment. One playlist.</h2>
          <Button
            size="lg"
            onClick={() => {
              const p = library.all[0]
              if (p) player.playQueue(p.trackIds, 0, p.title)
              navigate('/create')
            }}
          >
            Start with how you feel
          </Button>
        </div>
        <Signal amplitude={0.34} complexity={0.6} speed={0.5} height={92} className="closer__signal" />
      </section>

      <footer className="foot shell">
        <div className="foot__row">
          <p className="mono">Sonder — music for the moment you’re actually in</p>
          <p className="mono foot__note">Demo build · audio and cover art generated · imagery from Unsplash</p>
        </div>
      </footer>
    </>
  )
}

/* ------------------------------------------------------------
   The read — runs the actual interpreter on example sentences.
   Nothing here is faked for the marketing section; it is the same
   code path the Create page uses.
   ------------------------------------------------------------ */

const DEMOS = [
  'I want something peaceful for studying while it’s raining at night.',
  'I need something for a late night drive.',
  'I feel sad but I don’t want depressing music.',
  'I’m coding and it’s raining outside.',
]

function ReadDemo() {
  const [active, setActive] = useState(0)
  const text = DEMOS[active]

  const { read, curation } = useMemo(() => {
    const interp = readIntent(text)
    return { read: interp, curation: generatePlaylist(interp, { size: 4 }) }
  }, [text])

  const facts = [
    read.moods[0] && { label: 'Mood', value: moodById[read.moods[0]].name },
    read.activities[0] && { label: 'Doing', value: activityById[read.activities[0]].name },
    read.feelings[0] && { label: 'Wants to feel', value: feelingById[read.feelings[0]].name },
    read.weather[0] && { label: 'Weather', value: read.weather[0] },
    { label: 'Energy', value: String(read.energy ?? 50) },
    { label: 'Confidence', value: `${Math.round(read.confidence * 100)}%` },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <section className="section shell read">
      <Reveal className="section-head">
        <div className="section-head__text">
          <p className="eyebrow">How it reads you</p>
          <h2 className="display display--1">Say it the way you’d say it out loud.</h2>
          <p className="lede">
            Pick a sentence. This is the real interpreter running — the same one behind the Create page, not a
            screenshot.
          </p>
        </div>
      </Reveal>

      <Reveal className="read__tabs">
        {DEMOS.map((d, i) => (
          <button
            key={d}
            type="button"
            className={`read__tab${i === active ? ' is-active' : ''}`}
            onClick={() => setActive(i)}
          >
            {d}
          </button>
        ))}
      </Reveal>

      <Reveal className="read__panel" style={{ ['--accent' as string]: curation.hue } as React.CSSProperties}>
        <div className="read__col">
          <p className="mono read__label">Input</p>
          <p className="read__quote">“{text}”</p>

          <p className="mono read__label">Extracted</p>
          <dl className="read__facts">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="mono">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="read__col read__col--result">
          <p className="mono read__label">Result</p>
          <div className="read__result">
            <div className="read__cover">
              <Cover
                photoId={read.moods[0] ? moodById[read.moods[0]].photo : undefined}
                hue={curation.hue}
                seed={curation.title}
                width={400}
              />
            </div>
            <div>
              <h3 className="display display--3">{curation.title}</h3>
              <p className="read__sub">{curation.subtitle}</p>
            </div>
          </div>

          <ol className="read__tracks">
            {curation.trackIds.slice(0, 4).map((id, i) => {
              const s = getTrack(id)!
              return (
                <li key={id}>
                  <span className="mono tabular">{String(i + 1).padStart(2, '0')}</span>
                  <span className="read__track">
                    <strong>{s.title}</strong>
                    <em>{s.artist}</em>
                  </span>
                  <span className="mono tabular read__dur">{duration(s.duration)}</span>
                </li>
              )
            })}
          </ol>

          <Link to={`/create?note=${encodeURIComponent(text)}`} className="read__go">
            Build this one properly
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
