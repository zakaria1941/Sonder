import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { cx } from '@/lib/util'

const TABS: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover', icon: 'compass' },
  { to: '/create', label: 'Create', icon: 'wand' },
  { to: '/library', label: 'Library', icon: 'library' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

/** Bottom tab bar. Sits above the mini player and respects the home indicator. */
export function MobileNav() {
  return (
    <nav className="mobilenav" aria-label="Primary">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => cx('mobilenav__tab', isActive && 'is-active')}
        >
          {({ isActive }) => (
            <>
              <span className="mobilenav__icon">
                <Icon name={t.icon} size={21} strokeWidth={isActive ? 1.9 : 1.5} />
              </span>
              <span className="mobilenav__label">{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
