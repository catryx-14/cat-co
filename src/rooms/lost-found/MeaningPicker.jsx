import { useState } from 'react'
import { CATEGORY_COLORS } from './lib/lostFoundDb.js'

const MEAN = CATEGORY_COLORS.meaning // teal — meaning category colour

export default function MeaningPicker({ meaningData, selected, onAdd, onRemove, onDontKnow, askClaudeOpen, onCreateWord }) {
  const { families, byParent, bySlug } = meaningData
  const [expandedFamily, setExpandedFamily] = useState(null)
  const [addingPersonal, setAddingPersonal] = useState(null) // family slug for "add my own"
  const [personalInput, setPersonalInput] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [personalError, setPersonalError] = useState(null)

  const selectedSlugs = new Set(selected.map(s => s.slug))

  function getSource() {
    return askClaudeOpen ? 'ask_claude_question' : 'self'
  }

  function toggleFamily(fam) {
    if (selectedSlugs.has(fam.slug)) {
      onRemove(fam.slug)
    } else {
      onAdd({ slug: fam.slug, source: getSource(), name: fam.name, isFamily: true })
    }
  }

  function toggleGranular(item) {
    if (selectedSlugs.has(item.slug)) {
      onRemove(item.slug)
    } else {
      onAdd({ slug: item.slug, source: getSource(), name: item.name })
    }
  }

  async function submitPersonal(familySlug) {
    const name = personalInput.trim()
    if (!name || savingPersonal) return
    setSavingPersonal(true)
    setPersonalError(null)
    try {
      if (onCreateWord) {
        // Persist as a real personal word so it satisfies the DB and saves cleanly
        const row = await onCreateWord(name, familySlug)
        onAdd({ slug: row.slug, source: getSource(), name: row.name })
      } else {
        const slug = 'personal-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        onAdd({ slug, source: getSource(), name, isPersonal: true, parentSlug: familySlug })
      }
      setPersonalInput('')
      setAddingPersonal(null)
    } catch (err) {
      console.error('add meaning word error', err)
      setPersonalError('Could not add that. Try again.')
    } finally {
      setSavingPersonal(false)
    }
  }

  const styles = {
    familyCard: (isExpanded) => ({
      border: `0.5px solid ${isExpanded ? MEAN.border : 'var(--color-border)'}`,
      borderRadius: 12,
      background: isExpanded ? 'var(--color-background-primary)' : 'var(--color-background-primary)',
      overflow: 'hidden',
      opacity: expandedFamily && !isExpanded ? 0.65 : 1,
      transition: 'opacity 0.15s',
      marginBottom: 8,
    }),
    familyHeader: {
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'transparent', border: 'none',
      padding: '11px 14px',
      display: 'flex', alignItems: 'baseline', gap: 10,
    },
    familyName: {
      fontFamily: 'var(--font-serif)', fontSize: 15,
      color: 'var(--color-accent-primary)', flexShrink: 0,
    },
    famGloss: {
      fontFamily: 'var(--font-serif)', fontStyle: 'italic',
      fontSize: 13, color: 'var(--color-text-secondary)',
      flex: 1,
    },
    chevron: (open) => ({
      flexShrink: 0, fontSize: 12, color: 'var(--color-text-tertiary)',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s',
    }),
    granularWrap: {
      padding: '2px 14px 13px',
      borderTop: '0.5px solid var(--color-border-tertiary)',
    },
    chip: (on) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: on ? MEAN.bg : 'var(--color-background-secondary)',
      border: `0.5px solid ${on ? MEAN.border : 'var(--color-border)'}`,
      color: on ? MEAN.text : 'var(--color-text-secondary)',
      borderRadius: 999, padding: '4px 11px', fontSize: 13, cursor: 'pointer',
    }),
    takeFamily: (on) => ({
      background: on ? MEAN.bg : 'transparent',
      border: `0.5px solid ${on ? MEAN.border : 'var(--color-border-tertiary)'}`,
      color: on ? MEAN.text : 'var(--color-text-tertiary)',
      borderRadius: 999, padding: '3px 10px', fontSize: 12, cursor: 'pointer', marginTop: 8,
    }),
  }

  return (
    <div>
      {families.map(fam => {
        const isExpanded = expandedFamily === fam.slug
        const granular = byParent[fam.slug] || []
        const famSelected = selectedSlugs.has(fam.slug)

        return (
          <div key={fam.slug} style={styles.familyCard(isExpanded)}>
            <button
              style={styles.familyHeader}
              onClick={() => setExpandedFamily(isExpanded ? null : fam.slug)}
            >
              {/* Gold diamond marker */}
              <span style={{ color: 'var(--color-accent-primary)', fontSize: 12, marginRight: 2 }}>◆</span>
              <span style={styles.familyName}>{fam.name}</span>
              <span style={styles.famGloss}>{fam.gloss}</span>
              <span style={styles.chevron(isExpanded)}>▼</span>
            </button>

            {isExpanded && (
              <div style={styles.granularWrap}>
                {/* Granular chips */}
                {granular.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                    {granular.map(item => (
                      <button key={item.slug} onClick={() => toggleGranular(item)} style={styles.chip(selectedSlugs.has(item.slug))}>
                        {selectedSlugs.has(item.slug) && <span style={{ fontSize: 11 }}>✓ </span>}
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* "The family itself fits" option */}
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => toggleFamily(fam)} style={styles.takeFamily(famSelected)}>
                    {famSelected ? '✓ the whole family fits' : 'the whole family fits'}
                  </button>

                  {/* Add my own */}
                  {addingPersonal === fam.slug ? (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={personalInput}
                        onChange={e => setPersonalInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitPersonal(fam.slug); if (e.key === 'Escape') { setAddingPersonal(null); setPersonalInput('') } }}
                        placeholder="your word"
                        style={{
                          fontFamily: 'var(--font-serif)', fontSize: 13,
                          background: 'var(--color-background-primary)',
                          border: '0.5px solid var(--color-border)',
                          borderRadius: 6, padding: '4px 8px', color: 'var(--color-text-primary)',
                          outline: 'none', width: 130,
                        }}
                      />
                      <button disabled={savingPersonal} onClick={() => submitPersonal(fam.slug)} style={{ ...styles.takeFamily(false), borderColor: 'var(--color-accent-primary)', color: 'var(--color-accent-primary)' }}>{savingPersonal ? 'adding…' : 'add'}</button>
                      <button disabled={savingPersonal} onClick={() => { setAddingPersonal(null); setPersonalInput(''); setPersonalError(null) }} style={styles.takeFamily(false)}>cancel</button>
                      {personalError && <span style={{ fontSize: 11, color: 'rgba(210,130,110,.95)' }}>{personalError}</span>}
                    </span>
                  ) : (
                    <button onClick={() => setAddingPersonal(fam.slug)} style={styles.takeFamily(false)}>
                      + add my own
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Gathered meanings */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          {selected.map(m => (
            <span key={m.slug} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: MEAN.bg, border: `0.5px solid ${MEAN.border}`,
              color: MEAN.text, borderRadius: 999, fontSize: 12, padding: '3px 10px',
            }}>
              {m.name ?? bySlug[m.slug]?.name ?? m.slug}
              <span style={{ cursor: 'pointer', opacity: 0.7, fontSize: 14 }} onClick={() => onRemove(m.slug)}>×</span>
            </span>
          ))}
        </div>
      )}

      {/* I don't know why yet */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <button onClick={onDontKnow} style={{
          background: 'none', border: '0.5px solid var(--color-border)',
          color: 'var(--color-text-secondary)', borderRadius: 999, padding: '6px 14px',
          fontSize: 13, cursor: 'pointer',
        }}>
          i don't know why yet
        </button>
      </div>
    </div>
  )
}
