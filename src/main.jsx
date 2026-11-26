import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PWABadge from './PWABadge.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <PWABadge />
  </StrictMode>,
)
