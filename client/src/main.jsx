import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.addEventListener('error', e => console.error('[onerror]', e.message))
window.addEventListener('unhandledrejection', e => console.error('[unhandled]', e.reason))

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
