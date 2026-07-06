import { useId } from 'react'

// JewelRoomOval — wing room ovals, ported from circles-round2.html. Metallic
// ring + a whisper of a second inner line (~.38 opacity). The medium variant
// adds ONE clean small diamond at north sitting on the ring. active adds a soft
// glow, a brighter ring, and a dot sparkle (hover / current-room state).
//
//   variant="quiet"   ring + inner whisper + centre diamond
//   variant="medium"  + clean north diamond
//   active            + glow, brighter ring, north sparkle dot
//
// `bg` is the page colour the medium north-diamond knocks out to (default navy).

export default function JewelRoomOval({
  variant = 'quiet', active = false, centerDiamond = true, dim = false,
  bg = '#182040', width = 150, className, style, title, children,
}) {
  const uid = useId().replace(/[:]/g, '')
  const ring = `rovr-${uid}`, glow = `rovg-${uid}`
  const ringW = active ? 1.8 : 1.3
  const innerOp = active ? 0.45 : 0.38
  return (
    <svg viewBox="-78 -98 156 196" width={width} preserveAspectRatio="xMidYMid meet"
      className={className} style={{ display: 'block', overflow: 'visible', opacity: dim ? 0.32 : 1, ...style }}
      role="img" aria-label={title || `${variant} room oval`}>
      <defs>
        <linearGradient id={ring} gradientUnits="userSpaceOnUse" x1="-95" y1="95" x2="95" y2="-95">
          <stop offset="0" stopColor="#8a6a2f" />
          <stop offset="0.5" stopColor="#e9c24c" />
          <stop offset="1" stopColor="#fbf0c4" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#e9c24c" stopOpacity="0.26" />
          <stop offset="0.7" stopColor="#e9c24c" stopOpacity="0.07" />
          <stop offset="1" stopColor="#e9c24c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {active && <ellipse rx="70" ry="88" fill={`url(#${glow})`} />}
      <ellipse rx="62" ry="80" fill="none" stroke={`url(#${ring})`} strokeWidth={ringW} />
      <ellipse rx="56" ry="73" fill="none" stroke="#c9a44e" strokeWidth="0.6" opacity={innerOp} />

      {variant === 'medium' && (
        <>
          <path d="M 0 -80 m -5.5 0 l 5.5 -5.5 5.5 5.5 -5.5 5.5 z" fill={bg} stroke="#E9C24C" strokeWidth="1.1" />
          <path d="M 0 -80 m -2 0 l 2 -1.7 2 1.7 -2 1.7 z" fill="#E9C24C" />
        </>
      )}

      {centerDiamond && (
        <path d="M 0 0 m -10 0 l 10 -10 10 10 -10 10 z" fill={active ? '#E9C24C' : '#c9a44e'} opacity={active ? 1 : 0.8} />
      )}

      {active && (
        <>
          <circle cx="46" cy="-60" r="2.2" fill="#fdf4d4" />
          <circle cx="53" cy="-52" r="1.1" fill="#fdf4d4" opacity="0.6" />
        </>
      )}
      {children}
    </svg>
  )
}
