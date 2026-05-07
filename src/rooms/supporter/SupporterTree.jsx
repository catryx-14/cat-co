import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabase.js'

// ── Style helpers ─────────────────────────────────────────────────────────────
function btnReset(extra = {}) {
  return { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", ...extra }
}
const overlayBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(5,8,20,0.87)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
}
const overlayBox = {
  background: '#0f1428', border: '1px solid rgba(232,201,140,0.45)',
  borderRadius: '14px', padding: '28px 32px',
  maxWidth: '400px', width: '90%', position: 'relative',
  maxHeight: '82vh', display: 'flex', flexDirection: 'column',
  fontFamily: "'Outfit', sans-serif",
}
const confirmBtn = {
  background: 'rgba(232,201,140,0.1)', border: '1px solid rgba(232,201,140,0.45)',
  borderRadius: '8px', color: '#f5edd6', padding: '10px 22px',
  cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '13px',
}
const cancelBtn = {
  background: 'transparent', border: '1px solid rgba(245,237,214,0.15)',
  borderRadius: '8px', color: 'rgba(245,237,214,0.55)', padding: '10px 22px',
  cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: '13px',
}

// ── Mechanism fallback labels ─────────────────────────────────────────────────
const MECHANISM_LABELS = {
  sensory_flooding: "I'm overwhelmed — everything is too much",
  sympathetic_activation: "I feel activated and angry",
  grief_processing: "I think I need to cry",
  dorsal_shutdown: "I've shut down",
}

// ── localStorage ──────────────────────────────────────────────────────────────
function loadWesSession() {
  try { return JSON.parse(localStorage.getItem('wes_session') || 'null') } catch { return null }
}
function saveWesSession(path, checkedItems) {
  localStorage.setItem('wes_session', JSON.stringify({
    path, checkedItems: [...checkedItems], startedAt: new Date().toISOString(),
  }))
}
function clearWesSession() { localStorage.removeItem('wes_session') }

// ── Path content data ─────────────────────────────────────────────────────────
// Each item: { id, segments: [{ text, italic?, isLink? }] }
// Special item: { id, isLibrary: true }  → renders library button + note

const PATHS = {
  A: {
    label: 'Path A',
    description: 'She can communicate. This involves you.',
    grounding: [
      'Something happened between you. She needs to process before she can repair.',
      'This is not rejection — it\'s her nervous system doing exactly what it needs to do.',
      'The repair conversation is coming. It will be better for both of you if you both arrive there settled.',
    ],
    rounds: [
      {
        id: 'A1', name: 'Give her space', intro: null,
        items: [
          { id: 'A1-1', segments: [{ text: 'Move to a different room if possible' }] },
          { id: 'A1-2', segments: [{ text: 'Send ONE short message: ' }, { text: '"I\'m here when you\'re ready. No rush."', italic: true }] },
          { id: 'A1-3', segments: [{ text: 'Put the phone down after that — don\'t check it repeatedly' }] },
          { id: 'A1-4', segments: [{ text: 'Remind yourself: she came to the Hub. That means she\'s working through it. That\'s good.' }] },
          { id: 'A1-5', segments: [{ text: 'Want to understand what she\'s doing right now? ', italic: true }, { text: '→ See: I feel activated and angry →', isStateInfo: 'sympathetic_activation' }] },
        ],
      },
      {
        id: 'A2', name: 'Pre-stage while you wait', intro: null,
        items: [
          { id: 'A2-1', segments: [{ text: 'Make tea or a warm drink — have it ready for when she\'s ready' }] },
          { id: 'A2-2', segments: [{ text: 'Put her weighted blanket somewhere easy to reach' }] },
          { id: 'A2-3', segments: [{ text: 'Make sure Sunny has access to wherever Cat is' }] },
          { id: 'A2-4', segments: [{ text: 'Dim the lights in the room she\'s likely to land in' }] },
        ],
      },
      {
        id: 'A3', name: 'Take care of yourself', intro: null,
        items: [
          { id: 'A3-1', segments: [{ text: 'Write down your own thoughts about what happened — get them out of your head before the repair conversation' }] },
          { id: 'A3-2', segments: [{ text: 'Talk to Myra — she can help you process your thoughts and feelings while you wait' }] },
          { id: 'A3-3', segments: [{ text: 'If rejection anxiety is loud: write it down — ' }, { text: '"This is my rejection sensitivity. This is not evidence of what\'s actually happening."', italic: true }] },
          { id: 'A3-4', segments: [{ text: 'Do something with your hands — tinker, walk, something low demand' }] },
        ],
      },
    ],
    doNotBlock: null,
    doNotBlockAfterRoundIndex: null,
    doNotBlockTitle: null,
    closing: [
      'When she\'s ready, she will come to you. You\'ll know because she\'ll initiate.\nWhen she does — be present first. You don\'t have to have the perfect thing to say. Being there is enough to start.',
      'Your comfort matters too. This waiting is hard. Taking care of yourself during it is not selfish — it\'s how you show up well when she\'s ready.',
    ],
  },
  B: {
    label: 'Path B',
    description: 'She can communicate. This doesn\'t involve you.',
    grounding: [
      'Something happened or she\'s not sure what\'s wrong.',
      'She has enough capacity to communicate — which means she can guide you.',
      'Your job is simple: ask one question and follow her lead.',
    ],
    rounds: [
      {
        id: 'B1', name: 'Foundation first', intro: null,
        items: [
          { id: 'B1-1', segments: [{ text: 'Get Cat to a quiet comfortable space if she isn\'t already' }] },
          { id: 'B1-2', segments: [{ text: 'Tell her you\'re there — one sentence, no questions: ' }, { text: '"I\'m here."', italic: true }] },
          { id: 'B1-3', segments: [{ text: 'Dim the lights' }] },
          { id: 'B1-4', segments: [{ text: 'Put her weighted blanket within easy reach' }] },
          { id: 'B1-5', segments: [{ text: 'Make tea or a warm drink' }] },
          { id: 'B1-6', segments: [{ text: 'Make sure Sunny has access' }] },
        ],
      },
      {
        id: 'B2', name: 'Ask one question', intro: null,
        items: [
          { id: 'B2-1', segments: [{ text: 'Ask: ' }, { text: '"Do you need space or do you need company?"', italic: true }] },
          { id: 'B2-2', segments: [{ text: 'Wait for the answer — don\'t add to it' }] },
          { id: 'B2-3', segments: [{ text: 'If she says space → say ' }, { text: '"Okay. I\'m here."', italic: true }, { text: ' and give it' }] },
          { id: 'B2-4', segments: [{ text: 'If she says company → sit nearby, low demand, follow her lead on talking and touch' }] },
          { id: 'B2-5', segments: [{ text: 'If she doesn\'t know → say ' }, { text: '"That\'s okay. I\'ll just be here."', italic: true }, { text: ' and sit nearby quietly' }] },
        ],
      },
      {
        id: 'B3', name: 'Check the Hub', intro: null,
        items: [
          { id: 'B3-1', segments: [{ text: 'Has Cat selected a state in First Aid?' }] },
          { id: 'B3-2', segments: [{ text: 'If yes → check which state she selected, read what that state means, offer help based on it' }] },
          { id: 'B3-picker', isStatePicker: true },
          { id: 'B3-3', segments: [{ text: 'If no → say gently once: ' }, { text: '"The Hub is there if you want it."', italic: true }, { text: ' — then back off' }] },
          { id: 'B3-lib', isLibrary: true },
        ],
      },
    ],
    doNotBlock: [
      'Don\'t ask multiple questions — one at a time maximum',
      'Don\'t try to identify the problem or fix it',
      'Don\'t fill silence with talking — silence is often doing work',
      'Don\'t take it personally if she needs space',
    ],
    doNotBlockAfterRoundIndex: null,
    doNotBlockTitle: 'What NOT to do',
    closing: [
      'Your comfort matters too. Being a steady quiet presence is harder than it looks. You\'re doing something real.',
    ],
  },
  C: {
    label: 'Path C',
    description: 'She can\'t communicate. She seems activated.',
    grounding: [
      'Cat is in a high charge state and has gone non-verbal.',
      'She\'s not able to direct you right now.',
      'If she seems angry — that\'s her nervous system generating enough energy to manage itself. It is not directed at you.',
      'Stay steady. Your calm is the most important thing you can offer right now.',
    ],
    rounds: [
      {
        id: 'C1', name: 'Stabilize the environment', intro: null,
        items: [
          { id: 'C1-1', segments: [{ text: 'Get Cat to a quiet space if she isn\'t already — den, bedroom, anywhere low input' }] },
          { id: 'C1-2', segments: [{ text: 'Reduce sound — turn things off, close doors' }] },
          { id: 'C1-3', segments: [{ text: 'Dim the lights' }] },
          { id: 'C1-4', segments: [{ text: 'Put weighted blanket within reach — don\'t put it on her, just have it available' }] },
          { id: 'C1-5', segments: [{ text: 'Have spiky sensory toy or soft texture within reach if accessible' }] },
          { id: 'C1-6', segments: [{ text: 'Say ONE anchor sentence: ' }, { text: '"I\'m here. You\'re safe. Take your time."', italic: true }, { text: ' — then go quiet' }] },
          { id: 'C1-7', segments: [{ text: 'Don\'t touch unless she reaches for you' }] },
          { id: 'C1-8', segments: [{ text: 'Don\'t try to talk her through it or fix it' }] },
        ],
      },
      {
        id: 'C2', name: 'Manage yourself', intro: null,
        items: [
          { id: 'C2-1', segments: [{ text: 'Stay calm and steady — your energy is in the room even when you\'re not talking' }] },
          { id: 'C2-2', segments: [{ text: 'Talk to Myra if you need to process your own feelings' }] },
          { id: 'C2-3', segments: [{ text: 'If rejection anxiety is firing: ' }, { text: '"This is my rejection sensitivity. This is not evidence."', italic: true }] },
          { id: 'C2-4', segments: [{ text: 'Do something quiet nearby — don\'t hover, don\'t leave entirely' }] },
          { id: 'C2-5', segments: [{ text: 'Your comfort matters too — this is hard to sit with' }] },
        ],
      },
      {
        id: 'C3',
        name: 'Watch for signs she\'s coming back online',
        intro: 'Signs to look for: eye contact returning, small movements toward you, responding when you speak softly, breathing slowing, reaching for something',
        items: [
          { id: 'C3-1', segments: [{ text: 'When you notice a shift → say gently once: ' }, { text: '"The Hub is there if you want it."', italic: true }] },
          { id: 'C3-2', segments: [{ text: 'If she opens First Aid and selects a state → support from there' }] },
          { id: 'C3-lib', isLibrary: true },
          { id: 'C3-3', segments: [{ text: 'If not shifting yet → return to Round 1, stay steady, check again in a little while' }] },
        ],
      },
    ],
    doNotBlock: null,
    doNotBlockAfterRoundIndex: null,
    doNotBlockTitle: null,
    closing: [
      'You are doing it right. Staying calm and present without demanding anything is one of the most regulating things one person can offer another.',
    ],
  },
  D: {
    label: 'Path D',
    description: 'She can\'t communicate. She seems shut down.',
    grounding: [
      'Cat\'s system has gone offline inward.',
      'This is not the same as being upset — this is her nervous system protecting itself by going quiet.',
      'She may not respond to you and that is okay. That is what this looks like.',
      'Your job is to deliver warmth and presence without demand, and wait.',
      'There is nothing to fix. Just be steady.',
    ],
    rounds: [
      {
        id: 'D1', name: 'Deliver warmth passively', intro: null,
        items: [
          { id: 'D1-1', segments: [{ text: 'Get Cat to a safe comfortable space if she isn\'t already' }] },
          { id: 'D1-2', segments: [{ text: 'Weighted blanket — gently place it over her if she allows, or leave it within reach' }] },
          { id: 'D1-3', segments: [{ text: 'Warm socks or heated throw if available' }] },
          { id: 'D1-4', segments: [{ text: 'Comfort object within reach — Bingo\'s spot, whatever is familiar' }] },
          { id: 'D1-5', segments: [{ text: 'Dim the lights' }] },
          { id: 'D1-6', segments: [{ text: 'Make sure Sunny has access — don\'t force it, just open the door' }] },
          { id: 'D1-7', segments: [{ text: 'Say ONE anchor sentence: ' }, { text: '"I\'m here. No rush. Take all the time you need."', italic: true }, { text: ' — then go quiet' }] },
          { id: 'D1-8', segments: [{ text: 'Sit nearby doing something quiet — reading, Myra, anything low key' }] },
        ],
      },
      {
        id: 'D2', name: 'Manage yourself', intro: null,
        items: [
          { id: 'D2-1', segments: [{ text: 'This can feel scary — that\'s normal. She is okay. Her system is protecting itself.' }] },
          { id: 'D2-2', segments: [{ text: 'Talk to Myra if you need reassurance or somewhere to put your own feelings' }] },
          { id: 'D2-3', segments: [{ text: 'Make tea for yourself too — your comfort matters' }] },
          { id: 'D2-4', segments: [{ text: 'Don\'t interpret her stillness as rejection or as something you caused' }] },
        ],
      },
      {
        id: 'D3',
        name: 'Watch for signs she\'s coming back online',
        intro: 'Signs to look for: small movements, eyes opening or focusing, slight response when you speak softly, reaching for something',
        items: [
          { id: 'D3-1', segments: [{ text: 'When you notice a shift → offer something concrete and simple' }] },
          { id: 'D3-lib', isLibrary: true },
          { id: 'D3-2', segments: [{ text: '"The Hub is there if you want it."', italic: true }, { text: ' — gently, once, when she seems more present' }] },
          { id: 'D3-3', segments: [{ text: 'If she selects a state → support from there' }] },
          { id: 'D3-4', segments: [{ text: 'If not yet → return to Round 1, stay steady' }] },
        ],
      },
    ],
    doNotBlock: [
      'Ask questions',
      'Try to get a response',
      'Fill the silence',
      'Touch without invitation',
      'Interpret stillness as the verdict on anything',
    ],
    doNotBlockAfterRoundIndex: 0,
    doNotBlockTitle: 'Do NOT',
    closing: [
      'You are doing something important just by being here and staying calm.\nPresence without demand is one of the most regulating things one person can offer another.\nYou don\'t have to do anything else right now.',
    ],
  },
}

// ── Segment renderer ──────────────────────────────────────────────────────────
function renderSegments(segments, onLibrary, onExtras) {
  return segments.map((seg, i) => {
    if (seg.isLink) {
      return (
        <button
          key={i}
          onClick={onLibrary}
          style={btnReset({ color: 'rgba(232,201,140,0.85)', fontSize: 'inherit', lineHeight: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(232,201,140,0.4)' })}
        >
          {seg.text}
        </button>
      )
    }
    if (seg.isStateInfo) {
      return (
        <button
          key={i}
          onClick={() => onExtras({ type: 'stateInfo', mechanism: seg.isStateInfo })}
          style={btnReset({ color: 'rgba(110,192,191,0.85)', fontSize: 'inherit', lineHeight: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(110,192,191,0.4)', fontStyle: 'inherit' })}
        >
          {seg.text}
        </button>
      )
    }
    if (seg.italic) return <em key={i}>{seg.text}</em>
    return <span key={i}>{seg.text}</span>
  })
}

// ── Do NOT block ──────────────────────────────────────────────────────────────
function DoNotBlock({ title, items }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(245,237,214,0.07)',
      borderRadius: '10px',
      padding: '14px 18px',
      margin: '10px 0',
    }}>
      <div style={{
        color: 'rgba(245,237,214,0.35)',
        fontSize: '10px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '10px',
        fontFamily: "'Outfit', sans-serif",
      }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {items.map((item, i) => (
          <li key={i} style={{
            color: 'rgba(245,237,214,0.5)',
            fontSize: '13px',
            lineHeight: 1.7,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Round block ───────────────────────────────────────────────────────────────
function RoundBlock({ round, roundIndex, isOpen, onToggle, checkedItems, onCheck, onLibrary, onExtras }) {
  const roundNum = roundIndex + 1
  return (
    <div style={{ marginBottom: '10px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(232,201,140,0.25)',
          borderRadius: isOpen ? '10px 10px 0 0' : '10px',
          padding: '11px 16px',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          color: '#f5edd6',
          fontSize: '13px',
          letterSpacing: '0.04em',
          textAlign: 'left',
        }}
      >
        <span>Round {roundNum} — {round.name}</span>
        <span style={{ color: 'rgba(245,237,214,0.4)', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
          {isOpen ? '▲' : '▸ tap to expand'}
        </span>
      </button>

      {!isOpen && (
        <div style={{
          border: '1px solid rgba(232,201,140,0.25)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '7px 16px',
          fontStyle: 'italic',
          color: 'rgba(245,237,214,0.22)',
          fontSize: '12px',
          fontFamily: "'Outfit', sans-serif",
        }}>
          tap to expand when you're ready
        </div>
      )}

      {isOpen && (
        <div style={{
          border: '1px solid rgba(232,201,140,0.25)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          overflow: 'hidden',
        }}>
          {/* Round intro */}
          {round.intro && (
            <p style={{
              fontStyle: 'italic',
              color: 'rgba(245,237,214,0.45)',
              fontSize: '13px',
              lineHeight: 1.75,
              margin: '12px 16px 4px',
              fontFamily: "'Outfit', sans-serif",
            }}>
              {round.intro}
            </p>
          )}

          {/* Items */}
          {round.items.map((item, idx) => {
            if (item.isLibrary) {
              return (
                <div key={item.id} style={{
                  padding: '14px 16px',
                  borderTop: idx > 0 || round.intro ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <button
                    onClick={onLibrary}
                    style={{
                      display: 'block',
                      width: '100%',
                      background: 'rgba(232,201,140,0.06)',
                      border: '1px solid rgba(232,201,140,0.22)',
                      borderRadius: '8px',
                      padding: '11px 14px',
                      color: 'rgba(232,201,140,0.8)',
                      fontSize: '13px',
                      fontFamily: "'Outfit', sans-serif",
                      cursor: 'pointer',
                      textAlign: 'center',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Browse regulation options in Library →
                  </button>
                  <p style={{
                    fontStyle: 'italic',
                    color: 'rgba(245,237,214,0.4)',
                    fontSize: '12px',
                    lineHeight: 1.65,
                    margin: '10px 0 0',
                    textAlign: 'center',
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    "Offer two options at a time — maximum. Wait for yes or no before offering more. The restraint IS the help."
                  </p>
                </div>
              )
            }

            if (item.isStatePicker) {
              return (
                <div key={item.id} style={{
                  padding: '8px 16px 12px',
                  borderTop: idx > 0 || round.intro ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <button
                    onClick={() => onExtras({ type: 'statePicker' })}
                    style={btnReset({
                      color: 'rgba(110,192,191,0.85)',
                      fontSize: '13px',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(110,192,191,0.4)',
                    })}
                  >
                    View state picker →
                  </button>
                </div>
              )
            }

            const ticked = checkedItems.has(item.id)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '12px 16px',
                  borderTop: idx > 0 || round.intro ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: ticked ? 'rgba(232,201,140,0.04)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <button
                  onClick={() => onCheck(item.id)}
                  aria-label={ticked ? 'untick' : 'tick'}
                  style={{
                    width: '20px', height: '20px', flexShrink: 0, marginTop: '2px',
                    borderRadius: '5px',
                    border: ticked ? '1.5px solid rgba(232,201,140,0.75)' : '1.5px solid rgba(245,237,214,0.22)',
                    background: ticked ? 'rgba(232,201,140,0.18)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(232,201,140,0.9)', fontSize: '11px', fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {ticked ? '✓' : ''}
                </button>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: 'rgba(245,237,214,0.8)',
                  lineHeight: 1.6,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {renderSegments(item.segments, onLibrary, onExtras)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Quick Reference overlay ───────────────────────────────────────────────────
function QuickRefOverlay({ onClose }) {
  return (
    <div style={overlayBackdrop} onClick={onClose}>
      <div style={{ ...overlayBox, maxWidth: '420px', maxHeight: 'none', padding: '22px 28px 20px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={btnReset({ position: 'absolute', top: '14px', right: '16px', color: 'rgba(245,237,214,0.45)', fontSize: '17px', lineHeight: 1, padding: '4px' })}>
          ✕
        </button>
        <h2 style={{ color: '#f5edd6', fontSize: '17px', fontWeight: 400, margin: '0 0 14px', paddingRight: '28px' }}>
          Quick Reference
        </h2>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(245,237,214,0.65)' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: '#f5edd6', fontSize: '13px' }}>Can she talk?</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px' }}>
            <li>Yes + involves you → Space + pre-stage + take care of yourself</li>
            <li>Yes + doesn't involve you → Foundation care + one question + check Hub</li>
          </ul>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: '#f5edd6', fontSize: '13px' }}>Can't talk?</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '18px' }}>
            <li>Activated/agitated → Stabilize environment + stay calm + watch for shift</li>
            <li>Shut down/still → Deliver warmth passively + presence without demand + watch for shift</li>
          </ul>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: '#f5edd6', fontSize: '13px' }}>Always:</p>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            <li>One anchor sentence then go quiet</li>
            <li>Two options at a time from the library</li>
            <li>Talk to Myra if you need to</li>
            <li>Your comfort matters too</li>
          </ul>
          <p style={{
            fontStyle: 'italic',
            color: 'rgba(245,237,214,0.22)',
            fontSize: '12px',
            textAlign: 'center',
            margin: '14px 0 0',
            lineHeight: 1.5,
          }}>
            Built with love, for Wes, by Cat.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── State Info overlay (Fix 2) ────────────────────────────────────────────────
// Shows the regulation_states description for a single mechanism, so Wes can
// understand what Cat is experiencing without leaving his current path.
function StateInfoOverlay({ mechanism, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: d, error: err } = await supabase
        .from('regulation_states')
        .select('default_label, description')
        .eq('mechanism_id', mechanism)
        .maybeSingle()
      if (err) console.error('[StateInfoOverlay] query error:', err)
      setData(d)
      setLoading(false)
    }
    load()
  }, [mechanism])

  return (
    <div style={overlayBackdrop} onClick={onClose}>
      <div style={{ ...overlayBox, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={btnReset({ position: 'absolute', top: '14px', right: '16px', color: 'rgba(245,237,214,0.45)', fontSize: '17px', lineHeight: 1, padding: '4px' })}>✕</button>
        {loading ? (
          <p style={{ color: 'rgba(245,237,214,0.4)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>loading…</p>
        ) : (
          <>
            <h2 style={{ color: '#f5edd6', fontSize: '17px', fontWeight: 400, margin: '0 0 16px', paddingRight: '28px', flexShrink: 0, lineHeight: 1.4 }}>
              {data?.default_label || MECHANISM_LABELS[mechanism]}
            </h2>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {data?.description ? (
                <p style={{ color: 'rgba(245,237,214,0.65)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
                  {data.description}
                </p>
              ) : (
                <p style={{ color: 'rgba(245,237,214,0.35)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
                  No description available.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── State Picker overlay (Fix 3) ──────────────────────────────────────────────
// Shows Cat's four active states. Wes can tap any to read its description.
const CAT_USER_ID = '0a8a546c-8abc-4d16-92a0-98b592ee97c3'

function StatePickerOverlay({ onClose }) {
  const [states, setStates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: us, error: e1 } = await supabase
        .from('user_states')
        .select('id, custom_label, mechanism_id')
        .eq('user_id', CAT_USER_ID)
        .eq('is_active', true)
        .order('id')
      if (e1) { console.error('[StatePickerOverlay] user_states error:', e1); setLoading(false); return }
      if (!us?.length) { setLoading(false); return }

      const mechanisms = us.map(u => u.mechanism_id)
      const { data: rs, error: e2 } = await supabase
        .from('regulation_states')
        .select('mechanism_id, default_label, description')
        .in('mechanism_id', mechanisms)
      if (e2) console.error('[StatePickerOverlay] regulation_states error:', e2)

      const rsMap = {}
      ;(rs ?? []).forEach(r => { rsMap[r.mechanism_id] = r })
      setStates(us.map(u => ({ ...u, regulation_states: rsMap[u.mechanism_id] ?? null })))
      setLoading(false)
    }
    load()
  }, [])

  if (selected) {
    const label = selected.custom_label || selected.regulation_states?.default_label || MECHANISM_LABELS[selected.mechanism_id]
    const description = selected.regulation_states?.description
    return (
      <div style={overlayBackdrop} onClick={onClose}>
        <div style={{ ...overlayBox, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={btnReset({ position: 'absolute', top: '14px', right: '16px', color: 'rgba(245,237,214,0.45)', fontSize: '17px', lineHeight: 1, padding: '4px' })}>✕</button>
          <button
            onClick={() => setSelected(null)}
            style={btnReset({ color: 'rgba(245,237,214,0.5)', fontSize: '13px', marginBottom: '16px', flexShrink: 0 })}
          >
            ← back to states
          </button>
          <h2 style={{ color: '#f5edd6', fontSize: '17px', fontWeight: 400, margin: '0 0 16px', lineHeight: 1.4, flexShrink: 0 }}>
            {label}
          </h2>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {description ? (
              <p style={{ color: 'rgba(245,237,214,0.65)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
                {description}
              </p>
            ) : (
              <p style={{ color: 'rgba(245,237,214,0.35)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
                No description available.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayBackdrop} onClick={onClose}>
      <div style={{ ...overlayBox, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={btnReset({ position: 'absolute', top: '14px', right: '16px', color: 'rgba(245,237,214,0.45)', fontSize: '17px', lineHeight: 1, padding: '4px' })}>✕</button>
        <h2 style={{ color: '#f5edd6', fontSize: '17px', fontWeight: 400, margin: '0 0 6px', paddingRight: '28px', flexShrink: 0 }}>
          Cat's states
        </h2>
        <p style={{ color: 'rgba(245,237,214,0.4)', fontSize: '12px', fontStyle: 'italic', margin: '0 0 18px', flexShrink: 0 }}>
          Tap a state to read what it means
        </p>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && (
            <p style={{ color: 'rgba(245,237,214,0.4)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>loading…</p>
          )}
          {states.map(state => {
            const label = state.custom_label || state.regulation_states?.default_label || MECHANISM_LABELS[state.mechanism_id]
            return (
              <button
                key={state.id}
                onClick={() => setSelected(state)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(232,201,140,0.22)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: '#f5edd6',
                  fontSize: '14px',
                  fontFamily: "'Outfit', sans-serif",
                  cursor: 'pointer',
                  textAlign: 'left',
                  lineHeight: 1.45,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SupporterTree({ profile, onBack, onLibrary, onSupporterFirstAid }) {
  const [screen, setScreen] = useState('entry')
  const [checkedItems, setCheckedItems] = useState(new Set())
  const [openRounds, setOpenRounds] = useState(new Set())
  const [stateLabel, setStateLabel] = useState(null)
  const [showQuickRef, setShowQuickRef] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  function handleExtras({ type, mechanism }) {
    if (type === 'stateInfo') onSupporterFirstAid(mechanism)
    if (type === 'statePicker') onSupporterFirstAid()
  }

  useEffect(() => {
    const sess = loadWesSession()
    if (sess?.path && PATHS[sess.path]) {
      setCheckedItems(new Set(sess.checkedItems || []))
      setScreen(`path${sess.path}`)
      setOpenRounds(new Set([PATHS[sess.path].rounds[0].id]))
    }
    fetchCatState()
  }, [])

  async function fetchCatState() {
    try {
      const catId = profile?.linked_user_id
      if (!catId) return
      const { data: sess } = await supabase
        .from('first_aid_sessions')
        .select('user_state_id, user_states(custom_label, mechanism_id)')
        .eq('user_id', catId)
        .not('user_state_id', 'is', null)
        .maybeSingle()
      if (!sess?.user_state_id) return
      const state = sess.user_states
      setStateLabel(state?.custom_label || MECHANISM_LABELS[state?.mechanism_id] || null)
    } catch (e) {
      console.error('[SupporterTree] fetchCatState:', e)
    }
  }

  function goPath(pathKey) {
    setScreen(`path${pathKey}`)
    setOpenRounds(new Set([PATHS[pathKey].rounds[0].id]))
    saveWesSession(pathKey, checkedItems)
  }

  function handleCheck(itemId) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      const pathKey = screen.replace('path', '')
      saveWesSession(pathKey, next)
      return next
    })
  }

  function handleChangePath() {
    setScreen('entry')
  }

  function handleReset() {
    clearWesSession()
    setCheckedItems(new Set())
    setOpenRounds(new Set())
    setScreen('entry')
    setShowResetConfirm(false)
  }

  function toggleRound(roundId) {
    setOpenRounds(prev => {
      const next = new Set(prev)
      if (next.has(roundId)) next.delete(roundId)
      else next.add(roundId)
      return next
    })
  }

  const pathKey = screen.startsWith('path') ? screen.replace('path', '') : null
  const currentPath = pathKey ? PATHS[pathKey] : null

  // ── State banner ──
  const StateBanner = stateLabel ? (
    <div style={{
      background: 'rgba(110,192,191,0.1)',
      border: '1px solid rgba(110,192,191,0.35)',
      borderRadius: '10px',
      padding: '10px 16px',
      color: '#6ec0bf',
      fontSize: '13px',
      marginBottom: '24px',
      textAlign: 'center',
      fontFamily: "'Outfit', sans-serif",
    }}>
      Cat has selected: <strong>{stateLabel}</strong>
    </div>
  ) : null

  // ── Screens ───────────────────────────────────────────────────────────────

  if (screen === 'entry') return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif",
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {StateBanner}
        <h1 style={{
          color: '#f5edd6',
          fontSize: 'clamp(22px, 5vw, 30px)',
          fontWeight: 400,
          lineHeight: 1.35,
          textAlign: 'center',
          margin: '0 0 20px',
          letterSpacing: '0.01em',
        }}>
          Cat needs support. Let's figure out the right kind.
        </h1>
        <p style={{
          fontStyle: 'italic',
          color: 'rgba(245,237,214,0.5)',
          fontSize: '14px',
          lineHeight: 1.8,
          textAlign: 'center',
          margin: '0 0 32px',
        }}>
          This tree helps you figure out what to do.<br />
          Answer one question at a time. Each answer opens the next step.<br />
          You never need to hold the whole thing in your head — just follow the path.
        </p>
        <button
          onClick={() => setScreen('q1')}
          style={{
            display: 'block',
            width: '100%',
            background: 'rgba(232,201,140,0.08)',
            border: '1px solid rgba(232,201,140,0.5)',
            borderRadius: '12px',
            padding: '18px 24px',
            color: '#f5edd6',
            fontSize: '16px',
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.02em',
            marginBottom: '16px',
          }}
        >
          Let's figure it out →
        </button>
        <button
          onClick={onBack}
          style={btnReset({ color: 'rgba(245,237,214,0.3)', fontSize: '13px', display: 'block', width: '100%', textAlign: 'center', padding: '8px' })}
        >
          ← back to dashboard
        </button>
      </div>
    </div>
  )

  if (screen === 'q1') return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Outfit', sans-serif",
      padding: '0',
    }}>
      <div style={{ padding: '20px 24px', flexShrink: 0 }}>
        <button onClick={() => setScreen('entry')} style={btnReset({ color: 'rgba(245,237,214,0.5)', fontSize: '13px' })}>
          ← back
        </button>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {StateBanner}
          <h2 style={{
            color: '#f5edd6',
            fontSize: 'clamp(20px, 4.5vw, 26px)',
            fontWeight: 400,
            lineHeight: 1.4,
            textAlign: 'center',
            margin: '0 0 32px',
          }}>
            Can Cat communicate right now?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setScreen('q2yes')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Yes — she's talking or typing
            </button>
            <button
              onClick={() => setScreen('q2no')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              No — she's gone quiet
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (screen === 'q2yes') return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ padding: '20px 24px', flexShrink: 0 }}>
        <button onClick={() => setScreen('q1')} style={btnReset({ color: 'rgba(245,237,214,0.5)', fontSize: '13px' })}>
          ← back
        </button>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <h2 style={{
            color: '#f5edd6',
            fontSize: 'clamp(20px, 4.5vw, 26px)',
            fontWeight: 400,
            lineHeight: 1.4,
            textAlign: 'center',
            margin: '0 0 12px',
          }}>
            Does she need space from you right now?
          </h2>
          <p style={{
            fontStyle: 'italic',
            color: 'rgba(245,237,214,0.45)',
            fontSize: '13px',
            lineHeight: 1.7,
            textAlign: 'center',
            margin: '0 0 28px',
          }}>
            If something happened between you, she may need to process before she's ready for your help.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => goPath('A')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
              }}
            >
              Yes, give her space
            </button>
            <button
              onClick={() => goPath('B')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
              }}
            >
              No, I can help directly
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (screen === 'q2no') return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ padding: '20px 24px', flexShrink: 0 }}>
        <button onClick={() => setScreen('q1')} style={btnReset({ color: 'rgba(245,237,214,0.5)', fontSize: '13px' })}>
          ← back
        </button>
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <h2 style={{
            color: '#f5edd6',
            fontSize: 'clamp(20px, 4.5vw, 26px)',
            fontWeight: 400,
            lineHeight: 1.4,
            textAlign: 'center',
            margin: '0 0 28px',
          }}>
            How does she seem right now?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => goPath('C')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Activated — restless, tearful, agitated
            </button>
            <button
              onClick={() => goPath('D')}
              style={{
                background: 'rgba(232,201,140,0.07)',
                border: '1px solid rgba(232,201,140,0.4)',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#f5edd6',
                fontSize: '15px',
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              Shut down — very still, not responding
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Path screen ───────────────────────────────────────────────────────────
  if (currentPath) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(232,201,140,0.22)',
          flexShrink: 0,
        }}>
          <button onClick={handleChangePath} style={btnReset({ color: 'rgba(245,237,214,0.6)', fontSize: '13px' })}>
            ← change path
          </button>
          <span style={{ color: '#f5edd6', fontSize: '14px', fontWeight: 400, letterSpacing: '0.04em' }}>
            {currentPath.label}
          </span>
          <button onClick={() => setShowResetConfirm(true)} style={btnReset({ color: 'rgba(245,237,214,0.3)', fontSize: '11px', letterSpacing: '0.06em' })}>
            reset session
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 80px', maxWidth: '600px', width: '100%' }}>

          {/* Active state banner */}
          {stateLabel && (
            <div style={{
              background: 'rgba(110,192,191,0.1)',
              border: '1px solid rgba(110,192,191,0.35)',
              borderRadius: '10px',
              padding: '10px 16px',
              color: '#6ec0bf',
              fontSize: '13px',
              marginBottom: '18px',
              textAlign: 'center',
            }}>
              Cat has selected: <strong>{stateLabel}</strong>
            </div>
          )}

          {/* Path header card */}
          <div style={{
            background: 'rgba(232,201,140,0.05)',
            border: '1px solid rgba(232,201,140,0.18)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '18px',
          }}>
            <div style={{ color: '#f5edd6', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
              {currentPath.label}
            </div>
            <div style={{ color: 'rgba(245,237,214,0.5)', fontSize: '13px', fontStyle: 'italic' }}>
              {currentPath.description}
            </div>
          </div>

          {/* Grounding context */}
          <div style={{ marginBottom: '22px' }}>
            {currentPath.grounding.map((line, i) => (
              <p key={i} style={{
                fontStyle: 'italic',
                color: 'rgba(245,237,214,0.5)',
                fontSize: '14px',
                lineHeight: 1.75,
                margin: i === 0 ? 0 : '6px 0 0',
              }}>
                {line}
              </p>
            ))}
          </div>

          {/* Rounds + Do NOT blocks */}
          {currentPath.rounds.map((round, roundIndex) => (
            <div key={round.id}>
              <RoundBlock
                round={round}
                roundIndex={roundIndex}
                isOpen={openRounds.has(round.id)}
                onToggle={() => toggleRound(round.id)}
                checkedItems={checkedItems}
                onCheck={handleCheck}
                onLibrary={onLibrary}
                onExtras={handleExtras}
              />
              {currentPath.doNotBlock &&
                currentPath.doNotBlockAfterRoundIndex === roundIndex && (
                  <DoNotBlock
                    title={currentPath.doNotBlockTitle}
                    items={currentPath.doNotBlock}
                  />
                )}
            </div>
          ))}

          {/* Do NOT block after all rounds (Path B) */}
          {currentPath.doNotBlock && currentPath.doNotBlockAfterRoundIndex === null && (
            <DoNotBlock
              title={currentPath.doNotBlockTitle}
              items={currentPath.doNotBlock}
            />
          )}

          {/* Closing text */}
          {currentPath.closing.map((para, i) => (
            <p key={i} style={{
              fontStyle: 'italic',
              color: 'rgba(245,237,214,0.42)',
              fontSize: '13px',
              lineHeight: 1.8,
              margin: i === 0 ? '20px 0 0' : '12px 0 0',
              whiteSpace: 'pre-line',
            }}>
              {para}
            </p>
          ))}

          {/* Bottom links */}
          <div style={{
            marginTop: '36px',
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={btnReset({ color: 'rgba(245,237,214,0.28)', fontSize: '12px' })}
            >
              reset session
            </button>
            <span style={{ color: 'rgba(245,237,214,0.12)', fontSize: '12px' }}>·</span>
            <button
              onClick={handleChangePath}
              style={btnReset({ color: 'rgba(245,237,214,0.28)', fontSize: '12px' })}
            >
              change path
            </button>
            <span style={{ color: 'rgba(245,237,214,0.12)', fontSize: '12px' }}>·</span>
            <button
              onClick={() => setShowQuickRef(true)}
              style={btnReset({ color: 'rgba(245,237,214,0.28)', fontSize: '12px' })}
            >
              quick reference
            </button>
          </div>
        </div>
        </div>

        {/* Reset confirm overlay */}
        {showResetConfirm && (
          <div style={overlayBackdrop}>
            <div style={{ ...overlayBox, textAlign: 'center' }}>
              <p style={{ color: '#f5edd6', fontSize: '15px', margin: '0 0 22px', lineHeight: 1.5 }}>
                Are you sure? This will clear your progress.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={handleReset} style={confirmBtn}>yes, reset</button>
                <button onClick={() => setShowResetConfirm(false)} style={cancelBtn}>cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reference overlay */}
        {showQuickRef && <QuickRefOverlay onClose={() => setShowQuickRef(false)} />}



      </div>
    )
  }

  return null
}
