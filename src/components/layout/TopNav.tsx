import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon, Logo } from '@/components/ui'
import { profile } from '@/data'
import { cx } from '@/lib/util'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/create', label: 'Create' },
  { to: '/library', label: 'My playlists' },
  { to: '/assistant', label: 'Muse' },
]

export function TopNav({ onSearch }: { onSearch: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const onHero = pathname === '/'

  return (
    <header className={cx('topnav', scrolled && 'is-scrolled', onHero && 'topnav--overlay')}>
      <div className="topnav__inner">
        <NavLink to="/" className="topnav__brand" aria-label="Sonder, home">
          <Logo />
        </NavLink>

        <nav className="topnav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => cx('topnav__link', isActive && 'is-active')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="topnav__right">
          <button type="button" className="topnav__search" onClick={onSearch}>
            <Icon name="search" size={16} />
            <span>Search</span>
            <kbd className="mono">⌘K</kbd>
          </button>
          <button
            type="button"
            className="topnav__search topnav__search--compact"
            onClick={onSearch}
            aria-label="Search"
          >
            <Icon name="search" size={18} />
          </button>
          <NavLink to="/profile" className="topnav__avatar" aria-label="Your music profile">
            <span>{profile.name.charAt(0)}</span>
          </NavLink>
        </div>
      </div>
    </header>
  )
}
