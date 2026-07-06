// JewelPip — flat jewel-tone dot (kit pip). HARD RULE (Engine Room id=171):
// flat saturated circle under ~10px; a single small facet highlight is allowed
// only at ~12px+. Pip garnet is #C42A44 — deliberately brighter than band
// garnet #9E1E33, which goes near-black at tiny sizes. Great as a list marker.

const PIP = {
  jade:     { fill: '#2FBE86', facet: '#d8ffef' },
  gold:     { fill: '#E9C24C', facet: '#fff8dd' },
  amber:    { fill: '#F2933C', facet: '#ffe4c4' },
  garnet:   { fill: '#C42A44', facet: '#ffd2da' },
  amethyst: { fill: '#A673E4', facet: '#eedcff' },
}

export default function JewelPip({ color = 'gold', size = 8, title, className, style }) {
  const spec = PIP[color] || { fill: color, facet: '#fff8dd' }
  const r = size / 2
  const showFacet = size >= 12   // flat below ~12px; one restrained highlight at/above
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      role="img" aria-label={title || `${color} pip`}>
      <circle cx={r} cy={r} r={r} fill={spec.fill} />
      {showFacet && (
        <circle cx={r - r * 0.28} cy={r - r * 0.28} r={Math.max(1.5, r * 0.28)}
          fill={spec.facet} opacity="0.88" />
      )}
    </svg>
  )
}
