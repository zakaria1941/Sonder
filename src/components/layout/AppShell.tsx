import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import { SearchOverlay } from './SearchOverlay'
import { NowPlaying } from '@/components/player/NowPlaying'
import { PlaybackNotice } from '@/components/player/PlaybackNotice'
import { useHotkey } from '@/hooks'

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()

  useHotkey('k', () => setSearchOpen((s) => !s))
  const openSearch = useCallback(() => setSearchOpen(true), [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className="app">
      <TopNav onSearch={openSearch} />

      {/* Keyed on the route so the enter animation replays on navigation.
          The animation is CSS, so content is visible even if it never runs. */}
      <main key={pathname} className="app__main">
        <Outlet />
      </main>

      <PlaybackNotice />
      <NowPlaying />
      <MobileNav />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </div>
  )
}
