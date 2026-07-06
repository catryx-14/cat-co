import { useId } from 'react'

// JewelFrame — panel frames, ported from jewelry-kit-svg-round1.html.
//
//   tier="quiet"      fine mitered gold wire border
//   tier="medium"     corner motif (concentric diamonds + stepped lines with
//                     diamond terminals). corners={2|4} — both approved.
//   tier="statement"  full deco border (stepped corner squares, double edge
//                     lines, centre edge ornaments top & bottom). gem sets ONE
//                     diamond in a jewel tone (never more than two per frame).
//
// A fixed-ratio decorative frame: it keeps the exact drawn geometry and scales
// as a unit (set width, height follows). Good for room headers / cards / badges
// of a set proportion. Tier rationing: statement is for the Threshold, room
// headers, and celebration moments only — everyday surfaces wear quiet/medium.

export default function JewelFrame({
  tier = 'quiet', corners = 4, gem = false, gemColor = '#A673E4',
  stroke = '#E9C24C', width, className, style, title,
}) {
  const uid = useId().replace(/[:]/g, '')
  const W = tier === 'statement' ? 520 : 360
  const H = tier === 'statement' ? 300 : 240
  const stmt = `stmt-${uid}`, med = `med-${uid}`, orn = `orn-${uid}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width ?? W} preserveAspectRatio="xMidYMid meet"
      className={className} style={{ display: 'block', ...style }}
      role="img" aria-label={title || `${tier} frame`}>
      <defs>
        <g id={stmt} stroke={stroke} fill="none" strokeWidth="1.2">
          <rect x="10" y="10" width="16" height="16" />
          <rect x="16" y="16" width="16" height="16" />
          <path d="M 26 10 H 120 M 10 26 V 120" />
          <path d="M 32 22 H 120 M 22 32 V 120" />
          <path d="M 40 16 H 88" />
          <path d="M 16 40 V 88" />
          <path d="M 92 16 l 5 -4 5 4 -5 4 z" fill={stroke} stroke="none" opacity="0.9" />
          <path d="M 16 92 l -4 5 4 5 4 -5 z" fill={stroke} stroke="none" opacity="0.9" />
        </g>
        <g id={med} stroke={stroke} fill="none" strokeWidth="1.2">
          <path d="M 26 26 m -14 0 l 14 -14 14 14 -14 14 z" />
          <path d="M 26 26 m -8 0 l 8 -8 8 8 -8 8 z" />
          <path d="M 26 26 m -3.5 0 l 3.5 -3.5 3.5 3.5 -3.5 3.5 z" fill={stroke} stroke="none" />
          <path d="M 40 18 H 96" />
          <path d="M 46 28 H 78" />
          <path d="M 99 18 l 4.5 -3.5 4.5 3.5 -4.5 3.5 z" fill={stroke} stroke="none" />
          <path d="M 81 28 l 4 -3 4 3 -4 3 z" fill={stroke} stroke="none" opacity="0.8" />
          <path d="M 18 40 V 96" />
          <path d="M 28 46 V 78" />
          <path d="M 18 99 l -3.5 4.5 3.5 4.5 3.5 -4.5 z" fill={stroke} stroke="none" />
          <path d="M 28 81 l -3 4 3 4 3 -4 z" fill={stroke} stroke="none" opacity="0.8" />
        </g>
        <g id={orn} stroke={stroke} fill="none" strokeWidth="1.2">
          <path d="M 0 0 m -9 0 l 9 -7 9 7 -9 7 z" />
          <path d="M 0 0 m -4 0 l 4 -3.2 4 3.2 -4 3.2 z" fill={stroke} stroke="none" />
          <path d="M -40 0 H -13 M 13 0 H 40" />
          <path d="M -44 0 l -4 -3 0 6 z" fill={stroke} stroke="none" opacity="0.85" />
          <path d="M 44 0 l 4 -3 0 6 z" fill={stroke} stroke="none" opacity="0.85" />
        </g>
      </defs>

      {tier === 'quiet' && (
        <rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke={stroke}
          strokeWidth="1" opacity="0.78" />
      )}

      {tier === 'medium' && (
        corners === 2 ? (
          <>
            <use href={`#${med}`} />
            <use href={`#${med}`} transform={`translate(${W},${H}) rotate(180)`} />
          </>
        ) : (
          <>
            <use href={`#${med}`} />
            <use href={`#${med}`} transform={`translate(${W},0) scale(-1,1)`} />
            <use href={`#${med}`} transform={`translate(0,${H}) scale(1,-1)`} />
            <use href={`#${med}`} transform={`translate(${W},${H}) scale(-1,-1)`} />
          </>
        )
      )}

      {tier === 'statement' && (
        <>
          <use href={`#${stmt}`} />
          <use href={`#${stmt}`} transform={`translate(${W},0) scale(-1,1)`} />
          <use href={`#${stmt}`} transform={`translate(0,${H}) scale(1,-1)`} />
          <use href={`#${stmt}`} transform={`translate(${W},${H}) scale(-1,-1)`} />
          <path d={`M 120 10 H ${W - 120} M 120 26 H 190 M ${W - 190} 26 H ${W - 120}`}
            stroke={stroke} fill="none" strokeWidth="1.2" />
          <path d={`M 120 ${H - 10} H ${W - 120} M 120 ${H - 26} H 190 M ${W - 190} ${H - 26} H ${W - 120}`}
            stroke={stroke} fill="none" strokeWidth="1.2" />
          <path d={`M 10 120 V ${H - 120} M 26 120 V ${H - 120}`} stroke={stroke} fill="none" strokeWidth="1.2" />
          <path d={`M ${W - 10} 120 V ${H - 120} M ${W - 26} 120 V ${H - 120}`} stroke={stroke} fill="none" strokeWidth="1.2" />
          <use href={`#${orn}`} transform={`translate(${W / 2},18)`} />
          <use href={`#${orn}`} transform={`translate(${W / 2},${H - 18}) scale(1,-1)`} />
          {gem && (
            <path d={`M ${W / 2} 18 m -4 0 l 4 -3.2 4 3.2 -4 3.2 z`} fill={gemColor} />
          )}
        </>
      )}
    </svg>
  )
}
