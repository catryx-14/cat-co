import { useState, useEffect, useRef } from 'react'
import { buildBokeh } from './atmosphere.js'
import TrackerRoom from './TrackerRoom.jsx'
import SparksRoom from './SparksRoom.jsx'
import EngineRoom from './EngineRoom.jsx'
import { loadSettings } from './lib/db.js'

const ROOMS = [
  { key: 'tracker', name: 'Energy Tracker', sub: 'today · horizon · history', tone: 'warm',   x: 15, y: 32, breathe: 5.2, delay: '0s'    },
  { key: 'sparks',  name: 'Sparks',         sub: 'hold them gently',             tone: 'rose',   x: 40, y: 18, breathe: 4.6, delay: '-1.2s' },
  { key: 'physio',  name: 'Neural Physio',  sub: 'gentle exercises',             tone: 'teal',   x: 68, y: 30, breathe: 5.6, delay: '-2.1s' },
  { key: 'games',   name: 'Games',          sub: 'low-stakes play',              tone: 'purple', x: 73, y: 62, breathe: 4.8, delay: '-0.6s' },
  { key: 'library', name: 'Library',        sub: 'what i\u2019m reading',        tone: 'warm',   x: 23, y: 70, breathe: 5.0, delay: '-2.6s' },
  { key: 'threads', name: 'Threads',        sub: 'thinking-in-progress',         tone: 'rose',   x: 47, y: 55, breathe: 5.4, delay: '-1.8s' },
]

// ─── Threshold door definitions ───
// x/y are % of .field (not viewport). zone is [xLo, xHi, yLo, yHi] as fractions of .field.
// physio yHi=0.45 and games yLo=0.55 creates a clean 10% gap so they never overlap vertically.
const HUB_DOORS = [
  { key: 'tracker', name: 'Energy Tracker', sub: 'today · horizon · history',
    bright: [210,235,255], mid: [25,90,235],  deep: [8,25,120],  x: 20, y: 50,
    zone: [0.08, 0.42, 0.15, 0.85] },
  { key: 'sparks',  name: 'Sparks',          sub: 'hold them gently',
    bright: [255,188,205], mid: [205,28,65],  deep: [110,5,25],  x: 50, y: 22,
    zone: [0.28, 0.72, 0.00, 0.50] },
  { key: 'physio',  name: 'First Aid',        sub: 'gentle attention',
    bright: [185,255,212], mid: [12,165,72],  deep: [0,75,30],   x: 75, y: 22,
    zone: [0.54, 0.96, 0.00, 0.45] },
  { key: 'games',   name: 'More Lights',      sub: 'more rooms this way',
    bright: [238,212,255], mid: [130,25,210], deep: [55,5,130],  x: 62, y: 72,
    zone: [0.36, 0.86, 0.55, 1.00] },
]
// Exact shape from SparksRoom SparklePath
const STAR_PATH = 'M50,4 C52,30 54,46 96,50 C54,54 52,70 50,96 C48,70 46,54 4,50 C46,46 48,30 50,4 Z'
const STAR_SZ = 84
const GLOW_SZ = 220

// ─── RoomDoor ─── (Threshold 4-point star icons)
function RoomDoor({ door, idx, onPick }) {
  const driftRef = useRef(null)
  const bodyRef  = useRef(null)
  const orbitRef = useRef(null)
  const shimRef  = useRef(null)

  // Deterministic params — same formulas as FireflySpark in SparksRoom
  const R = (k) => {
    let s = ((idx + 1) * 7919 + k * 49297) % 233280
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  // Drift — amplitudes sized for a ~400-600px tall field; zone-clamped in tick
  const aX = 40  + R(4) * 60
  const aY = 28  + R(5) * 36
  const periodX = 9  + R(6)  * 10
  const periodY = 11 + R(7)  * 9
  const phaseX  = R(8)  * Math.PI * 2
  const phaseY  = R(9)  * Math.PI * 2
  // Rotation — exact same recipe as Sparks FireflySpark
  const rotPeriod = 18 + R(10) * 14
  const rotDir    = R(11) > 0.5 ? 1 : -1
  // Orbit
  const orbitPeriod = 6  + R(12) * 5
  const orbitDir    = R(13) > 0.55 ? 1 : -1
  const orbitR      = STAR_SZ / 2 + 12
  // Shimmer
  const shimPeriod  = 3.5 + R(15) * 2.5
  const shimPhase   = R(16) * Math.PI * 2

  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const t = (now - t0) / 1000 * 0.55
      const fieldEl = document.querySelector('.field')
      const fw = fieldEl ? fieldEl.offsetWidth  : window.innerWidth
      const fh = fieldEl ? fieldEl.offsetHeight : window.innerHeight * 0.52
      const [xLo, xHi, yLo, yHi] = door.zone
      const baseXpx = (door.x / 100) * fw
      const baseYpx = (door.y / 100) * fh
      const pad = STAR_SZ / 2 + 16
      const rawDx = Math.sin(t * (Math.PI * 2 / periodX) + phaseX) * aX
      const rawDy = Math.cos(t * (Math.PI * 2 / periodY) + phaseY) * aY
      const dx = Math.max(xLo * fw - baseXpx + pad, Math.min(xHi * fw - baseXpx - pad, rawDx))
      const dy = Math.max(yLo * fh - baseYpx + pad, Math.min(yHi * fh - baseYpx - pad, rawDy))
      if (driftRef.current)
        driftRef.current.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`
      if (bodyRef.current)
        bodyRef.current.style.transform = `rotate(${((t / rotPeriod) * 360 * rotDir).toFixed(2)}deg)`
      const oA = (t / orbitPeriod) * Math.PI * 2 * orbitDir
      if (orbitRef.current)
        orbitRef.current.style.transform =
          `translate(${(Math.cos(oA)*orbitR).toFixed(1)}px,${(Math.sin(oA)*orbitR).toFixed(1)}px)`
      if (shimRef.current)
        shimRef.current.style.opacity =
          ((0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / shimPeriod) + shimPhase)) * 0.2).toFixed(3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [aX, aY, periodX, periodY, phaseX, phaseY, rotPeriod, rotDir, orbitPeriod, orbitDir, orbitR, shimPeriod, shimPhase])

  const [br, bg, bb] = door.bright
  const [mr, mg, mb] = door.mid
  const [dr, dg, db] = door.deep
  const gradId = `dg-${door.key}`

  return (
    <a
      className={`room-door ${door.key}`}
      href="#"
      tabIndex={0}
      onClick={e => { e.preventDefault(); onPick(door.key) }}
      style={{ left: `${door.x}%`, top: `${door.y}%` }}
      aria-label={`Enter ${door.name}`}
    >
      <div ref={driftRef} className="room-door-drift">
        {/* soft outer glow — not rotated */}
        <div style={{
          position: 'absolute',
          left: -(GLOW_SZ - STAR_SZ) / 2, top: -(GLOW_SZ - STAR_SZ) / 2,
          width: GLOW_SZ, height: GLOW_SZ,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${mr},${mg},${mb},0.28) 0%, transparent 68%)`,
          filter: 'blur(26px)',
          pointerEvents: 'none',
        }} />

        {/* rotating star body */}
        <div ref={bodyRef} style={{
          position: 'absolute', left: 0, top: 0,
          width: STAR_SZ, height: STAR_SZ,
          willChange: 'transform',
        }}>
          <svg width={STAR_SZ} height={STAR_SZ} viewBox="0 0 100 100"
               style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={`rgb(${br},${bg},${bb})`} />
                <stop offset="55%"  stopColor={`rgb(${mr},${mg},${mb})`} />
                <stop offset="100%" stopColor={`rgb(${dr},${dg},${db})`} />
              </radialGradient>
            </defs>
            <path d={STAR_PATH} fill={`url(#${gradId})`} />
            <path ref={shimRef} d={STAR_PATH} fill="white" style={{ opacity: 0 }} />
          </svg>

        </div>

        {/* orbiting sparkle — not part of rotating body */}
        <div style={{ position: 'absolute', left: STAR_SZ / 2, top: STAR_SZ / 2, width: 0, height: 0 }}>
          <div ref={orbitRef} style={{ position: 'absolute', willChange: 'transform' }}>
            <div style={{
              position: 'absolute', marginLeft: -1.8, marginTop: -1.8,
              width: 3.6, height: 3.6, borderRadius: '50%',
              background: `rgba(${br},${bg},${bb},0.95)`,
              boxShadow: `0 0 5px rgba(${br},${bg},${bb},0.8), 0 0 10px rgba(${br},${bg},${bb},0.4)`,
            }} />
          </div>
        </div>

        {/* labels — restored from git history: Cagliostro + Crimson Pro */}
        <div style={{
          position: 'absolute', left: '50%', top: STAR_SZ + 14,
          transform: 'translateX(-50%)',
          textAlign: 'center', whiteSpace: 'nowrap',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* label sparkle — flickers at top-left of room name */}
            <div style={{
              position: 'absolute',
              right: 'calc(100% + 3px)', top: 0,
              width: 32, height: 32,
              pointerEvents: 'none', mixBlendMode: 'screen',
              background: `
                linear-gradient(90deg,  transparent 0%,transparent 38%,rgba(255,255,255,0.95) 50%,transparent 62%,transparent 100%),
                linear-gradient(0deg,   transparent 0%,transparent 38%,rgba(255,255,255,0.85) 50%,transparent 62%,transparent 100%),
                linear-gradient(45deg,  transparent 0%,transparent 44%,rgba(255,255,255,0.35) 50%,transparent 56%,transparent 100%),
                linear-gradient(-45deg, transparent 0%,transparent 44%,rgba(255,255,255,0.35) 50%,transparent 56%,transparent 100%)`,
              WebkitMask: 'radial-gradient(circle, #000 0%, #000 35%, transparent 70%)',
              mask: 'radial-gradient(circle, #000 0%, #000 35%, transparent 70%)',
              animation: 'label-sparkle-flash var(--sparkle-dur,4s) ease-in-out infinite',
              animationDelay: 'var(--sparkle-delay,0s)',
            }} />
            <div style={{
              color: 'rgba(255,255,255,0.88)',
              fontFamily: '"Cagliostro", serif',
              fontWeight: 400, fontSize: 22, letterSpacing: '0.04em', lineHeight: 1.3,
              textShadow: '0 0 14px rgba(14,19,34,0.9)',
            }}>
              {door.name}
            </div>
          </div>
          <div style={{
            color: `rgba(${br},${bg},${bb},0.65)`,
            fontFamily: '"Crimson Pro", serif', fontStyle: 'italic',
            fontSize: 13, marginTop: 4, letterSpacing: '0.04em',
            textShadow: '0 0 10px rgba(14,19,34,0.85)',
          }}>
            {door.sub}
          </div>
        </div>
      </div>
    </a>
  )
}

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
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* ── HERO CONTAINER — 40vh, content vertically centred ── */}
      <div style={{
        height: '40vh', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
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

      {/* ── STARS CONTAINER — 60vh, clips all drift, footer pinned at bottom ── */}
      <div style={{
        height: '60vh', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* field fills all space above footer */}
        <div className="field-wrap" style={{ flex: 1, position: 'relative', overflow: 'hidden', margin: 0 }}>
          <div className="field" style={{ position: 'absolute', inset: 0 }}>
            {HUB_DOORS.map((d, i) => (
              <RoomDoor key={d.key} door={d} idx={i} onPick={onPick} />
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
      if (view === 'hub') {
        bokeh.style.display = 'none'
      } else {
        bokeh.style.opacity = 0.25 + tweaks.particleDensity * 0.6
        bokeh.style.display = tweaks.particleDensity > 0.05 ? 'block' : 'none'
      }
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
