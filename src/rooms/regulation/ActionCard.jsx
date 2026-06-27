import { useState, useEffect } from 'react'
import { loadAction, loadTool } from './lib/regulationDb.js'

// The five optional sections an Action can carry (same family as a routine face).
// Science is deliberately NOT here — it lives on the linked shelf card, reachable
// through the "the science" link below.
const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]

const SCI_FIELDS = [
  ['what it is', 'description'],
  ['how to use it', 'how_to_use'],
  ['the science', 'the_science'],
  ['notes & variations', 'notes_variations'],
]

// Read-only Activity (Action) card. Mirrors the routine read card's look, using
// the shared .reg-room styles. Rendered inside a .reg-room wrapper by the caller.
// `onOpenShelf(toolId)` — when provided, the shelf link jumps to the backing
// card in the Shelf tab; otherwise the science reveals inline.
export default function ActionCard({ actionId, onBack, backLabel = '‹ close', onOpenShelf }) {
  const [action, setAction] = useState(null)
  const [missing, setMissing] = useState(false)
  const [sci, setSci] = useState(null)        // backing tool, loaded on demand
  const [sciOpen, setSciOpen] = useState(false)

  useEffect(() => {
    let live = true
    loadAction(actionId)
      .then(a => { if (live) setAction(a) })
      .catch(err => { console.error('[Regulation] failed to load action', err); if (live) setMissing(true) })
    return () => { live = false }
  }, [actionId])

  async function revealScience() {
    if (action?.tool_id == null) return
    if (onOpenShelf) { onOpenShelf(action.tool_id); return }
    if (sci) { setSciOpen(o => !o); return }
    try {
      const tool = await loadTool(action.tool_id)
      setSci(tool); setSciOpen(true)
    } catch (err) { console.error('[Regulation] failed to load shelf card', err) }
  }

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
  const channels = action.backing
    ? [action.backing.channel_primary, ...(action.backing.channels_secondary || [])].filter(Boolean)
    : []
  const firstAid = !!(action.backing?.tags || []).includes('first aid')
  // teal headband for one-offs, gold for all-day — matches the grid box tags
  const bandVars = action.action_type === 'all_day'
    ? { '--rb': '#e6c878', '--rb-deep': '#5a4410' }
    : { '--rb': '#5aa9cf', '--rb-deep': '#1e3d52' }

  return (
    <div style={bandVars}>
      <style>{AC_STYLES}</style>
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

          {(channels.length > 0 || firstAid) && (
            <div className="ac-tagrow">
              {channels.map((c, i) => <span key={c + i} className={`ac-chtag ${i > 0 ? 'sec' : ''}`}>{c}</span>)}
              {firstAid && <span className="ac-fa">first aid</span>}
            </div>
          )}

          {action.tool_id != null && (
            <div className="ac-shelf">
              <button className="ac-shelflink" onClick={revealScience}>
                {onOpenShelf
                  ? `open shelf card${action.backing?.name ? `: ${action.backing.name}` : ''} →`
                  : (sciOpen ? 'hide the science ▴' : `the science${action.backing?.name ? `: ${action.backing.name}` : ''} ▾`)}
              </button>
              {!onOpenShelf && sciOpen && sci && (
                <div className="ac-sci">
                  {SCI_FIELDS.some(([, k]) => sci[k]) ? (
                    SCI_FIELDS.map(([label, key]) => sci[key] ? (
                      <div className="ac-scisec" key={key}><div className="ac-scil">{label}</div><p>{sci[key]}</p></div>
                    ) : null)
                  ) : (
                    <p className="ac-scinone">the science on this shelf card hasn’t been written up yet.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const AC_STYLES = `
.ac-tagrow{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:4px 0 2px;}
.ac-chtag{font-size:10.5px;padding:2px 9px;border-radius:999px;border:1px solid rgba(47,190,134,.4);color:#9fe3c4;background:rgba(47,190,134,.07);}
.ac-chtag.sec{border-color:rgba(110,130,180,.4);color:var(--r-dim);background:transparent;}
.ac-fa{font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:2px 9px;border-radius:999px;border:1px solid rgba(227,145,176,.5);color:#e391b0;}
.ac-shelf{margin-top:16px;}
.ac-shelflink{background:none;border:none;font-size:12.5px;color:var(--r-gold-soft);cursor:pointer;font-family:inherit;
  border-bottom:1px dashed rgba(242,223,166,.4);padding:0 0 1px;}
.ac-shelflink:hover{color:var(--r-gold);}
.ac-sci{margin-top:13px;border-top:1px solid var(--line);padding-top:13px;}
.ac-scisec{margin-bottom:13px;}
.ac-scil{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--r-faint);margin-bottom:4px;}
.ac-sci p{margin:0;font-size:13px;line-height:1.6;color:#dbe2f4;white-space:pre-wrap;}
.ac-scinone{color:var(--r-faint);font-style:italic;}
`
