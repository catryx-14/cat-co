import { useState, useMemo } from 'react'

// ── Frontend taxonomy constants (source of truth for display order / labels) ──

const REGIONS = [
  { slug: 'head-face',   label: 'head & face' },
  { slug: 'chest-belly', label: 'chest & belly' },
  { slug: 'arms-legs',   label: 'arms & legs' },
  { slug: 'all-over',    label: 'all over' },
]

const CATEGORIES = [
  { slug: 'energy',           label: 'energy' },
  { slug: 'temperature',      label: 'temperature' },
  { slug: 'weight-tightness', label: 'weight & tightness' },
  { slug: 'everything-else',  label: 'everything else' },
]

// SVG region hit-areas (drawn on top of silhouette; order = back-to-front paint order)
const FIGURE_ZONES = [
  { regionSlug: 'chest-belly', key: 'cb',    shape: 'rect',
    props: { x: 78,  y: 90,  width: 84,  height: 150, rx: 20 } },
  { regionSlug: 'head-face',   key: 'hf',    shape: 'ellipse',
    props: { cx: 120, cy: 44, rx: 36,  ry: 46 } },
  { regionSlug: 'arms-legs',   key: 'al-la', shape: 'rect',
    props: { x: 44,  y: 98,  width: 34,  height: 190, rx: 17 } },
  { regionSlug: 'arms-legs',   key: 'al-ra', shape: 'rect',
    props: { x: 162, y: 98,  width: 34,  height: 190, rx: 17 } },
  { regionSlug: 'arms-legs',   key: 'al-ll', shape: 'rect',
    props: { x: 84,  y: 238, width: 36,  height: 250, rx: 18 } },
  { regionSlug: 'arms-legs',   key: 'al-rl', shape: 'rect',
    props: { x: 120, y: 238, width: 36,  height: 250, rx: 18 } },
]

// Colour tokens — body = gold family
const BODY_C = {
  text:   '#e8c98c',
  border: 'rgba(232,201,140,0.45)',
  bg:     'rgba(232,201,140,0.12)',
}
const GOLD    = 'var(--color-accent-primary)'
const SIL_FILL = '#1d2747'
const SIL_LINE = '#3a4878'

// ─────────────────────────────────────────────────────────────────────────────

export default function BodyMap({ bodyData, bodyEntries, onAddLocation, onRemoveLocation, onToggleQuality }) {
  const [activeRegion,  setActiveRegion]  = useState('head-face')
  const [openPart,      setOpenPart]      = useState(null)
  const [openCategory,  setOpenCategory]  = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)

  const { locations = [], qualities = [] } = bodyData

  // ── derived lookups ────────────────────────────────────────────────────────

  const locationBySlug = useMemo(() => {
    const m = {}
    for (const l of locations) m[l.slug] = l
    return m
  }, [locations])

  const locationsByRegion = useMemo(() => {
    const m = {}
    for (const r of REGIONS) m[r.slug] = []
    for (const l of locations) {
      if (l.parent_group && m[l.parent_group]) m[l.parent_group].push(l)
    }
    return m
  }, [locations])

  const qualitiesByCategory = useMemo(() => {
    const m = {}
    for (const c of CATEGORIES) m[c.slug] = []
    for (const q of qualities) {
      if (q.parent_group && m[q.parent_group]) m[q.parent_group].push(q)
    }
    return m
  }, [qualities])

  const entryByPart = useMemo(() => {
    const m = {}
    for (const e of bodyEntries) m[e.location_slug] = e
    return m
  }, [bodyEntries])

  // Which regions have at least one gathered part (for figure visual feedback)
  const gatheredRegions = useMemo(() => {
    const s = new Set()
    for (const e of bodyEntries) {
      const loc = locationBySlug[e.location_slug]
      if (loc?.parent_group) s.add(loc.parent_group)
    }
    return s
  }, [bodyEntries, locationBySlug])

  // ── interaction handlers ──────────────────────────────────────────────────

  function switchRegion(slug) {
    setActiveRegion(slug)
    setOpenPart(null)
    setOpenCategory(null)
  }

  function togglePart(slug) {
    if (openPart === slug) {
      setOpenPart(null)
      setOpenCategory(null)
    } else {
      setOpenPart(slug)
      setOpenCategory(null)
      // Opening a part automatically gathers it — shows in bouquet as just the name
      // if no qualities are added. (Remove via × on the bouquet pill.)
      if (!entryByPart[slug]) onAddLocation(slug)
    }
  }

  function toggleCategory(slug) {
    setOpenCategory(prev => prev === slug ? null : slug)
  }

  // Tap a quality word: auto-add the part if not yet gathered, then toggle the quality.
  // Both calls use functional updaters in the parent, so the second sees the result of
  // the first even when batched in the same React 18 event.
  function handleWordTap(partSlug, qualitySlug) {
    if (!entryByPart[partSlug]) onAddLocation(partSlug)
    onToggleQuality(partSlug, qualitySlug)
  }

  // Tap a bouquet pill → scroll-to-edit: open that part's region and expand its row
  function openPartForEdit(locationSlug) {
    const loc = locationBySlug[locationSlug]
    if (!loc?.parent_group) return
    setActiveRegion(loc.parent_group)
    setOpenPart(locationSlug)
    setOpenCategory(null)
  }

  // ── render ────────────────────────────────────────────────────────────────

  const isAllOver = activeRegion === 'all-over'

  return (
    <div>

      {/* ── Region pills ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {REGIONS.map(r => {
          const active = activeRegion === r.slug
          const has    = gatheredRegions.has(r.slug)
          return (
            <button
              key={r.slug}
              onClick={() => switchRegion(r.slug)}
              style={{
                background:   active ? BODY_C.bg : 'transparent',
                border:       `1px solid ${active ? BODY_C.border : has ? 'rgba(232,201,140,0.28)' : 'var(--color-border)'}`,
                color:        active ? BODY_C.text : has ? BODY_C.text : 'var(--color-text-secondary)',
                borderRadius: 999, padding: '5px 13px', fontSize: 13, cursor: 'pointer',
                fontWeight:   active ? 500 : 400,
                opacity:      has && !active ? 0.85 : 1,
                transition:   'background .12s, border-color .12s',
              }}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {/* ── Tree + figure (side by side) ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* Left lane: three-level expanding tree */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {(locationsByRegion[activeRegion] || []).map(part => {
            const isPartOpen = openPart === part.slug
            const entry      = entryByPart[part.slug]
            const hasEntry   = !!entry
            const qualCount  = entry?.quality_slugs?.length ?? 0

            return (
              <div key={part.slug}>

                {/* Part row (level 1) */}
                <button
                  onClick={() => togglePart(part.slug)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: `0.5px solid ${isPartOpen ? 'transparent' : 'var(--color-border-tertiary)'}`,
                    padding: '7px 2px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: 14, flex: 1,
                    color:      hasEntry ? BODY_C.text : 'var(--color-text-primary)',
                    fontWeight: hasEntry ? 500 : 400,
                  }}>
                    {part.name}
                  </span>
                  {hasEntry && (
                    <span style={{ fontSize: 11, color: BODY_C.text, opacity: 0.7 }}>
                      {qualCount > 0 ? qualCount : '·'}
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0,
                    transform:  isPartOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform .12s',
                  }}>▼</span>
                </button>

                {/* Sensation groups (level 2) — only when part is open */}
                {isPartOpen && (
                  <div style={{
                    marginLeft: 10, paddingLeft: 12, paddingBottom: 8, marginBottom: 4,
                    borderLeft: `1.5px solid var(--color-border-tertiary)`,
                  }}>
                    {CATEGORIES.map(cat => {
                      const words     = qualitiesByCategory[cat.slug] || []
                      const isCatOpen = openCategory === cat.slug
                      if (!words.length) return null

                      return (
                        <div key={cat.slug}>

                          {/* Category header (level 2) */}
                          <button
                            onClick={() => toggleCategory(cat.slug)}
                            style={{
                              width: '100%', textAlign: 'left', background: 'none', border: 'none',
                              padding: '5px 0', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                          >
                            <span style={{
                              fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase',
                              color: isCatOpen ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                            }}>
                              {cat.label}
                            </span>
                            <span style={{
                              fontSize: 9, color: 'var(--color-text-tertiary)', flexShrink: 0,
                              transform:  isCatOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform .12s',
                            }}>▼</span>
                          </button>

                          {/* Quality words (level 3) — plain text, one per row */}
                          {isCatOpen && (
                            <div style={{ paddingBottom: 6 }}>
                              {words.map(q => {
                                const on = entry?.quality_slugs?.includes(q.slug) ?? false
                                return (
                                  <button
                                    key={q.slug}
                                    onClick={() => handleWordTap(part.slug, q.slug)}
                                    style={{
                                      display: 'block', width: '100%', textAlign: 'left',
                                      background: 'none', border: 'none', cursor: 'pointer',
                                      padding: '4px 0',
                                      fontFamily: 'var(--font-serif)', fontSize: 14,
                                      color:      on ? GOLD : 'var(--color-text-secondary)',
                                      fontWeight: on ? 600 : 400,
                                      transition: 'color .1s',
                                    }}
                                  >
                                    {on && (
                                      <span style={{ marginRight: 5, fontSize: 11, opacity: 0.8 }}>✓</span>
                                    )}
                                    {q.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Centre: body figure — coarse region selector; glows fully when 'all over' */}
        <div style={{ flex: '0 0 auto', width: 148 }} className="lf-body-figure">
            <svg
              viewBox="0 0 240 510"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              aria-label="body figure — tap to switch region"
            >
              {/* Base silhouette */}
              <g>
                <ellipse cx="120" cy="46"  rx="26" ry="32"  fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="110" y="74"   width="20"  height="22"  rx="7"  fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="84"  y="94"   width="72"  height="70"  rx="18" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="88"  y="160"  width="64"  height="64"  rx="18" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="86"  y="220"  width="68"  height="44"  rx="16" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="52"  y="104"  width="20"  height="152" rx="10" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="168" y="104"  width="20"  height="152" rx="10" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <circle  cx="62"  cy="268" r="13"     fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <circle  cx="178" cy="268" r="13"     fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="94"  y="258"  width="24"  height="210" rx="12" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <rect    x="122" y="258"  width="24"  height="210" rx="12" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <ellipse cx="100" cy="478" rx="20" ry="11" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                <ellipse cx="140" cy="478" rx="20" ry="11" fill={SIL_FILL} stroke={SIL_LINE} strokeWidth="1.4" />
                {/* Joint dots */}
                <circle fill={SIL_LINE} cx="88"  cy="104" r="3.5" />
                <circle fill={SIL_LINE} cx="152" cy="104" r="3.5" />
                <circle fill={SIL_LINE} cx="62"  cy="178" r="3.5" />
                <circle fill={SIL_LINE} cx="178" cy="178" r="3.5" />
                <circle fill={SIL_LINE} cx="62"  cy="256" r="3.5" />
                <circle fill={SIL_LINE} cx="178" cy="256" r="3.5" />
                <circle fill={SIL_LINE} cx="106" cy="260" r="3.5" />
                <circle fill={SIL_LINE} cx="134" cy="260" r="3.5" />
                <circle fill={SIL_LINE} cx="106" cy="365" r="3.5" />
                <circle fill={SIL_LINE} cx="134" cy="365" r="3.5" />
                <circle fill={SIL_LINE} cx="106" cy="466" r="3.5" />
                <circle fill={SIL_LINE} cx="134" cy="466" r="3.5" />
              </g>

              {/* Region hit-areas — last element wins the click (paint on top) */}
              {FIGURE_ZONES.map(z => {
                const isActive  = isAllOver || activeRegion === z.regionSlug
                const isHovered = hoveredRegion === z.regionSlug && !isActive
                const hasItems  = gatheredRegions.has(z.regionSlug) && !isActive
                const fill = isActive
                  ? 'rgba(232,201,140,0.22)'
                  : isHovered
                    ? 'rgba(232,201,140,0.14)'
                    : hasItems
                      ? 'rgba(232,201,140,0.07)'
                      : 'transparent'
                const stroke = isActive
                  ? 'rgba(232,201,140,0.55)'
                  : hasItems
                    ? 'rgba(232,201,140,0.28)'
                    : 'transparent'
                const commonProps = {
                  style:        { fill, stroke, strokeWidth: 2, cursor: 'pointer', transition: 'fill .15s' },
                  onClick:      () => switchRegion(z.regionSlug),
                  onMouseEnter: () => setHoveredRegion(z.regionSlug),
                  onMouseLeave: () => setHoveredRegion(null),
                }
                if (z.shape === 'ellipse') return <ellipse key={z.key} {...z.props} {...commonProps} />
                if (z.shape === 'rect')    return <rect    key={z.key} {...z.props} {...commonProps} />
                return null
              })}
            </svg>
            <div style={{
              textAlign: 'center', fontSize: 11,
              color: 'var(--color-text-tertiary)', marginTop: 4,
            }}>
              {isAllOver ? 'tap a region to focus' : 'tap to switch region'}
            </div>
          </div>
      </div>  {/* end tree + figure */}

      {/* ── Bottom bouquet: gathered items as compound pills ─────────────── */}
      {bodyEntries.length > 0 && (
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', flexWrap: 'wrap', gap: 7,
        }}>
          {bodyEntries.map(entry => {
            const locName   = locationBySlug[entry.location_slug]?.name ?? entry.location_slug
            const qualNames = (entry.quality_slugs || [])
              .map(qs => qualities.find(q => q.slug === qs)?.name ?? qs)
            const label = qualNames.length
              ? `${locName} · ${qualNames.join(', ')}`
              : locName

            return (
              <span
                key={entry.location_slug}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: BODY_C.bg, border: `0.5px solid ${BODY_C.border}`,
                  color: BODY_C.text, borderRadius: 999, fontSize: 12,
                  padding: '4px 8px 4px 10px',
                }}
              >
                {/* Tappable label — re-opens this part in the tree for editing */}
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => openPartForEdit(entry.location_slug)}
                  title="tap to edit"
                >
                  {label}
                </span>
                {/* Remove */}
                <span
                  onClick={() => onRemoveLocation(entry.location_slug)}
                  style={{
                    cursor: 'pointer', opacity: 0.6, fontSize: 14,
                    lineHeight: 1, padding: '0 3px',
                  }}
                  aria-label="remove"
                >×</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Hide figure on very narrow screens */}
      <style>{`
        @media (max-width: 460px) { .lf-body-figure { display: none !important; } }
      `}</style>
    </div>
  )
}
