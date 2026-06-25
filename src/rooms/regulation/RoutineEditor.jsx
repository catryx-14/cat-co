import { useState, useEffect, useRef, useMemo } from 'react'
import {
  loadRoutine, loadAllTools, updateRoutineMeta, updateFace,
  addDose, updateDose, deleteDose,
  addIngredient, deleteIngredient,
  buildFace, deleteFace, deleteRoutine, nextSortOrder,
  BANDS, BAND_LABEL, BAND_COLOR, BAND_DEEP, MARKER_GLYPH,
} from './lib/regulationDb.js'

const SECTIONS = [
  ['what it is', 'what_it_is', 'a warm sentence about what this actually is'],
  ['how to use it', 'how_to_use', 'gentle steps — including the don’ts, in your own words'],
  ['what counts', 'what_counts', 'the floor — the smallest version that still counts'],
  ['stop if', 'stop_if', 'the exit — when it starts costing more than it gives'],
  ['why it helps', 'why_it_helps', 'the reassurance, so future-you trusts it'],
]
const MARKERS = ['do', 'dont', 'tool', 'coreg']

export default function RoutineEditor({ routineId, initialBand, onDone, onDeleted }) {
  const [routine, setRoutine] = useState(null)
  const [tools, setTools] = useState([])
  const [band, setBand] = useState(initialBand || 'green')
  const [addOpen, setAddOpen] = useState(false)
  const [addText, setAddText] = useState('')
  const [addMarker, setAddMarker] = useState('do')
  const [saved, setSaved] = useState('')
  const savedTimer = useRef(null)

  useEffect(() => {
    loadRoutine(routineId).then(setRoutine).catch(err => console.error('[Regulation] editor load failed', err))
    loadAllTools().then(setTools).catch(err => console.error('[Regulation] load tools failed', err))
  }, [routineId])

  useEffect(() => () => clearTimeout(savedTimer.current), [])

  function flashSaved(msg = 'saved ✓') {
    setSaved(msg)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(''), 1500)
  }

  // ── Immutable local updaters ──────────────────────────────────────────────
  const patchFaceLocal = (b, patch) => setRoutine(r => ({
    ...r, facesByBand: { ...r.facesByBand, [b]: { ...r.facesByBand[b], ...patch } },
  }))
  const patchDoseLocal = (b, doseId, patch) => setRoutine(r => {
    const f = r.facesByBand[b]
    const doses = f.doses.map(d => d.id === doseId ? { ...d, ...patch } : d)
    return { ...r, facesByBand: { ...r.facesByBand, [b]: { ...f, doses } } }
  })

  const matches = useMemo(() => {
    const q = addText.trim().toLowerCase()
    if (!q) return []
    return tools.filter(t => t.name.toLowerCase().includes(q)).slice(0, 7)
  }, [addText, tools])

  if (!routine) return <div className="reg-loading">…</div>

  const face = routine.facesByBand[band]
  const bandVars = { '--rb': BAND_COLOR[band], '--rb-deep': BAND_DEEP[band] }
  const isPurple = band === 'purple'
  const builtBands = BANDS.filter(b => routine.facesByBand[b]?.id)

  // ── Routine name / subtitle ───────────────────────────────────────────────
  const saveMeta = async (field, value) => {
    try { await updateRoutineMeta(routine.id, { [field]: value || null }); flashSaved() }
    catch (err) { console.error('[Regulation] save meta failed', err) }
  }

  // ── Lazy persistence: a "built" face that hasn't been saved is a draft ─────
  // (id === null). The row is only written the first time real content lands.
  const startDraft = () => {
    setRoutine(r => ({
      ...r,
      facesByBand: {
        ...r.facesByBand,
        [band]: {
          band, id: null, draft: true, built: false,
          label: BAND_LABEL[band],
          what_it_is: '', how_to_use: '', what_counts: '', stop_if: '', why_it_helps: '', dose_note: '',
          ingredients: [], doses: [],
        },
      },
    }))
  }
  const discardDraft = (b = band) => {
    setRoutine(r => {
      const fb = { ...r.facesByBand }; delete fb[b]; return { ...r, facesByBand: fb }
    })
  }
  // Ensure the current face exists as a real row; returns the persisted face.
  const ensureFace = async (b) => {
    const f = routine.facesByBand[b]
    if (f?.id) return f
    const real = await buildFace(routine.id, b, {
      label: f.label, what_it_is: f.what_it_is, how_to_use: f.how_to_use,
      what_counts: f.what_counts, stop_if: f.stop_if, why_it_helps: f.why_it_helps, dose_note: f.dose_note,
    })
    setRoutine(r => ({ ...r, facesByBand: { ...r.facesByBand, [b]: { ...real } } }))
    flashSaved('built ✓')
    return real
  }

  // ── Face text (sections, label, dose_note) — persists the draft on first edit ─
  const saveFace = async (field, value) => {
    const f = routine.facesByBand[band]
    if (!f) return
    try {
      if (!f.id) { await ensureFace(band); return }   // draft: ensureFace writes all current fields
      await updateFace(f.id, { [field]: value }); flashSaved()
    } catch (err) { console.error('[Regulation] save face failed', err) }
  }

  // ── Ingredients ───────────────────────────────────────────────────────────
  const commitIngredient = async ({ label, tool_id, is_personal }) => {
    if (!label) return
    try {
      const f = await ensureFace(band)
      const sort_order = nextSortOrder(f.ingredients || [])
      const ing = await addIngredient(f.id, { label, marker: addMarker, tier: 'mine', is_personal, tool_id, sort_order })
      setRoutine(r => {
        const fc = r.facesByBand[band]
        return { ...r, facesByBand: { ...r.facesByBand, [band]: { ...fc, ingredients: [...(fc.ingredients || []), ing] } } }
      })
      setAddText(''); setAddOpen(false); setAddMarker('do'); flashSaved()
    } catch (err) { console.error('[Regulation] add ingredient failed', err) }
  }
  const removeIngredient = async (ing) => {
    try {
      await deleteIngredient(ing.id)
      patchFaceLocal(band, { ingredients: face.ingredients.filter(i => i.id !== ing.id) })
      flashSaved('removed')
    } catch (err) { console.error('[Regulation] remove ingredient failed', err) }
  }

  // ── Doses ─────────────────────────────────────────────────────────────────
  const addVersion = async () => {
    try {
      const f = await ensureFace(band)
      const sort_order = nextSortOrder(f.doses || [])
      const dose = await addDose(f.id, { name: 'a fuller version', points_today: null, points_recovery: null, sort_order })
      setRoutine(r => {
        const fc = r.facesByBand[band]
        return { ...r, facesByBand: { ...r.facesByBand, [band]: { ...fc, doses: [...(fc.doses || []), dose] } } }
      })
      flashSaved()
    } catch (err) { console.error('[Regulation] add dose failed', err) }
  }
  const removeVersion = async (dose) => {
    try {
      await deleteDose(dose.id)
      patchFaceLocal(band, { doses: face.doses.filter(d => d.id !== dose.id) })
      flashSaved('removed')
    } catch (err) { console.error('[Regulation] remove dose failed', err) }
  }
  const saveDose = async (doseId, field, value) => {
    try { await updateDose(doseId, { [field]: value }); flashSaved() }
    catch (err) { console.error('[Regulation] save dose failed', err) }
  }
  const parseInt0 = (v) => {
    if (v === '' || v == null) return null
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }

  // ── Delete a single face, or the whole routine ────────────────────────────
  const removeFace = async () => {
    const f = routine.facesByBand[band]
    if (!f) return
    if (!f.id) { discardDraft(); setBand(builtBands[0] || 'green'); return }   // unsaved draft → just discard
    if (!window.confirm(`Delete the ${BAND_LABEL[band]} face? Its words, doses, and ingredients go with it.`)) return
    try {
      await deleteFace(f.id)
      const remaining = builtBands.filter(b => b !== band)
      discardDraft(band)
      setBand(remaining[0] || 'green')
      flashSaved('face deleted')
    } catch (err) { console.error('[Regulation] delete face failed', err) }
  }
  const removeRoutine = async () => {
    if (!window.confirm(`Delete “${routine.name}” for good? This removes all of its faces, doses, and ingredients.`)) return
    try { await deleteRoutine(routine.id); onDeleted() }
    catch (err) { console.error('[Regulation] delete routine failed', err) }
  }

  const isDraft = !!face && !face.id

  return (
    <div style={bandVars}>
      <button className="reg-back" onClick={onDone}>‹ back to the card</button>

      <div className="ed-name">
        <input
          value={routine.name}
          onChange={e => setRoutine(r => ({ ...r, name: e.target.value }))}
          onBlur={e => saveMeta('name', e.target.value.trim())}
        />
      </div>
      <div className="ed-sub">
        <input
          placeholder="a short subtitle (optional)…"
          value={routine.subtitle || ''}
          onChange={e => setRoutine(r => ({ ...r, subtitle: e.target.value }))}
          onBlur={e => saveMeta('subtitle', e.target.value.trim())}
        />
      </div>
      <div className="ed-tag">tap any field to edit · nothing here is required · it saves as you go</div>

      <div className="facetabs">
        {BANDS.map(b => {
          const f = routine.facesByBand[b]
          const persisted = !!f?.id
          const drafting = !!f && !f.id
          const on = b === band
          const status = persisted ? 'built' : drafting ? 'building…' : 'not built yet'
          return (
            <div
              key={b}
              className={`ftab ${on ? 'on' : ''} ${(persisted || drafting) ? '' : 'seed'}`}
              style={on ? { background: BAND_COLOR[b] } : undefined}
              onClick={() => setBand(b)}
            >
              {BAND_LABEL[b]}
              <span className="st">{status}</span>
            </div>
          )
        })}
      </div>

      {!face ? (
        <div className="panel seedpanel">
          <div className="icn">🌱</div>
          <h3>the {BAND_LABEL[band]} version isn’t built yet</h3>
          <p>Empty faces aren’t blank — they’re seeds. Start building it now, or leave it for when you’re standing in that band. Nothing saves until you actually write something.</p>
          <button className="startbtn" onClick={startDraft}>build the {BAND_LABEL[band]} version</button>
        </div>
      ) : (
        <div className="panel">
          <div className="bandhdr">
            <div className="bl">{BAND_LABEL[band]} face{isDraft ? ' · not saved yet' : ''}</div>
            <div className="nm">the words future-you will read</div>
          </div>

          <div className="eseg">
            <div className="l">band label <span className="hint">how this face is titled</span></div>
            <input
              className="line"
              value={face.label || ''}
              placeholder={BAND_LABEL[band]}
              onChange={e => patchFaceLocal(band, { label: e.target.value })}
              onBlur={e => saveFace('label', e.target.value)}
            />
          </div>

          {SECTIONS.map(([label, key, hint]) => (
            <div className="eseg" key={key}>
              <div className="l">{label} <span className="hint">{hint}</span></div>
              <textarea
                value={face[key] || ''}
                placeholder={`${hint}…`}
                onChange={e => patchFaceLocal(band, { [key]: e.target.value })}
                onBlur={e => saveFace(key, e.target.value)}
              />
            </div>
          ))}

          <div className="ilab">what’s in it</div>
          <div className="chips">
            {(face.ingredients || []).map(ing => (
              <span key={ing.id} className={`chip ${ing.marker}`}>
                <span className="mk">{MARKER_GLYPH[ing.marker] || '+'}</span>
                {ing.label}
                {ing.tool_id != null && <span className="arrow" title="linked to its card">◆</span>}
                <span className="rm" style={{ cursor: 'pointer' }} onClick={() => removeIngredient(ing)}>×</span>
              </span>
            ))}
            {!addOpen && (
              <span className="chip add" onClick={() => setAddOpen(true)}>+ add ingredient</span>
            )}
          </div>

          {addOpen && (
            <div className="addpanel">
              <div className="markpick">
                reads as:
                {MARKERS.map(m => (
                  <button
                    key={m}
                    className={`markbtn ${m} ${addMarker === m ? 'on' : ''}`}
                    title={m === 'do' ? 'a do' : m === 'dont' ? 'a don’t / shield' : m === 'tool' ? 'a tool' : 'co-regulation'}
                    onClick={() => setAddMarker(m)}
                  >{MARKER_GLYPH[m]}</button>
                ))}
              </div>
              <div className="addrow">
                <input
                  autoFocus
                  value={addText}
                  placeholder="search your cards, or type your own…"
                  onChange={e => setAddText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && addText.trim()) commitIngredient({ label: addText.trim(), tool_id: null, is_personal: true })
                    if (e.key === 'Escape') { setAddOpen(false); setAddText('') }
                  }}
                />
              </div>
              {matches.length > 0 && (
                <div className="toolmatches">
                  {matches.map(t => (
                    <button key={t.id} className="toolmatch" onClick={() => commitIngredient({ label: t.name, tool_id: t.id, is_personal: false })}>
                      <span className="tm">{MARKER_GLYPH[addMarker]}</span>{t.name}<span className="tg">link its card ›</span>
                    </button>
                  ))}
                </div>
              )}
              {addText.trim() && (
                <button className="freetext" onClick={() => commitIngredient({ label: addText.trim(), tool_id: null, is_personal: true })}>
                  + add “{addText.trim()}” as my own words
                </button>
              )}
            </div>
          )}

          <div className="doslab">
            <span>dose versions</span>
            <span className="hint">full is the cap</span>
          </div>
          {(face.doses || []).map(dose => (
            <div className="dvrow" key={dose.id}>
              <input
                className="nm"
                value={dose.name}
                onChange={e => patchDoseLocal(band, dose.id, { name: e.target.value })}
                onBlur={e => saveDose(dose.id, 'name', e.target.value.trim() || 'a version')}
              />
              <div className="num">
                <input
                  inputMode="numeric"
                  value={dose.points_today ?? ''}
                  onChange={e => patchDoseLocal(band, dose.id, { points_today: parseInt0(e.target.value) })}
                  onBlur={e => saveDose(dose.id, 'points_today', parseInt0(e.target.value))}
                />
                <span className="nl">today</span>
              </div>
              {isPurple && (
                <div className="num">
                  <input
                    inputMode="numeric"
                    value={dose.points_recovery ?? ''}
                    onChange={e => patchDoseLocal(band, dose.id, { points_recovery: parseInt0(e.target.value) })}
                    onBlur={e => saveDose(dose.id, 'points_recovery', parseInt0(e.target.value))}
                  />
                  <span className="nl">recovery</span>
                </div>
              )}
              {face.doses.length > 1 && (
                <button className="rm" title="remove this version" onClick={() => removeVersion(dose)}>×</button>
              )}
            </div>
          ))}
          {!isDraft && (
            <button className="addv" onClick={addVersion}>+ add a version (e.g. a lighter one)</button>
          )}

          <div className="eseg" style={{ marginTop: 18 }}>
            <div className="l">dose note <span className="hint">what tells the versions apart</span></div>
            <input
              className="line"
              value={face.dose_note || ''}
              placeholder="e.g. versions vary by how long the sit is…"
              onChange={e => patchFaceLocal(band, { dose_note: e.target.value })}
              onBlur={e => saveFace('dose_note', e.target.value)}
            />
          </div>

          {isDraft ? (
            <button className="delface" onClick={removeFace}>discard this unsaved face</button>
          ) : builtBands.length > 1 ? (
            <button className="delface" onClick={removeFace}>delete this {BAND_LABEL[band]} face</button>
          ) : null}
        </div>
      )}

      <div className="savemark">{saved}</div>

      <div className="ed-actions">
        <button className="donebtn" onClick={onDone}>done — back to the card</button>
        <button className="delbtn" onClick={removeRoutine}>delete routine</button>
      </div>

      <div className="foot">this is the calm Library editor — off the daily screen. the skeleton works as-is; fleshing it out just adds warmth and reach.</div>
    </div>
  )
}
