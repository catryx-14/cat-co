import { useState, useEffect, useRef, useMemo } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { supabase } from '../../shared/lib/supabase.js'

// ─── tag system ────────────────────────────────────────────────────────
const TAGS = {
  'neural-physio': { label: 'Neural Physio', hue: [272, 88, 48], gem: '#8a2be2', gemDark: '#4b0d8f' },
  'hub':           { label: 'Hub',           hue: [42,  98, 52], gem: '#f0b400', gemDark: '#9c6a00' },
  'ask-claude':    { label: 'Ask Claude',    hue: [218, 92, 50], gem: '#1957d8', gemDark: '#0a2a8a' },
  'wes':           { label: 'Wes',           hue: [350, 90, 48], gem: '#d4143a', gemDark: '#7a0820' },
  'library':       { label: 'Library',       hue: [148, 88, 38], gem: '#089b5a', gemDark: '#04532f' },
  'general':       { label: 'General',       hue: [180, 88, 40], gem: '#0aaaaa', gemDark: '#055e5e' },
}
const TAG_ORDER = ['neural-physio', 'hub', 'ask-claude', 'wes', 'library', 'general']

function hsl(h, s, l, a = 1) {
  return `hsla(${h}, ${Math.max(0, Math.min(100, s))}%, ${Math.max(0, Math.min(100, l))}%, ${a})`
}
function hslOff([h, s, l], lOff = 0, sOff = 0, a = 1) {
  return hsl(h, s + sOff, l + lOff, a)
}

function teaser(text, n = 4) {
  const clean = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ')
  return words.slice(0, n).join(' ') + (words.length > n ? '…' : '')
}

function relTime(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return Math.floor(d / 60) + 'm'
  if (d < 86400) return Math.floor(d / 3600) + 'h'
  return Math.floor(d / 86400) + 'd'
}

// ─── gem pip ───────────────────────────────────────────────────────────
function GemPip({ color, dark, size = 11 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 32% 30%, #fff 0%, ${color} 38%, ${dark || color} 100%)`,
      boxShadow: `0 0 6px ${color}cc, inset 0 -1px 1px rgba(0,0,0,0.35)`,
      flexShrink: 0,
    }} />
  )
}

// ─── sparkle SVG ───────────────────────────────────────────────────────
function SparklePath({ size, gradId, ring, sparkId, dark, hovered }) {
  const p = 'M50,4 C52,30 54,46 96,50 C54,54 52,70 50,96 C48,70 46,54 4,50 C46,46 48,30 50,4 Z'
  const clipId = `sp-clip-${sparkId}`
  const facetId = `sp-facet-${sparkId}`
  const rimId = `sp-rim-${sparkId}`
  const shineId = `sp-shine-${sparkId}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={clipId}><path d={p} /></clipPath>
        <linearGradient id={facetId} x1="12%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%"   stopColor="#fff" stopOpacity={hovered ? 0.98 : 0.92} />
          <stop offset="15%"  stopColor="#fff" stopOpacity={0.45} />
          <stop offset="32%"  stopColor="#fff" stopOpacity={0.06} />
          <stop offset="55%"  stopColor="#000" stopOpacity={0.05} />
          <stop offset="75%"  stopColor="#000" stopOpacity={0.42} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.85} />
        </linearGradient>
        <radialGradient id={rimId} cx="28%" cy="20%" r="55%">
          <stop offset="50%"  stopColor="#fff" stopOpacity={0} />
          <stop offset="80%"  stopColor="#fff" stopOpacity={hovered ? 1 : 0.95} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={shineId} cx="32%" cy="28%" r="22%">
          <stop offset="0%"   stopColor="#fff" stopOpacity={hovered ? 0.95 : 0.78} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={p} fill={`url(#${gradId})`} />
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${facetId})`} />
      </g>
      <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'screen' }}>
        <rect x="0" y="0" width="100" height="100" fill={`url(#${shineId})`} />
      </g>
      <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'screen' }}>
        <path d={p} fill="none" stroke={`url(#${rimId})`} strokeWidth={4} strokeLinejoin="miter" />
      </g>
      <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }}>
        <g transform="translate(50 50) rotate(180) translate(-50 -50)">
          <path d={p} fill="none" stroke={dark} strokeOpacity={0.9} strokeWidth={3} strokeLinejoin="miter" />
        </g>
      </g>
      <path d={p} fill="none" stroke={ring} strokeWidth={0.7} strokeLinejoin="miter" />
    </svg>
  )
}

// ─── facet glints ──────────────────────────────────────────────────────
function FacetGlints({ size, sparkId, hovered }) {
  const glints = useMemo(() => {
    let s = 0
    for (let i = 0; i < sparkId.length; i++) s = (s * 31 + sparkId.charCodeAt(i)) | 0
    s = Math.abs(s)
    const r = (k) => { let v = (s * 9301 + k * 49297) % 233280; v = (v * 9301 + 49297) % 233280; return v / 233280 }
    return [0, 1, 2].map(i => ({
      orbitDur: 7 + r(i * 4 + 1) * 6,
      dir: r(i * 4 + 2) > 0.5 ? 1 : -1,
      startAngle: r(i * 4 + 3) * Math.PI * 2,
      pulsePeriod: 5 + r(i * 4 + 5) * 4,
      pulsePhase: r(i * 4 + 6) * Math.PI * 2,
    }))
  }, [sparkId])

  const r0 = useRef(null), r1 = useRef(null), r2 = useRef(null)
  const refs = [r0, r1, r2]

  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const t = (now - t0) / 1000
      glints.forEach((g, i) => {
        const a = g.startAngle + (t / g.orbitDur) * Math.PI * 2 * g.dir
        const rPx = (size / 2) * 0.78 * (1 + Math.cos(a * 4) * 0.32)
        const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / g.pulsePeriod) + g.pulsePhase))
        const el = refs[i].current
        if (el) {
          el.style.transform = `translate(${Math.cos(a) * rPx}px, ${Math.sin(a) * rPx}px)`
          el.style.opacity = (pulse * (hovered ? 1 : 0.85)).toFixed(3)
        }
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [glints, size, hovered])

  const gs = Math.max(4, size * 0.07)
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
        {refs.map((ref, i) => (
          <div key={i} ref={ref} style={{ position: 'absolute', left: -gs / 2, top: -gs / 2, width: gs, height: gs, willChange: 'transform, opacity' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${gs * 1.8}px #fff, 0 0 ${gs * 3}px rgba(255,255,255,0.6)` }} />
            <div style={{ position: 'absolute', left: '50%', top: '-40%', width: 1.5, height: '180%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85) 50%, transparent)', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '-40%', width: '180%', height: 1.5, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.85) 50%, transparent)', transform: 'translateY(-50%)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── firefly spark ─────────────────────────────────────────────────────
function FireflySpark({ spark, fieldW, fieldH, onClick, focused, dimmed, idx, total }) {
  const tagKey = (spark.tags && spark.tags[0]) || 'general'
  const tag = TAGS[tagKey] || TAGS['general']
  const sparkIdStr = String(spark.id)

  const seed = useMemo(() => {
    let n = 0
    for (let i = 0; i < sparkIdStr.length; i++) n = (n * 31 + sparkIdStr.charCodeAt(i)) | 0
    return Math.abs(n)
  }, [sparkIdStr])

  const rand = (k) => {
    let s = (seed * 9301 + k * 49297) % 233280
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }

  const lenN = Math.min(1, Math.max(0.15, spark.content.length / 220))
  const size = (64 + lenN * 56) * (0.92 + rand(1) * 0.20)

  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(Math.max(1, total)))))
  const rows = Math.max(1, Math.ceil(Math.max(1, total) / cols))
  const col = idx % cols
  const row = Math.floor(idx / cols)

  const aX = 26 + rand(4) * 38
  const aY = 18 + rand(5) * 28
  const padX = size / 2 + aX + 24
  const padY = size / 2 + aY + 24
  const innerW = Math.max(60, fieldW - padX * 2)
  const innerH = Math.max(60, fieldH - padY * 2)
  const baseX = padX + (col + 0.5) / cols * innerW + (rand(2) - 0.5) * (innerW / cols * 0.5)
  const baseY = padY + (row + 0.5) / rows * innerH + (rand(3) - 0.5) * (innerH / rows * 0.5)

  const periodX = 9 + rand(6) * 10
  const periodY = 11 + rand(7) * 9
  const phaseX = rand(8) * Math.PI * 2
  const phaseY = rand(9) * Math.PI * 2
  const rotPeriod = 18 + rand(10) * 14
  const rotDir = rand(11) > 0.5 ? 1 : -1
  const orbitPeriod = 6 + rand(12) * 5
  const orbitDir = rand(13) > 0.55 ? 1 : -1
  const orbitR = size * 0.62
  const flickerPhase = rand(14) * Math.PI * 2

  const wrapRef = useRef(null)
  const bodyRef = useRef(null)
  const glowRef = useRef(null)
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)

  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const t = (now - t0) / 1000 * 0.55
      const x = baseX + Math.sin(t * (Math.PI * 2 / periodX) + phaseX) * aX
      const y = baseY + Math.cos(t * (Math.PI * 2 / periodY) + phaseY) * aY
      if (wrapRef.current) wrapRef.current.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`
      if (bodyRef.current) bodyRef.current.style.transform = `rotate(${(t / rotPeriod) * 360 * rotDir}deg)`
      const oA = (t / orbitPeriod) * 360 * orbitDir
      if (orb1Ref.current) orb1Ref.current.style.transform = `rotate(${oA}deg)`
      if (orb2Ref.current) orb2Ref.current.style.transform = `rotate(${-oA * 0.7 + 140}deg)`
      if (glowRef.current) glowRef.current.style.opacity = (0.85 + Math.sin(t * 1.4 + flickerPhase) * 0.15).toFixed(3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [baseX, baseY, aX, aY, periodX, periodY, phaseX, phaseY, rotPeriod, rotDir, orbitPeriod, orbitDir, size, flickerPhase])

  const fill = hslOff(tag.hue, 10)
  const fillSoft = hslOff(tag.hue, -16, -4)
  const ring = hslOff(tag.hue, 22, 0, 0.95)
  const haloSize = size * (hovered ? 1.85 : 1.55)

  return (
    <button
      ref={wrapRef}
      onClick={() => onClick(spark.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`Open spark: ${teaser(spark.content, 3)}`}
      style={{
        position: 'absolute', left: 0, top: 0, width: size, height: size,
        background: 'transparent', border: 0, padding: 0, margin: 0,
        cursor: 'pointer',
        opacity: dimmed ? 0.18 : 1,
        transition: 'opacity 350ms ease',
        zIndex: focused ? 60 : (hovered ? 55 : 5 + Math.floor(lenN * 10)),
        willChange: 'transform',
      }}
    >
      {/* halo glow */}
      <div ref={glowRef} style={{
        position: 'absolute',
        left: (size - haloSize) / 2, top: (size - haloSize) / 2,
        width: haloSize, height: haloSize,
        background: `radial-gradient(circle, ${hslOff(tag.hue, 20, 0, hovered ? 0.7 : 0.55)} 0%, ${hslOff(tag.hue, 8, 0, 0.18)} 40%, transparent 68%)`,
        filter: 'blur(8px)', pointerEvents: 'none',
        transition: 'all 240ms ease',
      }} />

      {/* rotating body */}
      <div ref={bodyRef} style={{
        position: 'absolute', inset: 0, willChange: 'transform',
        transition: 'filter 240ms ease',
        filter: hovered
          ? `drop-shadow(0 0 14px ${hslOff(tag.hue, 28, 8, 0.85)})`
          : `drop-shadow(0 0 6px ${hslOff(tag.hue, 18, 0, 0.55)})`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${hovered ? 1.12 : 1})`,
          transformOrigin: 'center',
          transition: 'transform 280ms cubic-bezier(0.2,0.8,0.3,1)',
        }}>
          <SparklePath size={size} gradId={`sg-${sparkIdStr}`} ring={ring} sparkId={sparkIdStr} dark={tag.gemDark} hovered={hovered} />
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <radialGradient id={`sg-${sparkIdStr}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={hslOff(tag.hue, 28, -10)} />
                <stop offset="55%"  stopColor={fill} />
                <stop offset="100%" stopColor={fillSoft} />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      <FacetGlints size={size} sparkId={sparkIdStr} hovered={hovered} />

      {/* text label */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', pointerEvents: 'none',
        padding: size * 0.16,
      }}>
        <div style={{
          fontFamily: '"Crimson Pro", Georgia, serif',
          fontStyle: 'italic', fontWeight: 500,
          fontSize: Math.max(13, Math.min(18, size * 0.155)),
          lineHeight: 1.22, color: '#ffffff', textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7), 0 0 14px rgba(0,0,0,0.5)',
          maxWidth: size * 0.82,
          display: '-webkit-box', WebkitLineClamp: hovered ? 3 : 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
          transition: 'all 240ms ease',
        }}>
          {hovered ? teaser(spark.content, 8) : teaser(spark.content, 3)}
        </div>
      </div>

      {/* orbiting mini-sparkles */}
      <div ref={orb1Ref} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, willChange: 'transform' }}>
        <div style={{
          position: 'absolute', left: size / 2 + orbitR - 3, top: size / 2 - 3,
          width: 6, height: 6, borderRadius: '50%',
          background: hslOff(tag.hue, 28, 12),
          boxShadow: `0 0 8px ${hslOff(tag.hue, 28, 8, 0.95)}, 0 0 16px ${hslOff(tag.hue, 18, 0, 0.55)}`,
        }} />
      </div>
      {lenN > 0.35 && (
        <div ref={orb2Ref} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, willChange: 'transform' }}>
          <div style={{
            position: 'absolute', left: size / 2 + orbitR * 0.78 - 2, top: size / 2 - 2,
            width: 4, height: 4, borderRadius: '50%',
            background: hslOff(tag.hue, 36, 18),
            boxShadow: `0 0 6px ${hslOff(tag.hue, 30, 12, 0.9)}`,
          }} />
        </div>
      )}
    </button>
  )
}

// ─── ambient field dots ────────────────────────────────────────────────
function FieldDots() {
  const items = useMemo(() => Array.from({ length: 64 }, (_, i) => {
    const r = Math.random()
    const kind = r < 0.62 ? 'dot' : r < 0.92 ? 'sparkle' : 'glow'
    const size = kind === 'dot' ? 1.2 + Math.random() * 1.6 : kind === 'sparkle' ? 5 + Math.random() * 6 : 8 + Math.random() * 8
    const t = Math.random()
    const tint = t < 0.40 ? 'rgba(255,235,205,0.95)' : t < 0.65 ? 'rgba(255,215,200,0.92)' : t < 0.82 ? 'rgba(220,200,255,0.88)' : t < 0.94 ? 'rgba(180,220,255,0.86)' : 'rgba(255,200,220,0.9)'
    return {
      id: i, kind, size, tint,
      x: Math.random() * 100, y: Math.random() * 100,
      a: kind === 'glow' ? 0.18 + Math.random() * 0.18 : 0.4 + Math.random() * 0.45,
      twinkleDelay: -Math.random() * 8, twinkleDur: 3.5 + Math.random() * 6,
      driftDelay: -Math.random() * 30, driftDur: 22 + Math.random() * 28,
      driftDir: Math.random() < 0.5 ? 'a' : 'b',
      rotDur: 8 + Math.random() * 10, rotDir: Math.random() < 0.5 ? 'a' : 'b',
    }
  }), [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {items.map(d => {
        const drift = {
          position: 'absolute', left: d.x + '%', top: d.y + '%',
          width: d.size, height: d.size,
          animation: `sp-amb-drift-${d.driftDir} ${d.driftDur}s ease-in-out ${d.driftDelay}s infinite`,
          willChange: 'transform',
        }
        if (d.kind === 'dot') return (
          <div key={d.id} style={drift}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: d.tint, boxShadow: `0 0 ${d.size * 2.5}px ${d.tint}`, opacity: d.a, animation: `sp-amb-twinkle ${d.twinkleDur}s ease-in-out ${d.twinkleDelay}s infinite` }} />
          </div>
        )
        if (d.kind === 'sparkle') return (
          <div key={d.id} style={drift}>
            <div style={{ width: '100%', height: '100%', opacity: d.a, animation: `sp-amb-twinkle ${d.twinkleDur}s ease-in-out ${d.twinkleDelay}s infinite` }}>
              <div style={{ width: '100%', height: '100%', animation: `sp-amb-rot-${d.rotDir} ${d.rotDur}s linear infinite`, filter: `drop-shadow(0 0 ${d.size * 0.7}px ${d.tint})` }}>
                <svg viewBox="0 0 16 16" width="100%" height="100%" style={{ display: 'block' }}>
                  <path d="M8,0.6 C8.5,5.5 9,7.5 15.4,8 C9,8.5 8.5,10.5 8,15.4 C7.5,10.5 7,8.5 0.6,8 C7,7.5 7.5,5.5 8,0.6 Z" fill={d.tint} />
                </svg>
              </div>
            </div>
          </div>
        )
        return (
          <div key={d.id} style={drift}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `radial-gradient(circle, ${d.tint} 0%, transparent 70%)`, opacity: d.a, filter: 'blur(3px)' }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── capture box ───────────────────────────────────────────────────────
function CaptureBox({ value, onChange, tag, onTagChange, editing, onSave, onCancel, onDelete }) {
  const ta = useRef(null)
  useEffect(() => {
    if (ta.current) {
      ta.current.style.height = 'auto'
      ta.current.style.height = Math.min(360, ta.current.scrollHeight) + 'px'
    }
  }, [value])

  const btnInk = (color) => ({
    background: 'transparent', border: 0, color, cursor: 'pointer',
    fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
    letterSpacing: '0.28em', textTransform: 'uppercase', padding: 0,
  })

  return (
    <div style={{
      background: 'transparent',
      border: 'none',
      borderRadius: 4, padding: '20px 24px 18px',
    }}>
      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(240,227,194,0.55)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{editing ? 'editing spark' : 'ooh, what was that?'}</span>
        {editing && (
          <span style={{ display: 'flex', gap: 14 }}>
            <button onClick={onDelete} style={btnInk('rgba(255,160,180,0.7)')}>delete</button>
            <button onClick={onCancel} style={btnInk('rgba(240,227,194,0.55)')}>cancel</button>
          </span>
        )}
      </div>
      <textarea
        ref={ta}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="quick, before it's gone..."
        rows={2}
        style={{
          width: '100%', background: 'transparent', border: 0, outline: 'none', resize: 'none',
          color: 'var(--ink)', fontFamily: '"Crimson Pro", Georgia, serif',
          fontSize: 19, lineHeight: 1.55, padding: '4px 0 14px', minHeight: 56,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid rgba(232,201,140,0.10)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TAG_ORDER.map(k => {
            const def = TAGS[k]
            const sel = tag === k
            return (
              <button key={k} onClick={() => onTagChange(k)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: sel ? hslOff(def.hue, 0, 0, 0.18) : 'transparent',
                border: `1px solid ${sel ? hslOff(def.hue, 12, 0, 0.7) : 'rgba(232,201,140,0.18)'}`,
                color: sel ? hslOff(def.hue, 28, 12) : 'var(--ink-soft)',
                padding: '6px 10px', borderRadius: 999,
                fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 13.5,
                cursor: 'pointer', transition: 'all 180ms ease',
              }}>
                <GemPip color={def.gem} dark={def.gemDark} size={10} />
                {def.label}
              </button>
            )
          })}
        </div>
        <button onClick={onSave} disabled={!value.trim()} style={{
          background: 'transparent', border: 0,
          color: value.trim() ? 'var(--candle-soft)' : 'rgba(240,227,194,0.32)',
          fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 14,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          cursor: value.trim() ? 'pointer' : 'default',
          padding: '6px 0 6px 14px', flexShrink: 0,
        }}>
          {editing ? 'save changes' : 'save spark'} →
        </button>
      </div>
    </div>
  )
}

// ─── list view ─────────────────────────────────────────────────────────
function ListView({ sparks, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(232,201,140,0.07)' }}>
      {sparks.map(s => {
        const tag = TAGS[s.tags?.[0]] || TAGS['general']
        return (
          <button key={s.id} onClick={() => onClick(s.id)} style={{
            background: 'transparent', border: 0,
            padding: '18px 20px',
            display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 18,
            alignItems: 'baseline', textAlign: 'left', cursor: 'pointer',
            color: 'var(--ink)',
            borderBottom: '1px solid rgba(232,201,140,0.07)',
            transition: 'background 220ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,201,140,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: hslOff(tag.hue, 22, 8), fontSize: 12.5, letterSpacing: '0.05em', fontVariant: 'small-caps' }}>
              <GemPip color={tag.gem} dark={tag.gemDark} size={9} />
              {tag.label}
            </span>
            <span style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 17, lineHeight: 1.5 }}>{s.content}</span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: 'rgba(240,227,194,0.4)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              {relTime(s.created_at)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── view toggle ───────────────────────────────────────────────────────
function ViewToggle({ value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', borderRadius: 999, padding: 3, border: '1px solid rgba(232,201,140,0.18)' }}>
      {[{ k: 'constellation', icon: '✶', label: 'Constellation' }, { k: 'list', icon: '≡', label: 'List' }].map(o => (
        <button key={o.k} onClick={() => onChange(o.k)} style={{
          background: value === o.k ? 'rgba(232,201,140,0.10)' : 'transparent',
          border: 0, color: value === o.k ? 'var(--candle-soft)' : 'var(--ink-soft)',
          fontFamily: '"Crimson Pro", Georgia, serif', fontSize: 13.5,
          padding: '6px 14px', borderRadius: 999,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'all 220ms ease',
        }}>
          <span style={{ fontSize: o.k === 'list' ? 16 : 14, lineHeight: 1, color: value === o.k ? 'var(--candle)' : 'var(--ink-faint)' }}>{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── main Sparks room ──────────────────────────────────────────────────
export default function SparksRoom({ onSettings, roomName = 'Sparks' }) {
  const [sparks, setSparks] = useState([])
  const [draft, setDraft] = useState('')
  const [draftTag, setDraftTag] = useState('general')
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('constellation')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fieldRef = useRef(null)
  const [fieldSize, setFieldSize] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      if (data?.user) fetchSparks()
      else setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!fieldRef.current) return
    const { width, height } = fieldRef.current.getBoundingClientRect()
    if (width > 0) setFieldSize({ w: width, h: height })
    const ro = new ResizeObserver(([e]) => setFieldSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(fieldRef.current)
    return () => ro.disconnect()
  }, [loading, view])

  const fetchSparks = async () => {
    const { data } = await supabase.from('sparks').select('*').order('created_at', { ascending: false })
    setSparks(data || [])
    setLoading(false)
  }

  const signIn = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })

  const onSparkClick = (id) => {
    const s = sparks.find(x => x.id === id)
    if (!s) return
    setEditing(id)
    setDraft(s.content)
    setDraftTag(s.tags?.[0] || 'general')
    setTimeout(() => document.getElementById('sp-capture')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const onCancel = () => { setEditing(null); setDraft(''); setDraftTag('general') }

  const onSave = async () => {
    if (!draft.trim()) return
    if (editing) {
      await supabase.from('sparks').update({ content: draft.trim(), tags: [draftTag] }).eq('id', editing)
    } else {
      await supabase.from('sparks').insert({ content: draft.trim(), tags: [draftTag], user_id: user?.id })
    }
    setEditing(null); setDraft(''); setDraftTag('general')
    fetchSparks()
  }

  const onDelete = async () => {
    if (!editing) return
    await supabase.from('sparks').delete().eq('id', editing)
    setEditing(null); setDraft(''); setDraftTag('general')
    fetchSparks()
  }

  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(Math.max(1, sparks.length)))))
  const rows = Math.max(1, Math.ceil(Math.max(1, sparks.length) / cols))
  const fieldHeight = Math.max(420, rows * 180 + 80)

  const todayStr = () => {
    const d = new Date()
    const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
    const h = d.getHours(), mm = d.getMinutes().toString().padStart(2,'0')
    const ampm = h >= 12 ? 'pm' : 'am'
    return `${d.getDate()} ${m} · ${((h + 11) % 12) + 1}:${mm} ${ampm}`
  }

  if (!user) return (
    <>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{roomName}</h2>
          <RoomMark date={todayStr()} onSettings={onSettings} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-faint)', marginBottom: 32, lineHeight: 1.6 }}>
            hold them gently — sign in to access your sparks.
          </div>
          <button onClick={signIn} style={{
            background: 'transparent', border: '1px solid rgba(232,201,140,0.35)',
            color: 'var(--candle-soft)', fontFamily: '"Crimson Pro", serif', fontSize: 14,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '10px 28px', borderRadius: 4, cursor: 'pointer',
            transition: 'all 250ms ease',
          }}>
            sign in with google
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* room header */}
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{roomName}</h2>
          <RoomMark date={todayStr()} onSettings={onSettings} />
        </div>
      </div>

      {/* capture box */}
      <div id="sp-capture" style={{ marginBottom: 0 }}>
        <CaptureBox
          value={draft}
          onChange={setDraft}
          tag={draftTag}
          onTagChange={setDraftTag}
          editing={!!editing}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </div>

      {/* controls row */}
      {!loading && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '40px 0 6px', flexWrap: 'wrap', gap: 18 }}>
            <div>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.42em', textTransform: 'uppercase', color: 'rgba(240,227,194,0.55)' }}>
                your sparks
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.12em', color: 'rgba(240,227,194,0.4)', marginLeft: 14 }}>
                {sparks.length} caught
              </span>
            </div>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div style={{ fontFamily: '"Crimson Pro", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(240,227,194,0.38)', letterSpacing: '0.04em', marginBottom: 16 }}>
            sparks, fireflies and fleeting thoughts
          </div>
        </>
      )}

      {/* constellation field */}
      {!loading && view === 'constellation' && (
        <div
          ref={fieldRef}
          style={{
            position: 'relative', borderRadius: 10, overflow: 'hidden',
            background: 'transparent', border: 'none',
            marginBottom: '2rem', height: fieldHeight,
          }}
        >
          <FieldDots />
          {fieldSize && sparks.map((s, i) => (
            <FireflySpark
              key={s.id}
              spark={s}
              fieldW={fieldSize.w}
              fieldH={fieldHeight}
              onClick={onSparkClick}
              focused={editing === s.id}
              dimmed={!!editing && editing !== s.id}
              idx={i}
              total={sparks.length}
            />
          ))}
          {sparks.length === 0 && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 15, color: 'rgba(240,227,194,0.3)', textAlign: 'center' }}>
              no sparks yet — catch your first thought above
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 12, color: 'rgba(240,227,194,0.28)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            ✶ hover to peek · click to open
          </div>
        </div>
      )}

      {/* list view */}
      {!loading && view === 'list' && sparks.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <ListView sparks={sparks} onClick={onSparkClick} />
        </div>
      )}

      {!loading && view === 'list' && sparks.length === 0 && (
        <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-faint)' }}>
          no sparks yet — catch your first thought above
        </div>
      )}

    </>
  )
}
