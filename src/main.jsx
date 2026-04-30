import React from 'react'
import ReactDOM from 'react-dom/client'
import './shared/index.css'
import { initAtmosphere } from './shared/atmosphere.js'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'

initAtmosphere()

ReactDOM.createRoot(document.getElementById('app-root')).render(
  <AuthGate>{(session) => <App session={session} />}</AuthGate>
)
