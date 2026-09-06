import { useMemo, useState } from 'react'
import { Button, Chip, Reveal, Signal } from '@/components/ui'
import { CollectionCard, MoodCard, PlaylistCard } from '@/components/playlist/Cards'
import { activities, collections, moods } from '@/data'
import { useLibrary } from '@/state/LibraryContext'

const FILTERS = ['All', 'Low energy', 'High energy', 'Instrumental', 'Not in English'] as const

export function Discover() {
  const library = useLibrary()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')

  const shown = useMemo(() => {
    switch (filter) {
      case 'Low energy':
        return collections.filter((c) =>
          ['c-late-night', 'c-heartbreak', 'c-deep-focus', 'c-rain-delay', 'c-off-the-grid', 'c-slow-burn'].includes(
            c.id,
          ),
        )
      case 'High energy':
        return collections.filter((c) =>
          ['c-main-character', 'c-pre-game', 'c-summer-drive', 'c-after-hours'].includes(c.id),
        )
      case 'Instrumental':
        return collections.filter((c) => c.tags.some((t) => ['Ambient', 'Classical', 'Lo-fi'].includes(t)))
      case 'Not in English':
        return collections.filter((c) => c.tags.includes('Arabic'))
      default:
        return collections
    }
  }, [filter])

  return (
    <div className="discover">
      <header className="dischead">
        <div className="shell dischead__inner">
          <p className="eyebrow">Discover</p>
          <h1 className="display display--page">Find your next mood.</h1>
          <p className="lede">
            Ten collections, each built around a feeling rather than a genre. Open one, or start from a mood and let
            Sonder build something for the hour you’re in.
          </p>
          <div className="dischead__actions">
            <Button to="/create" size="lg">
              Build one from scratch
            </Button>
            <Button to="/assistant" variant="ghost" size="lg" iconRight="arrow-right">
              Ask Muse instead
            </Button>
          </div>
        </div>
        <Signal className="dischead__signal" amplitude={0.42} complexity={0.5} speed={0.6} height={96} />
      </header>

      {/* ---------------- Collections ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Collections</p>
            <h2 className="display display--1">Somewhere to start.</h2>
          </div>
          <div className="chipwrap chipwrap--tight">
            {FILTERS.map((f) => (
              <Chip key={f} label={f} size="sm" selected={filter === f} onClick={() => setFilter(f)} />
            ))}
          </div>
        </div>

        <div className="discover__grid">
          {shown.map((c, i) => (
            <Reveal key={c.id} delay={i * 34}>
              <CollectionCard collection={c} />
            </Reveal>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="lede" style={{ marginTop: 'var(--s-8)' }}>
            Nothing in that band yet. Try another filter.
          </p>
        )}
      </section>

      {/* ---------------- Moods ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">By feeling</p>
            <h2 className="display display--1">Or just say how you feel.</h2>
            <p className="lede">Each one opens the builder with that mood already set.</p>
          </div>
        </div>
        <div className="moodgrid">
          {moods.map((m, i) => (
            <Reveal key={m.id} delay={i * 22}>
              <MoodCard mood={m} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Activities ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">By moment</p>
            <h2 className="display display--1">What are you doing?</h2>
            <p className="lede">Pace matters more than genre. These set it.</p>
          </div>
        </div>
        <div className="chipwrap">
          {activities.map((a) => (
            <a key={a.id} href={`/create?activity=${a.id}`} className="chip">
              <span className="chip__label">{a.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------------- Editorial ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Editorial</p>
            <h2 className="display display--1">Made earlier.</h2>
          </div>
          <Button to="/library" variant="outline" iconRight="arrow-right">
            Your library
          </Button>
        </div>
        <div className="rail hide-scroll">
          {library.all.slice(0, 8).map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      </section>
    </div>
  )
}
