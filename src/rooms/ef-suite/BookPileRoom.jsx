import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../shared/lib/supabase.js'
import ScribblePanel from './ScribblePanel.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',     label: 'all',     statuses: [1, 2, 3] },
  { key: 'to-read', label: 'to read', statuses: [3] },
  { key: 'reading', label: 'reading', statuses: [1] },
  { key: 'read',    label: 'read',    statuses: [2] },
  { key: 'dnf',     label: 'dnf',     statuses: [4] },
]

const MY_RATING_OPTIONS = [
  { value: '6',   label: '6 — wrecked me in the best way' },
  { value: '5',   label: '5 — genuinely loved it' },
  { value: '4',   label: '4 — liked it, glad I read it' },
  { value: '3',   label: '3 — fine, finished it, meh' },
  { value: '2',   label: "2 — probably should have DNF'd" },
  { value: '1',   label: '1 — why did I finish this' },
  { value: 'dnf', label: 'DNF' },
]

const ENJOYMENT_FLAGS = [
  'slow burn', 'instalove', 'enemies to lovers', 'friends to lovers',
  'second chance', 'forced proximity', 'found family', 'chosen one',
  'morally grey protagonist', 'dark themes', 'explicit content',
  'cliffhanger ending', 'standalone', 'series complete', 'series ongoing',
  'happy ending', 'bittersweet ending', 'age gap', 'forbidden romance',
]

// Trope groups — sourced from Engine Room id=66 (not yet created; groups inferred from approved list)
const TROPE_GROUPS = [
  {
    key: 'romance-core', label: 'Romance core', color: '#c98aa0',
    tropes: [
      'Enemies to lovers', 'Forced proximity', 'Fake dating', 'Second chance',
      'Forbidden love', 'Grumpy / sunshine', 'Age gap', 'Slow burn', 'Love triangle',
      'One bed', 'Best friends to lovers', 'Brother\'s best friend', 'Boss / employee',
      'Bodyguard romance', 'Arranged / marriage of convenience', 'Secret identity',
      'Childhood sweethearts reunited', 'Protector / protected', 'Opposites attract',
      'Insta-love', 'Reverse harem',
    ],
  },
  {
    key: 'character-dynamics', label: 'Character dynamics', color: '#a890d4',
    tropes: [
      'Dark romance', 'Morally grey MMC', 'Alpha male', 'Soft hero', 'Villain love interest',
      'Found family', 'Single parent', 'Chosen one', 'Dark / brooding MMC', 'Sunshine FMC',
      'Strong FMC', 'Anti-hero', 'Reluctant hero', 'Mentor / student', 'Rivals',
      'Redemption arc', 'Broken hero', 'Obsessive / possessive MMC', 'Dual POV',
      'Unreliable narrator',
    ],
  },
  {
    key: 'plot-devices', label: 'Plot devices', color: '#c8844a',
    tropes: [
      'Revenge plot', 'Heist', 'Chosen one prophecy', 'Secret society', 'Hidden identity',
      'Missing memory / amnesia', 'Time loop', 'Portal fantasy', 'Quest',
      'Political intrigue', 'Slow reveal', 'Dark secret', 'Trapped together', 'Road trip',
      'Tournament / competition', 'Kidnapping / captive', 'Mistaken identity',
    ],
  },
  {
    key: 'setting', label: 'Setting flavours', color: '#6ec0bf',
    tropes: [
      'Small town', 'Academy / school setting', 'Royal court', 'Mafia / crime world',
      'Military / spec ops', 'Supernatural world', 'Fae court', 'Pack dynamics / shifters',
      'Vampire society', 'Witch / magic user', 'Dystopian', 'Post-apocalyptic', 'Space opera',
      'Regency / historical', 'Small-town cowboys', 'Sports romance', 'Office / workplace',
      'Medical setting', 'Rock star / celebrity', 'Billionaire world',
    ],
  },
  {
    key: 'emotional', label: 'Emotional beats', color: '#e8c98c',
    tropes: [
      'Hurt / comfort', 'Found family feels', 'Grief and loss', 'Trauma healing',
      'Identity crisis', 'Protective rage', 'Jealousy', 'Pining', 'Longing', 'Bittersweet',
      'Chosen family over blood', 'Dark past revealed', 'Learning to trust', 'Vulnerability',
      'Hope after devastation', 'Rage to tenderness', 'Letting go', 'Earned happiness',
    ],
  },
]

const GENRES = [
  'contemporary romance', 'historical romance', 'dark romance', 'romantasy',
  'urban fantasy', 'paranormal romance', 'romantic suspense', 'M/M romance',
  'mystery / thriller', 'sci-fi', 'fantasy', 'horror', 'non-fiction', 'other',
]

const SERIES_STATUS_OPTIONS = [
  { value: 'complete',   label: 'complete'   },
  { value: 'ongoing',    label: 'ongoing'    },
  { value: 'standalone', label: 'standalone' },
  { value: 'unknown',    label: 'unknown'    },
]

const CLIFFHANGER_OPTIONS = [
  { value: 'standalone',             label: 'standalone'             },
  { value: 'cliffhanger',            label: 'cliffhanger'            },
  { value: 'resolved-but-continues', label: 'resolved-but-continues' },
  { value: 'unknown',                label: 'unknown'                },
]

const HEAT_LEVEL_OPTIONS = [
  { value: 'none',     label: 'none'     },
  { value: 'sweet',    label: 'sweet'    },
  { value: 'warm',     label: 'warm'     },
  { value: 'steamy',   label: 'steamy'   },
  { value: 'explicit', label: 'explicit' },
]

const STORY_STRUCTURE_OPTIONS = [
  { value: 'plot-driven',      label: 'plot-driven'      },
  { value: 'character-driven', label: 'character-driven' },
  { value: 'balanced',         label: 'balanced'         },
]

const APPROVED_VIBES = [
  'slow burn', 'dark', 'emotional', 'lighthearted', 'tense',
  'witty', 'cozy', 'angsty', 'heartwarming', 'rich world-building',
  'magical', 'dangerous', 'forbidden', 'possessive', 'funny',
]

const EMPTY_FILTERS = {
  genre: '', tropes: [], heatLevel: '', seriesStatus: '',
  cliffhangerType: '', vibeTags: [], storyStructure: '', lowConfidenceOnly: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTropeColor(trope) {
  for (const group of TROPE_GROUPS) {
    if (group.tropes.includes(trope)) return group.color
  }
  return null
}

function hex2rgba(hex, a) {
  const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16))
  return `rgba(${r},${g},${b},${a})`
}

function countFilters(f) {
  return (f.genre ? 1 : 0) + f.tropes.length + (f.heatLevel ? 1 : 0) +
    (f.seriesStatus ? 1 : 0) + (f.cliffhangerType ? 1 : 0) +
    f.vibeTags.length + (f.storyStructure ? 1 : 0) + (f.lowConfidenceOnly ? 1 : 0)
}

// ── Base components ───────────────────────────────────────────────────────────

function RatingDots({ rating }) {
  if (!rating || rating === 0) return null
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i <= rating ? '#e8c98c' : 'rgba(255,255,255,0.15)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  )
}

function BookRow({ book, isSelected, onClick }) {
  const attr = book.attributes || {}
  const series = attr.series_name
    ? `${attr.series_name}${attr.series_number != null ? ` #${attr.series_number}` : ''}`
    : null
  return (
    <div
      onClick={onClick}
      style={{
        padding: '11px 0 11px 10px',
        borderBottom: '1px solid rgba(232,201,140,0.08)',
        borderLeft: isSelected ? '2px solid rgba(232,201,140,0.55)' : '2px solid transparent',
        background: isSelected ? 'rgba(232,201,140,0.05)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 17, color: '#f2f0e6', lineHeight: 1.3 }}>
            {book.title}
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {attr.author}
          </div>
          {series && (
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontStyle: 'italic' }}>
              {series}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, paddingTop: 2 }}>
          <RatingDots rating={attr.goodreads_rating} />
          {book.needs_review && (
            <span style={{ fontSize: 11, color: 'rgba(232,201,140,0.45)', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' }}>
              · needs sorting
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Personal field label — bold
function FieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
      letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase', marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

// AI field label — italic bold
function AiFieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600, fontStyle: 'italic',
      letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase', marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

const INPUT_STYLE = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(232,201,140,0.18)',
  borderRadius: 6,
  color: '#f2f0e6',
  fontFamily: "'Outfit', sans-serif",
  fontSize: 14,
  padding: '8px 12px',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  boxSizing: 'border-box',
}

function SelectField({ label, value, options, onChange, ai = false }) {
  const Label = ai ? AiFieldLabel : FieldLabel
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{label}</Label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        style={{ ...INPUT_STYLE, color: value ? '#f2f0e6' : 'rgba(255,255,255,0.3)' }}
      >
        <option value="">—</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ color: '#f2f0e6', background: '#131e44' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, ai = false }) {
  const Label = ai ? AiFieldLabel : FieldLabel
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{label}</Label>
      <textarea
        ref={ref}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...INPUT_STYLE,
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: 15,
          resize: 'none',
          lineHeight: 1.55,
          cursor: 'text',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  if (!value && value !== 0) return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  if (!display) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
        {display}
      </div>
    </div>
  )
}

function TropeChip({ trope, onRemove, small = false }) {
  const color = getTropeColor(trope)
  const chipStyle = color
    ? { background: hex2rgba(color, 0.12), border: `1px solid ${hex2rgba(color, 0.38)}`, color, boxShadow: `0 0 7px ${hex2rgba(color, 0.2)}` }
    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.45)' }
  return (
    <span style={{
      ...chipStyle,
      padding: onRemove ? (small ? '2px 5px 2px 8px' : '3px 6px 3px 10px') : (small ? '2px 8px' : '3px 10px'),
      borderRadius: 999,
      fontFamily: "'Outfit', sans-serif",
      fontSize: small ? 11 : 12,
      lineHeight: 1.5,
      display: 'inline-flex',
      alignItems: 'center',
      gap: onRemove ? 3 : 0,
      whiteSpace: 'nowrap',
    }}>
      {trope}
      {onRemove && (
        <button
          onMouseDown={e => { e.preventDefault(); onRemove() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', opacity: 0.55, padding: '0 1px',
            fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center',
          }}
        >×</button>
      )}
    </span>
  )
}

// Searchable dropdown tag selector.
// Options are sorted alphabetically; already-selected tags are excluded from the dropdown.
// onAddToList(tag): if provided, shows "Add to list" at the bottom when search doesn't match
//   any existing option — clicking adds to the book AND to the master options list.
// getOptionColor(opt): optional fn returning a hex color string for dropdown item text.
// renderChip(tag, onRemove): optional custom chip renderer; defaults to plain white chip.
function ApprovedTagInput({ label, options = [], value = [], onChange, placeholder = 'search...', renderChip, onAddToList, getOptionColor }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const q = search.trim().toLowerCase()
  const available = options
    .filter(opt => !value.includes(opt) && (!q || opt.toLowerCase().includes(q)))
    .sort((a, b) => a.localeCompare(b))

  const canAddNew = !!onAddToList && !!search.trim()
    && !options.some(o => o.toLowerCase() === search.trim().toLowerCase())
    && !value.some(v => v.toLowerCase() === search.trim().toLowerCase())

  function add(opt) {
    if (!value.includes(opt)) onChange([...value, opt])
    setSearch('')
    inputRef.current?.focus()
  }

  function handleAddToList() {
    const tag = search.trim()
    if (!tag) return
    add(tag)
    onAddToList(tag)
    setOpen(false)
  }

  function remove(opt) {
    onChange(value.filter(t => t !== opt))
  }

  const defaultChip = (tag, onRemove) => (
    <span key={tag} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 6px 3px 10px', borderRadius: 999,
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)',
      color: 'rgba(255,255,255,0.65)', fontFamily: "'Outfit', sans-serif", fontSize: 12,
    }}>
      {tag}
      <button
        onMouseDown={e => { e.preventDefault(); onRemove() }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1, padding: '0 1px', display: 'flex', alignItems: 'center' }}
      >×</button>
    </span>
  )

  const chipRenderer = renderChip ?? defaultChip
  const showDropdown = open && (available.length > 0 || canAddNew)

  return (
    <div style={{ marginBottom: 16 }}>
      <AiFieldLabel>{label}</AiFieldLabel>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map(tag => chipRenderer(tag, () => remove(tag)))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }}
          placeholder={placeholder}
          style={{ ...INPUT_STYLE, fontSize: 13, padding: '7px 11px', cursor: 'text' }}
        />
        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: '#0d1530', border: '1px solid rgba(232,201,140,0.22)',
            borderRadius: 6, maxHeight: 220, overflowY: 'auto', zIndex: 100,
          }}>
            {available.map(opt => (
              <div
                key={opt}
                onMouseDown={e => { e.preventDefault(); add(opt) }}
                style={{
                  padding: '7px 12px', cursor: 'pointer',
                  color: getOptionColor ? (getOptionColor(opt) || 'rgba(255,255,255,0.6)') : 'rgba(255,255,255,0.6)',
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {opt}
              </div>
            ))}
            {canAddNew && (
              <div
                onMouseDown={e => { e.preventDefault(); handleAddToList() }}
                style={{
                  padding: '7px 12px', cursor: 'pointer',
                  color: '#e8c98c', fontFamily: "'Outfit', sans-serif", fontSize: 12,
                  borderTop: available.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,201,140,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                + Add "{search.trim()}" to list
              </div>
            )}
          </div>
        )}
        {open && !showDropdown && search && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: '#0d1530', border: '1px solid rgba(232,201,140,0.22)',
            borderRadius: 6, padding: '8px 12px', zIndex: 100,
            color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif", fontSize: 12,
          }}>
            no matches
          </div>
        )}
      </div>
    </div>
  )
}

function TropeEditor({ options = [], value = [], onChange, onAddToList }) {
  return (
    <ApprovedTagInput
      label="Tropes"
      options={options}
      value={value}
      onChange={onChange}
      placeholder="search tropes..."
      onAddToList={onAddToList}
      getOptionColor={getTropeColor}
      renderChip={(trope, onRemove) => (
        <TropeChip key={trope} trope={trope} onRemove={onRemove} />
      )}
    />
  )
}

function ThingsToKnow({ value = [], onChange }) {
  const [customInput, setCustomInput] = useState('')
  const customFlags = value.filter(f => !ENJOYMENT_FLAGS.includes(f))
  const allFlags = [...ENJOYMENT_FLAGS, ...customFlags]
  function toggle(flag) {
    onChange(value.includes(flag) ? value.filter(f => f !== flag) : [...value, flag])
  }
  function addCustom() {
    const trimmed = customInput.trim().toLowerCase()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setCustomInput('')
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>Things to know</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {allFlags.map(flag => {
          const active = value.includes(flag)
          return (
            <button key={flag} onClick={() => toggle(flag)} style={{
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${active ? 'rgba(232,201,140,0.55)' : 'rgba(255,255,255,0.14)'}`,
              background: active ? 'rgba(232,201,140,0.1)' : 'transparent',
              color: active ? '#e8c98c' : 'rgba(255,255,255,0.4)',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {flag}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} placeholder="add custom tag..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,201,140,0.18)', borderRadius: 6, color: '#f2f0e6', fontFamily: "'Outfit', sans-serif", fontSize: 13, padding: '6px 10px' }} />
        <button onClick={addCustom} style={{ padding: '6px 14px', background: 'rgba(232,201,140,0.08)', border: '1px solid rgba(232,201,140,0.28)', borderRadius: 6, color: '#e8c98c', fontFamily: "'Outfit', sans-serif", fontSize: 13, cursor: 'pointer' }}>add</button>
      </div>
    </div>
  )
}

// ── Filter components ─────────────────────────────────────────────────────────

function ActiveFilterChips({ filters, onRemove, onClear }) {
  const chips = []
  if (filters.genre)           chips.push({ key: 'genre',     label: filters.genre,                          field: 'genre',           val: '' })
  if (filters.heatLevel)       chips.push({ key: 'heat',      label: `heat: ${filters.heatLevel}`,           field: 'heatLevel',       val: '' })
  if (filters.seriesStatus)    chips.push({ key: 'series',    label: `series: ${filters.seriesStatus}`,      field: 'seriesStatus',    val: '' })
  if (filters.cliffhangerType) chips.push({ key: 'ending',    label: `ending: ${filters.cliffhangerType}`,   field: 'cliffhangerType', val: '' })
  if (filters.storyStructure)  chips.push({ key: 'structure', label: `structure: ${filters.storyStructure}`, field: 'storyStructure',  val: '' })
  if (filters.lowConfidenceOnly) chips.push({ key: 'unvalidated', label: 'unvalidated', field: 'lowConfidenceOnly', val: false })
  filters.tropes.forEach(t   => chips.push({ key: `trope-${t}`, label: t, field: 'tropes',   val: filters.tropes.filter(x => x !== t) }))
  filters.vibeTags.forEach(t => chips.push({ key: `vibe-${t}`, label: `vibe: ${t}`, field: 'vibeTags', val: filters.vibeTags.filter(x => x !== t) }))
  if (chips.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, alignItems: 'center' }}>
      {chips.map(chip => (
        <span key={chip.key} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 6px 3px 10px', borderRadius: 999,
          background: 'rgba(232,201,140,0.08)', border: '1px solid rgba(232,201,140,0.25)',
          color: '#e8c98c', fontFamily: "'Outfit', sans-serif", fontSize: 11,
        }}>
          {chip.label}
          <button onClick={() => onRemove(chip.field, chip.val)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,201,140,0.5)', fontSize: 14, lineHeight: 1, padding: '0 1px', display: 'flex', alignItems: 'center' }}>×</button>
        </span>
      ))}
      {chips.length > 1 && (
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontFamily: "'Outfit', sans-serif", fontSize: 11, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
        >clear all</button>
      )}
    </div>
  )
}

function FilterPanel({ filters, onUpdate, onClear, distinctGenres, distinctVibeTags, tropeLogic, onTropeLogicToggle }) {
  const [expandedGroups, setExpandedGroups] = useState([])
  function toggleGroup(key) {
    setExpandedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  const sl = { // section label
    fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 600,
    letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', marginBottom: 5,
  }
  const compactSelect = {
    ...INPUT_STYLE, fontSize: 13, padding: '6px 10px',
    color: '#f2f0e6',
  }
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,201,140,0.1)',
      borderRadius: 8, padding: '14px 16px 10px', marginBottom: 14,
    }}>
      {/* Simple selects — two rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={sl}>Genre</div>
          <select style={compactSelect} value={filters.genre} onChange={e => onUpdate('genre', e.target.value)}>
            <option value="">all</option>
            {distinctGenres.map(g => <option key={g} value={g} style={{ background: '#131e44' }}>{g}</option>)}
          </select>
        </div>
        <div>
          <div style={sl}>Heat</div>
          <select style={compactSelect} value={filters.heatLevel} onChange={e => onUpdate('heatLevel', e.target.value)}>
            <option value="">all</option>
            {HEAT_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#131e44' }}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={sl}>Structure</div>
          <select style={compactSelect} value={filters.storyStructure} onChange={e => onUpdate('storyStructure', e.target.value)}>
            <option value="">all</option>
            {STORY_STRUCTURE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#131e44' }}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={sl}>Series</div>
          <select style={compactSelect} value={filters.seriesStatus} onChange={e => onUpdate('seriesStatus', e.target.value)}>
            <option value="">all</option>
            {SERIES_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#131e44' }}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={sl}>Ending</div>
          <select style={compactSelect} value={filters.cliffhangerType} onChange={e => onUpdate('cliffhangerType', e.target.value)}>
            <option value="">all</option>
            {CLIFFHANGER_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#131e44' }}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Vibe tags */}
      {distinctVibeTags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={sl}>Vibe</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {distinctVibeTags.map(tag => {
              const active = filters.vibeTags.includes(tag)
              return (
                <button key={tag} onClick={() => onUpdate('vibeTags', active ? filters.vibeTags.filter(t => t !== tag) : [...filters.vibeTags, tag])} style={{
                  padding: '2px 9px', borderRadius: 999,
                  border: `1px solid ${active ? 'rgba(168,144,212,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'rgba(168,144,212,0.12)' : 'transparent',
                  color: active ? '#a890d4' : 'rgba(255,255,255,0.38)',
                  fontFamily: "'Outfit', sans-serif", fontSize: 11, cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Low confidence toggle */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => onUpdate('lowConfidenceOnly', !filters.lowConfidenceOnly)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            border: `1px solid ${filters.lowConfidenceOnly ? 'rgba(232,201,140,0.6)' : 'rgba(255,255,255,0.2)'}`,
            background: filters.lowConfidenceOnly ? 'rgba(232,201,140,0.15)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: '#e8c98c',
          }}>
            {filters.lowConfidenceOnly ? '✓' : ''}
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: filters.lowConfidenceOnly ? '#e8c98c' : 'rgba(255,255,255,0.38)' }}>
            show unvalidated only
          </span>
        </button>
      </div>

      {/* Tropes — collapsible groups */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={sl}>Tropes</div>
          <button onClick={onTropeLogicToggle} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, color: 'rgba(255,255,255,0.45)', fontFamily: "'Outfit', sans-serif",
            fontSize: 10, padding: '2px 7px', cursor: 'pointer', letterSpacing: '0.06em',
          }}>
            {tropeLogic}
          </button>
          {filters.tropes.length > 0 && (
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
              {filters.tropes.length} selected
            </span>
          )}
        </div>

        {filters.tropes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {filters.tropes.map(t => (
              <TropeChip key={t} trope={t} small onRemove={() => onUpdate('tropes', filters.tropes.filter(x => x !== t))} />
            ))}
          </div>
        )}

        {TROPE_GROUPS.map(group => {
          const isOpen = expandedGroups.includes(group.key)
          const selCount = group.tropes.filter(t => filters.tropes.includes(t)).length
          return (
            <div key={group.key} style={{ marginBottom: 2 }}>
              <button onClick={() => toggleGroup(group.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', width: '100%', textAlign: 'left' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', width: 8 }}>{isOpen ? '▾' : '▸'}</span>
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: hex2rgba(group.color, 0.75) }}>
                  {group.label}{selCount > 0 ? ` (${selCount})` : ''}
                </span>
              </button>
              {isOpen && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 14, paddingBottom: 6 }}>
                  {group.tropes.map(trope => {
                    const active = filters.tropes.includes(trope)
                    return (
                      <button key={trope} onClick={() => onUpdate('tropes', active ? filters.tropes.filter(t => t !== trope) : [...filters.tropes, trope])} style={{
                        padding: '2px 8px', borderRadius: 999,
                        border: `1px solid ${active ? hex2rgba(group.color, 0.5) : hex2rgba(group.color, 0.2)}`,
                        background: active ? hex2rgba(group.color, 0.15) : 'transparent',
                        color: active ? group.color : hex2rgba(group.color, 0.5),
                        fontFamily: "'Outfit', sans-serif", fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.12s',
                        boxShadow: active ? `0 0 5px ${hex2rgba(group.color, 0.18)}` : 'none',
                      }}>
                        {trope}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Book drawer ───────────────────────────────────────────────────────────────

function BookDrawer({ book, onClose, onSave, savedFlash, subGenreOptions, tropeOptions, vibeOptions, onAddToMasterList }) {
  const attr = book?.attributes || {}

  // Personal fields
  const [myRating,       setMyRating]       = useState(attr.my_rating ?? '')
  const [wouldReread,    setWouldReread]     = useState(attr.would_reread ?? '')
  const [readingCap,     setReadingCap]      = useState(attr.capacity_rating ?? '')
  const [format,         setFormat]          = useState(attr.format ?? '')
  const [howIHaveIt,     setHowIHaveIt]      = useState(attr.how_i_have_it ?? '')
  const [thingsToKnow,   setThingsToKnow]    = useState(attr.things_to_know ?? [])
  const [whyStopped,     setWhyStopped]      = useState(attr.why_stopped ?? '')
  const [notes,          setNotes]           = useState(book?.notes ?? '')

  // AI fields
  const [aiSummary,        setAiSummary]        = useState(attr.summary ?? '')
  const [aiPrimaryGenre,   setAiPrimaryGenre]   = useState(attr.primary_genre ?? '')
  const [aiSubGenres,      setAiSubGenres]      = useState(Array.isArray(attr.sub_genres) ? attr.sub_genres : [])
  const [aiTropes,         setAiTropes]         = useState(Array.isArray(attr.tropes) ? attr.tropes : [])
  const [aiSeriesStatus,   setAiSeriesStatus]   = useState(attr.series_status ?? '')
  const [aiCliffhanger,    setAiCliffhanger]    = useState(attr.cliffhanger_type ?? '')
  const [aiVibeTags,       setAiVibeTags]       = useState(Array.isArray(attr.vibe_tags) ? attr.vibe_tags : [])
  const [aiHeatLevel,      setAiHeatLevel]      = useState(attr.heat_level ?? '')
  const [aiStoryStructure, setAiStoryStructure] = useState(attr.story_structure ?? '')

  // Low-confidence validation state
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validated,       setValidated]       = useState(false)

  const pendingRef = useRef({ attrs: {}, top: {} })
  const timerRef   = useRef(null)

  useEffect(() => {
    if (!book) return
    const a = book.attributes || {}
    setMyRating(a.my_rating ?? '')
    setWouldReread(a.would_reread ?? '')
    setReadingCap(a.capacity_rating ?? '')
    setFormat(a.format ?? '')
    setHowIHaveIt(a.how_i_have_it ?? '')
    setThingsToKnow(a.things_to_know ?? [])
    setWhyStopped(a.why_stopped ?? '')
    setNotes(book.notes ?? '')
    setAiSummary(a.summary ?? '')
    setAiPrimaryGenre(a.primary_genre ?? '')
    setAiSubGenres(Array.isArray(a.sub_genres) ? a.sub_genres : [])
    setAiTropes(Array.isArray(a.tropes) ? a.tropes : [])
    setAiSeriesStatus(a.series_status ?? '')
    setAiCliffhanger(a.cliffhanger_type ?? '')
    setAiVibeTags(Array.isArray(a.vibe_tags) ? a.vibe_tags : [])
    setAiHeatLevel(a.heat_level ?? '')
    setAiStoryStructure(a.story_structure ?? '')
    setConfirmValidate(false)
    setValidated(false)
    pendingRef.current = { attrs: {}, top: {} }
    clearTimeout(timerRef.current)
  }, [book?.id])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function scheduleSave(attrs = {}, top = {}) {
    Object.assign(pendingRef.current.attrs, attrs)
    Object.assign(pendingRef.current.top, top)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const { attrs: a, top: t } = pendingRef.current
      pendingRef.current = { attrs: {}, top: {} }
      onSave(book.id, a, t)
    }, 500)
  }

  if (!book) return null

  const isLowConfidence = !validated && (attr.low_confidence === true || attr.low_confidence === 'true')

  const series = attr.series_name
    ? `${attr.series_name}${attr.series_number != null ? ` #${attr.series_number}` : ''}`
    : null

  const SOURCE_LABELS = {
    'goodreads-main':   'Goodreads (main)',
    'goodreads-public': 'Goodreads (public)',
    'manual':           'Manual entry',
  }

  const btnBase = {
    borderRadius: 4, fontFamily: "'Outfit', sans-serif", fontSize: 11,
    padding: '2px 8px', cursor: 'pointer',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(8,16,42,0.5)', zIndex: 249, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: 'clamp(320px, 42vw, 520px)',
        background: 'linear-gradient(180deg, #0e1838 0%, #131f48 60%, #0f1a3a 100%)',
        borderLeft: '1px solid rgba(232,201,140,0.22)',
        zIndex: 250, overflowY: 'auto', padding: '24px 28px 56px',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 21, color: '#f2f0e6', lineHeight: 1.25, marginBottom: 4 }}>
              {book.title}
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {attr.author}{attr.additional_authors ? `, ${attr.additional_authors}` : ''}
            </div>
            {series && (
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontStyle: 'italic' }}>
                {series}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 22, padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >×</button>
            {savedFlash && (
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: 'rgba(136,226,180,0.75)', letterSpacing: '0.05em' }}>saved ✓</div>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(232,201,140,0.12)', marginBottom: 18 }} />

        {/* AI section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            Book info
          </div>
          {isLowConfidence && (
            confirmValidate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button onClick={() => setConfirmValidate(false)} style={{ ...btnBase, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}>
                  edit first
                </button>
                <button onClick={() => { setValidated(true); setConfirmValidate(false); onSave(book.id, { low_confidence: false }) }}
                  style={{ ...btnBase, background: 'rgba(110,192,191,0.1)', border: '1px solid rgba(110,192,191,0.35)', color: '#6ec0bf' }}>
                  looks good
                </button>
                <button onClick={() => setConfirmValidate(false)} style={{ ...btnBase, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.28)' }}>
                  cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmValidate(true)} title="AI-inferred data — click to validate"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontSize: 13, lineHeight: 1, color: 'rgba(232,201,140,0.45)', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(232,201,140,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,201,140,0.45)'}
              >⚠</button>
            )
          )}
        </div>

        {/* Genre */}
        <SelectField
          label="Primary genre" ai
          value={aiPrimaryGenre}
          options={GENRES.map(g => ({ value: g, label: g }))}
          onChange={v => { setAiPrimaryGenre(v ?? ''); scheduleSave({ primary_genre: v || null }) }}
        />

        {/* Sub-genres */}
        <ApprovedTagInput
          label="Sub-genres"
          options={subGenreOptions}
          value={aiSubGenres}
          placeholder="search sub-genres..."
          onChange={v => { setAiSubGenres(v); scheduleSave({ sub_genres: v }) }}
          onAddToList={tag => onAddToMasterList('sub_genres', tag)}
        />

        {/* Series + Ending — side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SelectField
            label="Series" ai
            value={aiSeriesStatus}
            options={SERIES_STATUS_OPTIONS}
            onChange={v => { setAiSeriesStatus(v ?? ''); scheduleSave({ series_status: v || null }) }}
          />
          <SelectField
            label="Ending" ai
            value={aiCliffhanger}
            options={CLIFFHANGER_OPTIONS}
            onChange={v => { setAiCliffhanger(v ?? ''); scheduleSave({ cliffhanger_type: v || null }) }}
          />
        </div>

        {/* Summary */}
        <TextareaField
          label="Summary" ai rows={4}
          value={aiSummary}
          onChange={v => { setAiSummary(v ?? ''); scheduleSave({ summary: v || null }) }}
          placeholder="a few sentences about this book..."
        />

        {/* Tropes */}
        <TropeEditor
          options={tropeOptions}
          value={aiTropes}
          onChange={v => { setAiTropes(v); scheduleSave({ tropes: v }) }}
          onAddToList={tag => onAddToMasterList('tropes', tag)}
        />

        {/* Vibe + Heat + Structure */}
        <ApprovedTagInput
          label="Vibe tags"
          options={vibeOptions}
          value={aiVibeTags}
          placeholder="search vibe tags..."
          onChange={v => { setAiVibeTags(v); scheduleSave({ vibe_tags: v }) }}
          onAddToList={tag => onAddToMasterList('vibe_tags', tag)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SelectField
            label="Heat" ai
            value={aiHeatLevel}
            options={HEAT_LEVEL_OPTIONS}
            onChange={v => { setAiHeatLevel(v ?? ''); scheduleSave({ heat_level: v || null }) }}
          />
          <SelectField
            label="Structure" ai
            value={aiStoryStructure}
            options={STORY_STRUCTURE_OPTIONS}
            onChange={v => { setAiStoryStructure(v ?? ''); scheduleSave({ story_structure: v || null }) }}
          />
        </div>

        {/* Goodreads metadata — secondary */}
        <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <ReadOnlyField label="Source"           value={SOURCE_LABELS[attr.source] ?? attr.source} />
          <ReadOnlyField label="Goodreads rating" value={attr.goodreads_rating ? `${attr.goodreads_rating} / 5` : null} />
          <ReadOnlyField label="Pages"            value={attr.pages} />
          <ReadOnlyField label="Year published"   value={attr.year_published} />
        </div>

        <div style={{ height: 1, background: 'rgba(232,201,140,0.12)', margin: '8px 0 18px' }} />

        {/* Personal notes */}
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 16 }}>
          Your notes
        </div>

        <SelectField
          label="My rating"
          value={String(myRating ?? '')}
          options={MY_RATING_OPTIONS}
          onChange={v => {
            setMyRating(v)
            const parsed = v === 'dnf' ? 'dnf' : v ? Number(v) : null
            scheduleSave({ my_rating: parsed })
          }}
        />
        <SelectField label="Would reread" value={wouldReread}
          options={[{ value: 'yes', label: 'yes' }, { value: 'maybe', label: 'maybe' }, { value: 'no', label: 'no' }]}
          onChange={v => { setWouldReread(v); scheduleSave({ would_reread: v || null }) }}
        />
        <SelectField label="Reading capacity needed" value={readingCap}
          options={[{ value: 'low-spoons', label: 'low-spoons' }, { value: 'medium', label: 'medium' }, { value: 'high-focus', label: 'high-focus' }]}
          onChange={v => { setReadingCap(v); scheduleSave({ capacity_rating: v || null }) }}
        />
        <SelectField label="Format" value={format}
          options={[{ value: 'ebook', label: 'ebook' }, { value: 'audiobook', label: 'audiobook' }, { value: 'print', label: 'print' }, { value: 'fanfic-only', label: 'fanfic only' }]}
          onChange={v => { setFormat(v); scheduleSave({ format: v || null }) }}
        />
        <SelectField label="How I have it" value={howIHaveIt}
          options={[{ value: 'kindle-owned', label: 'kindle — owned' }, { value: 'kindle-unlimited', label: 'kindle unlimited' }, { value: 'audible', label: 'audible' }, { value: 'physical', label: 'physical' }, { value: 'wishlist', label: 'wishlist' }]}
          onChange={v => { setHowIHaveIt(v); scheduleSave({ how_i_have_it: v || null }) }}
        />
        <ThingsToKnow value={thingsToKnow} onChange={v => { setThingsToKnow(v); scheduleSave({ things_to_know: v }) }} />
        {book.status === 4 && (
          <TextareaField label="Why I stopped" value={whyStopped} onChange={v => { setWhyStopped(v); scheduleSave({ why_stopped: v || null }) }} placeholder="what happened..." />
        )}
        <TextareaField label="My notes" value={notes} onChange={v => { setNotes(v); scheduleSave({}, { notes: v || null }) }} placeholder="anything you want to remember..." rows={4} />
      </div>
    </>
  )
}

// ── Main BookPileRoom ─────────────────────────────────────────────────────────

export default function BookPileRoom({ onBack }) {
  const [books,          setBooks]          = useState([])
  const [loading,        setLoading]        = useState(true)
  const [tab,            setTab]            = useState('to-read')
  const [search,         setSearch]         = useState('')
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [savedFlash,     setSavedFlash]     = useState(false)
  const [filters,        setFilters]        = useState(EMPTY_FILTERS)
  const [filtersOpen,    setFiltersOpen]    = useState(false)
  const [tropeLogic,     setTropeLogic]     = useState('AND')
  const [extraSubGenres, setExtraSubGenres] = useState([])
  const [extraTropes,    setExtraTropes]    = useState([])
  const [extraVibes,     setExtraVibes]     = useState([])
  const [scribbleOpen,   setScribbleOpen]   = useState(false)
  const flashTimer = useRef(null)

  useEffect(() => {
    supabase
      .from('inventory_items')
      .select('*')
      .eq('inventory_id', 1)
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load books:', error)
        setBooks(data || [])
        setLoading(false)
      })
  }, [])

  const distinctGenres = useMemo(() => {
    const s = new Set()
    books.forEach(b => { if (b.attributes?.primary_genre) s.add(b.attributes.primary_genre) })
    return [...s].sort()
  }, [books])

  const distinctVibeTags = useMemo(() => {
    const s = new Set()
    books.forEach(b => (b.attributes?.vibe_tags || []).forEach(t => s.add(t)))
    return [...s].sort()
  }, [books])

  // Master option lists for drawer tag editors — seeded from DB data, growable within session
  const subGenreOptions = useMemo(() => {
    const s = new Set(extraSubGenres)
    books.forEach(b => (b.attributes?.sub_genres || []).forEach(t => { if (t) s.add(t) }))
    return [...s].sort()
  }, [books, extraSubGenres])

  const tropeOptions = useMemo(() => {
    const base = TROPE_GROUPS.flatMap(g => g.tropes)
    return [...new Set([...base, ...extraTropes])].sort((a, b) => a.localeCompare(b))
  }, [extraTropes])

  const vibeOptions = useMemo(() => {
    return [...new Set([...APPROVED_VIBES, ...extraVibes])].sort((a, b) => a.localeCompare(b))
  }, [extraVibes])

  function addToMasterList(field, tag) {
    if (field === 'sub_genres') setExtraSubGenres(p => [...p, tag])
    else if (field === 'tropes') setExtraTropes(p => [...p, tag])
    else if (field === 'vibe_tags') setExtraVibes(p => [...p, tag])
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
  }

  const filterCount = countFilters(filters)

  const currentTab = TABS.find(t => t.key === tab)

  const filtered = books.filter(book => {
    if (!currentTab.statuses.includes(book.status)) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      if (!book.title?.toLowerCase().includes(q) && !book.attributes?.author?.toLowerCase().includes(q)) return false
    }

    const attr = book.attributes || {}

    if (filters.genre && attr.primary_genre !== filters.genre) return false

    if (filters.tropes.length > 0) {
      const bookTropes = Array.isArray(attr.tropes) ? attr.tropes : []
      const match = tropeLogic === 'AND'
        ? filters.tropes.every(t => bookTropes.includes(t))
        : filters.tropes.some(t => bookTropes.includes(t))
      if (!match) return false
    }

    if (filters.heatLevel       && attr.heat_level      !== filters.heatLevel)       return false
    if (filters.seriesStatus    && attr.series_status   !== filters.seriesStatus)    return false
    if (filters.cliffhangerType && attr.cliffhanger_type !== filters.cliffhangerType) return false
    if (filters.storyStructure  && attr.story_structure !== filters.storyStructure)  return false

    if (filters.vibeTags.length > 0) {
      const bookVibeTags = Array.isArray(attr.vibe_tags) ? attr.vibe_tags : []
      if (!filters.vibeTags.every(t => bookVibeTags.includes(t))) return false
    }

    if (filters.lowConfidenceOnly && attr.low_confidence !== true && attr.low_confidence !== 'true') return false

    return true
  })

  const selectedBook = books.find(b => b.id === selectedBookId) ?? null

  async function handleSave(bookId, attrChanges, topLevelChanges = {}) {
    const book = books.find(b => b.id === bookId)
    if (!book) return
    const updates = { ...topLevelChanges }
    if (Object.keys(attrChanges).length > 0) {
      updates.attributes = { ...book.attributes, ...attrChanges }
    }
    const { error } = await supabase.from('inventory_items').update(updates).eq('id', bookId)
    if (!error) {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updates } : b))
      clearTimeout(flashTimer.current)
      setSavedFlash(true)
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  return (
    <div style={{
      paddingTop: 0,
      paddingBottom: 80,
      paddingLeft: 0,
      paddingRight: scribbleOpen ? 416 : 72,
      transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Search + filter toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="search by title or author..."
          style={{ flex: 1, maxWidth: 440, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,201,140,0.18)', borderRadius: 8, color: '#f2f0e6', fontFamily: "'Outfit', sans-serif", fontSize: 14, padding: '10px 16px', outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => setFiltersOpen(o => !o)}
          style={{
            padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, letterSpacing: '0.03em',
            background: filterCount > 0 ? 'rgba(232,201,140,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${filterCount > 0 ? 'rgba(232,201,140,0.35)' : 'rgba(255,255,255,0.12)'}`,
            color: filterCount > 0 ? '#e8c98c' : 'rgba(255,255,255,0.38)',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
        >
          ⌥ filter{filterCount > 0 ? ` (${filterCount})` : ''}
        </button>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips filters={filters} onRemove={updateFilter} onClear={clearFilters} />

      {/* Filter panel */}
      {filtersOpen && (
        <FilterPanel
          filters={filters}
          onUpdate={updateFilter}
          onClear={clearFilters}
          distinctGenres={distinctGenres}
          distinctVibeTags={distinctVibeTags}
          tropeLogic={tropeLogic}
          onTropeLogicToggle={() => setTropeLogic(l => l === 'AND' ? 'ANY' : 'AND')}
        />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(232,201,140,0.12)', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid #e8c98c' : '2px solid transparent',
            color: tab === t.key ? '#e8c98c' : 'rgba(255,255,255,0.38)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, letterSpacing: '0.05em',
            padding: '8px 16px 10px', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s', marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.22)', marginBottom: 10, letterSpacing: '0.04em' }}>
        {loading ? 'loading...' : `${filtered.length} book${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      {!loading && (
        filtered.length === 0 ? (
          <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 16, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', padding: '32px 0' }}>
            {search || filterCount > 0 ? 'no matches found' : 'nothing here yet'}
          </div>
        ) : (
          filtered.map(book => (
            <BookRow
              key={book.id} book={book}
              isSelected={book.id === selectedBookId}
              onClick={() => setSelectedBookId(book.id === selectedBookId ? null : book.id)}
            />
          ))
        )
      )}

      {/* Drawer */}
      {selectedBook && (
        <BookDrawer
          book={selectedBook}
          onClose={() => setSelectedBookId(null)}
          onSave={handleSave}
          savedFlash={savedFlash}
          subGenreOptions={subGenreOptions}
          tropeOptions={tropeOptions}
          vibeOptions={vibeOptions}
          onAddToMasterList={addToMasterList}
        />
      )}

      {/* Scribble */}
      <ScribblePanel
        open={scribbleOpen}
        onToggle={() => setScribbleOpen(o => !o)}
        books={books}
        filteredCount={filtered.length}
      />
    </div>
  )
}
