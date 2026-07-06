import { useId } from 'react'

// JewelDivider — the four locked dividers (Engine Room id=171), ported from
// dividers-round4.html. All share the reflective-gold paint: shinefade (bright
// #f6e3a0 catch at center, dissolving to nothing at open tips) and shinesolid
// (solid metal for lines that end in a drawn terminal).
//
//   kind="quiet"    fading hairline + center tick                (everyday/dense)
//   kind="medium"   center diamond, lines fading out both sides  (everyday default)
//   kind="diamonds" three interlocked diamonds (Statement A)      (statement)
//   kind="curves"   interlocked circles + solid wave lines to     (statement)
//                   open-circle terminals; center rail fades
//   gem             sets flat jewel stones in the four curve terminals
//
// GOTCHA (kept from source): a perfectly horizontal line has a zero-height
// bounding box, so a default-units gradient collapses and the line renders
// INVISIBLE. Every reflective stroke uses gradientUnits="userSpaceOnUse" with
// explicit coordinates. Do not remove.

export default function JewelDivider({
  kind = 'medium', gem = false, gemColor = '#A673E4',
  width = '100%', className, style, title,
}) {
  const uid = useId().replace(/[:]/g, '')
  const fade = `jdfade-${uid}`
  const solid = `jdsolid-${uid}`
  return (
    <svg viewBox="-195 -22 390 44" width={width} preserveAspectRatio="xMidYMid meet"
      className={className} style={{ display: 'block', overflow: 'visible', ...style }}
      role="img" aria-label={title || `${kind} divider`}>
      <defs>
        <linearGradient id={fade} gradientUnits="userSpaceOnUse" x1="-190" y1="0" x2="190" y2="0">
          <stop offset="0" stopColor="#c9a44e" stopOpacity="0" />
          <stop offset="0.22" stopColor="#c9a44e" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#f6e3a0" stopOpacity="0.95" />
          <stop offset="0.78" stopColor="#c9a44e" stopOpacity="0.6" />
          <stop offset="1" stopColor="#c9a44e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={solid} gradientUnits="userSpaceOnUse" x1="-190" y1="0" x2="190" y2="0">
          <stop offset="0" stopColor="#a8853c" />
          <stop offset="0.28" stopColor="#c9a44e" />
          <stop offset="0.5" stopColor="#f6e3a0" />
          <stop offset="0.72" stopColor="#c9a44e" />
          <stop offset="1" stopColor="#a8853c" />
        </linearGradient>
      </defs>

      {kind === 'quiet' && (
        <>
          <line x1="-190" y1="0" x2="190" y2="0" stroke={`url(#${fade})`} strokeWidth="1" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#c9a44e" strokeWidth="1" opacity="0.7" />
        </>
      )}

      {kind === 'medium' && (
        <>
          <g fill="none" stroke={`url(#${fade})`} strokeWidth="1">
            <path d="M -7 0 L 0 -5 L 7 0 L 0 5 Z" />
            <line x1="-190" y1="0" x2="-12" y2="0" />
            <line x1="12" y1="0" x2="190" y2="0" />
          </g>
          <path d="M -2.5 0 L 0 -2 L 2.5 0 L 0 2 Z" fill="#E9C24C" />
        </>
      )}

      {kind === 'diamonds' && (
        <g fill="none" stroke={`url(#${fade})`} strokeWidth="1.4">
          <path d="M -26 0 L -14 -10 L -2 0 L -14 10 Z" />
          <path d="M -13 0 L 0 -11 L 13 0 L 0 11 Z" />
          <path d="M 2 0 L 14 -10 L 26 0 L 14 10 Z" />
          <line x1="-190" y1="0" x2="-32" y2="0" />
          <line x1="32" y1="0" x2="190" y2="0" />
        </g>
      )}

      {kind === 'curves' && (
        <>
          <g fill="none" stroke={`url(#${fade})`} strokeWidth="1.2">
            <line x1="-190" y1="0" x2="-26" y2="0" />
            <line x1="26" y1="0" x2="190" y2="0" />
          </g>
          <g fill="none" stroke={`url(#${solid})`} strokeWidth="1.2">
            <circle cx="-11" cy="0" r="15" />
            <circle cx="11" cy="0" r="15" />
            <path d="M -160 -9 C -80 -9 -60 9 -26 6" />
            <path d="M -160 9 C -80 9 -60 -9 -26 -6" />
            <path d="M 160 -9 C 80 -9 60 9 26 6" />
            <path d="M 160 9 C 80 9 60 -9 26 -6" />
            <circle cx="-164" cy="-9" r="3" />
            <circle cx="-164" cy="9" r="3" />
            <circle cx="164" cy="-9" r="3" />
            <circle cx="164" cy="9" r="3" />
          </g>
          {gem && (
            <g fill={gemColor}>
              <circle cx="-164" cy="-9" r="2" />
              <circle cx="-164" cy="9" r="2" />
              <circle cx="164" cy="-9" r="2" />
              <circle cx="164" cy="9" r="2" />
            </g>
          )}
        </>
      )}
    </svg>
  )
}
