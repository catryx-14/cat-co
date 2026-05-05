import { useState, useEffect } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import { supabase } from '../../shared/lib/supabase.js'

const CATEGORY_COLORS = {
  design:    'rgba(168,144,212,0.7)',
  technical: 'rgba(110,192,191,0.7)',
  content:   'rgba(232,201,140,0.7)',
  reference: 'rgba(126,184,217,0.7)',
}

export default function EngineRoom({ onSettings, roomName = 'Engine Room' }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('engine_room')
      .select('id, title, category, content, status')
      .order('id')
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

  return (
    <>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{roomName}</h2>
          <RoomMark date={todayStr()} onSettings={onSettings} />
        </div>
      </div>

      <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(240,227,194,0.35)', marginBottom: 32 }}>
        below decks · documents &amp; reference
      </div>

      {loading && (
        <div style={{ padding: '40px 0', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-faint)' }}>
          loading…
        </div>
      )}

      {error && (
        <div style={{ padding: '20px 0', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 14, color: 'rgba(255,160,180,0.7)' }}>
          could not load engine room: {error}
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div style={{ padding: '40px 0', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-faint)' }}>
          no documents found in engine_room table
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {docs.map(doc => {
            const catColor = CATEGORY_COLORS[doc.category?.toLowerCase()] || 'rgba(240,227,194,0.45)'
            return (
              <div key={doc.id} style={{
                padding: '20px 6px 20px',
                borderBottom: '1px solid rgba(232,201,140,0.07)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: doc.content ? 10 : 0, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: '"Cagliostro", serif', fontSize: 18, color: 'var(--ink)', letterSpacing: '0.02em' }}>
                    {doc.title}
                  </span>
                  {doc.category && (
                    <span style={{ fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: 12, color: catColor, letterSpacing: '0.04em' }}>
                      {doc.category}
                    </span>
                  )}
                  {doc.status && (
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                      letterSpacing: '0.22em', textTransform: 'uppercase',
                      color: doc.status.toLowerCase() === 'active' ? 'rgba(163,201,168,0.8)' : 'rgba(240,227,194,0.35)',
                      padding: '2px 8px', borderRadius: 2,
                      border: `0.5px solid ${doc.status.toLowerCase() === 'active' ? 'rgba(163,201,168,0.3)' : 'rgba(240,227,194,0.15)'}`,
                      marginLeft: 'auto',
                    }}>
                      {doc.status}
                    </span>
                  )}
                </div>
                {doc.content && (
                  <div style={{
                    fontFamily: '"Crimson Pro", serif', fontSize: 15, lineHeight: 1.6,
                    color: 'var(--ink-soft)', maxWidth: 720,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {doc.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
