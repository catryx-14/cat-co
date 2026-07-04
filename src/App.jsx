import { useState, useEffect, useMemo, useCallback } from 'react'
import TrackerV2Room from './rooms/energy-tracker/TrackerV2Room.jsx'
import SparksRoom from './rooms/sparks/SparksRoom.jsx'
import EngineRoom from './rooms/engine-room/EngineRoom.jsx'
import FirstAidRoom from './rooms/first-aid/FirstAidRoom.jsx'
import GamesRoom from './rooms/games/GamesRoom.jsx'
import MoreLightsRoom from './rooms/more-lights/MoreLightsRoom.jsx'
import BookPileRoom from './rooms/ef-suite/BookPileRoom.jsx'
import LostFoundRoom from './rooms/lost-found/LostFoundRoom.jsx'
import RegulationRoom from './rooms/regulation/RegulationRoom.jsx'
import { supabase } from './shared/lib/supabase.js'
import SupporterApp from './SupporterApp.jsx'
import { loadSettings } from './shared/lib/db.js'
import { DEFAULT_AUTISTIC_TAX } from './shared/lib/math.js'
import { todayDisplayStr } from './shared/lib/dates.js'
import RoomMark from './shared/components/RoomMark.jsx'

// ── Room registry — fallback names only (rail no longer uses this) ──────────
const ROOMS = [
  { key: 'tracker',     name: 'Capacity Tracker' }, /* HORIZON TAB — DEFERRED */
  { key: 'sparks',      name: 'Sparks'           },
  { key: 'physio',      name: 'First Aid'        },
  { key: 'regulation',  name: 'Regulation'       },
  { key: 'lost-found',  name: 'Lost + Found'     },
  { key: 'more-lights', name: 'More this way'    },
]

// Tone class per room slug — drives rail dot colour
const SLUG_TONE = {
  'capacity-tracker': 'warm',
  'first-aid':        'teal',
  'sparks':           'rose',
  'lost-found':       'blue',
  'book-pile':        'purple',
  'herding-cats':     'teal',
}

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

// ── Threshold nav grid — pin-driven 2-column tiles + "More this way" ──────────
// Follows the user's threshold_pins (in sort order); "More this way" is always
// the final tile. With the usual 5 pins this reads as the locked 2×3 (brief
// id=168), on a soft dark panel with one uniform thin border on every tile.
function ThresholdNavLinks({ links, onPick, isMobile }) {
  const btnStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-primary)',
    fontSize: isMobile ? 14 : 16,
    letterSpacing: '0.06em',
    padding: isMobile ? '10px 12px' : '11px 18px',
    cursor: 'pointer',
    transition: 'color 200ms, border-color 200ms, background 200ms',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }
  const onEnter = e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.borderColor = 'var(--color-accent-primary)' }
  const onLeave = e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)' }
  const cells = [...(links ?? []), { key: 'more-lights', name: 'More this way' }]
  return (
    <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? 10 : 12, width: '100%' }}>
      {cells.map(l => (
        <button key={l.key} onClick={() => onPick(l.key)} style={btnStyle}
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          {l.name}
        </button>
      ))}
    </nav>
  )
}

// ── Threshold atmosphere ─────────────────────────────────────────────────────

function ThresholdStarField() {
  const stars = useMemo(() => {
    let s = 1337
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const arr = []
    // Dust: many tiny, faint, mostly cream/blue — depth
    for (let i = 0; i < 150; i++) {
      arr.push({
        x: rn() * 100, y: rn() * 58,
        r: 0.15 + rn() * 0.55,
        o: 0.2 + rn() * 0.45,
        dur: 2.5 + rn() * 6,
        delay: rn() * 6,
        hue: rn() < 0.14 ? 'warm' : rn() < 0.30 ? 'blue' : 'cream',
      })
    }
    // Mid stars: varied size + brightness, a fair few warm
    for (let i = 0; i < 46; i++) {
      arr.push({
        x: rn() * 100, y: rn() * 54,
        r: 0.55 + rn() * 0.75,
        o: 0.45 + rn() * 0.45,
        dur: 3 + rn() * 5,
        delay: rn() * 5,
        hue: rn() < 0.34 ? 'warm' : rn() < 0.46 ? 'blue' : 'cream',
        glow: rn() < 0.4,
      })
    }
    // Beacons: bright warm-gold points like the image's amber bokeh
    for (let i = 0; i < 15; i++) {
      const gold = rn() < 0.7
      arr.push({
        x: rn() * 94 + 3, y: rn() * 46 + 2,
        r: 1.2 + rn() * 1.3,
        o: 0.82 + rn() * 0.18,
        dur: 4 + rn() * 4,
        delay: rn() * 4,
        hue: gold ? 'gold' : 'cream', big: true,
      })
    }
    return arr
  }, [])
  const color = (h) => h === 'gold' ? '#ffc866' : h === 'warm' ? '#ffd58a' : h === 'blue' ? '#bfd3f0' : '#f4f1e8'
  return (
    <svg className="threshold-starfield" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice"
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
                ? `drop-shadow(0 0 ${s.r * 0.35}px ${color(s.hue)}) drop-shadow(0 0 ${s.r}px ${color(s.hue)})`
                : s.glow
                  ? `drop-shadow(0 0 ${s.r * 0.3}px ${color(s.hue)})`
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
        color: '#2b3654',
        textTransform: 'lowercase',
        textShadow: 'none',
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

function BookPileStandalone({ onSettings }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">the book pile</h2>
          <RoomMark date={todayDisplayStr()} onSettings={onSettings} />
        </div>
      </div>
      <BookPileRoom />
    </div>
  )
}

// ── HubView — The Threshold landing page ─────────────────────────────────────
function HubView({ onPick, pins }) {
  const { mobile: isMobile } = useViewport()
  const links = (pins || []).map(p => ({ key: p.key, name: p.name }))

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Starfield background */}
      <ThresholdStarField />
      {/* Faint low cloud wisps easing page → image sky */}
      <div className="threshold-clouds" aria-hidden="true" />
      {/* Bottom treeline shadow — image foliage melts into this full-width band */}
      <div className="threshold-groundband" aria-hidden="true" />

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
          marginBottom: isMobile ? 44 : 70,
          textShadow: '0 1px 6px rgba(6,10,26,0.9), 0 0 2px rgba(6,10,26,0.8)',
          pointerEvents: 'none',
        }}>
          · the threshold ·
        </div>

        {/* Cat [logo] Co. — art-deco Italiana title in metallic gold, on a soft moon.
            The moon disc sits behind the mark (the animals below are looking up at it). */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Soft glowing moon behind the logo */}
          <div className="threshold-moon" aria-hidden="true" />

          <div className="threshold-title" style={{
            fontFamily: '"Italiana", "Cormorant Garamond", serif',
            fontSize: 'clamp(48px, 7vw, 100px)',
            letterSpacing: '0.04em',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.16em',
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'none',
          }}>
            <span className="threshold-title-word">Cat</span>
            <img src="/assets/logo.png" alt="and" draggable={false} style={{
              height: '1.15em', width: 'auto',
              display: 'inline-block', verticalAlign: 'middle',
              transform: 'translateY(0.08em)',
              filter: 'drop-shadow(0 1px 1px rgba(12,9,3,0.5)) drop-shadow(0 0 18px rgba(242,205,140,0.45))',
              userSelect: 'none',
            }} />
            <span className="threshold-title-word">Co.</span>
          </div>
        </div>

      </div>

      {/* ── Full-width date/time divider ── */}
      <ThresholdDateBar />

      {/* ── Two-column content area: tagline panel (left) + room grid panel (right) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'flex-start',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        padding: isMobile ? '16px 22px 20px' : '28px 60px 0',
        gap: isMobile ? 14 : 48,
        position: 'relative',
        zIndex: 6,
        minHeight: 0,
      }}>

        {/* Left: tagline block on a soft dark panel (keep the subtle darker edge) */}
        <div className="threshold-panel" style={{
          flex: isMobile ? '0 0 auto' : '0 1 460px',
          maxWidth: isMobile ? '100%' : 460,
          width: isMobile ? '100%' : undefined,
          padding: isMobile ? '16px 20px' : '26px 30px',
        }}>
          <div style={{
            fontFamily: 'var(--font-hero)',
            fontStyle: 'normal',
            fontSize: isMobile ? 'clamp(28px, 8vw, 38px)' : 'clamp(30px, 3.4vw, 48px)',
            color: '#f2f0e6',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
          }}>
            A place to think
          </div>
          <div style={{
            fontFamily: 'var(--font-hero)',
            fontStyle: 'italic',
            fontSize: isMobile ? 'clamp(28px, 8vw, 38px)' : 'clamp(30px, 3.4vw, 48px)',
            color: '#c4b5d4',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            marginBottom: isMobile ? 12 : 16,
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

        {/* Right: 2×3 room grid on a matching soft dark panel */}
        <div className="threshold-panel" style={{
          flex: isMobile ? '0 0 auto' : '0 1 460px',
          maxWidth: isMobile ? '100%' : 460,
          width: isMobile ? '100%' : undefined,
          padding: isMobile ? '18px 18px' : '24px 26px',
        }}>
          <ThresholdNavLinks links={links} onPick={onPick} isMobile={isMobile} />
        </div>

      </div>

      {/* ── Cat family banner — anchored to the page bottom, fades into the night sky ── */}
      <div className="threshold-family" aria-hidden="true">
        <img src="/assets/threshold-family.png" alt="" draggable={false} />
      </div>

    </div>
  )
}

// ─── Rail ───
function Rail({ inRoom, current, onPick, onHome, railPins }) {
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
        {(railPins || []).map(p => (
          <button key={p.key}
            type="button"
            className={`rail-nav-item ${SLUG_TONE[p.slug] ?? 'warm'} ${current === p.key ? 'active' : ''}`}
            onClick={() => onPick(p.key)}>
            <span className="dot" />
            <span className="label-text">{p.name}</span>
          </button>
        ))}
        <button
          type="button"
          className={`rail-nav-item purple ${current === 'more-lights' ? 'active' : ''}`}
          onClick={() => onPick('more-lights')}>
          <span className="dot" />
          <span className="label-text">More this way</span>
        </button>
      </nav>
    </div>
  )
}

// ─── RoomView ───
function RoomView({ roomKey, onHome, onRoom, onSettings, onEditAction, session, settings, onThresholdsChange, trackerInitTab, regulationInitAction, onConsumedInitAction, pins, onAddPin, onRemovePin }) {
  const room = ROOMS.find(r => r.key === roomKey)
  if (roomKey === 'tracker') {
    return <TrackerV2Room onHome={onHome} onRoom={onRoom} onEditAction={onEditAction} session={session} settings={settings} onThresholdsChange={onThresholdsChange} initialTab={trackerInitTab} />
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
  if (roomKey === 'regulation') {
    return <RegulationRoom onSettings={onSettings} session={session}
             initActionId={regulationInitAction} onConsumedInitAction={onConsumedInitAction} />
  }
  if (roomKey === 'herding-cats') {
    return <GamesRoom roomName="herding cats" onSettings={onSettings} initialGame="cat-sort" />
  }
  if (roomKey === 'more-lights') {
    const pinSlugs = new Set((pins || []).map(p => p.slug))
    return <MoreLightsRoom onRoom={onRoom} onSettings={onSettings} pinSlugs={pinSlugs} pinCount={(pins || []).length} onAddPin={onAddPin} onRemovePin={onRemovePin} />
  }
  if (roomKey === 'book-pile') {
    return <BookPileStandalone onSettings={onSettings} />
  }
  if (roomKey === 'lost-found') {
    return <LostFoundRoom onSettings={onSettings} />
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
  const [pins, setPins] = useState(null)
  const inRoom = view !== 'hub'

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(err => {
        console.error('failed to load settings', err)
        setSettings({ taxValue: DEFAULT_AUTISTIC_TAX, thresholds: { yellow: 15, orange: 25, critical: 30 }, livedExperienceThresholds: { yellow: 15, orange: 25, critical: 30 }, purpleFloors: { floor_day1: 25, floor_day2: 15 }, taxStartDate: '2000-01-01' })
      })
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('threshold_pins')
      .select('room_slug, sort_order, hub_rooms(name, route)')
      .eq('user_id', session.user.id)
      .order('sort_order')
      .then(({ data }) => {
        setPins((data || []).map(p => ({
          slug: p.room_slug,
          name: p.hub_rooms?.name ?? p.room_slug,
          key: p.hub_rooms?.route ?? p.room_slug,
          sort_order: p.sort_order,
        })))
      })
  }, [session?.user?.id])

  const addPin = useCallback(async (slug, name, routeKey) => {
    if (!session?.user?.id || pins === null || pins.length >= 5) return
    const sortOrder = pins.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1
    setPins(prev => prev ? [...prev, { slug, name, key: routeKey, sort_order: sortOrder }] : prev)
    await supabase.from('threshold_pins').insert({ user_id: session.user.id, room_slug: slug, sort_order: sortOrder })
  }, [pins, session?.user?.id])

  const removePin = useCallback(async (slug) => {
    if (!session?.user?.id) return
    setPins(prev => prev ? prev.filter(p => p.slug !== slug) : prev)
    await supabase.from('threshold_pins').delete().eq('user_id', session.user.id).eq('room_slug', slug)
  }, [session?.user?.id])

  const updateThresholds = ({ yellow, orange, critical, leYellow, leCritical }) => {
    const y = yellow   ?? leYellow   ?? 15
    const o = orange   ?? 25
    const c = critical ?? leCritical ?? 30
    setSettings(prev => ({
      ...prev,
      thresholds: { yellow: y, orange: o, critical: c },
      livedExperienceThresholds: { yellow: y, orange: o, critical: c },
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
  const [regulationInitAction, setRegulationInitAction] = useState(null)

  const goRoom = (key) => {
    if (key === 'tracker') setTrackerInitTab(null)
    setView(key)
  }
  const goHome = () => setView('hub')
  const goSettings = () => { setTrackerInitTab('settings'); setView('tracker') }
  // Jump from the Tracker's picker to a specific action's card in the Regulation room.
  const goEditAction = (actionId) => { setRegulationInitAction(actionId); setView('regulation') }

  const fadeClass = `view-fade ${view === 'hub' ? 'is-hub' : 'is-room'}`

  if (!settings) return null

  return (
    <>
      <div className="stage">
        {inRoom && <Rail inRoom={inRoom} current={view} onPick={goRoom} onHome={goHome} railPins={pins} />}
        <main className="view">
          <div className={fadeClass} key={view}>
            {view === 'hub'
              ? <HubView onPick={goRoom} pins={pins} />
              : <RoomView roomKey={view} onHome={goHome} onRoom={goRoom} onSettings={goSettings} onEditAction={goEditAction} session={session} settings={settings} onThresholdsChange={updateThresholds} trackerInitTab={trackerInitTab} regulationInitAction={regulationInitAction} onConsumedInitAction={() => setRegulationInitAction(null)} pins={pins} onAddPin={addPin} onRemovePin={removePin} />}
          </div>
        </main>
      </div>
    </>
  )
}
