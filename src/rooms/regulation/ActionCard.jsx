import { useState, useEffect } from 'react'
import { loadAction } from './lib/regulationDb.js'

// The five optional sections an Action can carry (same family as a routine face).
// Science is deliberately NOT here — it lives on the linked shelf card.
const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]

// Read-only Activity (Action) card. Mirrors the routine read card's look, using
// the shared .reg-room styles. Rendered inside a .reg-room wrapper by the caller.
export default function ActionCard({ actionId, onBack, backLabel = '‹ close' }) {
  const [action, setAction] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let live = true
    loadAction(actionId)
      .then(a => { if (live) setAction(a) })
      .catch(err => { console.error('[Regulation] failed to load action', err); if (live) setMissing(true) })
    return () => { live = false }
  }, [actionId])

  if (missing) {
    return (
      <div>
        <button className="reg-back" onClick={onBack}>{backLabel}</button>
        <div className="card"><div className="cardbody">
          <p className="reg-lede">this card is no longer available.</p>
        </div></div>
      </div>
    )
  }
  if (!action) return <div className="reg-loading">…</div>

  const typeLabel = action.action_type === 'all_day' ? 'all-day' : 'one-off'
  const hasAnySection = SECTIONS.some(([, key]) => action[key])
  // teal headband for one-offs, gold for all-day — matches the grid box tags
  const bandVars = action.action_type === 'all_day'
    ? { '--rb': '#e6c878', '--rb-deep': '#5a4410' }
    : { '--rb': '#5aa9cf', '--rb-deep': '#1e3d52' }

  return (
    <div style={bandVars}>
      <button className="reg-back" onClick={onBack}>{backLabel}</button>
      <div className="card">
        <div className="headband">
          <div className="bl">{typeLabel} · +{action.points}</div>
          <h1>{action.name}</h1>
        </div>
        <div className="cardbody">
          <div className="anat">
            {SECTIONS.map(([label, key]) => (
              <div className="seg" key={key}>
                <div className="l">{label}</div>
                {action[key]
                  ? <p>{action[key]}</p>
                  : <p className="empty">— not written yet —</p>}
              </div>
            ))}
          </div>
          {!hasAnySection && (
            <div className="foot">this card hasn’t been written up yet — you can add its words over in the Regulation room.</div>
          )}
        </div>
      </div>
    </div>
  )
}
