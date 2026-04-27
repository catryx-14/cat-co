import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { initAtmosphere } from './atmosphere.js'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'

initAtmosphere()

ReactDOM.createRoot(document.getElementById('app-root')).render(
  <AuthGate>{(session) => <App session={session} />}</AuthGate>
)
