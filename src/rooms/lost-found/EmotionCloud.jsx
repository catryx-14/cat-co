import { useState, useMemo } from 'react'
import { FAMILY_ORDER, findWordMatches, CATEGORY_COLORS } from './lib/lostFoundDb.js'

const EMO = CATEGORY_COLORS.emotion // rose — emotion category colour

// Pill width helper (mirrors prototype)
function pillW(word) { return Math.max(44, word.length * 7 + 18) }

function useViewport() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700)
  if (typeof window !== 'undefined') {
    const handler = () => setMobile(window.innerWidth < 700)
    // attach once — safe because this component is always mounted
    if (!window.__lfCloudResizeAttached) {
      window.addEventListener('resize', handler)
      window.__lfCloudResizeAttached = true
    }
  }
  return mobile
}

export default function EmotionCloud({ emotionData, selected, onAdd, onRemove, askClaudeOpen, onCreateWord }) {
  const isMobile = useViewport()
  const { bySlug, families } = emotionData

  const [center, setCenter] = useState(null)     // current word slug
  const [curFam, setCurFam] = useState(null)     // current family name
  const [path, setPath] = useState([])           // traversal path (slugs)
  const [searchVal, setSearchVal] = useState('')
  const [searchHits, setSearchHits] = useState([])
  const [addFamilyOpen, setAddFamilyOpen] = useState(false) // showing family picker for a new word
  const [addingWord, setAddingWord] = useState(false)       // create in flight
  const [addError, setAddError] = useState(null)

  const selectedSlugs = useMemo(() => new Set(selected.map(s => s.slug)), [selected])

  // Ordered families
  const famOrder = useMemo(() => {
    return FAMILY_ORDER.filter(f => families[f])
  }, [families])

  function go(slug, mode) {
    if (!bySlug[slug]) return
    const word = bySlug[slug]
    setCenter(slug)
    setCurFam(word.family)
    setSearchVal('')
    setSearchHits([])
    if (mode === 'seed') {
      setPath([slug])
    } else if (mode === 'crumb') {
      // path already trimmed by caller
    } else {
      setPath(prev => prev[prev.length - 1] === slug ? prev : [...prev, slug])
    }
  }

  function browseFamily(f) {
    setCenter(null)
    setCurFam(f)
    setPath([])
    setSearchVal('')
    setSearchHits([])
  }

  function toggleSelected(slug) {
    const source = mode => {
      if (mode === 'search') return askClaudeOpen ? 'ask_claude_question' : 'self'
      return askClaudeOpen ? 'ask_claude_question' : 'cloud'
    }
    if (selectedSlugs.has(slug)) {
      onRemove(slug)
    } else {
      const traversal = path.length > 1 ? [...path] : null
      onAdd({ slug, source: source(path.length <= 1 ? 'search' : 'cloud'), traversal_path: traversal })
    }
  }

  function handleSearch(q) {
    setSearchVal(q)
    setAddFamilyOpen(false)
    setAddError(null)
    if (!q.trim()) { setSearchHits([]); return }
    // Variant-aware match: typing "loving" surfaces an existing "love".
    const hits = findWordMatches(q, Object.values(bySlug)).slice(0, 8)
    setSearchHits(hits)
    // Centre the cloud on the closest match as you type — but DON'T clear the
    // search box / hits (go() does that, which wiped the field on every keystroke).
    if (hits.length > 0) {
      const slug = hits[0].slug
      const word = bySlug[slug]
      setCenter(slug)
      setCurFam(word.family)
      setPath([slug])
    }
  }

  // Create a brand-new personal word in the chosen family, then gather it.
  async function handleCreateWord(family) {
    const word = searchVal.trim()
    if (!word || !onCreateWord) return
    setAddingWord(true)
    setAddError(null)
    try {
      const row = await onCreateWord(word, family)
      onAdd({ slug: row.slug, source: askClaudeOpen ? 'ask_claude_question' : 'self', traversal_path: null })
      setCenter(row.slug)
      setCurFam(row.family)
      setPath([row.slug])
      setSearchVal('')
      setSearchHits([])
      setAddFamilyOpen(false)
    } catch (err) {
      console.error('add emotion word error', err)
      setAddError('Could not add that word. Try again.')
    } finally {
      setAddingWord(false)
    }
  }

  function handleSearchPick(slug) {
    const source = askClaudeOpen ? 'ask_claude_question' : 'self'
    if (!selectedSlugs.has(slug)) {
      onAdd({ slug, source, traversal_path: null })
    }
    go(slug, 'seed')
  }

  // Neighbours for cloud rendering
  const neighbours = useMemo(() => {
    if (!center || !bySlug[center]) return []
    return (bySlug[center].neighbours || []).filter(s => bySlug[s]).slice(0, 8)
  }, [center, bySlug])

  // Cloud SVG points
  const pts = useMemo(() => {
    const cx = 240, cy = 200, R = 132
    return neighbours.map((s, i) => {
      const ang = (-90 + i * (360 / neighbours.length)) * Math.PI / 180
      return { s, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) }
    })
  }, [neighbours])

  const styles = {
    root: {
      display: 'flex', flexDirection: 'column', gap: 8,
    },
    searchRow: {
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    },
    searchInput: {
      flex: 1, minWidth: 140,
      fontFamily: 'var(--font-serif)', fontSize: 15,
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 8, padding: '6px 10px',
      color: 'var(--color-text-primary)',
      outline: 'none',
    },
    famChips: {
      display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4,
    },
    famChip: active => ({
      background: active ? EMO.bg : 'var(--color-background-primary)',
      border: `0.5px solid ${active ? EMO.border : 'var(--color-border)'}`,
      color: active ? EMO.text : 'var(--color-text-secondary)',
      borderRadius: 999, padding: '4px 11px', fontSize: 12,
      cursor: 'pointer', fontFamily: 'var(--font-serif)',
    }),
    cloudWrap: {
      display: 'flex', gap: 12, alignItems: 'flex-start',
    },
    famList: {
      flex: '0 0 155px', maxHeight: 320, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 2,
    },
    famListItem: (isCenter, isSel) => ({
      fontSize: 13, padding: '4px 9px',
      borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
      cursor: 'pointer',
      background: isCenter ? EMO.bg : 'transparent',
      color: isCenter ? EMO.text : 'var(--color-text-secondary)',
      fontWeight: isCenter ? 500 : 400,
    }),
    breadcrumb: {
      fontSize: 12, color: 'var(--color-text-tertiary)',
      lineHeight: 1.6, minHeight: 18, marginBottom: 4,
    },
    dontKnow: {
      background: 'none',
      border: '0.5px solid var(--color-border)',
      color: 'var(--color-text-tertiary)',
      borderRadius: 999, padding: '5px 13px', fontSize: 13, cursor: 'pointer',
      marginTop: 6,
    },
    saveBtn: on => ({
      background: on ? EMO.bg : 'transparent',
      border: `0.5px solid ${on ? EMO.border : 'var(--color-border)'}`,
      color: on ? EMO.text : 'var(--color-text-secondary)',
      borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
    }),
  }

  // Breadcrumb trail
  function BreadcrumbTrail() {
    if (!path.length) return (
      <div style={styles.breadcrumb}>
        <span style={{ fontStyle: 'italic' }}>your path traces here as you travel</span>
      </div>
    )
    const start = path.length > 7 ? path.length - 7 : 0
    const crumbs = path.slice(start)
    return (
      <div style={styles.breadcrumb}>
        {start > 0 && <span>… </span>}
        {crumbs.map((s, i) => {
          const isLast = i === crumbs.length - 1
          const absIdx = start + i
          return (
            <span key={s}>
              <span
                style={{ color: isLast ? 'var(--color-text-info)' : 'var(--color-text-tertiary)', fontWeight: isLast ? 500 : 400, cursor: 'pointer' }}
                onClick={() => { const trimmed = path.slice(0, absIdx + 1); setPath(trimmed); go(s, 'crumb') }}
              >
                {bySlug[s]?.word ?? s}
              </span>
              {!isLast && <span style={{ opacity: 0.5 }}> › </span>}
            </span>
          )
        })}
      </div>
    )
  }

  // Cloud SVG
  function CloudSVG() {
    if (!center) {
      const msg = curFam ? 'pick a word from the list to begin' : 'choose a family to begin'
      return (
        <svg width="100%" viewBox="0 0 480 400" style={{ display: 'block' }}>
          <text x="240" y="200" textAnchor="middle" style={{ fill: 'var(--color-text-tertiary)', fontStyle: 'italic', fontSize: 13 }}>{msg}</text>
        </svg>
      )
    }

    const cx = 240, cy = 200
    const centerWord = bySlug[center]
    const cw = centerWord?.word ?? center
    const cpw = Math.max(64, pillW(cw) + 10), cph = 40

    return (
      <svg width="100%" viewBox="0 0 480 400" style={{ display: 'block' }}>
        {/* spoke lines */}
        {pts.map(p => (
          <line key={p.s} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
            stroke="var(--color-border-secondary)" strokeWidth="0.5" />
        ))}
        {/* neighbour pills */}
        {pts.map(p => {
          const w = bySlug[p.s]
          if (!w) return null
          const pw = pillW(w.word), ph = 28
          const on = selectedSlugs.has(p.s)
          const cross = w.family !== centerWord?.family
          return (
            <g key={p.s} style={{ cursor: 'pointer' }} onClick={() => go(p.s, 'travel')}>
              <rect
                x={(p.x - pw / 2).toFixed(1)} y={(p.y - ph / 2).toFixed(1)}
                width={pw} height={ph} rx={14}
                fill={on ? EMO.bg : 'var(--color-background-secondary)'}
                stroke={on ? EMO.border : cross ? 'var(--color-border-secondary)' : 'var(--color-border-tertiary)'}
                strokeWidth={cross ? 1 : 0.5}
                strokeDasharray={cross ? '1 3' : undefined}
                strokeLinecap={cross ? 'round' : undefined}
              />
              <text x={p.x.toFixed(1)} y={p.y.toFixed(1)} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 13, fill: on ? EMO.text : 'var(--color-text-secondary)' }}>
                {w.word}
              </text>
            </g>
          )
        })}
        {/* center pill */}
        <g>
          <rect x={cx - cpw / 2} y={cy - cph / 2} width={cpw} height={cph} rx={20}
            fill={EMO.bg} stroke={EMO.border} strokeWidth="1.5" />
          <text x={cx} y={cy} textAnchor="middle" dy="0.35em"
            style={{ fill: EMO.text, fontSize: 15, fontWeight: 600 }}>
            {cw}
          </text>
        </g>
      </svg>
    )
  }

  // Add-a-new-word panel — shows only when the typed word matches nothing existing
  function AddWordPanel() {
    if (!onCreateWord) return null
    if (!searchVal.trim() || searchHits.length > 0) return null
    const word = searchVal.trim()
    return (
      <div style={{ marginTop: 2, marginBottom: 4 }}>
        {!addFamilyOpen ? (
          <button
            onClick={() => setAddFamilyOpen(true)}
            style={{ ...styles.famChip(false), borderStyle: 'dashed' }}
          >
            + add “{word}” to your words
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              which family does “{word}” belong with?
            </div>
            <div style={styles.famChips}>
              {FAMILY_ORDER.map(f => (
                <button key={f} disabled={addingWord} onClick={() => handleCreateWord(f)} style={styles.famChip(false)}>
                  {f}
                </button>
              ))}
              <button disabled={addingWord} onClick={() => { setAddFamilyOpen(false); setAddError(null) }} style={{ ...styles.famChip(false), opacity: 0.7 }}>
                cancel
              </button>
            </div>
            {addingWord && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>adding…</div>}
            {addError && <div style={{ fontSize: 12, color: 'rgba(210,130,110,.95)' }}>{addError}</div>}
          </div>
        )}
      </div>
    )
  }

  // Mobile: stacked layout
  if (isMobile) {
    return (
      <div style={styles.root}>
        {/* Search */}
        <input
          value={searchVal}
          onChange={e => handleSearch(e.target.value)}
          placeholder="…or type a rough word"
          style={styles.searchInput}
        />
        {searchHits.length > 0 && (
          <div style={styles.famChips}>
            <span style={{ width: '100%', fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              already in your words — tap to use
            </span>
            {searchHits.map(w => (
              <button key={w.slug} onClick={() => handleSearchPick(w.slug)}
                style={styles.famChip(selectedSlugs.has(w.slug))}>
                {w.word}
              </button>
            ))}
          </div>
        )}

        <AddWordPanel />

        {/* Family chips */}
        {!searchVal && (
          <div style={styles.famChips}>
            {famOrder.map(f => (
              <button key={f} onClick={() => browseFamily(f)} style={styles.famChip(curFam === f)}>
                {f}
              </button>
            ))}
          </div>
        )}

        <BreadcrumbTrail />
        <CloudSVG />

        {/* Word list for current family */}
        {curFam && families[curFam] && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {families[curFam].map(w => {
              const on = selectedSlugs.has(w.slug)
              return (
                <button key={w.slug} onClick={() => go(w.slug, 'travel')}
                  style={styles.famChip(w.slug === center || on)}>
                  {on && '✓ '}{w.word}
                </button>
              )
            })}
          </div>
        )}

        {/* Actions */}
        {center && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button style={styles.saveBtn(selectedSlugs.has(center))} onClick={() => toggleSelected(center)}>
              {selectedSlugs.has(center) ? `✓ gathered · ${bySlug[center]?.word}` : `gather · "${bySlug[center]?.word}"`}
            </button>
            <button style={styles.dontKnow} onClick={() => { setCenter(null); setCurFam(null); setPath([]) }}>
              still can't name it
            </button>
          </div>
        )}
      </div>
    )
  }

  // Desktop: family list | cloud | breadcrumb
  return (
    <div style={styles.root}>
      {/* Search row + family chips */}
      <div style={styles.searchRow}>
        <input
          value={searchVal}
          onChange={e => handleSearch(e.target.value)}
          placeholder="…or type a rough word"
          style={styles.searchInput}
        />
      </div>

      {searchHits.length > 0 && (
        <div style={styles.famChips}>
          <span style={{ width: '100%', fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            already in your words — tap to use
          </span>
          {searchHits.map(w => (
            <button key={w.slug} onClick={() => handleSearchPick(w.slug)}
              style={styles.famChip(selectedSlugs.has(w.slug))}>
              {w.word}
            </button>
          ))}
        </div>
      )}

      <AddWordPanel />

      {!searchVal && !curFam && (
        <div style={styles.famChips}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', alignSelf: 'center', marginRight: 4 }}>
            where are you, roughly?
          </span>
          {famOrder.map(f => (
            <button key={f} onClick={() => browseFamily(f)} style={styles.famChip(false)}>
              {f}
            </button>
          ))}
        </div>
      )}

      <BreadcrumbTrail />

      {/* Three-panel layout */}
      <div style={styles.cloudWrap}>
        {/* Left: family word list */}
        {curFam && (
          <div style={styles.famList}>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              · {curFam} ·
            </div>
            {(families[curFam] || []).map(w => {
              const isC = w.slug === center
              const on = selectedSlugs.has(w.slug)
              return (
                <div key={w.slug} style={styles.famListItem(isC, on)} onClick={() => go(w.slug, 'travel')}>
                  {on && <span style={{ fontSize: 11, color: 'var(--color-text-info)' }}>✓</span>}
                  <span>{w.word}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Centre: cloud SVG */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CloudSVG />
        </div>
      </div>

      {/* Bottom actions */}
      {center && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <button style={styles.saveBtn(selectedSlugs.has(center))} onClick={() => toggleSelected(center)}>
            {selectedSlugs.has(center)
              ? `✓ gathered · ${bySlug[center]?.word}`
              : `this is it · gather "${bySlug[center]?.word}"`}
          </button>
          <button style={styles.dontKnow} onClick={() => { setCenter(null); setCurFam(null); setPath([]) }}>
            still can't name it
          </button>
        </div>
      )}

      {/* Gathered emotions */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          {selected.map(e => (
            <span key={e.slug} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: EMO.bg, border: `0.5px solid ${EMO.border}`,
              color: EMO.text, borderRadius: 999, fontSize: 12, padding: '3px 10px',
            }}>
              {bySlug[e.slug]?.word ?? e.slug}
              <span style={{ cursor: 'pointer', opacity: 0.7, fontSize: 14 }} onClick={() => onRemove(e.slug)}>×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
