import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PlayerProvider } from '@/state/PlayerContext'
import { LibraryProvider } from '@/state/LibraryContext'
import { Home } from '@/pages/Home'
import { Discover } from '@/pages/Discover'
import { Create } from '@/pages/Create'
import { PlaylistPage } from '@/pages/PlaylistPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { ArtistPage } from '@/pages/ArtistPage'
import { Library } from '@/pages/Library'
import { Assistant } from '@/pages/Assistant'
import { Profile } from '@/pages/Profile'
import { NotFound } from '@/pages/NotFound'

export function App() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/create" element={<Create />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/collection/:id" element={<CollectionPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </PlayerProvider>
    </LibraryProvider>
  )
}
