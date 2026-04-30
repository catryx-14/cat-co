import { useState, useEffect } from 'react'
import { buildBokeh } from './shared/atmosphere.js'
import TrackerRoom from './rooms/energy-tracker/TrackerRoom.jsx'
import SparksRoom from './rooms/sparks/SparksRoom.jsx'
import EngineRoom from './rooms/engine-room/EngineRoom.jsx'
import FirstAidRoom from './rooms/first-aid/FirstAidRoom.jsx'
import { loadSettings } from './shared/lib/db.js'

const ROOMS = [
  { key: 'tracker', name: 'Energy Tracker', sub: 'today · horizon · history', tone: 'warm',   x: 12, y: 42, breathe: 5.2, delay: '0s'    },
  { key: 'sparks',  name: 'Sparks',          sub: 'hold them gently',           tone: 'rose',   x: 38, y: 26, breathe: 4.6, delay: '-1.2s' },
  { key: 'physio',  name: 'First Aid',        sub: 'gentle attention',           tone: 'teal',   x: 66, y: 38, breathe: 5.6, delay: '-2.1s' },
  { key: 'games',   name: 'More Lights',      sub: 'more rooms this way',        tone: 'purple', x: 75, y: 56, breathe: 4.8, delay: '-0.6s' },
]


const TWEAK_DEFAULTS = {
  showSubtitles: true,
  particleDensity: 1,
  warmth: 0.7,
  heroLine: 'This is a liminal space.',
  showTime: true,
  settlePrompt: 'Take a breath. Nothing here is urgent.',
}

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 5)  return 'late'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function clockText() {
  const d = new Date()
  const hh = d.getHours()
  const mm = d.getMinutes().toString().padStart(2, '0')
  const day = ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()]
  return `${day} · ${hh}:${mm}`
}

// ─── RoomStar ───
function RoomStar({ room, showSub, onPick }) {
  return (
    <a className={`room-star ${room.tone} ${room.key}`} href="#" tabIndex="0"
       onClick={e => { e.preventDefault(); onPick(room.key) }}
       style={{ left: `${room.x}%`, top: `${room.y}%`, '--breathe': `${room.breathe}s`, '--delay': room.delay }}
       aria-label={`Enter ${room.name}`}>
      <span className="glow" />
      <span className="point" />
      <div className="label">{room.name}</div>
      {showSub && <div className="sub">{room.sub}</div>}
    </a>
  )
}

// ─── HubView ───
function HubView({ tweaks, onPick }) {
  const [clock, setClock] = useState(clockText())
  useEffect(() => {
    const id = setInterval(() => setClock(clockText()), 30000)
    return () => clearInterval(id)
  }, [])

  const tod = timeOfDay()
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── HERO CONTAINER — max 320px, content vertically centred ── */}
      <div style={{
        maxHeight: '320px', flexShrink: 0,
        flex: '0 0 auto', minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 0',
      }}>
        <p className="gloaming">the threshold</p>
        <h1 className="hub-mark">
          Cat<span className="amp" aria-label="and">
            <svg viewBox="0 0 229 329" aria-hidden="true">
              <defs>
                <linearGradient id="ampGold" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0.6" y2="1">
                  <stop offset="0%"   stopColor="#fff5cc"/>
                  <stop offset="22%"  stopColor="#f4d28a"/>
                  <stop offset="45%"  stopColor="#c9923a"/>
                  <stop offset="65%"  stopColor="#8c5a1c"/>
                  <stop offset="82%"  stopColor="#d4a352"/>
                  <stop offset="100%" stopColor="#7a4a14"/>
                </linearGradient>
                <filter id="ampBevel" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
                  <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.4" specularExponent="22" lightingColor="#fff8dc" result="spec">
                    <feDistantLight azimuth="225" elevation="45"/>
                  </feSpecularLighting>
                  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClipped"/>
                  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="specClipped"/></feMerge>
                </filter>
              </defs>
              <g filter="url(#ampBevel)">
                <path fill="url(#ampGold)" stroke="#5a3608" strokeWidth="1.5" strokeOpacity="0.55"
                  d="M 166 0 L 186 0 L 206 8 L 221 23 L 225 30 L 229 44 L 229 71 L 219 96 L 209 110 L 199 120 L 172 142 L 156 158 L 150 167 L 147 177 L 147 182 L 152 189 L 184 199 L 197 206 L 203 214 L 207 223 L 209 235 L 208 252 L 204 266 L 190 287 L 169 306 L 157 313 L 137 321 L 118 325 L 99 326 L 71 323 L 53 317 L 47 324 L 39 328 L 23 329 L 12 326 L 6 320 L 5 313 L 12 306 L 22 304 L 24 302 L 15 292 L 6 277 L 2 266 L 0 247 L 5 225 L 22 199 L 24 191 L 20 181 L 11 167 L 8 151 L 10 140 L 16 126 L 23 116 L 33 107 L 31 100 L 37 94 L 43 94 L 49 99 L 62 94 L 85 92 L 115 71 L 120 70 L 120 104 L 116 113 L 110 119 L 97 115 L 75 115 L 69 117 L 97 136 L 99 138 L 98 141 L 94 140 L 64 119 L 59 119 L 58 121 L 73 151 L 69 151 L 58 128 L 53 122 L 52 128 L 55 156 L 52 157 L 48 127 L 47 126 L 39 136 L 37 142 L 37 155 L 44 174 L 45 186 L 30 220 L 29 242 L 35 261 L 42 272 L 53 283 L 71 292 L 94 297 L 112 297 L 129 294 L 154 284 L 163 278 L 173 268 L 181 255 L 184 243 L 184 233 L 181 225 L 169 215 L 142 206 L 131 199 L 126 191 L 124 181 L 124 172 L 130 157 L 139 146 L 187 99 L 195 88 L 201 72 L 201 51 L 195 37 L 184 27 L 177 24 L 159 22 L 157 20 L 156 10 L 158 3 L 166 0 Z"/>
              </g>
            </svg>
          </span>Co
        </h1>
        <p className="hero-line">{tweaks.heroLine}</p>
        <p className="hero-sub">a soft place to set your day down,</p>
        <p className="hero-sub">and small lights for the way ahead.</p>
        {tweaks.showTime && <p className="hero-time">{tod} · {clock}</p>}
      </div>

      {/* ── STARS CONTAINER — remaining height, clips all drift, footer pinned at bottom ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* field fills all space above footer */}
        <div className="field-wrap" style={{ flex: 1, position: 'relative', overflow: 'hidden', margin: 0 }}>
          <div className="field" style={{ position: 'absolute', inset: 0 }}>
            {ROOMS.map(r => (
              <RoomStar key={r.key} room={r} showSub={tweaks.showSubtitles} onPick={onPick} />
            ))}
          </div>
        </div>

        {/* footer pinned at bottom of stars container */}
        <footer className="footer" style={{ flexShrink: 0, margin: 0, padding: '14px 56px 16px' }}>
          <div className="left">{tweaks.settlePrompt}</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <button
              onClick={() => onPick('engine-room')}
              style={{
                background: 'transparent', border: 0, padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'rgba(155,142,196,0.3)', cursor: 'pointer',
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(155,142,196,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(155,142,196,0.3)'}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <circle cx="8" cy="8" r="3"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
              </svg>
              engine room
            </button>
            <div className="right">v.0 · cagliostro · the gloaming</div>
          </div>
        </footer>
      </div>

    </div>
  )
}

// ─── Rail ───
function Rail({ inRoom, current, onPick, onHome }) {
  return (
    <div className={`rail ${inRoom ? 'expanded' : ''}`} aria-label="navigation">
      <div className="rail-mark" title="home" onClick={inRoom ? onHome : undefined} />
      <nav className="rail-nav" aria-hidden={!inRoom}>
        {ROOMS.map(r => (
          <a key={r.key}
             className={`rail-nav-item ${r.tone} ${current === r.key ? 'active' : ''}`}
             href="#"
             onClick={e => { e.preventDefault(); onPick(r.key) }}>
            <span className="dot" />
            <span className="label-text">{r.name}</span>
          </a>
        ))}
      </nav>
      <a className="rail-home" href="#" onClick={e => { e.preventDefault(); onHome() }}>
        back to the threshold
      </a>
    </div>
  )
}

// ─── RoomView ───
function RoomView({ roomKey, onHome, onRoom, session, settings, onThresholdsChange }) {
  const room = ROOMS.find(r => r.key === roomKey)
  if (roomKey === 'tracker') {
    return <TrackerRoom onHome={onHome} session={session} settings={settings} onThresholdsChange={onThresholdsChange} />
  }
  if (roomKey === 'sparks') {
    return <SparksRoom onHome={onHome} session={session} />
  }
  if (roomKey === 'engine-room') {
    return <EngineRoom onHome={onHome} />
  }
  if (roomKey === 'physio') {
    return <FirstAidRoom onHome={onHome} />
  }
  return (
    <>
      <div className="room-head">
        <h2 className="room-title">{room ? room.name : '—'}</h2>
      </div>
      <div className="placeholder">
        this room hasn't been built yet — return to the threshold and choose another star.
      </div>
    </>
  )
}

// ─── App ───
export default function App({ session }) {
  const tweaks = TWEAK_DEFAULTS
  const [view, setView] = useState('hub')
  const [leaving, setLeaving] = useState(false)
  const [fadingIn, setFadingIn] = useState(false)
  const [fast, setFast] = useState(false)
  const [settings, setSettings] = useState(null)
  const inRoom = view !== 'hub'

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(err => {
        console.error('failed to load settings', err)
        setSettings({ taxValue: 3, thresholds: { yellow: 15, critical: 30 }, taxStartDate: '2000-01-01' })
      })
  }, [])

  const updateThresholds = (thresholds) => {
    setSettings(prev => ({ ...prev, thresholds }))
  }

  // Sync atmosphere tweaks to CSS + bokeh (hidden on hub)
  useEffect(() => {
    document.documentElement.style.setProperty('--warmth', tweaks.warmth)
    window.__warmth = tweaks.warmth
    if (window.__rebuildBokeh) window.__rebuildBokeh(tweaks.warmth)
    const bokeh = document.getElementById('bokeh-layer')
    if (bokeh) {
      bokeh.style.opacity = 0.25 + tweaks.particleDensity * 0.6
      bokeh.style.display = tweaks.particleDensity > 0.05 ? 'block' : 'none'
    }
  }, [view, tweaks.warmth, tweaks.particleDensity])

  function navigate(target, speed) {
    const isFast = speed === 'fast'
    setLeaving(true)
    setTimeout(() => {
      setView(target)
      setLeaving(false)
      setFast(isFast)
      setFadingIn(true)
    }, isFast ? 350 : 900)
  }

  const goRoom = (key) => navigate(key, 'slow')
  const goHome = () => navigate('hub', 'fast')

  const fadeClass = [
    'view-fade',
    leaving ? 'leaving' : '',
    fadingIn && !leaving ? 'fading-in' : '',
    fast ? 'fast' : '',
    view === 'hub' ? 'is-hub' : 'is-room',
  ].filter(Boolean).join(' ')

  if (!settings) return null

  return (
    <>
      <div className="stage">
        {inRoom && <Rail inRoom={inRoom} current={view} onPick={goRoom} onHome={goHome} />}
        <main className="view">
          <div className={fadeClass} key={leaving ? `leaving-${view}` : view}>
            {view === 'hub'
              ? <HubView tweaks={tweaks} onPick={goRoom} />
              : <RoomView roomKey={view} onHome={goHome} onRoom={goRoom} session={session} settings={settings} onThresholdsChange={updateThresholds} />}
          </div>
        </main>
      </div>

    </>
  )
}
