import { useState, useMemo, useEffect } from 'react'
import EmotionCloud from './EmotionCloud.jsx'
import BodyMap from './BodyMap.jsx'
import MeaningPicker from './MeaningPicker.jsx'
import AskClaudePanel from './AskClaudePanel.jsx'
import {
  saveEntry, updateEntry, addEmotionWord, addMeaningWord, saveAskTurns,
  EMOTION_OUTCOME_TO_UI, MEANING_OUTCOME_TO_UI, CATEGORY_COLORS,
} from './lib/lostFoundDb.js'

const OUTCOMES = [
  { value: 'yes', label: 'yes, I found it' },
  { value: 'not quite', label: 'not quite' },
  { value: 'still lost', label: 'still lost' },
]

// Group label style used in both bouquet and phase headers
const groupLabelStyle = {
  fontSize: 10, color: 'var(--color-text-tertiary)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7,
}

function PhaseCard({ title, hint, open, onToggle, children, onAskClaude, askClaudeOpen, titleColor }) {
  return (
    <div style={{
      border: '0.5px solid var(--color-border-secondary)',
      borderRadius: 'var(--border-radius-lg, 12px)',
      background: 'var(--color-background-primary)',
      overflow: 'hidden',
    }}>
      <button
        aria-expanded={open}
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
          padding: '13px 15px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 11,
        }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: titleColor ?? 'var(--color-text-primary)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flex: 1 }}>{hint}</span>
        <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '2px 15px 15px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          {children}
          <button
            onClick={onAskClaude}
            style={{
              marginTop: 14,
              background: askClaudeOpen ? 'var(--color-background-info)' : 'transparent',
              border: askClaudeOpen ? '0.5px solid var(--color-border-info)' : '0.5px dashed var(--color-border)',
              color: askClaudeOpen ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
              borderRadius: 999, padding: '5px 14px', fontSize: 13, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            ✦ {askClaudeOpen ? 'ask Claude — open' : 'ask Claude'}
          </button>
        </div>
      )}
    </div>
  )
}

function SituationChip({ sit, selected, onToggle }) {
  const on = selected.has(sit.slug)
  const c = CATEGORY_COLORS.situation
  return (
    <button
      onClick={() => onToggle(sit)}
      style={{
        background: on ? c.bg : 'var(--color-background-primary)',
        border: `0.5px solid ${on ? c.border : 'var(--color-border-tertiary)'}`,
        color: on ? c.text : 'var(--color-text-secondary)',
        borderRadius: 999, padding: '5px 11px', fontSize: 12, cursor: 'pointer',
        fontWeight: on ? 500 : 400,
      }}
    >
      {sit.name}
    </button>
  )
}

function OutcomePicker({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      {OUTCOMES.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          style={{
            background: value === o.value ? 'rgba(230,200,120,.12)' : 'transparent',
            border: `0.5px solid ${value === o.value ? 'var(--color-accent-primary)' : 'var(--color-border-tertiary)'}`,
            color: value === o.value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            borderRadius: 999, padding: '4px 11px', fontSize: 12, cursor: 'pointer',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function BouquetChip({ label, onRemove, kind }) {
  const c = CATEGORY_COLORS[kind] ?? {
    text: 'var(--color-text-info)', border: 'var(--color-border-info)', bg: 'var(--color-background-info)',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg,
      border: `0.5px solid ${c.border}`,
      color: c.text,
      borderRadius: 999, fontSize: 12, padding: '4px 10px',
    }}>
      <span>{label}</span>
      <span
        onClick={onRemove}
        style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7, lineHeight: 1 }}
        aria-label="remove"
      >×</span>
    </span>
  )
}

function BouquetGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={groupLabelStyle}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}

// Friendly outcome labels for the bouquet (UI values → short note)
const OUTCOME_NOTE = { yes: 'found it', 'not quite': 'not quite', 'still lost': 'still lost' }

function OutcomeNote({ label, value, onClear }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'transparent',
      border: '0.5px dashed var(--color-border)',
      color: 'var(--color-text-secondary)',
      borderRadius: 999, fontSize: 12, padding: '4px 10px',
    }}>
      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}:</span>
      <span style={{ fontStyle: 'italic' }}>{OUTCOME_NOTE[value] ?? value}</span>
      {onClear && (
        <span onClick={onClear} style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7, lineHeight: 1 }} aria-label="clear">×</span>
      )}
    </span>
  )
}

function Bouquet({ situations, emotions, bodyEntries, meanings, vocab,
  emotionOutcome, meaningOutcome, onClearEmotionOutcome, onClearMeaningOutcome,
  onRemoveSituation, onRemoveEmotion, onRemoveBody, onRemoveMeaning }) {

  const total = situations.length + emotions.length + bodyEntries.length + meanings.length
    + (emotionOutcome ? 1 : 0) + (meaningOutcome ? 1 : 0)
  if (total === 0) {
    return (
      <div style={{
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.5,
      }}>
        what you find gathers here
      </div>
    )
  }

  const emoBySlug = vocab?.emotions?.bySlug ?? {}
  const meaningBySlug = vocab?.meanings?.bySlug ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {situations.length > 0 && (
        <BouquetGroup label="situation">
          {situations.map(s => (
            <BouquetChip key={s.slug} kind="situation" label={s.name ?? s.slug} onRemove={() => onRemoveSituation(s.slug)} />
          ))}
        </BouquetGroup>
      )}
      {emotions.length > 0 && (
        <BouquetGroup label="feelings">
          {emotions.map(e => (
            <BouquetChip key={e.slug} kind="emotion" label={emoBySlug[e.slug]?.word ?? e.word ?? e.slug} onRemove={() => onRemoveEmotion(e.slug)} />
          ))}
        </BouquetGroup>
      )}
      {bodyEntries.length > 0 && (
        <BouquetGroup label="body">
          {bodyEntries.map(b => (
            <BouquetChip
              key={b.location_slug}
              kind="body"
              label={b.location_slug + (b.quality_slugs?.length ? ` · ${b.quality_slugs.join(', ')}` : '')}
              onRemove={() => onRemoveBody(b.location_slug)}
            />
          ))}
        </BouquetGroup>
      )}
      {meanings.length > 0 && (
        <BouquetGroup label="meaning">
          {meanings.map(m => (
            <BouquetChip key={m.slug} kind="meaning" label={m.name ?? meaningBySlug[m.slug]?.name ?? m.slug} onRemove={() => onRemoveMeaning(m.slug)} />
          ))}
        </BouquetGroup>
      )}
      {(emotionOutcome || meaningOutcome) && (
        <BouquetGroup label="where it landed">
          {emotionOutcome && (
            <OutcomeNote label="feeling" value={emotionOutcome} onClear={onClearEmotionOutcome} />
          )}
          {meaningOutcome && (
            <OutcomeNote label="meaning" value={meaningOutcome} onClear={onClearMeaningOutcome} />
          )}
        </BouquetGroup>
      )}
    </div>
  )
}

export default function LayItDownTab({ vocab, userId, onSaved, addVocabWord, initialEntry, onCancelEdit }) {
  const isEditing = !!initialEntry
  const [expression, setExpression] = useState('')
  const [openPhase, setOpenPhase] = useState(null)  // all collapsed by default
  const [askClaudeOpen, setAskClaudeOpen] = useState(false)
  const [sitOpen, setSitOpen] = useState(false)

  const [situations, setSituations] = useState([])
  const [emotions, setEmotions] = useState([])
  const [bodyEntries, setBodyEntries] = useState([])
  const [meanings, setMeanings] = useState([])

  const [emotionOutcome, setEmotionOutcome] = useState(null)
  const [meaningOutcome, setMeaningOutcome] = useState(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [bouquetExpanded, setBouquetExpanded] = useState(false)
  const [askMessages, setAskMessages] = useState([])

  // When opened to edit an existing entry, hydrate all fields from it
  useEffect(() => {
    if (!initialEntry) return
    const sitBySlug = {}
    for (const s of vocab?.situations || []) sitBySlug[s.slug] = s
    setExpression(initialEntry.expression || '')
    setSituations((initialEntry.lost_found_entry_situations || []).map(s => ({
      slug: s.situation_slug, name: sitBySlug[s.situation_slug]?.name ?? s.situation_slug, source: 'self',
    })))
    setEmotions((initialEntry.lost_found_entry_emotions || []).map(e => ({
      slug: e.emotion_slug, source: e.source || 'self',
    })))
    setBodyEntries((initialEntry.lost_found_entry_body || []).map(b => ({
      location_slug: b.location_slug, quality_slugs: b.quality_slugs || [], source: 'self',
    })))
    setMeanings((initialEntry.lost_found_entry_meanings || []).map(m => ({
      slug: m.meaning_slug, source: m.source || 'self',
    })))
    setEmotionOutcome(initialEntry.emotion_outcome ? (EMOTION_OUTCOME_TO_UI[initialEntry.emotion_outcome] ?? null) : null)
    setMeaningOutcome(initialEntry.meaning_outcome ? (MEANING_OUTCOME_TO_UI[initialEntry.meaning_outcome] ?? null) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEntry?.id])

  const selectedSitSlugs = useMemo(() => new Set(situations.map(s => s.slug)), [situations])
  function toggleSituation(sit) {
    if (selectedSitSlugs.has(sit.slug)) {
      setSituations(prev => prev.filter(s => s.slug !== sit.slug))
    } else {
      setSituations(prev => [...prev, { slug: sit.slug, name: sit.name, source: 'self' }])
    }
  }

  function addEmotion(em) { setEmotions(prev => prev.find(e => e.slug === em.slug) ? prev : [...prev, em]) }
  function removeEmotion(slug) { setEmotions(prev => prev.filter(e => e.slug !== slug)) }

  function addLocation(slug) {
    setBodyEntries(prev => prev.find(b => b.location_slug === slug)
      ? prev
      : [...prev, { location_slug: slug, quality_slugs: [], source: 'self' }])
  }
  function removeLocation(slug) { setBodyEntries(prev => prev.filter(b => b.location_slug !== slug)) }
  function toggleQuality(locationSlug, qualitySlug) {
    setBodyEntries(prev => prev.map(b => {
      if (b.location_slug !== locationSlug) return b
      const has = b.quality_slugs.includes(qualitySlug)
      return { ...b, quality_slugs: has ? b.quality_slugs.filter(q => q !== qualitySlug) : [...b.quality_slugs, qualitySlug] }
    }))
  }

  function addMeaning(m) { setMeanings(prev => prev.find(x => x.slug === m.slug) ? prev : [...prev, m]) }
  function removeMeaning(slug) { setMeanings(prev => prev.filter(m => m.slug !== slug)) }
  function handleMeaningDontKnow() { setMeaningOutcome('still lost') }

  // Create + persist a brand-new personal word, merge it into vocab, return the row.
  async function createEmotionWord(word, family) {
    const row = await addEmotionWord({ userId, word, family })
    addVocabWord?.('emotion', row)
    return row
  }
  async function createMeaningWord(name, parentSlug) {
    const row = await addMeaningWord({ userId, name, parentSlug })
    addVocabWord?.('meaning', row)
    return row
  }

  function acceptOffer(offer) {
    const kind = offer.kind?.toLowerCase() ?? ''
    const word = offer.word
    const slug = word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (kind === 'emotion' || kind === 'feeling') {
      addEmotion({ slug, word, source: 'ask_claude_chip' })
    } else if (kind === 'meaning') {
      addMeaning({ slug, name: word, source: 'ask_claude_chip' })
    } else if (kind === 'situation') {
      setSituations(prev => prev.find(s => s.slug === slug) ? prev : [...prev, { slug, name: word, source: 'ask_claude_chip' }])
    }
  }

  function removeOffer(offer) {
    const kind = offer.kind?.toLowerCase() ?? ''
    const slug = offer.word.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (kind === 'emotion' || kind === 'feeling') {
      removeEmotion(slug)
    } else if (kind === 'meaning') {
      removeMeaning(slug)
    } else if (kind === 'situation') {
      setSituations(prev => prev.filter(s => s.slug !== slug))
    }
  }

  async function handleSetItDown() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        expression: expression.trim() || null,
        situations, emotions, bodyEntries, meanings,
        emotionOutcome, meaningOutcome,
      }
      if (isEditing) {
        await updateEntry({ entryId: initialEntry.id, ...payload })
        if (askMessages.length > 0) {
          try { await saveAskTurns(userId, initialEntry.id, askMessages) } catch (e) { console.error('turn save', e) }
        }
        onSaved?.(initialEntry.id)
      } else {
        const entryId = await saveEntry({ userId, ...payload })
        if (askMessages.length > 0) {
          try { await saveAskTurns(userId, entryId, askMessages) } catch (e) { console.error('turn save', e) }
        }
        onSaved?.(entryId)
      }
    } catch (err) {
      console.error('save error', err)
      setSaveError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  const hasAnything = expression.trim() || situations.length || emotions.length || bodyEntries.length || meanings.length
  const bouquetCount = situations.length + emotions.length + bodyEntries.length + meanings.length
    + (emotionOutcome ? 1 : 0) + (meaningOutcome ? 1 : 0)
  const togglePhase = (phase) => setOpenPhase(prev => prev === phase ? null : phase)

  // Passed to AskClaudePanel so Claude knows what's already been gathered
  const bouquet = useMemo(
    () => ({ situations, emotions, bodyEntries, meanings }),
    [situations, emotions, bodyEntries, meanings],
  )

  const bouquetProps = {
    vocab, situations, emotions, bodyEntries, meanings,
    emotionOutcome, meaningOutcome,
    onClearEmotionOutcome: () => setEmotionOutcome(null),
    onClearMeaningOutcome: () => setMeaningOutcome(null),
    onRemoveSituation: s => setSituations(p => p.filter(x => x.slug !== s)),
    onRemoveEmotion: removeEmotion,
    onRemoveBody: removeLocation,
    onRemoveMeaning: removeMeaning,
  }

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'stretch', position: 'relative' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Editing banner */}
        {isEditing && (
          <div style={{
            marginBottom: 9, padding: '8px 12px', borderRadius: 10,
            background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)',
            fontSize: 13, color: 'var(--color-text-info)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <span>you're editing this entry — changes will save over it</span>
            <span onClick={() => onCancelEdit?.()} style={{ cursor: 'pointer', opacity: 0.8, textDecoration: 'underline' }}>
              cancel
            </span>
          </div>
        )}

        {/* Mobile bouquet tray */}
        <div className="lf-mobile-tray" style={{
          marginBottom: 9,
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 10, background: 'var(--color-background-primary)',
          overflow: 'hidden',
        }}>
          <button
            onClick={() => setBouquetExpanded(p => !p)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              this entry so far {bouquetCount > 0 && <span style={{ color: 'var(--color-accent-primary)' }}>({bouquetCount})</span>}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', transform: bouquetExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▼</span>
          </button>
          {bouquetExpanded && (
            <div style={{ padding: '0 13px 13px' }}>
              <Bouquet {...bouquetProps} />
            </div>
          )}
        </div>

        {/* Situation tag button — above the expression box, per prototype */}
        <div style={{ marginBottom: 9 }}>
          <button
            onClick={() => setSitOpen(p => !p)}
            style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 999,
              color: CATEGORY_COLORS.situation.text,
              border: `0.5px solid ${situations.length ? CATEGORY_COLORS.situation.border : 'var(--color-border-tertiary)'}`,
              background: situations.length ? CATEGORY_COLORS.situation.bg : 'transparent',
              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            ◈ what kind of thing was this?{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
              {situations.length ? situations.map(s => s.name).join(', ') : 'optional'}
            </span>
          </button>
          {sitOpen && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
              {(vocab?.situations ?? []).map(sit => (
                <SituationChip key={sit.slug} sit={sit} selected={selectedSitSlugs} onToggle={toggleSituation} />
              ))}
            </div>
          )}
        </div>

        {/* Expression textarea — the hero */}
        <textarea
          value={expression}
          onChange={e => setExpression(e.target.value)}
          placeholder="lay it down — a word, a vent, a whole poem. just what happened."
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 104,
            fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.6,
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--border-radius-lg, 12px)', padding: '13px 15px',
            color: 'var(--color-text-primary)', outline: 'none',
            marginBottom: 9,
          }}
        />

        {/* Section label */}
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '1.25rem 0 10px' }}>
          find as you go · all optional
        </div>

        {/* Phase cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PhaseCard
            title="the feeling"
            titleColor={CATEGORY_COLORS.emotion.text}
            hint="find the word — two ways"
            open={openPhase === 'feeling'}
            onToggle={() => togglePhase('feeling')}
            onAskClaude={() => setAskClaudeOpen(p => !p)}
            askClaudeOpen={askClaudeOpen}
          >
            <EmotionCloud
              emotionData={vocab?.emotions ?? { bySlug: {}, families: {} }}
              selected={emotions}
              onAdd={addEmotion}
              onRemove={removeEmotion}
              askClaudeOpen={askClaudeOpen}
              onCreateWord={createEmotionWord}
            />
            <div style={{ marginTop: 13, paddingTop: 11, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <OutcomePicker label="did you find it?" value={emotionOutcome} onChange={setEmotionOutcome} />
            </div>
          </PhaseCard>

          <PhaseCard
            title="in the body"
            titleColor={CATEGORY_COLORS.body.text}
            hint="name the sensation"
            open={openPhase === 'body'}
            onToggle={() => togglePhase('body')}
            onAskClaude={() => setAskClaudeOpen(p => !p)}
            askClaudeOpen={askClaudeOpen}
          >
            <BodyMap
              bodyData={vocab?.body ?? { locations: [], qualities: [] }}
              bodyEntries={bodyEntries}
              onAddLocation={addLocation}
              onRemoveLocation={removeLocation}
              onToggleQuality={toggleQuality}
            />
          </PhaseCard>

          <PhaseCard
            title="why it mattered"
            titleColor={CATEGORY_COLORS.meaning.text}
            hint=""
            open={openPhase === 'meaning'}
            onToggle={() => togglePhase('meaning')}
            onAskClaude={() => setAskClaudeOpen(p => !p)}
            askClaudeOpen={askClaudeOpen}
          >
            <MeaningPicker
              meaningData={vocab?.meanings ?? { families: [], byParent: {}, bySlug: {} }}
              selected={meanings}
              onAdd={addMeaning}
              onRemove={removeMeaning}
              onDontKnow={handleMeaningDontKnow}
              askClaudeOpen={askClaudeOpen}
              onCreateWord={createMeaningWord}
            />
            <div style={{ marginTop: 13, paddingTop: 11, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <OutcomePicker label="any closer to why?" value={meaningOutcome} onChange={setMeaningOutcome} />
            </div>
          </PhaseCard>
        </div>

        {/* Save */}
        <div style={{ marginTop: 'auto', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', gap: 14 }}>
          {saveError && (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{saveError}</span>
          )}
          <button
            onClick={handleSetItDown}
            disabled={saving}
            style={{
              fontSize: 14, padding: '8px 20px', borderRadius: 999,
              background: hasAnything ? 'rgba(230,200,120,.10)' : 'transparent',
              border: `0.5px solid ${hasAnything ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
              color: hasAnything ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s',
            }}
          >
            {saving ? (isEditing ? 'saving…' : 'setting it down…') : (isEditing ? 'save changes' : 'set it down')}
          </button>
          {isEditing ? (
            <button
              onClick={() => onCancelEdit?.()}
              disabled={saving}
              style={{
                fontSize: 13, padding: '8px 16px', borderRadius: 999,
                background: 'transparent', border: '0.5px solid var(--color-border)',
                color: 'var(--color-text-tertiary)', cursor: 'pointer',
              }}
            >
              cancel
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              saving with nothing tagged is a real entry too
            </span>
          )}
        </div>
      </div>

      {/* Desktop bouquet rail */}
      <aside className="lf-bouquet-rail" style={{
        flex: 'none', width: 188,
        borderLeft: '0.5px solid var(--color-border-secondary)',
        paddingLeft: '1.25rem',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ ...groupLabelStyle, marginBottom: 12 }}>this entry so far</div>
        <Bouquet {...bouquetProps} />
      </aside>

      {/* Ask Claude panel */}
      <AskClaudePanel
        open={askClaudeOpen}
        onClose={() => setAskClaudeOpen(false)}
        vocab={vocab}
        expression={expression}
        onAcceptOffer={acceptOffer}
        onRemoveOffer={removeOffer}
        currentPhase={openPhase}
        bouquet={bouquet}
        onMessagesChange={setAskMessages}
      />

      <style>{`
        @media (max-width: 700px) {
          .lf-bouquet-rail { display: none !important; }
        }
        @media (min-width: 701px) {
          .lf-mobile-tray { display: none !important; }
        }
      `}</style>
    </div>
  )
}
