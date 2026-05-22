import { useState, useEffect, useMemo } from 'react'
import TrackerV2Room from './rooms/energy-tracker/TrackerV2Room.jsx'
import SparksRoom from './rooms/sparks/SparksRoom.jsx'
import EngineRoom from './rooms/engine-room/EngineRoom.jsx'
import FirstAidRoom from './rooms/first-aid/FirstAidRoom.jsx'
import GamesRoom from './rooms/games/GamesRoom.jsx'
import MoreLightsRoom from './rooms/more-lights/MoreLightsRoom.jsx'
import EFSuiteRoom from './rooms/ef-suite/EFSuiteRoom.jsx'
import SupporterApp from './SupporterApp.jsx'
import { loadSettings } from './shared/lib/db.js'
import { todayDisplayStr } from './shared/lib/dates.js'
import RoomMark from './shared/components/RoomMark.jsx'

// ── Room registry (nav + routing) ───────────────────────────────────────────
const ROOMS = [
  { key: 'tracker',     name: 'Capacity Tracker', sub: 'today · history',         tone: 'warm'   }, /* HORIZON TAB — DEFERRED: sub was 'today · horizon · history' */
  { key: 'sparks',      name: 'Sparks',           sub: 'hold them gently',         tone: 'rose'   },
  { key: 'physio',      name: 'First Aid',         sub: 'gentle attention',         tone: 'teal'   },
  { key: 'ef-suite',    name: 'Executive Suite',   sub: 'tools for doing things',   tone: 'blue'   },
  { key: 'more-lights', name: 'More Lights',       sub: 'more rooms this way',      tone: 'purple' },
]

function useViewport() {
  const [vp, setVp] = useState(() => {
    if (typeof window === 'undefined') return { mobile: false, short: false }
    return { mobile: window.innerWidth < 768, short: window.innerHeight < 790 }
  })
  useEffect(() => {
    const on = () => setVp({ mobile: window.innerWidth < 768, short: window.innerHeight < 790 })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

// ── Threshold nav grid — 2×2 + More Rooms (replaces lantern arc for MVP) ──────
// Row 1: Capacity Tracker | First Aid
// Row 2: Sparks           | Executive Suite
// Row 3: More Rooms (full width)
function ThresholdNavLinks({ onPick, isMobile }) {
  const mainLinks = [
    { key: 'tracker',  name: 'Capacity Tracker' },
    { key: 'physio',   name: 'First Aid'        },
    { key: 'sparks',   name: 'Sparks'           },
    { key: 'ef-suite', name: 'Executive Suite'  },
  ]
  const btnStyle = {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-primary)',
    fontSize: isMobile ? 14 : 16,
    letterSpacing: '0.06em',
    padding: isMobile ? '10px 12px' : '11px 20px',
    cursor: 'pointer',
    transition: 'color 200ms, border-color 200ms',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }
  const onEnter = e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.borderColor = 'var(--color-accent-primary)' }
  const onLeave = e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? 10 : 12 }}>
        {mainLinks.map(l => (
          <button key={l.key} onClick={() => onPick(l.key)} style={btnStyle}
            onMouseEnter={onEnter} onMouseLeave={onLeave}>
            {l.name}
          </button>
        ))}
      </div>
      <button onClick={() => onPick('more-lights')} style={btnStyle}
        onMouseEnter={onEnter} onMouseLeave={onLeave}>
        More Rooms
      </button>
    </nav>
  )
}

// ── Threshold atmosphere ─────────────────────────────────────────────────────

function ThresholdStarField() {
  const stars = useMemo(() => {
    let s = 1337
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const arr = []
    for (let i = 0; i < 180; i++) {
      arr.push({
        x: rn() * 100, y: rn() * 55,
        r: 0.3 + rn() * 1.1,
        o: 0.3 + rn() * 0.6,
        dur: 2.5 + rn() * 5,
        delay: rn() * 5,
        hue: rn() < 0.25 ? 'warm' : rn() < 0.35 ? 'blue' : 'cream',
      })
    }
    for (let i = 0; i < 12; i++) {
      arr.push({
        x: rn() * 96 + 2, y: rn() * 50 + 2,
        r: 1.6 + rn() * 1.2,
        o: 0.85 + rn() * 0.15,
        dur: 4 + rn() * 3,
        delay: rn() * 3,
        hue: 'warm', big: true,
      })
    }
    return arr
  }, [])
  const color = (h) => h === 'warm' ? '#ffd58a' : h === 'blue' ? '#bfd3f0' : '#f2f0e6'
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <circle key={i}
          cx={s.x} cy={s.y} r={s.r * 0.16}
          fill={color(s.hue)}
          className="threshold-star"
          style={{
            '--dur': `${s.dur}s`,
            '--op-max': s.o,
            '--op-min': s.o * 0.25,
            '--delay': `-${s.delay}s`,
            filter: s.big
              ? `drop-shadow(0 0 ${s.r * 0.3}px ${color(s.hue)}) drop-shadow(0 0 ${s.r * 0.8}px ${color(s.hue)})`
              : undefined,
          }} />
      ))}
    </svg>
  )
}

function ThresholdDateBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(t)
  }, [])

  const h = now.getHours()
  const tod = h < 5 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'
  const dayAbbrev = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')

  return (
    <div id="date-bar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(16px, 3vw, 36px)',
      margin: 'clamp(20px, 3vw, 32px) 0 0',
      position: 'relative',
      zIndex: 6,
    }}>
      <div className="goldrule" style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(232,184,124,0) 0%, rgba(232,184,124,0.6) 40%, rgba(244,212,158,0.95) 100%)',
        boxShadow: '0 0 8px rgba(244,212,158,0.4)',
      }} />
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 'clamp(13px, 1.5vw, 16px)',
        letterSpacing: 3,
        color: '#e9d8b9',
        textTransform: 'lowercase',
        textShadow: '0 0 12px rgba(232,184,124,0.4)',
        whiteSpace: 'nowrap',
      }}>
        {tod} · {dayAbbrev} · {hh}:{mm}
      </div>
      <div className="goldrule" style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(244,212,158,0.95) 0%, rgba(232,184,124,0.6) 60%, rgba(232,184,124,0) 100%)',
        boxShadow: '0 0 8px rgba(244,212,158,0.4)',
      }} />
    </div>
  )
}

function LibraryPlaceholder({ title = 'Library', onSettings }) {
  return (
    <>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{title}</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>
      <div className="placeholder">Coming Soon!</div>
    </>
  )
}

// ── HubView — The Threshold landing page ─────────────────────────────────────
function HubView({ onPick }) {
  const { mobile: isMobile } = useViewport()

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Starfield background */}
      {/* NIGHT GARDEN THEME: add ThresholdMoon, ThresholdForestFrame, ThresholdAmbientBokeh, ThresholdFireflies here */}
      <ThresholdStarField />

      {/* ── Top: subtitle + logo ── */}
      <div style={{
        textAlign: 'center',
        padding: isMobile ? '24px 24px 0' : '36px 48px 0',
        position: 'relative',
        zIndex: 6,
        flexShrink: 0,
      }}>

        {/* · the threshold · */}
        {/* NIGHT GARDEN THEME VALUE: night garden copy — "· the threshold ·" */}
        <div style={{
          fontFamily: 'var(--font-primary)',
          fontStyle: 'italic',
          fontSize: 'clamp(11px, 1.1vw, 13px)',
          letterSpacing: 8,
          textTransform: 'lowercase',
          color: 'var(--color-text-dim)',
          marginBottom: isMobile ? 10 : 14,
          pointerEvents: 'none',
        }}>
          · the threshold ·
        </div>

        {/* Cat [logo] Co. — cat ampersand SVG is permanent structure */}
        {/* NIGHT GARDEN THEME VALUE: title was Italiana, serif with gold gradient:
            linear-gradient(180deg, #fff4c9 0%, #f3d98f 18%, #e8b87c 38%, #b8832e 56%, #8a5d28 72%, #d9a655 88%, #f3d98f 100%)
            filter: drop-shadow(0 1px 0 rgba(90,58,24,0.55)) drop-shadow(0 0 36px rgba(242,205,140,0.34)) */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 7vw, 100px)',
          letterSpacing: 2,
          lineHeight: 1,
          color: 'var(--color-accent-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.18em',
          width: '100%',
          pointerEvents: 'none',
        }}>
          <span>Cat</span>
          <img src="/assets/logo.png" alt="and" draggable={false} style={{
            height: '1.15em', width: 'auto',
            display: 'inline-block', verticalAlign: 'middle',
            transform: 'translateY(0.08em)',
            filter: 'drop-shadow(0 0 18px rgba(242,205,140,0.45))',
            userSelect: 'none',
          }} />
          <span>Co.</span>
        </div>

      </div>

      {/* ── Full-width date/time divider ── */}
      <ThresholdDateBar />

      {/* ── Two-column content area: hero text (left) + room grid (right) ── */}
      {/* NIGHT GARDEN THEME — LANTERNS: restore ThresholdHangingLantern arc in place of this section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        padding: isMobile ? '32px 28px 28px' : '40px 60px',
        gap: isMobile ? 36 : 60,
        position: 'relative',
        zIndex: 6,
        minHeight: 0,
      }}>

        {/* Left: hero text */}
        {/* NIGHT GARDEN THEME VALUE: hero text was "This is a liminal space. / a soft place to set your day down, / and small lights for the way ahead." */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-hero)',
              fontStyle: 'normal',
              fontSize: isMobile ? 'clamp(28px, 8vw, 38px)' : 'clamp(32px, 3.8vw, 52px)',
              color: '#f2f0e6',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}>
              A place to think
            </div>
            <div style={{
              fontFamily: 'var(--font-hero)',
              fontStyle: 'italic',
              fontSize: isMobile ? 'clamp(28px, 8vw, 38px)' : 'clamp(32px, 3.8vw, 52px)',
              color: '#c4b5d4',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              marginBottom: isMobile ? 14 : 20,
            }}>
              out loud.
            </div>
            <div style={{
              fontFamily: 'var(--font-hero)',
              fontStyle: 'normal',
              fontSize: isMobile ? 14 : 'clamp(13px, 1.15vw, 16px)',
              color: 'var(--color-text-dim)',
              lineHeight: 1.65,
            }}>
              A personal hub for exploring what it means to be autistic — the mechanisms, the patterns, the daily navigation. Built to catch the thoughts before they disappear.
            </div>
          </div>
        </div>

        {/* Right: 2×3 room grid */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: isMobile ? 'stretch' : 'center' }}>
          <div style={{ width: isMobile ? '100%' : 'clamp(280px, 38vw, 460px)' }}>
            <ThresholdNavLinks onPick={onPick} isMobile={isMobile} />
          </div>
        </div>

      </div>

    </div>
  )
}

// ─── Rail ───
function Rail({ inRoom, current, onPick, onHome }) {
  return (
    <div className={`rail ${inRoom ? 'expanded' : ''}`} aria-label="navigation">
      <button
        type="button"
        className="rail-threshold-btn"
        aria-label="Return to the Threshold"
        onClick={onHome}
      >
        <img src="/assets/logo.png" alt="" className="rail-threshold-icon" draggable={false} />
      </button>
      <nav className="rail-nav" aria-hidden={!inRoom}>
        {ROOMS.map(r => (
          <button key={r.key}
             type="button"
             className={`rail-nav-item ${r.tone} ${current === r.key ? 'active' : ''}`}
             onClick={() => onPick(r.key)}>
            <span className="dot" />
            <span className="label-text">{r.name}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// ─── RoomView ───
function RoomView({ roomKey, onHome, onRoom, onSettings, session, settings, onThresholdsChange, trackerInitTab, efSuiteResetKey }) {
  const room = ROOMS.find(r => r.key === roomKey)
  if (roomKey === 'tracker') {
    return <TrackerV2Room onHome={onHome} onRoom={onRoom} session={session} settings={settings} initialTab={trackerInitTab} />
  }
  if (roomKey === 'sparks') {
    return <SparksRoom roomName={room?.name ?? 'Sparks'} onSettings={onSettings} />
  }
  if (roomKey === 'engine-room') {
    return <EngineRoom roomName={room?.name ?? 'Engine Room'} onSettings={onSettings} />
  }
  if (roomKey === 'physio') {
    return <FirstAidRoom onSettings={onSettings} />
  }
  if (roomKey === 'games') {
    return <GamesRoom roomName="Games" onSettings={onSettings} />
  }
  if (roomKey === 'more-lights') {
    return <MoreLightsRoom onRoom={onRoom} onSettings={onSettings} />
  }
  if (roomKey === 'ef-suite') {
    return <EFSuiteRoom key={efSuiteResetKey} onSettings={onSettings} />
  }
  if (roomKey === 'library') {
    return <LibraryPlaceholder onSettings={onSettings} />
  }
  return <LibraryPlaceholder title={room ? room.name : '—'} onSettings={onSettings} />
}

// ─── App ───
export default function App({ session, profile }) {
  if (profile?.role === 'supporter') return <SupporterApp profile={profile} />
  return <HubApp session={session} />
}

function HubApp({ session }) {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || 'hub'
  })
  const [settings, setSettings] = useState(null)
  const inRoom = view !== 'hub'

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(err => {
        console.error('failed to load settings', err)
        setSettings({ taxValue: 3, thresholds: { yellow: 15, critical: 30 }, livedExperienceThresholds: { yellow: 15, critical: 30 }, taxStartDate: '2000-01-01' })
      })
  }, [])

  const updateThresholds = ({ leYellow, leCritical }) => {
    setSettings(prev => ({
      ...prev,
      livedExperienceThresholds: { yellow: leYellow ?? 15, critical: leCritical ?? 30 },
    }))
  }

  // Sync sidebar border top to header height — uses ResizeObserver so tab switches stay in sync
  useEffect(() => {
    const rail = document.querySelector('.rail')
    if (!rail) return

    function sync() {
      const hdr = document.querySelector('.room-header-wrap')
      if (hdr) {
        rail.style.setProperty('--header-h', `${hdr.getBoundingClientRect().height}px`)
      } else {
        rail.style.removeProperty('--header-h')
      }
    }

    // Measure immediately + after layout settles
    const raf = requestAnimationFrame(sync)
    const timer = setTimeout(sync, 150)

    // Watch for height changes (tab switches change header height)
    const ro = new ResizeObserver(sync)
    const hdr = document.querySelector('.room-header-wrap')
    if (hdr) ro.observe(hdr)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [view])

  // NIGHT GARDEN THEME VALUE: bokeh was shown in all rooms (display block, opacity 0.55)
  // and hidden only on hub. MVP removes bokeh from all pages — keep layer hidden always.
  useEffect(() => {
    const bokeh = document.getElementById('bokeh-layer')
    if (bokeh) bokeh.style.display = 'none'
  }, [view])

  const [trackerInitTab, setTrackerInitTab] = useState(null)
  const [efSuiteResetKey, setEfSuiteResetKey] = useState(0)

  const goRoom = (key) => {
    if (key === 'tracker') {
      setTrackerInitTab(null)
    }
    if (key === 'ef-suite') {
      setEfSuiteResetKey(k => k + 1)
    }
    setView(key)
  }
  const goHome = () => setView('hub')
  const goSettings = () => { setTrackerInitTab('settings'); setView('tracker') }

  const fadeClass = `view-fade ${view === 'hub' ? 'is-hub' : 'is-room'}`

  if (!settings) return null

  return (
    <>
      <div className="stage">
        {inRoom && <Rail inRoom={inRoom} current={view} onPick={goRoom} onHome={goHome} />}
        <main className="view">
          <div className={fadeClass} key={view}>
            {view === 'hub'
              ? <HubView onPick={goRoom} />
              : <RoomView roomKey={view} onHome={goHome} onRoom={goRoom} onSettings={goSettings} session={session} settings={settings} onThresholdsChange={updateThresholds} trackerInitTab={trackerInitTab} efSuiteResetKey={efSuiteResetKey} />}
          </div>
        </main>
      </div>
    </>
  )
}
