import { useState, useEffect } from 'react'
import {
  loadRoutine, loadTool,
  BANDS, BAND_LABEL, BAND_COLOR, BAND_DEEP, MARKER_GLYPH,
} from './lib/regulationDb.js'

const SECTIONS = [
  ['what it is', 'what_it_is'],
  ['how to use it', 'how_to_use'],
  ['what counts', 'what_counts'],
  ['stop if', 'stop_if'],
  ['why it helps', 'why_it_helps'],
]
const TIERS = [
  ['core', 'core — the spine', ''],
  ['optional', 'optional', '— take or leave, or try something you haven’t'],
  ['mine', 'mine', ''],
]
const KIND_LABEL = { do: 'do', dont: 'don’t — a shield move', tool: 'tool', coreg: 'co-regulation' }

// The ingredient science drill-down — only opens for chips with a tool_id.
function ScienceOverlay({ ingredient, onClose }) {
  const [tool, setTool] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    loadTool(ingredient.tool_id)
      .then(t => { if (live) { setTool(t); setLoading(false) } })
      .catch(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [ingredient.tool_id])

  const kindColor = {
    do: 'var(--rb)', dont: '#d9b8ec', tool: '#cfe0ff', coreg: '#ffd9b0',
  }[ingredient.marker] || 'var(--r-dim)'

  return (
    <div className="ov" onClick={e => { if (e.target.classList.contains('ov')) onClose() }}>
      <div className="sci">
        <button className="x" onClick={onClose}>×</button>
        <div className="kind" style={{ color: kindColor }}>{KIND_LABEL[ingredient.marker] || ''}</div>
        <h2>{tool?.name || ingredient.label}</h2>
        {loading ? (
          <p className="none">…</p>
        ) : tool ? (
          <>
            {tool.description && <p className="desc">{tool.description}</p>}
            {tool.how_to_use && <><div className="lab">how to use it</div><p>{tool.how_to_use}</p></>}
            {tool.the_science && <><div className="lab">the science</div><p>{tool.the_science}</p></>}
            {!tool.description && !tool.how_to_use && !tool.the_science && (
              <p className="none">this card doesn’t have its write-up yet.</p>
            )}
          </>
        ) : (
          <p className="none">this card is still coming.</p>
        )}
      </div>
    </div>
  )
}

// `flat` — routines are single flat-valued anchors now (the three faces are
// retired, id=145). In the tracker logging flow we pass flat so the green/yellow/
// purple face PICKER is not surfaced; the card just reads as the one anchor.
export default function RoutineCard({ routineId, onBack, onEdit, backLabel = '‹ all routines', flat = false }) {
  const [routine, setRoutine] = useState(null)
  const [band, setBand] = useState(null)
  const [sci, setSci] = useState(null)

  useEffect(() => {
    let live = true
    loadRoutine(routineId).then(r => {
      if (!live) return
      setRoutine(r)
      const built = BANDS.filter(b => r.facesByBand[b]?.built)
      setBand(built.includes('green') ? 'green' : (built[0] || 'green'))
    }).catch(err => console.error('[Regulation] failed to load routine', err))
    return () => { live = false }
  }, [routineId])

  if (!routine) return <div className="reg-loading">…</div>

  const face = band ? routine.facesByBand[band] : null
  const bandVars = { '--rb': BAND_COLOR[band], '--rb-deep': BAND_DEEP[band] }

  const ingredientsByTier = (tier) => (face?.ingredients || []).filter(i => i.tier === tier)

  return (
    <div style={bandVars}>
      <button className="reg-back" onClick={onBack}>{backLabel}</button>

      {!flat && (
        <div className="bands">
          {BANDS.map(b => {
            const exists = !!routine.facesByBand[b]?.built
            const on = b === band
            return (
              <button
                key={b}
                className={`bandpill ${on ? 'on' : ''} ${exists ? '' : 'absent'}`}
                style={on ? { background: BAND_COLOR[b] } : undefined}
                onClick={() => exists && setBand(b)}
              >
                {BAND_LABEL[b]}
              </button>
            )
          })}
        </div>
      )}

      {!face ? (
        <div className="card"><div className="cardbody">
          <p className="reg-lede">this band isn’t built yet. open the editor to grow it.</p>
        </div></div>
      ) : (
        <div className="card">
          <div className="headband">
            {!flat && <div className="bl">{face.label || BAND_LABEL[band]}</div>}
            <h1>{routine.name}</h1>
            {routine.subtitle && <div className="sub">{routine.subtitle}</div>}
          </div>
          <div className="cardbody">
            <div className="anat">
              {SECTIONS.map(([label, key]) => (
                <div className="seg" key={key}>
                  <div className="l">{label}</div>
                  {face[key]
                    ? <p>{face[key]}</p>
                    : <p className="empty">— not written yet —</p>}
                </div>
              ))}
            </div>

            <div className="rule" />
            <div className="seclab">what’s in it · tap any with a ◆ for the why</div>
            {TIERS.map(([tier, label, hint]) => {
              const items = ingredientsByTier(tier)
              if (tier === 'mine' && items.length === 0) return null
              return (
                <div className="tier" key={tier}>
                  <div className="tierlab">{label} {hint && <span className="hint">{hint}</span>}</div>
                  {items.length === 0 ? (
                    <div className="tier-empty">none yet</div>
                  ) : (
                    <div className="chips">
                      {items.map(ing => {
                        const tappable = ing.tool_id != null
                        const optional = tier !== 'core'
                        return (
                          <button
                            key={ing.id}
                            className={`chip ${ing.marker} ${optional ? 'opt' : ''} ${tappable ? 'tap' : ''}`}
                            onClick={() => tappable && setSci(ing)}
                          >
                            <span className="mk">{MARKER_GLYPH[ing.marker] || '+'}</span>
                            {ing.label}
                            {tappable && <span className="arrow">›</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="rule" />
            <div className="seclab">how much · the version that was your time</div>
            <div className="doses">
              {(face.doses || []).map(d => {
                const hasSplit = d.points_recovery != null
                const total = (d.points_today ?? 0) + (hasSplit ? d.points_recovery : 0)
                return (
                  <div className="dose" key={d.id}>
                    <div className="dn">{d.name}</div>
                    {d.points_today == null && !hasSplit ? (
                      <div className="pts"><span className="blank">—</span><span className="u">points</span></div>
                    ) : hasSplit ? (
                      <>
                        <div className="pts">{total}<span className="u">points</span></div>
                        <div className="split"><b>{d.points_today ?? 0}</b> today · <b>{d.points_recovery}</b> recovery</div>
                      </>
                    ) : (
                      <div className="pts">{d.points_today}<span className="u">points</span></div>
                    )}
                  </div>
                )
              })}
            </div>
            {face.dose_note && <div className="dosenote">{face.dose_note}</div>}
            <div className="capnote">full is the cap — more isn’t better. PT, not a scoreboard.</div>

            {onEdit && (
              <div className="editrow">
                <button className="editbtn" onClick={() => onEdit(band)}>
                  {flat ? 'edit this routine' : `edit this ${BAND_LABEL[band]} face`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="foot">red has no routines: red is a crisis day, and that’s First Aid’s.</div>

      {sci && <ScienceOverlay ingredient={sci} onClose={() => setSci(null)} />}
    </div>
  )
}
