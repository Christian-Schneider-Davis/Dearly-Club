import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'
import { ConsentProvider } from './components/consent/ConsentProvider'

// BASE_URL is '/' locally and '/Dearly-Club/' on the GitHub Pages project URL.
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
