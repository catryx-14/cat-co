import { useState, useEffect, useMemo } from 'react'
import TrackerRoom from './rooms/energy-tracker/TrackerRoom.jsx'
import SparksRoom from './rooms/sparks/SparksRoom.jsx'
import EngineRoom from './rooms/engine-room/EngineRoom.jsx'
import FirstAidRoom from './rooms/first-aid/FirstAidRoom.jsx'
import { loadSettings } from './shared/lib/db.js'

// ── Room registry (nav + routing) ───────────────────────────────────────────
const ROOMS = [
  { key: 'tracker',     name: 'Energy Tracker', sub: 'today · horizon · history', tone: 'warm'   },
  { key: 'sparks',      name: 'Sparks',          sub: 'hold them gently',          tone: 'rose'   },
  { key: 'physio',      name: 'First Aid',        sub: 'gentle attention',          tone: 'teal'   },
  { key: 'games',       name: 'Games',            sub: 'a soft place to drift',     tone: 'purple' },
  { key: 'more-lights', name: 'More Lights',      sub: 'more rooms this way',       tone: 'purple' },
]

// ── Lantern config (Threshold hub) ───────────────────────────────────────────
const LANTERN_ROOMS = [
  { id: 'almanac', name: 'Energy Tracker', sub: 'today · horizon · history', glow: '#3a78d8', glow2: '#86b6ff', svg: '/assets/lantern-01.svg', roomKey: 'tracker'     },
  { id: 'sparks',  name: 'Sparks',          sub: 'hold them gently',          glow: '#e35a4a', glow2: '#ffb098', svg: '/assets/lantern-07.svg', roomKey: 'sparks'      },
  { id: 'neural',  name: 'First Aid',        sub: 'gentle attention',          glow: '#a8132a', glow2: '#ff7888', svg: '/assets/lantern-02.svg', roomKey: 'physio'      },
  { id: 'games',   name: 'Games',            sub: 'a soft place to drift',     glow: '#2a8a5a', glow2: '#88e2b4', svg: '/assets/lantern-04.svg', roomKey: 'games'       },
  { id: 'threads', name: 'More Lights',      sub: 'more rooms this way',       glow: '#7a4ad8', glow2: '#c8a8ff', svg: '/assets/lantern-03.svg', roomKey: 'more-lights' },
]

function lanternLayout(isMobile) {
  if (isMobile) {
    return [
      { id: 'almanac', xPct: 14, chainVh: 4,  size: 60, sway: 1.2, delay: 0.0 },
      { id: 'sparks',  xPct: 36, chainVh: 12, size: 64, sway: 0.8, delay: 1.4 },
      { id: 'neural',  xPct: 58, chainVh: 8,  size: 60, sway: 1.6, delay: 0.7 },
      { id: 'games',   xPct: 80, chainVh: 14, size: 62, sway: 1.0, delay: 2.1 },
      { id: 'threads', xPct: 26, chainVh: 18, size: 56, sway: 1.4, delay: 2.8 },
    ]
  }
  return [
    { id: 'almanac', xPct: 16, chainVh: 5,  size: 100, sway: 1.4, delay: 0.0 },
    { id: 'sparks',  xPct: 33, chainVh: 10, size: 92,  sway: 0.9, delay: 1.6 },
    { id: 'neural',  xPct: 54, chainVh: 8,  size: 96,  sway: 1.7, delay: 0.6 },
    { id: 'games',   xPct: 72, chainVh: 10, size: 94,  sway: 1.0, delay: 2.4 },
    { id: 'threads', xPct: 88, chainVh: 4,  size: 90,  sway: 1.3, delay: 3.1 },
  ]
}

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const on = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return m
}

// ── Threshold atmosphere ─────────────────────────────────────────────────────

function ThresholdMoon() {
  return (
    <div style={{
      position: 'fixed',
      top: 'clamp(60px, 10vh, 160px)',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'clamp(340px, 46vw, 640px)',
      height: 'clamp(340px, 46vw, 640px)',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.52,
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="t-moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(225,238,252,0.6)" />
            <stop offset="22%"  stopColor="rgba(195,220,242,0.32)" />
            <stop offset="45%"  stopColor="rgba(170,200,230,0.14)" />
            <stop offset="75%"  stopColor="rgba(160,190,220,0.05)" />
            <stop offset="100%" stopColor="rgba(160,190,220,0)" />
          </radialGradient>
          <radialGradient id="t-moon-body" cx="42%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#f8f4e8" />
            <stop offset="40%"  stopColor="#e4e6e8" />
            <stop offset="70%"  stopColor="#c8cfd8" />
            <stop offset="100%" stopColor="#8ea0b0" />
          </radialGradient>
          <radialGradient id="t-moon-texture" cx="60%" cy="55%" r="40%">
            <stop offset="0%"   stopColor="rgba(150,170,190,0)" />
            <stop offset="100%" stopColor="rgba(110,130,160,0.32)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#t-moon-halo)" />
        <circle cx="50" cy="50" r="24" fill="url(#t-moon-body)" />
        <circle cx="50" cy="50" r="24" fill="url(#t-moon-texture)" opacity="0.55" />
        <circle cx="46" cy="46" r="1.7" fill="rgba(130,150,175,0.25)" />
        <circle cx="55" cy="53" r="2.1" fill="rgba(130,150,175,0.3)" />
        <circle cx="51" cy="44" r="1.0" fill="rgba(130,150,175,0.22)" />
        <circle cx="44" cy="55" r="1.3" fill="rgba(130,150,175,0.2)" />
      </svg>
    </div>
  )
}

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

function ThresholdForestFrame() {
  const grassTufts = useMemo(() => {
    let s = 314
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: 70 }).map(() => ({
      x: rn() * 1600, y: 880 + rn() * 110,
      h: 12 + rn() * 26, sway: (rn() - 0.5) * 4, o: 0.35 + rn() * 0.45,
    }))
  }, [])
  const flowerBlooms = useMemo(() => {
    let s = 1729
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const palette = ['#e8d8f0', '#f4e0e6', '#dfe8f4', '#f0e6c8', '#e0d4ec']
    return Array.from({ length: 46 }).map(() => ({
      x: rn() * 1600, y: 860 + rn() * 130,
      r: 3 + rn() * 5,
      color: palette[Math.floor(rn() * palette.length)],
      o: 0.55 + rn() * 0.4,
    }))
  }, [])
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <defs>
        <radialGradient id="t-leftHaze"  cx="0%"   cy="60%" r="55%">
          <stop offset="0%"   stopColor="rgba(20,28,48,0.85)" />
          <stop offset="55%"  stopColor="rgba(18,24,42,0.55)" />
          <stop offset="100%" stopColor="rgba(8,12,28,0)" />
        </radialGradient>
        <radialGradient id="t-rightHaze" cx="100%" cy="60%" r="55%">
          <stop offset="0%"   stopColor="rgba(20,28,48,0.85)" />
          <stop offset="55%"  stopColor="rgba(18,24,42,0.55)" />
          <stop offset="100%" stopColor="rgba(8,12,28,0)" />
        </radialGradient>
        <linearGradient id="t-groundFog" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%"   stopColor="rgba(8,14,36,0.75)" />
          <stop offset="45%"  stopColor="rgba(12,20,48,0.35)" />
          <stop offset="100%" stopColor="rgba(12,20,48,0)" />
        </linearGradient>
        <linearGradient id="t-floorFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(10,15,32,0)" />
          <stop offset="60%"  stopColor="rgba(8,12,28,0.6)" />
          <stop offset="100%" stopColor="rgba(6,10,22,0.95)" />
        </linearGradient>
        <radialGradient id="t-flowerPatch" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="rgba(38,28,55,0.6)" />
          <stop offset="100%" stopColor="rgba(20,18,40,0)" />
        </radialGradient>
        <filter id="t-softblur"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="t-lightblur"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect x="0"    y="0" width="520"  height="1000" fill="url(#t-leftHaze)" />
      <rect x="1080" y="0" width="520"  height="1000" fill="url(#t-rightHaze)" />
      <ellipse cx="800" cy="960" rx="1100" ry="280" fill="url(#t-floorFade)" />
      <g filter="url(#t-softblur)" opacity="0.85">
        <ellipse cx="180"  cy="940" rx="320" ry="120" fill="url(#t-flowerPatch)" />
        <ellipse cx="1420" cy="940" rx="320" ry="120" fill="url(#t-flowerPatch)" />
        <ellipse cx="800"  cy="980" rx="500" ry="80"  fill="url(#t-flowerPatch)" />
      </g>
      <g opacity="0.9">
        {grassTufts.map((g, i) => (
          <path key={i}
            d={`M ${g.x} ${g.y} Q ${g.x + g.sway} ${g.y - g.h * 0.6} ${g.x + g.sway * 1.5} ${g.y - g.h}`}
            stroke="rgba(60,80,90,0.7)" strokeWidth="0.7" fill="none" opacity={g.o} />
        ))}
      </g>
      <g filter="url(#t-lightblur)">
        {flowerBlooms.map((f, i) => (
          <g key={i} opacity={f.o} transform={`translate(${f.x}, ${f.y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy={-f.r * 0.8} rx={f.r * 0.4} ry={f.r * 0.7}
                transform={`rotate(${a})`} fill={f.color} />
            ))}
            <circle cx="0" cy="0" r={f.r * 0.3} fill="#fff7d0" opacity="0.9" />
          </g>
        ))}
      </g>
      <rect x="0" y="640" width="1600" height="360" fill="url(#t-groundFog)" opacity="1" />
    </svg>
  )
}

function ThresholdAmbientBokeh() {
  const orbs = useMemo(() => {
    let s = 555
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    const colors = ['#5FAFA7', '#E8B87C', '#E39AAA', '#B29AD8', '#7CB78E', '#F0D080', '#a6d6ff']
    return Array.from({ length: 22 }).map(() => ({
      x: rn() * 100, y: rn() * 100,
      size: 30 + rn() * 90,
      color: colors[Math.floor(rn() * colors.length)],
      opacity: 0.15 + rn() * 0.22,
      dur: 10 + rn() * 14,
      dx: (rn() - 0.5) * 30,
      dy: (rn() - 0.5) * 30,
      delay: rn() * 8,
    }))
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
      {orbs.map((o, i) => (
        <div key={i} className="threshold-orb" style={{
          position: 'absolute',
          left: `${o.x}%`, top: `${o.y}%`,
          width: o.size, height: o.size,
          background: `radial-gradient(circle at 38% 38%, ${o.color}ee, ${o.color}66 35%, ${o.color}22 65%, transparent 78%)`,
          borderRadius: '50%',
          opacity: o.opacity,
          filter: `blur(${o.size * 0.05}px)`,
          '--dur': `${o.dur}s`,
          '--delay': `-${o.delay}s`,
          '--dx': `${o.dx}px`,
          '--dy': `${o.dy}px`,
        }} />
      ))}
    </div>
  )
}

function ThresholdFireflies() {
  const flies = useMemo(() => {
    let s = 2024
    const rn = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: 28 }).map(() => ({
      x: rn() * 100, y: 30 + rn() * 65,
      size: 2 + rn() * 2.5,
      dur: 7 + rn() * 9,
      delay: rn() * 10,
      fx: (rn() - 0.5) * 100,
      fy: -(15 + rn() * 50),
      hue: rn() < 0.15 ? '#fff4c0' : '#fdd874',
    }))
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {flies.map((f, i) => (
        <div key={i} className="threshold-firefly" style={{
          position: 'absolute',
          left: `${f.x}%`, top: `${f.y}%`,
          width: f.size, height: f.size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${f.hue}, ${f.hue}88 40%, transparent 70%)`,
          boxShadow: `0 0 ${f.size * 3}px ${f.hue}, 0 0 ${f.size * 6}px ${f.hue}66`,
          '--dur': `${f.dur}s`,
          '--delay': `-${f.delay}s`,
          '--fx': `${f.fx}px`,
          '--fy': `${f.fy}px`,
        }} />
      ))}
    </div>
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
      justifyContent: 'center',
      gap: 'clamp(16px, 3vw, 36px)',
      margin: '24px auto 0',
      maxWidth: 760,
      padding: '0 24px',
    }}>
      <div className="goldrule" style={{
        flex: 1, height: 1, maxWidth: 240,
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
        flex: 1, height: 1, maxWidth: 240,
        background: 'linear-gradient(90deg, rgba(244,212,158,0.95) 0%, rgba(232,184,124,0.6) 60%, rgba(232,184,124,0) 100%)',
        boxShadow: '0 0 8px rgba(244,212,158,0.4)',
      }} />
    </div>
  )
}

function ThresholdHangingLantern({ room, xPct, chainVh, size, sway, delay, onPick }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className="threshold-lantern-wrap"
      role="button"
      tabIndex={0}
      aria-label={`Enter ${room.name} — ${room.sub}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPick(room.roomKey)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(room.roomKey) } }}
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: 0,
        transform: 'translateX(-50%)',
        width: size,
        pointerEvents: 'auto',
        cursor: 'pointer',
        animation: `thresholdLanternSway ${10 + sway}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformOrigin: 'top center',
        outline: 'none',
      }}>
      {/* fine gold chain */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        width: 1.2,
        height: `${chainVh}vh`,
        background: 'linear-gradient(180deg, rgba(244,212,158,0.95) 0%, rgba(244,212,158,0.85) 40%, rgba(232,184,124,0.7) 100%)',
        boxShadow: '0 0 4px rgba(244,212,158,0.5)',
      }} />
      {/* anchor ring at gold rule */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: -3,
        transform: 'translateX(-50%)',
        width: 6, height: 6,
        borderRadius: '50%',
        border: '1px solid rgba(244,212,158,0.95)',
        boxShadow: '0 0 6px rgba(244,212,158,0.7)',
      }} />
      {/* chain-to-lantern link */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `calc(${chainVh}vh - 8px)`,
        transform: 'translateX(-50%)',
        width: 5, height: 10,
        background: 'linear-gradient(180deg, rgba(232,184,124,0.7), rgba(244,212,158,1))',
        borderRadius: 2,
        boxShadow: '0 0 6px rgba(244,212,158,0.7)',
      }} />

      {/* lantern body */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `${chainVh}vh`,
        transform: `translate(-50%, 0) scale(${hover ? 1.06 : 1})`,
        width: size,
        height: size * 1.3,
        transition: 'transform 380ms cubic-bezier(.2,.9,.2,1)',
      }}>
        {/* coloured radial glow */}
        <div style={{
          position: 'absolute',
          inset: '-30%',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 52%, ${room.glow2} 0%, ${room.glow}cc 18%, ${room.glow}55 40%, ${room.glow}00 75%)`,
          filter: `blur(${hover ? 10 : 14}px)`,
          opacity: hover ? 1 : 0.85,
          transition: 'opacity 300ms, filter 300ms',
          mixBlendMode: 'screen',
          animation: 'thresholdLanternBreathe 4s ease-in-out infinite',
          animationDelay: `${delay}s`,
        }} />
        {/* candle core */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '54%',
          width: '40%', height: '40%',
          borderRadius: '50%',
          background: `radial-gradient(circle, #fff8d4 0%, ${room.glow2} 40%, ${room.glow}aa 70%, transparent 90%)`,
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
          animation: 'thresholdLanternFlicker 3.2s ease-in-out infinite',
          animationDelay: `${delay * 0.7}s`,
        }} />
        {/* lantern SVG metalwork */}
        <img src={room.svg} alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'brightness(0.18) drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
            pointerEvents: 'none',
            userSelect: 'none',
          }} />
      </div>

      {/* label — always visible, brightens on hover */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: `calc(${chainVh}vh + ${size * 1.3 + 10}px)`,
        transform: 'translate(-50%, 0)',
        pointerEvents: 'none',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        transition: 'opacity 280ms',
      }}>
        <div style={{
          fontFamily: 'Italiana, serif',
          fontSize: 20,
          color: hover ? '#fff4d0' : '#e8dfc0',
          letterSpacing: 1.5,
          textShadow: hover
            ? `0 0 18px ${room.glow}, 0 0 32px ${room.glow}88, 0 1px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)`
            : '0 1px 6px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.7)',
          transition: 'color 280ms, text-shadow 280ms',
        }}>{room.name}</div>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 13,
          color: hover ? '#d6c8b5' : '#c4b89a',
          marginTop: 2,
          letterSpacing: 0.3,
          textShadow: '0 1px 5px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.6)',
          transition: 'color 280ms',
        }}>{room.sub}</div>
      </div>
    </div>
  )
}

function ThresholdCatsOnFence() {
  return (
    <div style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      height: '22vh',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {/* mist wisps at fence base */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 55% 35% at 28% 100%, rgba(120,145,200,0.22) 0%, transparent 70%)',
          'radial-gradient(ellipse 38% 22% at 55% 100%, rgba(100,130,190,0.14) 0%, transparent 65%)',
          'radial-gradient(ellipse 65% 28% at 12% 100%, rgba(110,140,195,0.18) 0%, transparent 68%)',
          'radial-gradient(ellipse 45% 20% at 70% 100%, rgba(90,120,180,0.12) 0%, transparent 60%)',
          'linear-gradient(0deg, rgba(6,12,32,0.55) 0%, rgba(8,16,40,0.15) 45%, transparent 100%)',
        ].join(', '),
      }} />
      {/* cats image — offset left of centre */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0, bottom: 0,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingLeft: '6vw',
      }}>
        <img src="/assets/cats-on-fence.png" alt=""
          draggable={false}
          style={{
            height: '30vh',
            width: 'auto',
            maxWidth: '82vw',
            objectFit: 'contain',
            objectPosition: 'center bottom',
            mixBlendMode: 'screen',
            filter: 'brightness(0.90) contrast(1.05) saturate(0.9)',
            marginBottom: -4,
            userSelect: 'none',
          }} />
      </div>
    </div>
  )
}

// ── HubView — The Threshold landing page ─────────────────────────────────────
function HubView({ onPick }) {
  const isMobile = useIsMobile()
  const layout = useMemo(() => lanternLayout(isMobile), [isMobile])
  const [, setHovered] = useState(null)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* ── Atmospheric layers (position:fixed, pointer-events:none) ── */}
      <ThresholdMoon />
      <ThresholdStarField />
      <ThresholdForestFrame />
      <ThresholdAmbientBokeh />
      <ThresholdFireflies />

      {/* ── Hero block — top ~40vh ── */}
      <div style={{
        position: 'relative',
        zIndex: 4,
        textAlign: 'center',
        padding: isMobile ? '20px 18px 0' : '28px 24px 0',
      }}>
        {/* · the threshold · */}
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 'clamp(11px, 1.1vw, 13px)',
          letterSpacing: 6,
          textTransform: 'lowercase',
          color: '#c9b48a',
          textShadow: '0 0 14px rgba(232,184,124,0.35)',
          marginBottom: 0,
        }}>
          · the threshold ·
        </div>

        {/* Cat [logo] Co */}
        <div style={{
          fontFamily: 'Italiana, serif',
          fontSize: 'clamp(52px, 7.5vw, 110px)',
          margin: '8px 0 2px',
          letterSpacing: 2,
          lineHeight: 1,
          background: 'linear-gradient(180deg, #fff4c9 0%, #f3d98f 18%, #e8b87c 38%, #b8832e 56%, #8a5d28 72%, #d9a655 88%, #f3d98f 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
          filter: 'drop-shadow(0 1px 0 rgba(90,58,24,0.55)) drop-shadow(0 0 36px rgba(242,205,140,0.34))',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.18em',
          width: '100%',
        }}>
          <span>Cat</span>
          <img src="/assets/logo.png" alt="and"
            draggable={false}
            style={{
              height: '0.92em',
              width: 'auto',
              display: 'inline-block',
              verticalAlign: 'middle',
              transform: 'translateY(-0.04em)',
              filter: 'drop-shadow(0 0 18px rgba(242,205,140,0.45))',
              userSelect: 'none',
            }} />
          <span>Co</span>
        </div>

        {/* Hero text */}
        <div style={{
          margin: '10px auto 0',
          maxWidth: 580,
          padding: '0 24px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: isMobile ? 17 : 21,
          color: '#efe1cc',
          lineHeight: 1.55,
          textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 24px rgba(8,12,28,0.85), 0 0 48px rgba(8,12,28,0.6)',
          position: 'relative',
          zIndex: 1,
        }}>
          This is a liminal space.<br />
          a soft place to set your day down,<br />
          and small lights for the way ahead.
        </div>

        {/* Date / time bar */}
        <ThresholdDateBar />

        {/* ── Lantern hanging layer ── anchored at the date bar gold rule level */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          height: 0,
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 5,
        }}>
          {layout.map((L) => {
            const room = LANTERN_ROOMS.find(r => r.id === L.id)
            return (
              <ThresholdHangingLantern
                key={L.id}
                room={room}
                xPct={L.xPct}
                chainVh={L.chainVh}
                size={L.size}
                sway={L.sway}
                delay={L.delay}
                onPick={(key) => { setHovered(key); onPick(key) }}
              />
            )
          })}
        </div>
      </div>

      {/* Cats on fence */}
      <ThresholdCatsOnFence />

      {/* Take a breath */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: isMobile ? 6 : 8,
        textAlign: 'center',
        zIndex: 7,
        pointerEvents: 'none',
        padding: '0 24px',
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: isMobile ? 13 : 15,
          letterSpacing: 1.2,
          color: '#cdb89c',
          textShadow: '0 1px 8px rgba(0,0,0,0.7), 0 0 14px rgba(232,184,124,0.18)',
        }}>
          Take a breath. Nothing here is urgent.
        </span>
      </div>
    </div>
  )
}

// ─── Rail ───
function Rail({ inRoom, current, onPick, onHome }) {
  return (
    <div className={`rail ${inRoom ? 'expanded' : ''}`} aria-label="navigation">
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
function RoomView({ roomKey, onHome, onRoom, onSettings, session, settings, onThresholdsChange, trackerInitTab }) {
  const room = ROOMS.find(r => r.key === roomKey)
  if (roomKey === 'tracker') {
    return <TrackerRoom onHome={onHome} session={session} settings={settings} onThresholdsChange={onThresholdsChange} initialTab={trackerInitTab} />
  }
  if (roomKey === 'sparks') {
    return <SparksRoom onSettings={onSettings} session={session} />
  }
  if (roomKey === 'engine-room') {
    return <EngineRoom onSettings={onSettings} />
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
        this room hasn't been built yet — return to the threshold and choose another lantern.
      </div>
    </>
  )
}

// ─── App ───
export default function App({ session }) {
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
        setSettings({ taxValue: 3, thresholds: { yellow: 15, critical: 30 }, livedExperienceThresholds: { yellow: 12, critical: 22 }, taxStartDate: '2000-01-01' })
      })
  }, [])

  const updateThresholds = ({ yellow, critical, leYellow, leCritical }) => {
    setSettings(prev => ({
      ...prev,
      thresholds: { yellow, critical },
      livedExperienceThresholds: { yellow: leYellow ?? 12, critical: leCritical ?? 22 },
    }))
  }

  // Manage old bokeh/haze layers
  useEffect(() => {
    const bokeh = document.getElementById('bokeh-layer')
    if (bokeh) {
      if (view === 'hub') {
        bokeh.style.display = 'none'
      } else {
        bokeh.style.display = 'block'
        bokeh.style.opacity = '0.55'
        if (window.__rebuildBokeh) window.__rebuildBokeh(window.__warmth ?? 0.7)
      }
    }
  }, [view])

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

  const [trackerInitTab, setTrackerInitTab] = useState(null)

  const goRoom = (key) => { if (key === 'tracker') setTrackerInitTab(null); navigate(key, 'slow') }
  const goHome = () => navigate('hub', 'fast')
  const goSettings = () => { setTrackerInitTab('settings'); navigate('tracker', 'slow') }

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
              ? <HubView onPick={goRoom} />
              : <RoomView roomKey={view} onHome={goHome} onRoom={goRoom} onSettings={goSettings} session={session} settings={settings} onThresholdsChange={updateThresholds} trackerInitTab={trackerInitTab} />}
          </div>
        </main>
      </div>
    </>
  )
}
