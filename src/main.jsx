import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './shared/index.css'
import { initAtmosphere } from './shared/atmosphere.js'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import JewelKitGallery from './components/jewelry/JewelKitGallery.jsx'

initAtmosphere()

const root = ReactDOM.createRoot(document.getElementById('app-root'))

// Dev gallery for the Jewelry & Joy kit — /?kit=1 (no auth needed to preview art).
if (new URLSearchParams(window.location.search).has('kit')) {
  root.render(<JewelKitGallery />)
} else {
  root.render(
    <BrowserRouter>
      <AuthGate>{(session, profile) => <App session={session} profile={profile} />}</AuthGate>
    </BrowserRouter>
  )
}
