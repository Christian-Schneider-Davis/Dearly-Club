import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'
import { ConsentProvider } from './components/consent/ConsentProvider'
import { syncSessionHint } from './lib/sessionHint'

// BASE_URL is '/' locally and '/Dearly-Club/' on the GitHub Pages project URL.
// Show "Your account" (not "Log in") to anyone still signed in on this device.
syncSessionHint()

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <ConsentProvider>
        <App />
      </ConsentProvider>
    </BrowserRouter>
  </StrictMode>,
)
