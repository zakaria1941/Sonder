import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Cover, Icon, Signal } from '@/components/ui'
import { TrackList } from '@/components/music/TrackList'
import { assistant, suggestedPrompts } from '@/services/music'
import type { AssistantAction } from '@/services/music'
import { getTrack, totalDuration, tracksFor } from '@/services/music'
import { useLibrary } from '@/state/LibraryContext'
import { usePlayer } from '@/state/PlayerContext'
import { useAccent, useMediaQuery } from '@/hooks'
import { cx, runtime } from '@/lib/util'

interface Message {
  id: string
  role: 'muse' | 'you'
  text: string
  change?: string
  actions?: AssistantAction[]
}

const ACTION_TEXT: Record<string, string> = {
  'energy-up': 'Make it more energetic',
  sadder: 'Make it sadder',
  happier: 'Lift it a bit',
  obscure: 'I want something less mainstream',
}

let seq = 0
const nextId = () => `m${++seq}`

export function Assistant() {
  const library = useLibrary()
  const player = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 980px)')

  const requestedId = (location.state as { playlistId?: string } | null)?.playlistId
  const initial = useMemo(
    () => (requestedId ? library.get(requestedId) : undefined) ?? library.latest ?? library.all[0],
    // Only resolve the working playlist once, so replies do not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestedId],
  )

  const [playlistId] = useState(initial?.id)
  const playlist = playlistId ? library.get(playlistId) : undefined
  const [trackIds, setTrackIds] = useState<string[]>(initial?.trackIds ?? [])
  const [fresh, setFresh] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [input, setInput] = useState('')
  const [view, setView] = useState<'chat' | 'playlist'>('chat')

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: nextId(),
      role: 'muse',
      text: initial
        ? `I’ve got ${initial.title} open — ${initial.trackIds.length} tracks. Tell me what’s wrong with it and I’ll rebuild it.`
        : 'Tell me what’s going on. I’ll find the sound that fits.',
      actions: [
        { kind: 'sadder', label: 'Make it sadder' },
        { kind: 'energy-up', label: 'More energetic' },
        { kind: 'obscure', label: 'Less mainstream' },
      ],
    },
  ])

  useAccent(playlist?.hue)

  const threadRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  const tracks = useMemo(() => tracksFor(trackIds), [trackIds])
  const avgEnergy = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.energy, 0) / tracks.length) : 0

  const send = async (text: string) => {
    const clean = text.trim()
    if (!clean || pending) return
    setInput('')
    setMessages((m) => [...m, { id: nextId(), role: 'you', text: clean }])
    setPending(true)

    const reply = await assistant.converse(clean, {
      trackIds,
      title: playlist?.title,
      currentTrackId: player.track?.id,
    })

    if (reply.trackIds) {
      const added = reply.trackIds.filter((id) => !trackIds.includes(id))
      setTrackIds(reply.trackIds)
      setFresh(added)
      if (playlistId) library.replaceTracks(playlistId, reply.trackIds)
      window.setTimeout(() => setFresh([]), 2600)
    }

    setMessages((m) => [
      ...m,
      { id: nextId(), role: 'muse', text: reply.reply, change: reply.change, actions: reply.actions },
    ])
    setPending(false)
  }

  return (
    <div className="muse">
      <header className="musehead shell">
        <div className="musehead__id">
          <span className="museavatar museavatar--lg">
            <Signal amplitude={0.7} complexity={0.6} speed={1.4} height={26} glow={false} seed={3} />
          </span>
          <div>
            <h1 className="display display--2">Muse</h1>
            <p className="musehead__sub">Music expert. Opinionated. Will tell you what it changed and why.</p>
          </div>
        </div>
        {isMobile && (
          <div className="museswitch">
            <button type="button" className={cx(view === 'chat' && 'is-on')} onClick={() => setView('chat')}>
              Chat
            </button>
            <button type="button" className={cx(view === 'playlist' && 'is-on')} onClick={() => setView('playlist')}>
              Playlist · {tracks.length}
            </button>
          </div>
        )}
      </header>

      <div className="muse__grid shell">
        {/* ---------------- Chat ---------------- */}
        <section className={cx('chat', isMobile && view !== 'chat' && 'is-hidden')} aria-label="Conversation with Muse">
          <div className="chat__thread hide-scroll" ref={threadRef}>
            {messages.map((m) => (
              <div key={m.id} className={cx('msg', `msg--${m.role}`)}>
                {m.role === 'muse' && (
                  <span className="museavatar" aria-hidden="true">
                    <Signal amplitude={0.7} complexity={0.5} speed={1.1} height={18} glow={false} seed={5} />
                  </span>
                )}
                <div className="msg__body">
                  <p className="msg__text">{m.text}</p>
                  {m.change && (
                    <span className="msg__change mono">
                      <Icon name="refresh" size={12} />
                      {m.change}
                    </span>
                  )}
                  {m.actions && m.role === 'muse' && (
                    <div className="msg__actions">
                      {m.actions.map((a) => (
                        <button
                          key={a.kind}
                          type="button"
                          className="msg__action"
                          onClick={() => send(ACTION_TEXT[a.kind] ?? a.label)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {pending && (
              <div className="msg msg--muse">
                <span className="museavatar" aria-hidden="true">
                  <Signal amplitude={0.8} complexity={0.7} speed={2.4} height={18} glow={false} seed={9} />
                </span>
                <div className="msg__body">
                  <span className="typing" aria-label="Muse is thinking">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="chat__suggest hide-scroll">
            {suggestedPrompts.map((p) => (
              <button key={p} type="button" className="chat__chip" onClick={() => send(p)} disabled={pending}>
                {p}
              </button>
            ))}
          </div>

          <form
            className="chat__form"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me everything…"
              aria-label="Message Muse"
              disabled={pending}
            />
            <button type="submit" className="chat__send" disabled={!input.trim() || pending} aria-label="Send">
              <Icon name="send" size={18} />
            </button>
          </form>
        </section>

        {/* ---------------- Working playlist ---------------- */}
        <aside
          className={cx('working', isMobile && view !== 'playlist' && 'is-hidden')}
          aria-label="The playlist being edited"
        >
          {playlist ? (
            <>
              <div className="working__head">
                <div className="working__cover">
                  <Cover photoId={playlist.coverPhoto} hue={playlist.hue} seed={playlist.id} width={400} />
                </div>
                <div className="working__meta">
                  <p className="eyebrow">Working on</p>
                  <h2 className="display display--3">{playlist.title}</h2>
                  <p className="working__stats mono">
                    {tracks.length} tracks · {runtime(totalDuration(trackIds))} · energy {avgEnergy}
                  </p>
                </div>
              </div>

              <div className="working__actions">
                <Button icon="play" size="sm" onClick={() => player.playQueue(trackIds, 0, playlist.title)}>
                  Play
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/playlist/${playlist.id}`)}>
                  Open playlist
                </Button>
              </div>

              <Signal
                className="working__signal"
                amplitude={0.2 + (avgEnergy / 100) * 0.7}
                complexity={avgEnergy / 100}
                speed={0.6 + avgEnergy / 100}
                height={64}
              />

              <div className={cx('working__list', fresh.length > 0 && 'has-fresh')}>
                <TrackList
                  tracks={tracks}
                  source={playlist.title}
                  compact
                  header={false}
                  onRemove={(id) => {
                    const next = trackIds.filter((t) => t !== id)
                    setTrackIds(next)
                    if (playlistId) library.replaceTracks(playlistId, next)
                  }}
                />
              </div>

              {fresh.length > 0 && (
                <p className="working__fresh mono">
                  {fresh.length} new:{' '}
                  {fresh
                    .slice(0, 3)
                    .map((id) => getTrack(id)?.title)
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </>
          ) : (
            <div className="working__empty">
              <p className="eyebrow">Nothing open</p>
              <h2 className="display display--3">Build something first.</h2>
              <p className="lede">Muse edits an existing playlist. Make one and it will be waiting here.</p>
              <Button to="/create">Create a playlist</Button>
            </div>
          )}
        </aside>
      </div>

      <section className="section shell muse__examples">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">What it understands</p>
            <h2 className="display display--2">Talk to it like a person who knows music.</h2>
            <p className="lede">
              It reads energy, emotional brightness, genre, artist and language. Vague works — “something for driving
              through Tokyo at 2am” lands somewhere sensible.
            </p>
          </div>
        </div>
        <div className="museexamples">
          {[
            ['Make this playlist sadder', 'Drops emotional brightness and swaps the bright tracks out'],
            ['More like Frank Ocean', 'Anchors on that artist, fills around it from the same register'],
            ['Less mainstream', 'Reweights toward artists with a fraction of the listeners'],
            ['Give me more Arabic songs', 'Rebuilds around language, warns you if the energy shifts'],
            ['Make it more energetic', 'Raises the drive target and re-sequences the back half'],
            ['Why did you pick these?', 'Explains the two axes it scored against'],
          ].map(([q, a]) => (
            <button key={q} type="button" className="museexample" onClick={() => send(q)}>
              <span className="museexample__q">“{q}”</span>
              <span className="museexample__a">{a}</span>
              <Icon name="arrow-right" size={15} />
            </button>
          ))}
        </div>
      </section>

      <p className="muse__disclaimer shell mono">
        Demo build — Muse runs a local rules engine, not a hosted model. The service interface in
        <code> src/services/ai.ts </code> matches what a real API call would return, so swapping it out is a one-file
        change.
      </p>
    </div>
  )
}
