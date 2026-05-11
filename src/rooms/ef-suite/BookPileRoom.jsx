import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../shared/lib/supabase.js'

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

// ── Sub-components ───────────────────────────────────────────────────────────

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
          <div style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: 17,
            color: '#f2f0e6',
            lineHeight: 1.3,
          }}>
            {book.title}
          </div>
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 2,
          }}>
            {attr.author}
          </div>
          {series && (
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
              fontStyle: 'italic',
            }}>
              {series}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0, paddingTop: 2 }}>
          <RatingDots rating={attr.goodreads_rating} />
          {book.needs_review && (
            <span style={{
              fontSize: 11,
              color: 'rgba(232,201,140,0.45)',
              fontFamily: "'Outfit', sans-serif",
              whiteSpace: 'nowrap',
            }}>
              · needs sorting
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Outfit', sans-serif",
      fontSize: 11,
      letterSpacing: '0.08em',
      color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase',
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(232,201,140,0.18)',
          borderRadius: 6,
          color: value ? '#f2f0e6' : 'rgba(255,255,255,0.3)',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          padding: '8px 12px',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
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

function TextareaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(232,201,140,0.18)',
          borderRadius: 6,
          color: '#f2f0e6',
          fontFamily: "'Crimson Pro', Georgia, serif",
          fontSize: 15,
          padding: '8px 12px',
          resize: 'vertical',
          lineHeight: 1.55,
          boxSizing: 'border-box',
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
      <div style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: 15,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.5,
      }}>
        {display}
      </div>
    </div>
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
            <button
              key={flag}
              onClick={() => toggle(flag)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: `1px solid ${active ? 'rgba(232,201,140,0.55)' : 'rgba(255,255,255,0.14)'}`,
                background: active ? 'rgba(232,201,140,0.1)' : 'transparent',
                color: active ? '#e8c98c' : 'rgba(255,255,255,0.4)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {flag}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="add custom tag..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(232,201,140,0.18)',
            borderRadius: 6,
            color: '#f2f0e6',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            padding: '6px 10px',
          }}
        />
        <button
          onClick={addCustom}
          style={{
            padding: '6px 14px',
            background: 'rgba(232,201,140,0.08)',
            border: '1px solid rgba(232,201,140,0.28)',
            borderRadius: 6,
            color: '#e8c98c',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          add
        </button>
      </div>
    </div>
  )
}

// ── Book drawer ───────────────────────────────────────────────────────────────

function BookDrawer({ book, onClose, onSave, savedFlash }) {
  const attr = book?.attributes || {}

  const [myRating,       setMyRating]       = useState(attr.my_rating ?? '')
  const [wouldReread,    setWouldReread]     = useState(attr.would_reread ?? '')
  const [readingCap,     setReadingCap]      = useState(attr.capacity_rating ?? '')
  const [format,         setFormat]          = useState(attr.format ?? '')
  const [howIHaveIt,     setHowIHaveIt]      = useState(attr.how_i_have_it ?? '')
  const [thingsToKnow,   setThingsToKnow]    = useState(attr.things_to_know ?? [])
  const [whyStopped,     setWhyStopped]      = useState(attr.why_stopped ?? '')
  const [notes,          setNotes]           = useState(book?.notes ?? '')

  // Accumulate pending changes, flush after 500ms of quiet
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

  const series = attr.series_name
    ? `${attr.series_name}${attr.series_number != null ? ` #${attr.series_number}` : ''}`
    : null

  const SOURCE_LABELS = {
    'goodreads-main':   'Goodreads (main)',
    'goodreads-public': 'Goodreads (public)',
    'manual':           'Manual entry',
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(8,16,42,0.5)',
          zIndex: 49,
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position: 'fixed',
        right: 0, top: 0, bottom: 0,
        width: 'clamp(320px, 42vw, 520px)',
        background: 'linear-gradient(180deg, #0e1838 0%, #131f48 60%, #0f1a3a 100%)',
        borderLeft: '1px solid rgba(232,201,140,0.22)',
        zIndex: 50,
        overflowY: 'auto',
        padding: '24px 28px 56px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: 21,
              color: '#f2f0e6',
              lineHeight: 1.25,
              marginBottom: 4,
            }}>
              {book.title}
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
            }}>
              {attr.author}{attr.additional_authors ? `, ${attr.additional_authors}` : ''}
            </div>
            {series && (
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.3)',
                marginTop: 3,
                fontStyle: 'italic',
              }}>
                {series}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: 22, padding: '0 2px',
                lineHeight: 1, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              ×
            </button>
            {savedFlash && (
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 11,
                color: 'rgba(136,226,180,0.75)',
                letterSpacing: '0.05em',
              }}>
                saved ✓
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(232,201,140,0.12)', marginBottom: 18 }} />

        {/* Read-only: book info */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Book info
        </div>
        <ReadOnlyField label="Source"           value={SOURCE_LABELS[attr.source] ?? attr.source} />
        <ReadOnlyField label="Goodreads rating" value={attr.goodreads_rating ? `${attr.goodreads_rating} / 5` : null} />
        <ReadOnlyField label="Pages"            value={attr.pages} />
        <ReadOnlyField label="Year published"   value={attr.year_published} />
        <ReadOnlyField label="Summary"          value={attr.summary} />
        <ReadOnlyField label="Genres"           value={attr.genres} />
        <ReadOnlyField label="Tropes"           value={attr.tropes} />
        <ReadOnlyField label="Series status"    value={attr.series_status} />
        <ReadOnlyField label="Mood tags"        value={attr.mood_tags} />
        <ReadOnlyField label="Heat level"       value={attr.heat_level} />

        <div style={{ height: 1, background: 'rgba(232,201,140,0.12)', margin: '8px 0 18px' }} />

        {/* Editable: your notes */}
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
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

        <SelectField
          label="Would reread"
          value={wouldReread}
          options={[
            { value: 'yes',   label: 'yes'   },
            { value: 'maybe', label: 'maybe' },
            { value: 'no',    label: 'no'    },
          ]}
          onChange={v => { setWouldReread(v); scheduleSave({ would_reread: v || null }) }}
        />

        <SelectField
          label="Reading capacity needed"
          value={readingCap}
          options={[
            { value: 'low-spoons',  label: 'low-spoons'  },
            { value: 'medium',      label: 'medium'       },
            { value: 'high-focus',  label: 'high-focus'   },
          ]}
          onChange={v => { setReadingCap(v); scheduleSave({ capacity_rating: v || null }) }}
        />

        <SelectField
          label="Format"
          value={format}
          options={[
            { value: 'ebook',       label: 'ebook'      },
            { value: 'audiobook',   label: 'audiobook'  },
            { value: 'print',       label: 'print'      },
            { value: 'fanfic-only', label: 'fanfic only' },
          ]}
          onChange={v => { setFormat(v); scheduleSave({ format: v || null }) }}
        />

        <SelectField
          label="How I have it"
          value={howIHaveIt}
          options={[
            { value: 'kindle-owned',     label: 'kindle — owned'   },
            { value: 'kindle-unlimited', label: 'kindle unlimited'  },
            { value: 'audible',          label: 'audible'           },
            { value: 'physical',         label: 'physical'          },
            { value: 'wishlist',         label: 'wishlist'          },
          ]}
          onChange={v => { setHowIHaveIt(v); scheduleSave({ how_i_have_it: v || null }) }}
        />

        <ThingsToKnow
          value={thingsToKnow}
          onChange={v => { setThingsToKnow(v); scheduleSave({ things_to_know: v }) }}
        />

        {book.status === 4 && (
          <TextareaField
            label="Why I stopped"
            value={whyStopped}
            onChange={v => { setWhyStopped(v); scheduleSave({ why_stopped: v || null }) }}
            placeholder="what happened..."
          />
        )}

        <TextareaField
          label="My notes"
          value={notes}
          onChange={v => { setNotes(v); scheduleSave({}, { notes: v || null }) }}
          placeholder="anything you want to remember..."
          rows={4}
        />
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

  const currentTab = TABS.find(t => t.key === tab)

  const filtered = books.filter(book => {
    if (!currentTab.statuses.includes(book.status)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        book.title?.toLowerCase().includes(q) ||
        book.attributes?.author?.toLowerCase().includes(q)
      )
    }
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

    const { error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', bookId)

    if (!error) {
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updates } : b))
      clearTimeout(flashTimer.current)
      setSavedFlash(true)
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Back */}
      <div style={{ padding: '8px 0 20px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', fontSize: 13,
            fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em',
            padding: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          ← executive suite
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search by title or author..."
          style={{
            width: '100%',
            maxWidth: 480,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(232,201,140,0.18)',
            borderRadius: 8,
            color: '#f2f0e6',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            padding: '10px 16px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(232,201,140,0.12)',
        marginBottom: 16,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid #e8c98c' : '2px solid transparent',
              color: tab === t.key ? '#e8c98c' : 'rgba(255,255,255,0.38)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              letterSpacing: '0.05em',
              padding: '8px 16px 10px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 12,
        color: 'rgba(255,255,255,0.22)',
        marginBottom: 10,
        letterSpacing: '0.04em',
      }}>
        {loading ? 'loading...' : `${filtered.length} book${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* List */}
      {!loading && (
        filtered.length === 0 ? (
          <div style={{
            fontFamily: "'Crimson Pro', Georgia, serif",
            fontSize: 16,
            color: 'rgba(255,255,255,0.28)',
            fontStyle: 'italic',
            padding: '32px 0',
          }}>
            {search ? 'no matches found' : 'nothing here yet'}
          </div>
        ) : (
          filtered.map(book => (
            <BookRow
              key={book.id}
              book={book}
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
        />
      )}
    </div>
  )
}
