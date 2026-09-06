import { Link } from 'react-router-dom'
import { Art, Button, Chip, Metric, Reveal, Signal } from '@/components/ui'
import { PlaylistCard } from '@/components/playlist/Cards'
import { artistById, moodById, profile } from '@/data'
import type { Mood } from '@/services/music/types'
import { useLibrary } from '@/state/LibraryContext'
import { usePlayer } from '@/state/PlayerContext'
import { getTrack, tracks } from '@/services/music'
import type { Track } from '@/services/music/types'
import { TrackList } from '@/components/music/TrackList'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

export function Profile() {
  const library = useLibrary()
  const player = usePlayer()
  const liked = player.favorites
    .map((id) => getTrack(id))
    .filter((t): t is Track => Boolean(t))
    .slice(0, 6)
  const favourites = library.all.filter((p) => p.favorite).slice(0, 4)

  return (
    <div className="profile">
      <header className="prohead shell">
        <div className="prohead__id">
          <span className="prohead__avatar">{profile.name.charAt(0)}</span>
          <div>
            <p className="eyebrow">Your music profile</p>
            <h1 className="display display--page">{profile.name}</h1>
            <p className="lede">
              {profile.since} · {profile.handle}
            </p>
          </div>
        </div>
        <p className="prohead__read">{profile.read}</p>
      </header>

      <section className="section shell">
        <div className="prostats">
          {profile.stats.map((s) => (
            <Metric key={s.label} label={s.label} value={s.value} hint={s.hint} />
          ))}
        </div>
      </section>

      {/* ---------------- Listening shape ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Twelve months</p>
            <h2 className="display display--1">Your energy, over a year.</h2>
            <p className="lede">
              Summer runs loud, autumn drops off a cliff. The scale is the same one every playlist is scored on.
            </p>
          </div>
        </div>

        <div className="energychart">
          <Signal className="energychart__wave" amplitude={0.42} complexity={0.35} speed={0.4} height={120} />
          <div className="energychart__bars">
            {profile.energyByMonth.map((v, i) => (
              <div key={i} className="energychart__col">
                <span className="energychart__bar" style={{ height: `${14 + (v / 100) * 86}%` }}>
                  <span className="energychart__val mono tabular">{v}</span>
                </span>
                <span className="energychart__month mono">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Taste ---------------- */}
      <section className="section shell protaste">
        <Reveal className="protaste__block">
          <p className="eyebrow">Moods you return to</p>
          <div className="chipwrap">
            {profile.topMoods.map((id) => (
              <Link
                key={id}
                to={`/create?mood=${id}`}
                className="chip chip--hued"
                style={{ ['--chip-hue' as string]: moodById[id].hue }}
              >
                <span className="chip__label">{moodById[id].name}</span>
                <span className="chip__hint">{moodById[id].blurb}</span>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal className="protaste__block" delay={80}>
          <p className="eyebrow">Genres, by share of listening</p>
          <ul className="genrebars">
            {profile.topGenres.map((g) => (
              <li key={g.name}>
                <span className="genrebars__name">{g.name}</span>
                <span className="genrebars__track">
                  <span
                    className="genrebars__fill"
                    style={{ transform: `scaleX(${g.share / profile.topGenres[0].share})` }}
                  />
                </span>
                <span className="genrebars__pct mono tabular">{Math.round(g.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="protaste__block" delay={140}>
          <p className="eyebrow">Artists on repeat</p>
          <div className="artistgrid artistgrid--small">
            {profile.topArtists.map((id) => {
              const a = artistById[id]
              return (
                <Link key={id} to={`/artist/${id}`} className="artistcard" style={{ ['--card-hue' as string]: a.hue }}>
                  <span className="artistcard__art">
                    <Art seed={a.id} hue={a.hue} detail={false} />
                  </span>
                  <span className="artistcard__name">{a.name}</span>
                  <span className="artistcard__meta mono">{a.genres[0]}</span>
                </Link>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* ---------------- Recent moments ---------------- */}
      <section className="section shell">
        <div className="section-head">
          <div className="section-head__text">
            <p className="eyebrow">Recent moments</p>
            <h2 className="display display--1">What you asked for, lately.</h2>
          </div>
        </div>
        <ul className="moments">
          {profile.recentMoments.map((m) => {
            const mood = moodById[m.moodId as Mood]
            return (
              <li key={m.at} className="momentrow" style={{ ['--card-hue' as string]: mood.hue }}>
                <span className="momentrow__dot" />
                <span className="momentrow__when mono">{m.at}</span>
                <span className="momentrow__what">
                  <strong>{mood.name}</strong> while {m.activity.toLowerCase()}
                </span>
                <Link to={`/playlist/${m.playlistId}`} className="momentrow__link">
                  Open playlist
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------------- Liked ---------------- */}
      {liked.length > 0 && (
        <section className="section shell">
          <div className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">Liked songs</p>
              <h2 className="display display--1">Kept for later.</h2>
            </div>
            <Button to="/library" variant="outline" iconRight="arrow-right">
              All liked songs
            </Button>
          </div>
          <TrackList tracks={liked} source="Liked songs" />
        </section>
      )}

      {/* ---------------- Favourites ---------------- */}
      {favourites.length > 0 && (
        <section className="section shell">
          <div className="section-head">
            <div className="section-head__text">
              <p className="eyebrow">Favourite playlists</p>
              <h2 className="display display--1">The ones you go back to.</h2>
            </div>
          </div>
          <div className="library__grid">
            {favourites.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </section>
      )}

      <section className="section shell">
        <div className="prochips">
          <Chip label="Import your own MP3s" as="span" />
          <Chip label="Connect a music provider" as="span" />
          <span className="prochips__note mono">
            {tracks.length} tracks in the catalogue · see MUSIC_CATALOG.md to add more
          </span>
        </div>
      </section>
    </div>
  )
}
