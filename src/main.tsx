import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { reportCatalogIssues } from './services/music/catalog'

import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/layout.css'
import './styles/player.css'
import './styles/music.css'
import './styles/home.css'
import './styles/create.css'
import './styles/playlist.css'
import './styles/discover.css'
import './styles/library.css'
import './styles/assistant.css'
import './styles/profile.css'

// Dev-only: catches a malformed catalogue record while editing rather than
// when someone presses play. No-op in production builds.
reportCatalogIssues()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
