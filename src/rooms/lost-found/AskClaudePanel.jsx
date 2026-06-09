import { useState, useEffect, useRef } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../../shared/lib/supabase.js'
import { formatVocabForPrompt } from './lib/lostFoundDb.js'

// Model config — Opus for this room (highest-stakes AI touch in the hub)
const LF_MODEL = 'claude-opus-4-8'
const SYSTEM_PROMPT_ENGINE_ROOM_ID = 126

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

const FALLBACK_SYSTEM = `You are the thinking-partner inside Cat's Lost & Found room. Help Cat read her own emotions and meanings. Ask questions — you never tell her what she feels. Respond only as JSON: {"message": "...", "offers": [], "moves": [], "primary_move": null}.`

const VALID_MOVES = new Set([
  'mirroring-back', 'separating-threads', 'naming-a-shape', 'offering-a-lens', 'making-room',
  'sitting-with', 'what-matters', 'more-than-one', 'what-came-before', 'whats-underneath', 'meaning-path',
])

// Load system prompt from engine room (id=126) at runtime
async function loadSystemPrompt(vocab) {
  try {
    const { data, error } = await supabase
      .from('engine_room')
      .select('content')
      .eq('id', SYSTEM_PROMPT_ENGINE_ROOM_ID)
      .single()
    if (error || !data?.content) return FALLBACK_SYSTEM
    return data.content + formatVocabForPrompt(vocab)
  } catch {
    return FALLBACK_SYSTEM
  }
}

// Build a context note of Cat's current gathered atoms for the API call
function buildBouquetNote(bouquet, vocab) {
  if (!bouquet) return ''
  const { situations = [], emotions = [], bodyEntries = [], meanings = [] } = bouquet
  const parts = []
  if (emotions.length) {
    const words = emotions.map(e => vocab?.emotions?.bySlug?.[e.slug]?.word ?? e.word ?? e.slug)
    parts.push(`feelings: ${words.join(', ')}`)
  }
  if (meanings.length) {
    const names = meanings.map(m => vocab?.meanings?.bySlug?.[m.slug]?.name ?? m.name ?? m.slug)
    parts.push(`meaning: ${names.join(', ')}`)
  }
  if (bodyEntries.length) {
    const bodyStr = bodyEntries
      .map(b => b.location_slug + (b.quality_slugs?.length ? ` (${b.quality_slugs.join(', ')})` : ''))
      .join(', ')
    parts.push(`body: ${bodyStr}`)
  }
  if (situations.length) {
    parts.push(`situation: ${situations.map(s => s.name ?? s.slug).join(', ')}`)
  }
  if (!parts.length) return ''
  return `[Already in her bouquet — ${parts.join('; ')}. Already hers — don't re-offer these.]\n\n`
}

function parseResponse(text) {
  const tryParse = (str) => {
    const parsed = JSON.parse(str)
    const rawMoves = Array.isArray(parsed.moves) ? parsed.moves : []
    const moves = rawMoves.filter(m => VALID_MOVES.has(m))
    const pm = parsed.primary_move
    const primaryMove = (typeof pm === 'string' && VALID_MOVES.has(pm)) ? pm : (moves[0] ?? null)
    return {
      message: typeof parsed.message === 'string' ? parsed.message : str,
      offers: Array.isArray(parsed.offers) ? parsed.offers : [],
      moves,
      primaryMove,
    }
  }
  // Try code-fenced block anywhere in the text
  try {
    const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (block) return tryParse(block[1].trim())
  } catch { /**/ }
  // Try parsing the whole text (no fences)
  try { return tryParse(text.trim()) } catch { /**/ }
  // Fall back: first { to last }
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start) return tryParse(text.slice(start, end + 1))
  } catch { /**/ }
  return { message: text, offers: [], moves: [], primaryMove: null }
}

function HelpfulTick({ active, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'rgba(230,200,120,.08)' : 'transparent',
        border: `0.5px solid ${active ? 'var(--color-accent-primary)' : 'transparent'}`,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.04em',
        color: active ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
        cursor: 'pointer',
        opacity: active ? 1 : hovered ? 0.65 : 0.28,
        transition: 'color 0.15s, opacity 0.15s, background 0.15s, border-color 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      ✦ this helped
    </button>
  )
}

export default function AskClaudePanel({ open, onClose, vocab, expression, onAcceptOffer, currentPhase, bouquet, onMessagesChange }) {
  const [systemPrompt, setSystemPrompt] = useState(null)
  const [messages, setMessages] = useState([]) // [{role, content, offers?}]
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [gathered, setGathered] = useState([]) // words accepted from Claude's offers
  const bottomRef = useRef(null)

  function toggleHelpful(idx) {
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, markedHelpful: !m.markedHelpful } : m))
  }

  // Notify parent whenever messages change (for turn persistence on save)
  useEffect(() => {
    onMessagesChange?.(messages)
  }, [messages]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load system prompt when first opened
  useEffect(() => {
    if (open && !systemPrompt && vocab) {
      loadSystemPrompt(vocab).then(setSystemPrompt)
    }
  }, [open, vocab, systemPrompt])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    if (!text.trim() || loading || !systemPrompt) return
    const userMsg = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const contextNote = expression?.trim()
        ? `[Cat's entry so far: "${expression.trim()}"]\n\n`
        : ''
      const bouquetNote = buildBouquetNote(bouquet, vocab)
      const lastIdx = newMessages.length - 1
      const apiMessages = newMessages.map((m, i) => {
        let content = m.rawContent ?? m.content
        // Bouquet first (applied to last/current user message), then entry context (applied to first)
        if (i === lastIdx && bouquetNote) content = bouquetNote + content
        if (i === 0 && contextNote) content = contextNote + content
        return { role: m.role, content }
      })

      const res = await client.messages.create({
        model: LF_MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages: apiMessages,
      })

      const raw = res.content[0]?.text ?? ''
      const { message, offers, moves, primaryMove } = parseResponse(raw)

      const validOffers = offers.filter(o => o.word && o.kind)
      const finalOffers = validOffers.length === 1 ? [] : validOffers

      setMessages(prev => [...prev, {
        role: 'assistant', content: message, rawContent: raw,
        offers: finalOffers, moves, primaryMove, markedHelpful: false,
      }])
    } catch (err) {
      console.error('ask-claude error', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleAccept(offer) {
    onAcceptOffer(offer)
    setGathered(prev => prev.find(g => g.word === offer.word) ? prev : [...prev, offer])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  function handleStartOver() {
    setMessages([])
    setInput('')
    setError(null)
    setGathered([])
  }

  if (!open) return null

  const isReady = !!systemPrompt
  const isEmpty = messages.length === 0

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 'min(420px, 100vw)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      // Warm contained card look — dark background matching site gradient
      background: 'linear-gradient(180deg, #0a1328 0%, #0f1a3a 50%, #0c1530 100%)',
      borderLeft: '0.5px solid var(--color-border)',
      boxShadow: '-12px 0 48px rgba(0,0,0,.55)',
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 18px 14px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            letterSpacing: '0.03em',
            color: 'var(--candle-soft)',
            lineHeight: 1.2,
            marginBottom: 3,
          }}>
            ask Claude
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.4,
          }}>
            questions only — the answer is yours
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {messages.length > 0 && (
            <button
              onClick={handleStartOver}
              style={{
                background: 'transparent',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.04em',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
              }}
            >
              start over
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              fontSize: 20, lineHeight: 1,
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer', padding: '2px 4px',
            }}
          >×</button>
        </div>
      </div>

      {/* Conversation area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Empty state — centered warm message */}
        {isEmpty && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 28px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.7,
              maxWidth: 300,
            }}>
              {!isReady
                ? 'loading…'
                : <>
                    This is where you read your own entry back.
                    <br /><br />
                    Write what's here — even just <strong>one word</strong> — then ask Claude
                    to help you look. It will mostly ask questions; sometimes it'll
                    float a couple of words you can take or leave.
                  </>
              }
            </div>
          </div>
        )}

        {/* Messages */}
        {!isEmpty && (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    background: m.role === 'user'
                      ? 'var(--color-background-info)'
                      : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${m.role === 'user' ? 'var(--color-border-info)' : 'var(--color-border-tertiary)'}`,
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '10px 14px',
                    fontSize: 14, lineHeight: 1.6,
                    color: m.role === 'user' ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                    fontFamily: 'var(--font-serif)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>

                {/* Helpful tick — faint until hovered, gold when active */}
                {m.role === 'assistant' && (
                  <div style={{ paddingLeft: 4, marginTop: 6 }}>
                    <HelpfulTick active={m.markedHelpful ?? false} onToggle={() => toggleHelpful(i)} />
                  </div>
                )}

                {/* Offer chips */}
                {m.offers?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, paddingLeft: 4 }}>
                    <div style={{
                      width: '100%',
                      fontSize: 10,
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-tertiary)',
                      marginBottom: 2,
                    }}>
                      could any of these fit?
                    </div>
                    {m.offers.map((offer, j) => {
                      const taken = gathered.find(g => g.word === offer.word)
                      return (
                        <button
                          key={j}
                          onClick={() => !taken && handleAccept(offer)}
                          style={{
                            background: taken ? 'var(--color-background-info)' : 'rgba(255,255,255,0.04)',
                            border: `0.5px solid ${taken ? 'var(--color-border-info)' : 'var(--color-border)'}`,
                            color: taken ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                            borderRadius: 999,
                            padding: '5px 13px',
                            fontSize: 13,
                            cursor: taken ? 'default' : 'pointer',
                            fontFamily: 'var(--font-serif)',
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                        >
                          {offer.word}
                          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 5, fontStyle: 'italic' }}>
                            {offer.kind}
                          </span>
                          {taken && <span style={{ marginLeft: 5, opacity: 0.7 }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: '14px 14px 14px 4px',
                  padding: '10px 16px',
                  fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic',
                  fontFamily: 'var(--font-serif)',
                }}>
                  thinking…
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 13, color: 'rgba(200,100,80,0.85)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Gathered tray */}
      <div style={{
        borderTop: '0.5px solid var(--color-border-tertiary)',
        padding: '10px 16px 8px',
        flexShrink: 0,
        minHeight: 40,
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'var(--font-sans)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          marginBottom: gathered.length ? 7 : 0,
        }}>
          gathered
        </div>
        {gathered.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
            what you take shows here — nothing yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {gathered.map((g, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--color-background-info)',
                border: '0.5px solid var(--color-border-info)',
                color: 'var(--color-text-info)',
                borderRadius: 999, fontSize: 12, padding: '3px 9px',
                fontFamily: 'var(--font-serif)',
              }}>
                {g.word}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{
        padding: '10px 14px 16px',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="lay down what's here — a word, a vent, a few lines…"
            rows={2}
            style={{
              flex: 1, resize: 'none',
              fontFamily: 'var(--font-serif)', fontSize: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 10, padding: '8px 10px',
              color: 'var(--color-text-primary)', outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim() || !isReady}
            style={{
              flexShrink: 0,
              background: 'var(--color-background-info)',
              border: '0.5px solid var(--color-border-info)',
              color: 'var(--color-text-info)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              letterSpacing: '0.04em',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              opacity: loading || !input.trim() || !isReady ? 0.45 : 1,
              transition: 'opacity .15s',
              whiteSpace: 'nowrap',
            }}
          >
            ask Claude
          </button>
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          color: 'var(--color-text-tertiary)',
          marginTop: 6, lineHeight: 1.4,
        }}>
          enter to send · shift+enter for new line · accept offered words or find your own
        </div>
      </div>
    </div>
  )
}
