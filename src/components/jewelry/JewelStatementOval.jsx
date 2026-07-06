import { useId } from 'react'

// JewelStatementOval — ported from statement-oval-final.html. Three parallel
// elliptical strands (the middle strand lit from a different gradient angle, so
// the piece reads as woven metal) with interlocked-diamond LATTICE KNOTS at the
// four cardinals: a horizontal 3-diamond knot at N & S, a vertical 2-diamond
// knot at E & W. Same motif as the "diamonds" divider — one visible family.
//
//   variant="plain"  full size, no gem
//   variant="gem"    full size, one flat stone in the north knot's centre
//   variant="small"  room-gallery scale, with a centre diamond
//
// Statement tier: Threshold / room headers / celebration moments only.

const SIZES = {
  full:  { strands: [[128, 172], [122, 165], [116, 158]], knotY: 165, knotX: 122, knotScale: 1,   vb: '-150 -198 300 396' },
  small: { strands: [[90, 120], [85.5, 115], [81, 110]],  knotY: 115, knotX: 85.5, knotScale: 0.8, vb: '-108 -140 216 280' },
}

export default function JewelStatementOval({
  variant = 'plain', gemColor = '#A673E4', width, className, style, title,
}) {
  const uid = useId().replace(/[:]/g, '')
  const g1 = `ovm-${uid}`, g2 = `ovm2-${uid}`
  const size = variant === 'small' ? SIZES.small : SIZES.full
  const [[rx, ry], [mrx, mry], [irx, iry]] = size.strands
  const k = size.knotScale

  // Metallic paints scaled to this oval (userSpaceOnUse, per the flat-line rule).
  const s = rx / 128

  return (
    <svg viewBox={size.vb} width={width} preserveAspectRatio="xMidYMid meet"
      className={className} style={{ display: 'block', ...style }}
      role="img" aria-label={title || 'statement oval'}>
      <defs>
        <linearGradient id={g1} gradientUnits="userSpaceOnUse"
          x1={-140 * s} y1={180 * s} x2={140 * s} y2={-180 * s}>
          <stop offset="0" stopColor="#6e5323" />
          <stop offset="0.45" stopColor="#d9b45a" />
          <stop offset="0.75" stopColor="#fff3c8" />
          <stop offset="1" stopColor="#e9c24c" />
        </linearGradient>
        <linearGradient id={g2} gradientUnits="userSpaceOnUse"
          x1={-160 * s} y1={100 * s} x2={160 * s} y2={-120 * s}>
          <stop offset="0" stopColor="#7a5e28" />
          <stop offset="0.5" stopColor="#e9c24c" />
          <stop offset="0.82" stopColor="#fdf0bd" />
          <stop offset="1" stopColor="#cfa94f" />
        </linearGradient>
      </defs>

      {/* three parallel strands — middle strand on a different-angle gradient */}
      <g fill="none" stroke={`url(#${g1})`}>
        <ellipse rx={rx} ry={ry} strokeWidth="1.4" />
        <ellipse rx={mrx} ry={mry} strokeWidth="1.1" stroke={`url(#${g2})`} />
        <ellipse rx={irx} ry={iry} strokeWidth="1.4" />
      </g>

      {/* lattice knots at the cardinals */}
      <g stroke="#E9C24C" fill="none" strokeWidth="1.1">
        <g transform={`translate(0,${-size.knotY}) scale(${k})`}>
          <path d="M -20 0 L -10 -8 L 0 0 L -10 8 Z" />
          <path d="M -10 0 L 0 -9 L 10 0 L 0 9 Z" />
          <path d="M 0 0 L 10 -8 L 20 0 L 10 8 Z" />
        </g>
        <g transform={`translate(0,${size.knotY}) scale(${k})`}>
          <path d="M -20 0 L -10 -8 L 0 0 L -10 8 Z" />
          <path d="M -10 0 L 0 -9 L 10 0 L 0 9 Z" />
          <path d="M 0 0 L 10 -8 L 20 0 L 10 8 Z" />
        </g>
        <g transform={`translate(${-size.knotX},0) scale(${k})`}>
          <path d="M 0 -14 L -8 -6 L 0 2 L 8 -6 Z" />
          <path d="M 0 -2 L -8 6 L 0 14 L 8 6 Z" />
        </g>
        <g transform={`translate(${size.knotX},0) scale(${k})`}>
          <path d="M 0 -14 L -8 -6 L 0 2 L 8 -6 Z" />
          <path d="M 0 -2 L -8 6 L 0 14 L 8 6 Z" />
        </g>
      </g>

      {variant === 'gem' && (
        <path d={`M 0 ${-size.knotY} m -5 0 l 5 -4.5 5 4.5 -5 4.5 z`} fill={gemColor} />
      )}
      {variant === 'small' && (
        <path d="M 0 0 m -10 0 l 10 -10 10 10 -10 10 z" fill="#E9C24C" opacity="0.9" />
      )}
    </svg>
  )
}
