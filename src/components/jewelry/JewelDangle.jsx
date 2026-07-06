import { useId } from 'react'

// JewelDangle — statement tier only, ported from kit-final-three.html. A fine
// bead chain hanging from a statement frame's top edge.
//
//   length="whisper"    short drop → small open diamond
//   length="classic"    beads + solid diamond → open ring
//   length="celestial"  longest, thinning beads → a tiny four-point star
//                        (the night garden's ONE star allowance)
//
// CONVENTION (document, enforce by hand): max ONE dangle per page. It is the
// single most decorative flourish — never two.

const VB = {
  whisper:   '-9 -3 18 56',
  classic:   '-13 -3 26 102',
  celestial: '-9 -3 18 142',
}

export default function JewelDangle({ length = 'classic', width = 26, className, style, title }) {
  const uid = useId().replace(/[:]/g, '')
  const chain = `jchain-${uid}`
  const star = `jstar-${uid}`
  return (
    <svg viewBox={VB[length] || VB.classic} width={width} preserveAspectRatio="xMidYMin meet"
      className={className} style={{ display: 'block', overflow: 'visible', ...style }}
      role="img" aria-label={title || `${length} dangle`}>
      <defs>
        <linearGradient id={chain} gradientUnits="userSpaceOnUse" x1="-10" y1="120" x2="14" y2="-10">
          <stop offset="0" stopColor="#8a6a2f" />
          <stop offset="0.6" stopColor="#e9c24c" />
          <stop offset="1" stopColor="#fbf0c4" />
        </linearGradient>
        <g id={star}>
          <path d="M 0 -6 C .6 -1.8 1.8 -.6 6 0 C 1.8 .6 .6 1.8 0 6 C -.6 1.8 -1.8 .6 -6 0 C -1.8 -.6 -.6 -1.8 0 -6 Z" fill="#fdf4d4" />
        </g>
      </defs>

      {length === 'whisper' && (
        <g>
          <line x1="0" y1="0" x2="0" y2="34" stroke={`url(#${chain})`} strokeWidth="0.9" />
          <circle cx="0" cy="10" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="20" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="30" r="1.6" fill="#e9c24c" />
          <path d="M 0 40 m -4 0 l 4 -4 4 4 -4 4 z" fill="none" stroke="#E9C24C" strokeWidth="1" />
        </g>
      )}

      {length === 'classic' && (
        <g>
          <line x1="0" y1="0" x2="0" y2="74" stroke={`url(#${chain})`} strokeWidth="0.9" />
          <circle cx="0" cy="10" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="20" r="1.6" fill="#e9c24c" />
          <path d="M 0 32 m -3.4 0 l 3.4 -3.4 3.4 3.4 -3.4 3.4 z" fill="#E9C24C" />
          <circle cx="0" cy="46" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="56" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="84" r="10" fill="none" stroke={`url(#${chain})`} strokeWidth="1.2" />
        </g>
      )}

      {length === 'celestial' && (
        <g>
          <line x1="0" y1="0" x2="0" y2="120" stroke={`url(#${chain})`} strokeWidth="0.9" />
          <circle cx="0" cy="12" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="24" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="36" r="1.6" fill="#e9c24c" />
          <path d="M 0 50 m -3.4 0 l 3.4 -3.4 3.4 3.4 -3.4 3.4 z" fill="#E9C24C" />
          <circle cx="0" cy="64" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="76" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="88" r="1.6" fill="#e9c24c" />
          <circle cx="0" cy="100" r="1.3" fill="#e9c24c" opacity="0.8" />
          <circle cx="0" cy="110" r="1.1" fill="#e9c24c" opacity="0.65" />
          <use href={`#${star}`} transform="translate(0,128)" />
        </g>
      )}
    </svg>
  )
}
