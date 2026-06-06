import { useState, useMemo } from 'react'
import { QUALITY_GROUP_MAP, QUALITY_GROUP_ORDER, BUTTON_LOCATION_SLUGS } from './lib/lostFoundDb.js'

// SVG zone definitions (locked geometry from approved prototype)
const SVG_ZONES = [
  { slug: 'shoulders', shape: 'rect',    props: { x: 58,  y: 92,  width: 124, height: 18, rx: 9 } },
  { slug: 'chest',     shape: 'ellipse', props: { cx: 120, cy: 132, rx: 42, ry: 30 } },
  { slug: 'stomach',   shape: 'ellipse', props: { cx: 120, cy: 194, rx: 38, ry: 32 } },
  { slug: 'arms',      shape: 'rect',    props: { x: 48,  y: 112, width: 28, height: 138, rx: 14 }, key: 'arms-l' },
  { slug: 'arms',      shape: 'rect',    props: { x: 164, y: 112, width: 28, height: 138, rx: 14 }, key: 'arms-r' },
  { slug: 'hands',     shape: 'circle',  props: { cx: 62,  cy: 268, r: 16 }, key: 'hands-l' },
  { slug: 'hands',     shape: 'circle',  props: { cx: 178, cy: 268, r: 16 }, key: 'hands-r' },
  { slug: 'legs',      shape: 'rect',    props: { x: 90,  y: 258, width: 32, height: 196, rx: 16 }, key: 'legs-l' },
  { slug: 'legs',      shape: 'rect',    props: { x: 118, y: 258, width: 32, height: 196, rx: 16 }, key: 'legs-r' },
  { slug: 'feet',      shape: 'ellipse', props: { cx: 100, cy: 476, rx: 22, ry: 13 }, key: 'feet-l' },
  { slug: 'feet',      shape: 'ellipse', props: { cx: 140, cy: 476, rx: 22, ry: 13 }, key: 'feet-r' },
  { slug: 'head',      shape: 'ellipse', props: { cx: 120, cy: 34,  rx: 22, ry: 15 } },
  { slug: 'face',      shape: 'ellipse', props: { cx: 120, cy: 52,  rx: 20, ry: 13 } },
  { slug: 'jaw',       shape: 'ellipse', props: { cx: 120, cy: 70,  rx: 17, ry: 10 } },
  { slug: 'neck',      shape: 'ellipse', props: { cx: 120, cy: 92,  rx: 15, ry: 8 } },
  { slug: 'throat',    shape: 'ellipse', props: { cx: 120, cy: 80,  rx: 10, ry: 6 } },
]

function ZoneShape({ shape, props, on, onTap, onHover, onLeave }) {
  const baseStyle = {
    fill: on ? 'rgba(230,200,120,.30)' : 'transparent',
    stroke: on ? 'var(--color-accent-primary)' : 'transparent',
    strokeWidth: 2,
    cursor: 'pointer',
    transition: 'fill .15s, stroke .15s',
  }
  const hoverHandlers = {
    onMouseEnter: onHover,
    onMouseLeave: onLeave,
    onClick: onTap,
  }
  if (shape === 'rect') return <rect {...props} style={baseStyle} {...hoverHandlers} />
  if (shape === 'ellipse') return <ellipse {...props} style={baseStyle} {...hoverHandlers} />
  if (shape === 'circle') return <circle {...props} style={baseStyle} {...hoverHandlers} />
  return null
}

export default function BodyMap({ bodyData, bodyEntries, onAddLocation, onRemoveLocation, onToggleQuality }) {
  const [hovered, setHovered] = useState(null)
  const [paletteFor, setPaletteFor] = useState(null) // slug whose quality palette is open

  const { locations, qualities } = bodyData

  // Build lookup: slug → name
  const locationBySlug = useMemo(() => {
    const map = {}
    for (const l of locations) map[l.slug] = l
    return map
  }, [locations])

  // Build quality groups
  const qualityGroups = useMemo(() => {
    const ungrouped = []
    const groups = {}
    for (const q of qualities) {
      const g = QUALITY_GROUP_MAP[q.slug]
      if (g) {
        if (!groups[g]) groups[g] = []
        groups[g].push(q)
      } else {
        ungrouped.push(q)
      }
    }
    const ordered = QUALITY_GROUP_ORDER
      .filter(g => groups[g])
      .map(g => ({ label: g, items: groups[g] }))
    if (ungrouped.length) ordered.push({ label: 'other', items: ungrouped })
    return ordered
  }, [qualities])

  const selectedSlugs = useMemo(() => new Set(bodyEntries.map(e => e.location_slug)), [bodyEntries])
  const isWhole = selectedSlugs.has('whole-body')

  // Button locations (back, skin, whole-body, joints)
  const buttonLocations = locations.filter(l => BUTTON_LOCATION_SLUGS.includes(l.slug))

  function tapLocation(slug) {
    if (selectedSlugs.has(slug)) {
      // Re-tap: open quality palette
      setPaletteFor(prev => prev === slug ? null : slug)
    } else {
      onAddLocation(slug)
      setPaletteFor(slug) // open palette on add
    }
  }

  function getEntryFor(slug) {
    return bodyEntries.find(e => e.location_slug === slug)
  }

  const bodyfill = isWhole ? 'rgba(230,200,120,.10)' : '#1d2747'
  const bodyline = isWhole ? 'var(--color-accent-primary)' : '#3a4878'

  return (
    <div>
      <style>{`
        .lf-body-zone { fill: transparent; stroke: transparent; stroke-width: 2; cursor: pointer; transition: fill .15s; }
        .lf-body-zone:hover { fill: rgba(230,200,120,.16); }
        .lf-body-zone.on { fill: rgba(230,200,120,.30); stroke: var(--color-accent-primary); }
      `}</style>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Figure column */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220 }}>
          <svg viewBox="0 0 240 510" style={{ display: 'block', width: 200, height: 'auto', touchAction: 'manipulation' }}
            aria-label="body figure">
            {/* Base silhouette */}
            <g>
              <ellipse className="body-base" cx="120" cy="46" rx="26" ry="32" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="110" y="74" width="20" height="20" rx="7" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="84" y="96" width="72" height="70" rx="18" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="88" y="162" width="64" height="62" rx="18" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="86" y="220" width="68" height="40" rx="16" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="52" y="104" width="20" height="152" rx="10" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="168" y="104" width="20" height="152" rx="10" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <circle className="body-base" cx="62" cy="268" r="13" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <circle className="body-base" cx="178" cy="268" r="13" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="94" y="256" width="24" height="210" rx="12" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <rect className="body-base" x="122" y="256" width="24" height="210" rx="12" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <ellipse className="body-base" cx="100" cy="476" rx="20" ry="11" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              <ellipse className="body-base" cx="140" cy="476" rx="20" ry="11" fill={bodyfill} stroke={bodyline} strokeWidth="1.4" />
              {/* Joint dots */}
              <circle fill={bodyline} cx="88" cy="104" r="4" /><circle fill={bodyline} cx="152" cy="104" r="4" />
              <circle fill={bodyline} cx="62" cy="178" r="4" /><circle fill={bodyline} cx="178" cy="178" r="4" />
              <circle fill={bodyline} cx="62" cy="256" r="4" /><circle fill={bodyline} cx="178" cy="256" r="4" />
              <circle fill={bodyline} cx="106" cy="258" r="4" /><circle fill={bodyline} cx="134" cy="258" r="4" />
              <circle fill={bodyline} cx="106" cy="362" r="4" /><circle fill={bodyline} cx="134" cy="362" r="4" />
              <circle fill={bodyline} cx="106" cy="464" r="4" /><circle fill={bodyline} cx="134" cy="464" r="4" />
            </g>
            {/* Tappable zones */}
            {SVG_ZONES.map(z => {
              const key = z.key ?? z.slug
              const on = selectedSlugs.has(z.slug)
              return (
                <ZoneShape
                  key={key}
                  shape={z.shape}
                  props={z.props}
                  on={on}
                  onTap={() => tapLocation(z.slug)}
                  onHover={() => setHovered(z.slug)}
                  onLeave={() => setHovered(null)}
                />
              )
            })}
          </svg>

          {/* Hover label */}
          <div style={{ height: 20, marginTop: 2, fontSize: 13, color: 'var(--color-text-secondary)', fontStyle: hovered ? 'normal' : 'italic' }}>
            {hovered ? <b style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>{locationBySlug[hovered]?.name ?? hovered}</b> : 'tap where you feel it'}
          </div>

          {/* Button locations */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {buttonLocations.map(l => {
              const on = selectedSlugs.has(l.slug)
              return (
                <button key={l.slug} onClick={() => tapLocation(l.slug)} style={{
                  background: on ? 'rgba(230,200,120,.12)' : 'transparent',
                  border: on ? '1px solid var(--color-accent-primary)' : '1px dashed var(--color-border)',
                  color: on ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  borderRadius: 999, padding: '5px 12px', fontSize: 12.5, cursor: 'pointer',
                }}>
                  {l.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cards column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bodyEntries.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', border: '1px dashed var(--color-border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              what you find gathers here —<br />tap where it lives in your body, if anywhere
            </div>
          )}

          {bodyEntries.map(entry => {
            const locName = locationBySlug[entry.location_slug]?.name ?? entry.location_slug
            const isPaletteOpen = paletteFor === entry.location_slug
            const entryQualities = entry.quality_slugs || []

            return (
              <div key={entry.location_slug} style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12, padding: '9px 12px',
                background: 'rgba(20,29,54,.4)',
              }}>
                {/* Card head */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-accent-primary)', fontWeight: 600 }}>{locName}</span>
                  {/* Quality tags */}
                  {entryQualities.map(qSlug => {
                    const qName = qualities.find(q => q.slug === qSlug)?.name ?? qSlug
                    return (
                      <span key={qSlug} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'rgba(230,200,120,.10)', border: '1px solid rgba(230,200,120,.4)',
                        color: 'var(--color-accent-primary)', borderRadius: 999, fontSize: 12, padding: '2px 6px 2px 9px',
                      }}>
                        {qName}
                        <button onClick={() => onToggleQuality(entry.location_slug, qSlug)} style={{
                          background: 'none', border: 'none', color: 'var(--color-accent-primary)', opacity: 0.65,
                          cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
                        }}>×</button>
                      </span>
                    )
                  })}
                  {/* Actions */}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={() => setPaletteFor(prev => prev === entry.location_slug ? null : entry.location_slug)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {isPaletteOpen ? 'done' : entryQualities.length ? 'edit quality' : '+ quality'}
                    </button>
                    <button onClick={() => { onRemoveLocation(entry.location_slug); if (paletteFor === entry.location_slug) setPaletteFor(null) }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>
                      ×
                    </button>
                  </span>
                </div>

                {/* Quality palette */}
                {isPaletteOpen && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--color-border)' }}>
                    {qualityGroups.map(grp => (
                      <div key={grp.label} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 5 }}>
                          {grp.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {grp.items.map(q => {
                            const on = entryQualities.includes(q.slug)
                            return (
                              <button key={q.slug} onClick={() => onToggleQuality(entry.location_slug, q.slug)} style={{
                                background: on ? 'rgba(230,200,120,.12)' : 'var(--color-background-primary)',
                                border: on ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                                color: on ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                                borderRadius: 999, padding: '4px 11px', fontSize: 13, cursor: 'pointer',
                              }}>
                                {q.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
