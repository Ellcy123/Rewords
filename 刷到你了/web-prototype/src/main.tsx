import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/feed.css'
import './styles/stage.css'
import './styles/sheets.css'
import './styles/tutorial.css'
import './styles/commerce.css'
import './styles/relationship.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
