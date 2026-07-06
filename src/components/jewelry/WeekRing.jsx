import { useId } from 'react'

// WeekRing — a single WeekStrip day ring, ported from circles-round2.html.
// A fine metallic ring in the day's band colour. today=true brings the retired
// sky-view treatment home: a thicker gold metallic ring + a faint inner ring +
// a soft radial glow + one bright ROUND sparkle-dot on the rim with two faint
// companions. Sparkles are small circles, NEVER star shapes. (The sparse tiny
// dots that drift *between* days live at the WeekStrip level, not here.)
//
//   band="jade|amethyst|gold|rose|teal|blue"   named preset ring colour, OR
//   color="#rrggbb"                             any band hex → derived metal
//   today                                        the one sparkle moment per strip
//   num / numColor                               optional day number inside

const BANDS = {
  jade:     ['#176044', '#2FBE86', '#b8f4dc'],
  amethyst: ['#4f3080', '#A673E4', '#e8d5ff'],
  gold:     ['#8a6a2f', '#e9c24c', '#fbf0c4'],
  rose:     ['#7a3450', '#c98aa0', '#f2d5e0'],
  teal:     ['#155a58', '#6ec0bf', '#c8f0ef'],
  blue:     ['#274a86', '#7eb8d9', '#d3ecf7'],
}

// Derive a 3-stop metallic ramp (deep → colour → bright catch) from any hex, so
// the ring reads as metal tinted in the day's band colour.
function metalFromHex(hex) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((hex || '').trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const hx = ([r, g, b]) => '#' + [r, g, b].map(v =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
  const deep = rgb.map(v => v * 0.5)
  const bright = rgb.map(v => v + (255 - v) * 0.62)
  return [hx(deep), hx(rgb), hx(bright)]
}

export default function WeekRing({
  band = 'gold', color, today = false, num, numColor = '#f2e3b2', size = 84, className, style, title,
}) {
  const uid = useId().replace(/[:]/g, '')
  const ring = `wr-${uid}`, glow = `wg-${uid}`
  const stops = metalFromHex(color) || BANDS[band] || BANDS.gold
  return (
    <svg viewBox="-46 -46 92 92" width={size} height={size} className={className}
      style={{ display: 'block', overflow: 'visible', ...style }}
      role="img" aria-label={title || (today ? `today, ${num ?? ''}` : `${num ?? ''}`)}>
      <defs>
        <linearGradient id={ring} gradientUnits="userSpaceOnUse" x1="-26" y1="26" x2="26" y2="-26">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="0.5" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#e9c24c" stopOpacity="0.26" />
          <stop offset="0.7" stopColor="#e9c24c" stopOpacity="0.07" />
          <stop offset="1" stopColor="#e9c24c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {today ? (
        <>
          <circle r="42" fill={`url(#${glow})`} />
          <circle r="27" fill="none" stroke={`url(#${ring})`} strokeWidth="2.6" />
          <circle r="23" fill="none" stroke="#E9C24C" strokeWidth="0.7" opacity="0.4" />
          {num != null && <text y="8" textAnchor="middle" fontSize="22" fontFamily="'Cormorant Garamond', serif" fontWeight="500" fill="#f6e8bd">{num}</text>}
          <circle cx="22" cy="-20" r="2.4" fill="#fdf4d4" />
          <circle cx="28" cy="-12" r="1.2" fill="#fdf4d4" opacity="0.65" />
          <circle cx="-21" cy="21" r="1.5" fill="#fdf4d4" opacity="0.6" />
        </>
      ) : (
        <>
          <circle r="26" fill="none" stroke={`url(#${ring})`} strokeWidth="1.8" />
          {num != null && <text y="8" textAnchor="middle" fontSize="22" fontFamily="'Cormorant Garamond', serif" fontWeight="500" fill={numColor}>{num}</text>}
        </>
      )}
    </svg>
  )
}
