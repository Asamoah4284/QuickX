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
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // In development, automatically unregister any leftover service workers and clear workbox caches
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key);
      }
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
