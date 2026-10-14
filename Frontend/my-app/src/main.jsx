import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { fetchPlatformCurrencySettings } from './utils/currencyStore'

// Sync platform currency and exchange rate settings on startup
fetchPlatformCurrencySettings().catch(() => {});

// Register the service worker in production only (dev SW breaks Vite)
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
    .catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
