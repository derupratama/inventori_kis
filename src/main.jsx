import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'
import './styles/app.css'

const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
if (import.meta.env.PROD && window.location.protocol === 'http:' && !isLocalHost) {
  window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`)
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  window.deferredPwaInstallPrompt = event
  window.dispatchEvent(new Event('pwa-install-available'))
})
window.addEventListener('appinstalled', () => {
  window.deferredPwaInstallPrompt = null
  window.dispatchEvent(new Event('pwa-installed'))
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
