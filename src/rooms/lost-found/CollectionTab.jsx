import { useState, useEffect } from 'react'
import { loadCollection, deleteEntry, toggleFavorite, CATEGORY_COLORS } from './lib/lostFoundDb.js'

// Format a date string (YYYY-MM-DD) without timezone shift
function formatEntryDate(dateStr) {
  if (!dateStr) return ''
  const [y, mo, da] = dateStr.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[mo - 1]} ${da} · ${y}`
}

// Friendly labels for the stored DB outcome values
const OUTCOME_LABEL = {
  named: 'found the word',
  partly: 'partly there',
  not_found_yet: 'still lost',
  found: 'found the why',
  skipped: 'set aside',
}
const outcomeText = v => OUTCOME_LABEL[v] ?? v

// Derived: entry from tracker with no atoms and no outcomes set
function needsLook(entry) {
  return (
    entry.source_event_id &&
    !(entry.lost_found_entry_emotions?.length) &&
    !(entry.lost_found_entry_body?.length) &&
    !(entry.lost_found_entry_meanings?.length) &&
    !(entry.lost_found_entry_situations?.length) &&
    !entry.emotion_outcome &&
    !entry.meaning_outcome
  )
}

function Chip({ label, kind }) {
  const c = CATEGORY_COLORS[kind] ?? {
    text: 'var(--color-text-secondary)', border: 'var(--color-border)', bg: 'var(--color-background-secondary)',
  }
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg,
      border: `0.5px solid ${c.border}`,
      color: c.text,
      borderRadius: 999, fontSize: 12, padding: '2px 9px',
    }}>
      {label}
    </span>
  )
}

function StarButton({ on, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={on ? 'remove from favorites' : 'add to favorites'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0 2px', lineHeight: 1, flexShrink: 0,
        fontSize: 15,
        color: on ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
        transition: 'color .15s',
      }}
    >
      {on ? '★' : '☆'}
    </button>
  )
}

function EntryDrawer({ entry, onClose, vocab, onDelete, onEdit, onToggleFavorite }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  if (!entry) return null
  const emoBySlug = vocab?.emotions?.bySlug ?? {}
  const meaningBySlug = vocab?.meanings?.bySlug ?? {}

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 'min(440px, 100vw)',
      background: 'linear-gradient(180deg, #0a1328 0%, #0f1a3a 50%, #0c1530 100%)',
      borderLeft: '0.5px solid var(--color-border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 200, boxShadow: '-12px 0 48px rgba(0,0,0,.55)',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', borderBottom: '0.5px solid var(--color-border-tertiary)',
        flexShrink: 0, position: 'sticky', top: 0,
        background: '#0c1530', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {formatEntryDate(entry.entry_date)}
          </span>
          {entry.source_event_id && (
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 999,
              border: '0.5px solid var(--color-accent-primary)',
              color: 'var(--color-accent-primary)', letterSpacing: '.04em',
            }}>from tracker</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StarButton on={entry.is_favorite} onClick={() => onToggleFavorite(entry.id, !entry.is_favorite)} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 4 }}>×</button>
        </div>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Expression */}
        {entry.expression && (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.7, color: 'var(--color-text-primary)', margin: 0 }}>
            {entry.expression}
          </p>
        )}

        {/* Needs a look banner */}
        {needsLook(entry) && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(232,201,140,0.06)',
            border: '0.5px solid rgba(232,201,140,0.25)',
            fontSize: 12, color: 'var(--color-accent-primary)', fontStyle: 'italic',
          }}>
            needs a look — nothing gathered yet
          </div>
        )}

        {/* Emotions */}
        {entry.lost_found_entry_emotions?.length > 0 && (
          <section>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--color-text-tertiary)', marginBottom: 7 }}>feelings</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.lost_found_entry_emotions.map((e, i) => (
                <Chip key={i} kind="emotion" label={emoBySlug[e.emotion_slug]?.word ?? e.emotion_slug} />
              ))}
            </div>
            {entry.emotion_outcome && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                {outcomeText(entry.emotion_outcome)}
              </div>
            )}
          </section>
        )}

        {/* Body */}
        {entry.lost_found_entry_body?.length > 0 && (
          <section>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--color-text-tertiary)', marginBottom: 7 }}>in the body</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.lost_found_entry_body.map((b, i) => (
                <Chip key={i} kind="body" label={b.location_slug + (b.quality_slugs?.length ? ` · ${b.quality_slugs.join(', ')}` : '')} />
              ))}
            </div>
          </section>
        )}

        {/* Meanings */}
        {entry.lost_found_entry_meanings?.length > 0 && (
          <section>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--color-text-tertiary)', marginBottom: 7 }}>meanings</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.lost_found_entry_meanings.map((m, i) => (
                <Chip key={i} kind="meaning" label={meaningBySlug[m.meaning_slug]?.name ?? m.meaning_slug} />
              ))}
            </div>
            {entry.meaning_outcome && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                {outcomeText(entry.meaning_outcome)}
              </div>
            )}
          </section>
        )}

        {/* Situations */}
        {entry.lost_found_entry_situations?.length > 0 && (
          <section>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--color-text-tertiary)', marginBottom: 7 }}>situation</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.lost_found_entry_situations.map((s, i) => (
                <Chip key={i} kind="situation" label={s.situation_slug} />
              ))}
            </div>
          </section>
        )}

        {/* Edit entry */}
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button
            onClick={() => onEdit?.(entry)}
            style={{
              background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)',
              color: 'var(--color-text-info)', borderRadius: 999,
              padding: '6px 14px', fontSize: 13, cursor: 'pointer',
            }}
          >
            edit this entry
          </button>
        </div>

        {/* Remove entry */}
        <div style={{ marginTop: 4, paddingTop: 16 }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'none', border: '0.5px solid var(--color-border)',
                color: 'var(--color-text-tertiary)', borderRadius: 999,
                padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              }}
            >
              remove this entry
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                remove this for good?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: 'rgba(200,100,80,0.12)', border: '0.5px solid rgba(200,100,80,0.5)',
                  color: 'rgba(220,140,120,0.95)', borderRadius: 999,
                  padding: '6px 14px', fontSize: 13, cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'removing…' : 'yes, remove'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  background: 'none', border: '0.5px solid var(--color-border)',
                  color: 'var(--color-text-tertiary)', borderRadius: 999,
                  padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                }}
              >
                keep it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EntryCard({ entry, onClick, vocab, onToggleFavorite }) {
  const emoBySlug = vocab?.emotions?.bySlug ?? {}
  const meaningBySlug = vocab?.meanings?.bySlug ?? {}

  const emotions = entry.lost_found_entry_emotions ?? []
  const meanings = entry.lost_found_entry_meanings ?? []
  const body = entry.lost_found_entry_body ?? []
  const situations = entry.lost_found_entry_situations ?? []

  const hasChips = emotions.length || meanings.length || body.length || situations.length
  const isSeeded = !!entry.source_event_id
  const looksEmpty = needsLook(entry)

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: 'none',
        border: '0.5px solid var(--color-border)', borderRadius: 14,
        padding: '14px 16px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-info)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
    >
      {/* Top row: date + badges + star */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '.05em' }}>
            {formatEntryDate(entry.entry_date)}
          </span>
          {isSeeded && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 999,
              border: '0.5px solid var(--color-accent-primary)',
              color: 'var(--color-accent-primary)', letterSpacing: '.04em',
            }}>from tracker</span>
          )}
          {looksEmpty && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 999,
              border: '0.5px solid rgba(232,201,140,0.3)',
              color: 'rgba(232,201,140,0.55)', letterSpacing: '.04em', fontStyle: 'italic',
            }}>needs a look</span>
          )}
        </div>
        <StarButton on={entry.is_favorite} onClick={() => onToggleFavorite(entry.id, !entry.is_favorite)} />
      </div>

      {/* Expression */}
      {entry.expression && (
        <p style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6,
          color: 'var(--color-text-primary)',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {entry.expression}
        </p>
      )}

      {/* Chips */}
      {hasChips > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {emotions.slice(0, 4).map((e, i) => (
            <Chip key={`e${i}`} kind="emotion" label={emoBySlug[e.emotion_slug]?.word ?? e.emotion_slug} />
          ))}
          {body.slice(0, 2).map((b, i) => (
            <Chip key={`b${i}`} kind="body" label={b.location_slug} />
          ))}
          {meanings.slice(0, 2).map((m, i) => (
            <Chip key={`m${i}`} kind="meaning" label={meaningBySlug[m.meaning_slug]?.name ?? m.meaning_slug} />
          ))}
          {(emotions.length + body.length + meanings.length + situations.length) > 8 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
              +{(emotions.length + body.length + meanings.length + situations.length) - 8} more
            </span>
          )}
        </div>
      )}
    </button>
  )
}

const FILTER_TABS = [
  { key: 'all',     label: 'all' },
  { key: 'faves',   label: 'favorites' },
  { key: 'tracker', label: 'from the tracker' },
]

export default function CollectionTab({ userId, vocab, refreshTrigger, onEdit }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    loadCollection(userId)
      .then(data => { setEntries(data ?? []); setLoading(false) })
      .catch(err => { console.error(err); setError('Could not load your collection.'); setLoading(false) })
  }, [userId, refreshTrigger])

  async function handleDelete(entryId) {
    await deleteEntry(entryId)
    setEntries(prev => prev.filter(e => e.id !== entryId))
    setSelected(null)
  }

  async function handleToggleFavorite(entryId, isFavorite) {
    try {
      await toggleFavorite(entryId, isFavorite)
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_favorite: isFavorite } : e))
      // Keep drawer in sync
      if (selected?.id === entryId) setSelected(prev => ({ ...prev, is_favorite: isFavorite }))
    } catch (err) {
      console.error('favorite toggle failed', err)
    }
  }

  // Filter the list
  const visible = entries.filter(e => {
    if (filter === 'faves')   return e.is_favorite
    if (filter === 'tracker') return !!e.source_event_id
    return true
  })

  if (loading) {
    return <div style={{ padding: 24, fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>loading your collection…</div>
  }
  if (error) {
    return <div style={{ padding: 24, fontSize: 14, color: 'var(--color-text-tertiary)' }}>{error}</div>
  }

  return (
    <>
      {/* Filter tabs — Book Pile pattern */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
              background: filter === tab.key ? 'rgba(232,201,140,0.10)' : 'transparent',
              border: `0.5px solid ${filter === tab.key ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
              color: filter === tab.key ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
              transition: 'all .15s',
            }}
          >
            {tab.label}
            {tab.key === 'faves'   && entries.filter(e => e.is_favorite).length > 0 && (
              <span style={{ marginLeft: 5, opacity: 0.7 }}>({entries.filter(e => e.is_favorite).length})</span>
            )}
            {tab.key === 'tracker' && entries.filter(e => e.source_event_id).length > 0 && (
              <span style={{ marginLeft: 5, opacity: 0.7 }}>({entries.filter(e => e.source_event_id).length})</span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center',
          border: '1px dashed var(--color-border)', borderRadius: 14,
          fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic', lineHeight: 1.8,
        }}>
          {filter === 'faves'   && 'no favorites yet — star an entry to save it here'}
          {filter === 'tracker' && 'nothing from the tracker yet'}
          {filter === 'all'     && 'nothing here yet —\nlay something down and it\'ll appear in your collection'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              vocab={vocab}
              onClick={() => setSelected(entry)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {selected && (
        <EntryDrawer
          entry={selected}
          vocab={vocab}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onEdit={(entry) => { setSelected(null); onEdit?.(entry) }}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </>
  )
}
