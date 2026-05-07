import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabase.js'

const COST_STYLE = {
  near_zero: { bg: 'rgba(163,201,168,0.14)', color: '#a3c9a8', border: 'rgba(163,201,168,0.3)' },
  low:       { bg: 'rgba(110,192,191,0.12)', color: '#6ec0bf', border: 'rgba(110,192,191,0.28)' },
  moderate:  { bg: 'rgba(232,201,140,0.12)', color: 'rgba(232,201,140,0.85)', border: 'rgba(232,201,140,0.28)' },
  higher:    { bg: 'rgba(201,138,160,0.12)', color: '#c98aa0', border: 'rgba(201,138,160,0.28)' },
}

const overlayBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(5,8,20,0.87)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
}
const overlayBox = {
  background: '#0f1428',
  border: '1px solid rgba(232,201,140,0.45)',
  borderRadius: '14px',
  padding: '28px 32px',
  maxWidth: '400px',
  width: '90%',
  textAlign: 'left',
  fontFamily: "'Outfit', sans-serif",
  position: 'relative',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
}
const cardLabel = {
  color: 'rgba(232,201,140,0.55)',
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '5px',
}
const cardText = {
  color: 'rgba(245,237,214,0.65)',
  fontSize: '13px',
  lineHeight: 1.75,
  margin: 0,
}

function btnReset(extra = {}) {
  return { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", ...extra }
}

export default function SupporterLibrary({ onBack }) {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => {
    supabase
      .from('regulation_tools')
      .select('id, name, description, access_cost, has_card, how_to_use, time_component, the_science, notes_variations')
      .order('id')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setTools(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(232,201,140,0.28)',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={btnReset({ color: 'rgba(245,237,214,0.65)', fontSize: '13px' })}>
          ← back
        </button>
        <div style={{ color: '#f5edd6', fontSize: '15px', fontWeight: 400, letterSpacing: '0.04em' }}>
          Regulation Library
        </div>
      </div>

      {/* Tool list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 48px', maxWidth: '640px', width: '100%' }}>
        {loading && (
          <p style={{ color: 'rgba(245,237,214,0.35)', fontSize: '14px', fontStyle: 'italic', paddingTop: '24px' }}>
            loading…
          </p>
        )}
        {error && (
          <p style={{ color: 'rgba(255,120,100,0.7)', fontSize: '14px', paddingTop: '24px' }}>{error}</p>
        )}
        {tools.map(tool => {
          const cs = COST_STYLE[tool.access_cost] || COST_STYLE.moderate
          return (
            <div key={tool.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              gap: '12px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {tool.has_card ? (
                  <button
                    onClick={() => setActiveCard(tool)}
                    style={btnReset({
                      color: 'rgba(232,201,140,0.85)',
                      fontSize: '14px',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(232,201,140,0.3)',
                      textAlign: 'left',
                    })}
                  >
                    {tool.name}
                  </button>
                ) : (
                  <span style={{ color: '#f5edd6', fontSize: '14px' }}>{tool.name}</span>
                )}
                {tool.description && (
                  <div style={{
                    color: 'rgba(245,237,214,0.45)',
                    fontSize: '12px',
                    marginTop: '3px',
                    lineHeight: 1.55,
                  }}>
                    {tool.description}
                  </div>
                )}
              </div>
              {tool.access_cost && (
                <div style={{
                  background: cs.bg,
                  border: `1px solid ${cs.border}`,
                  color: cs.color,
                  borderRadius: '8px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  flexShrink: 0,
                  letterSpacing: '0.03em',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                }}>
                  {tool.access_cost.replace('_', ' ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tool card overlay */}
      {activeCard && (
        <div style={overlayBackdrop} onClick={() => setActiveCard(null)}>
          <div style={overlayBox} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveCard(null)}
              style={btnReset({ position: 'absolute', top: '14px', right: '16px', color: 'rgba(245,237,214,0.45)', fontSize: '17px', lineHeight: 1, padding: '4px' })}
            >✕</button>
            <h2 style={{ color: '#f5edd6', fontSize: '18px', fontWeight: 400, margin: '0 0 16px', paddingRight: '28px', flexShrink: 0 }}>
              {activeCard.name}
            </h2>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {activeCard.has_card ? (
                <>
                  {activeCard.description && (
                    <p style={{ color: 'rgba(245,237,214,0.65)', fontSize: '14px', lineHeight: 1.75, margin: '0 0 18px' }}>
                      {activeCard.description}
                    </p>
                  )}
                  {activeCard.how_to_use && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={cardLabel}>how to use it</div>
                      <p style={cardText}>{activeCard.how_to_use}</p>
                    </div>
                  )}
                  {activeCard.time_component && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={cardLabel}>time</div>
                      <p style={cardText}>{activeCard.time_component}</p>
                    </div>
                  )}
                  {activeCard.access_cost && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={cardLabel}>access cost</div>
                      <p style={cardText}>{activeCard.access_cost.replace('_', ' ')}</p>
                    </div>
                  )}
                  {activeCard.the_science && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={cardLabel}>the science</div>
                      <p style={cardText}>{activeCard.the_science}</p>
                    </div>
                  )}
                  {activeCard.notes_variations && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={cardLabel}>notes</div>
                      <p style={cardText}>{activeCard.notes_variations}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {activeCard.description && (
                    <p style={{ color: 'rgba(245,237,214,0.65)', fontSize: '14px', lineHeight: 1.75, margin: '0 0 18px' }}>
                      {activeCard.description}
                    </p>
                  )}
                  {activeCard.access_cost && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={cardLabel}>access cost</div>
                      <p style={cardText}>{activeCard.access_cost.replace('_', ' ')}</p>
                    </div>
                  )}
                  <p style={{ fontStyle: 'italic', color: 'rgba(245,237,214,0.3)', fontSize: '13px', marginTop: '12px' }}>
                    More detail coming for this card.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
