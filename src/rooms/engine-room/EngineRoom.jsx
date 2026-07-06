import { useState, useEffect } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { supabase } from '../../shared/lib/supabase.js'

const CATEGORY_COLORS = {
  architecture: 'rgba(110,192,191,0.7)',
  schema:       'rgba(126,184,217,0.7)',
  reference:    'rgba(168,144,212,0.7)',
  design:       'rgba(232,201,140,0.7)',
  config:       'rgba(180,200,150,0.7)',
  todo:         'rgba(232,160,110,0.7)',
  session:      'rgba(190,190,210,0.6)',
  ideas:        'rgba(150,220,180,0.7)',
}

const CATEGORY_ORDER = ['config', 'architecture', 'schema', 'reference', 'design', 'todo', 'ideas', 'session']

const STATUS_OPTIONS = ['active', 'done', 'archived']

const backBtn = (label, onClick) => (
  <button
    onClick={onClick}
    style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.28em',
      textTransform: 'uppercase', color: 'rgba(240,227,194,0.35)',
      marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8,
    }}
  >
    ← {label}
  </button>
)

export default function EngineRoom({ onSettings, roomName = 'Engine Room' }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    supabase
      .from('engine_room')
      .select('id, title, category, content, status')
      .order('title')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setDocs(data || [])
        setLoading(false)
      })
  }, [])

  const todayStr = () => {
    const d = new Date()
    const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
    return `${d.getDate()} ${m} ${d.getFullYear()}`
  }

  const visibleDocs = showArchived ? docs : docs.filter(d => d.status?.toLowerCase() !== 'archived')

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = visibleDocs.filter(d => d.category?.toLowerCase() === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})
  visibleDocs.forEach(d => {
    const cat = d.category?.toLowerCase() || 'other'
    if (!grouped[cat]) grouped[cat] = []
    if (!grouped[cat].find(x => x.id === d.id)) grouped[cat].push(d)
  })

  const catColor = doc => CATEGORY_COLORS[doc.category?.toLowerCase()] || 'rgba(240,227,194,0.45)'

  function startEdit() {
    setDraft({ title: selected.title, content: selected.content || '', status: selected.status })
    setEditing(true)
    setSaveError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  async function saveDoc() {
    setSaving(true)
    setSaveError(null)
    const { error: err } = await supabase
      .from('engine_room')
      .update({ title: draft.title, content: draft.content, status: draft.status })
      .eq('id', selected.id)
    setSaving(false)
    if (err) {
      setSaveError('Could not save — ' + err.message)
    } else {
      const updated = { ...selected, ...draft }
      setSelected(updated)
      setDocs(docs.map(d => d.id === selected.id ? updated : d))
      setEditing(false)
    }
  }

  const Header = () => (
    <div className="room-header-wrap">
      <div className="room-head">
        <h2 className="room-title">{roomName}</h2>
        <RoomMark date={todayStr()} onSettings={onSettings} />
      </div>
    </div>
  )

  // — Doc view —
  if (selected) {
    return (
      <>
        <Header />
        {backBtn(selectedCategory, () => { setSelected(null); setEditing(false) })}

        {editing ? (
          <input
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            style={{
              width: '100%', background: 'rgba(240,227,194,0.05)',
              border: '1px solid rgba(240,227,194,0.2)', borderRadius: 4,
              color: 'var(--ink)', fontFamily: '"Montserrat", serif', fontSize: 22,
              padding: '8px 12px', marginBottom: 16, boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '"Montserrat", serif', fontSize: 22, color: 'var(--ink)' }}>
              {selected.title}
            </span>
            <span style={{ fontFamily: '"Montserrat", serif', fontStyle: 'italic', fontSize: 13, color: catColor(selected) }}>
              {selected.category}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setDraft(d => ({ ...d, status: s }))}
                  style={{
                    background: draft.status === s ? 'rgba(240,227,194,0.12)' : 'none',
                    border: `0.5px solid ${draft.status === s ? 'rgba(240,227,194,0.4)' : 'rgba(240,227,194,0.15)'}`,
                    borderRadius: 2, cursor: 'pointer', padding: '3px 10px',
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                    letterSpacing: '0.22em', textTransform: 'uppercase',
                    color: draft.status === s ? 'rgba(240,227,194,0.8)' : 'rgba(240,227,194,0.35)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: selected.status?.toLowerCase() === 'active' ? 'rgba(163,201,168,0.8)' : 'rgba(240,227,194,0.35)',
              padding: '2px 8px', borderRadius: 2,
              border: `0.5px solid ${selected.status?.toLowerCase() === 'active' ? 'rgba(163,201,168,0.3)' : 'rgba(240,227,194,0.15)'}`,
            }}>
              {selected.status}
            </span>
          )}
        </div>

        {editing ? (
          <textarea
            value={draft.content}
            onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
            rows={20}
            style={{
              width: '100%', background: 'rgba(240,227,194,0.05)',
              border: '1px solid rgba(240,227,194,0.2)', borderRadius: 4,
              color: 'var(--ink-soft)', fontFamily: '"Montserrat", serif', fontSize: 15,
              lineHeight: 1.6, padding: '12px', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
        ) : (
          <div style={{
            fontFamily: '"Montserrat", serif', fontSize: 15, lineHeight: 1.6,
            color: 'var(--ink-soft)', maxWidth: 720, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {selected.content || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>no content</span>}
          </div>
        )}

        {saveError && (
          <div style={{ marginTop: 16, fontFamily: '"Montserrat", serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(255,160,180,0.7)' }}>
            {saveError}
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          {editing ? (
            <>
              <button
                onClick={saveDoc}
                disabled={saving}
                style={{
                  background: 'rgba(163,201,168,0.15)', border: '0.5px solid rgba(163,201,168,0.4)',
                  borderRadius: 4, cursor: saving ? 'default' : 'pointer', padding: '8px 20px',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: saving ? 'rgba(163,201,168,0.4)' : 'rgba(163,201,168,0.9)',
                }}
              >
                {saving ? 'saving…' : 'save'}
              </button>
              <button
                onClick={cancelEdit}
                style={{
                  background: 'none', border: '0.5px solid rgba(240,227,194,0.2)',
                  borderRadius: 4, cursor: 'pointer', padding: '8px 20px',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(240,227,194,0.4)',
                }}
              >
                cancel
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              style={{
                background: 'none', border: '0.5px solid rgba(240,227,194,0.2)',
                borderRadius: 4, cursor: 'pointer', padding: '8px 20px',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'rgba(240,227,194,0.5)',
              }}
            >
              edit
            </button>
          )}
        </div>
      </>
    )
  }

  // — Docs in category view —
  if (selectedCategory) {
    const items = grouped[selectedCategory] || []
    const color = CATEGORY_COLORS[selectedCategory] || 'rgba(240,227,194,0.45)'
    return (
      <>
        <Header />
        {backBtn('all categories', () => setSelectedCategory(null))}

        <div style={{
          fontFamily: '"Montserrat", serif', fontSize: 22,
          color, marginBottom: 24,
        }}>
          {selectedCategory}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: '8px 4px',
                display: 'flex', alignItems: 'baseline', gap: 12,
                borderRadius: 3,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,227,194,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontFamily: '"Montserrat", serif', fontSize: 16, color: 'var(--ink-soft)' }}>
                {doc.title}
              </span>
              {doc.status && doc.status.toLowerCase() !== 'active' && (
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(240,227,194,0.25)', flexShrink: 0,
                }}>
                  {doc.status}
                </span>
              )}
            </button>
          ))}
        </div>
      </>
    )
  }

  // — Categories view —
  return (
    <>
      <Header />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(240,227,194,0.35)' }}>
          below decks · documents &amp; reference
        </div>
        <button
          onClick={() => setShowArchived(v => !v)}
          style={{
            background: showArchived ? 'rgba(240,227,194,0.08)' : 'none',
            border: `0.5px solid ${showArchived ? 'rgba(240,227,194,0.3)' : 'rgba(240,227,194,0.15)'}`,
            borderRadius: 2, cursor: 'pointer', padding: '3px 10px',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: showArchived ? 'rgba(240,227,194,0.6)' : 'rgba(240,227,194,0.25)',
          }}
        >
          {showArchived ? 'hide archived' : 'show archived'}
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', fontFamily: '"Montserrat", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-faint)' }}>
          loading…
        </div>
      )}

      {error && (
        <div style={{ padding: '20px 0', fontFamily: '"Montserrat", serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(255,160,180,0.7)' }}>
          could not load engine room: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(grouped).map(([cat, items]) => {
            const color = CATEGORY_COLORS[cat] || 'rgba(240,227,194,0.45)'
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: '10px 4px',
                  display: 'flex', alignItems: 'baseline', gap: 16,
                  borderRadius: 3,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,227,194,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontFamily: '"Montserrat", serif', fontSize: 20, color }}>
                  {cat}
                </span>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                  letterSpacing: '0.2em', color: 'rgba(240,227,194,0.25)',
                }}>
                  {items.length} {items.length === 1 ? 'doc' : 'docs'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
