/**
 * TrackerV2Room — Cat's capacity tracker, backed by energy_events + energy_daily.
 */

import { useState, useEffect, useMemo } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import TrackerHistory from './TrackerHistory.jsx'
import { supabase } from '../../shared/lib/supabase.js'
import {
  loadAllEntriesV2,
  saveEntryV2,
  recalculateFromDateV2,
  backfillMissedDays,
  dbToInternal,
  internalToDb,
} from '../../shared/lib/db-v2.js'
import { seedEntry, loadSeededEventIds } from '../lost-found/lib/lostFoundDb.js'
import { saveThresholds, saveTaxValue, savePurpleFloors } from '../../shared/lib/db.js'
import { todayDateStr, todayDisplayStr } from '../../shared/lib/dates.js'
import { computeDisplayValues, taxActive, resolveOpeningBalance, DEFAULT_AUTISTIC_TAX, bandOf, bandColor, getPurpleState } from '../../shared/lib/math.js'
import RegulationGrid from './RegulationGrid.jsx'
import {
  loadRegulationLog, addRoutineLog, addActionLog, deleteRegLogRow, sumRegLog,
  splitDayRows, persistDaySplit,
} from '../../shared/lib/regulationLog.js'

// ── Constants (identical to TrackerRoom) ──────────────────────────────────────

const AXIS_DEFS = [
  { k: 'E', name: 'emotional',      meaning: 'how strong was the emotional charge of this event?' },
  { k: 'S', name: 'sensory',        meaning: 'how loud was the sensory load — sound, light, touch, demand on the body?' },
  { k: 'P', name: 'predictability', meaning: 'did things go as expected? did people, systems, or situations behave the way they should?' },
  { k: 'M', name: 'masking',        meaning: 'the cost of performing a version of yourself that isn\'t what\'s actually happening — managing a social situation while something else is going on inside' },
  { k: 'X', name: 'EF',             meaning: 'how much executive function did this cost — planning, switching, holding it together?' },
]

const REG_CHANNELS = [
  { k: 'sensory', name: 'sensory comfort', cap: 4 },
  { k: 'av',      name: 'audio / visual',  cap: 5 },
  { k: 'env',     name: 'environment',     cap: 6 },
  { k: 'body',    name: 'body / rest',     cap: 5 },
]

const WARNING_SIGNS = [
  { k: 'skin',    name: 'skin reactions',    glyph: '•' },
  { k: 'vision',  name: 'vision reactions',  glyph: '◦' },
  { k: 'thought', name: 'thought reactions', glyph: '◊' },
  { k: 'other',   name: 'other',             glyph: '×' },
]

const GOOD_SIGNS = [
  { k: 'flow',   name: 'flow activity',   glyph: '~' },
  { k: 'crisis', name: 'crisis recovery', glyph: '△' },
]

const BUCKETS = ['late night', 'morning', 'midday', 'afternoon', 'evening', 'night']

function nowBucket() {
  const h = new Date().getHours()
  if (h < 5)  return 'late night'
  if (h < 11) return 'morning'
  if (h < 14) return 'midday'
  if (h < 18) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

function formatDateStr(dateStr) {
  const [y, mo, day] = dateStr.split('-').map(Number)
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][mo - 1]
  return `${y} · ${m} · ${String(day).padStart(2, '0')}`
}

// ─── AxisLabel ───
function AxisLabel({ axisKey, className }) {
  const [open, setOpen] = useState(false)
  const def = AXIS_DEFS.find(a => a.k === axisKey)
  return (
    <button type="button"
            className={`axis-label ${className || ''}`}
            onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
      {axisKey}
      {open && (
        <span className="axis-tip" onClick={e => e.stopPropagation()}>
          <b>{def.name}</b>
          <span>{def.meaning}</span>
          <i className="dismiss" onClick={() => setOpen(false)}>tap to dismiss</i>
        </span>
      )}
    </button>
  )
}

// ─── EventRow ───
function EventRow({ e, onUpdate, onDelete, seededIds, onSeed }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(e)
  useEffect(() => setDraft(e), [e])

  if (e.system) {
    const axes = AXIS_DEFS.map(d => ({ ...d, val: e[d.k] }))
    const anyLit = axes.some(a => a.val > 0)
    return (
      <div className="event system" title="system entry — controlled by flow state">
        <div className="event-time">{e.bucket}</div>
        <div className="event-body">
          <div className={`event-text ${e.cancelled ? 'cancelled' : ''}`}>
            {e.text}
            <span className="event-tag system-tag">~ daily</span>
          </div>
          {anyLit && !e.cancelled && (
            <div className="event-axes">
              {axes.map(a => (
                <div key={a.k} className={`axis axis-${a.k} ${a.val > 0 ? 'lit' : ''}`}>
                  <AxisLabel axisKey={a.k} />
                  <span className="pips">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} className={`pip ${i < a.val ? 'on' : ''}`} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (editing) {
    const setAxis = (k, v) => setDraft(d => ({ ...d, [k]: d[k] === v ? 0 : v }))
    const save = () => { onUpdate(draft); setEditing(false) }
    const cancel = () => { setDraft(e); setEditing(false) }
    return (
      <div className="event editing">
        <div className="event-time">
          <select value={draft.bucket} onChange={ev => setDraft(d => ({ ...d, bucket: ev.target.value }))}>
            {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="event-body">
          <textarea
            className="event-edit-input"
            value={draft.text}
            onChange={ev => setDraft(d => ({ ...d, text: ev.target.value }))}
            rows={2}
            autoFocus
          />
          <div className="event-axes">
            {AXIS_DEFS.map(a => (
              <div key={a.k} className={`axis axis-${a.k} ${draft[a.k] > 0 ? 'lit' : ''}`}>
                <AxisLabel axisKey={a.k} />
                <span className="pips">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i}
                          className={`pip editable ${i < draft[a.k] ? 'on' : ''}`}
                          onClick={() => setAxis(a.k, i + 1)} />
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div className="event-edit-meta">
            <label><input type="checkbox" checked={draft.flow} onChange={ev => setDraft(d => ({ ...d, flow: ev.target.checked }))} />flow</label>
            <label><input type="checkbox" checked={draft.delayed} onChange={ev => setDraft(d => ({ ...d, delayed: ev.target.checked }))} />delayed</label>
            <label><input type="checkbox" checked={draft.cancelled} onChange={ev => setDraft(d => ({ ...d, cancelled: ev.target.checked }))} />cancelled</label>
            <span className="event-si-wrap">
              <span className="event-si-label">SI flow</span>
              <span className="event-si-btns">
                {['present', 'pulled'].map(opt => (
                  <button key={opt}
                    className={`event-si-btn ${draft.siFlow === opt ? 'active' : ''}`}
                    onClick={() => setDraft(d => {
                      const next = d.siFlow === opt ? null : opt
                      return { ...d, siFlow: next, flow: next != null ? true : d.flow }
                    })}>
                    {opt}
                  </button>
                ))}
              </span>
            </span>
            <button className="event-edit-btn delete" onClick={() => { if (window.confirm('delete this event?')) onDelete(e.id) }}>delete</button>
            <button className="event-edit-btn cancel" onClick={cancel}>cancel</button>
            <button className="event-edit-btn save" onClick={save}>save</button>
          </div>
        </div>
      </div>
    )
  }

  const axes = AXIS_DEFS.map(d => ({ ...d, val: e[d.k] }))
  const anyLit = axes.some(a => a.val > 0)
  return (
    <div className="event" onClick={() => setEditing(true)} title="click to edit">
      <div className="event-time">{e.bucket}</div>
      <div className="event-body">
        <div className={`event-text ${e.cancelled ? 'cancelled' : ''}`}>
          {e.text}
          {e.flow && <span className="event-tag flow">~ flow</span>}
          {e.delayed && <span className="event-tag">~ delayed</span>}
          {e.siFlow && <span className="event-tag si-flow">⟳ SI {e.siFlow}</span>}
          <span className="event-edit-hint">edit</span>
        </div>
        {anyLit && (
          <div className="event-axes" onClick={ev => ev.stopPropagation()}>
            {axes.map(a => (
              <div key={a.k} className={`axis axis-${a.k} ${a.val > 0 ? 'lit' : ''}`}>
                <AxisLabel axisKey={a.k} />
                <span className="pips">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} className={`pip ${i < a.val ? 'on' : ''}`} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
        {e.E > 0 && e._v2id && (
          <div style={{ marginTop: 6 }} onClick={ev => ev.stopPropagation()}>
            {seededIds?.has(e._v2id)
              ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>in Lost + Found</span>
              : <button
                  onClick={() => onSeed?.(e._v2id, e.text)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 11, color: 'var(--color-accent-primary)', fontFamily: 'inherit',
                  }}
                >lay it down →</button>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Composer ───
function Composer({ onAdd }) {
  const [text, setText] = useState('')
  const [axes, setAxes] = useState({ E: 0, S: 0, P: 0, M: 0, X: 0 })
  const [delayed, setDelayed] = useState(false)
  const [flow, setFlow] = useState(false)
  const [siFlow, setSiFlow] = useState(null)
  const [bucket, setBucket] = useState(nowBucket())

  const set = (k, v) => setAxes(a => ({ ...a, [k]: a[k] === v ? 0 : v }))
  function reset() {
    setText(''); setAxes({ E: 0, S: 0, P: 0, M: 0, X: 0 })
    setDelayed(false); setFlow(false); setSiFlow(null); setBucket(nowBucket())
  }
  function save() {
    if (!text.trim()) return
    onAdd({ id: 'e' + Date.now(), bucket, text: text.trim(), ...axes, delayed, flow, siFlow, cancelled: false })
    reset()
  }
  function onKey(ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); save() }
  }

  return (
    <div className="composer">
      <textarea
        className="composer-input"
        placeholder="something happened…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={1}
      />
      <div className="composer-axes">
        {AXIS_DEFS.map(({ k }) => (
          <div key={k} className={`composer-axis axis-${k} ${axes[k] > 0 ? 'lit' : ''}`}>
            <AxisLabel axisKey={k} className="name" />
            <span className="pips">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i}
                      className={`pip ${i < axes[k] ? 'on' : ''}`}
                      onClick={() => set(k, i + 1)} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="composer-meta">
        <label className="bucket-pick">
          <span>when</span>
          <select value={bucket} onChange={e => setBucket(e.target.value)}>
            {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={delayed} onChange={e => setDelayed(e.target.checked)} />delayed reaction</label>
        <label><input type="checkbox" checked={flow} onChange={e => setFlow(e.target.checked)} />flow state</label>
        <span className="event-si-wrap">
          <span className="event-si-label">SI flow</span>
          <span className="event-si-btns">
            {['present', 'pulled'].map(opt => (
              <button key={opt}
                className={`event-si-btn ${siFlow === opt ? 'active' : ''}`}
                onClick={() => {
                  const next = siFlow === opt ? null : opt
                  setSiFlow(next)
                  if (next != null) setFlow(true)
                }}>
                {opt}
              </button>
            ))}
          </span>
        </span>
        <button className="save" onClick={save}>save</button>
      </div>
    </div>
  )
}

// ─── useRegLog — load + mutate a day's regulation_log rows ───
// Each mutation writes the row, updates local state for an instant ring redraw,
// then calls onAfterChange(nextRows) so the editor can re-save the day's closing
// balance (which now depends on the log total) and carry it forward.
function useRegLog(userId, dateStr, onAfterChange) {
  const [rows, setRows]     = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    setLoaded(false)
    loadRegulationLog(userId, dateStr)
      .then(r => { if (alive) { setRows(r); setLoaded(true) } })
      .catch(err => { console.error('failed to load regulation log', err); if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [userId, dateStr])

  async function addRoutine(slot, routine) {
    const inserted = await addRoutineLog({ userId, dateStr, slot, routine })
    const next = [...rows.filter(r => !(r.kind === 'routine' && r.slot === slot)), inserted]
    setRows(next)
    await onAfterChange?.(next)
  }
  async function addAction(action) {
    const maxSort = rows.filter(r => r.kind === 'action').reduce((m, r) => Math.max(m, r.sort_order ?? 0), 1)
    const inserted = await addActionLog({ userId, dateStr, action, sortOrder: maxSort + 1 })
    const next = [...rows, inserted]
    setRows(next)
    await onAfterChange?.(next)
  }
  async function removeRow(row) {
    await deleteRegLogRow(row.id)
    const next = rows.filter(r => r.id !== row.id)
    setRows(next)
    await onAfterChange?.(next)
  }

  return {
    rows, loaded, total: sumRegLog(rows), hasRows: rows.length > 0,
    addRoutine, addAction, removeRow,
    // Let the editor write back the recomputed waterline split so the ring + the
    // recovery collection redraw without a reload.
    applyRows: setRows,
  }
}

// ─── OldPipReadout — read-only view of an older day's retired pip regulation ───
// Older days logged with the four pip channels keep their number, untouched.
function OldPipReadout({ values }) {
  const total = (values.sensory || 0) + (values.av || 0) + (values.env || 0) + (values.body || 0)
  return (
    <div style={{ border: '1px dashed #2b3a60', borderRadius: 12, padding: '13px 15px', background: 'rgba(20,29,54,.25)' }}>
      <div style={{ fontStyle: 'italic', color: '#9aa6c6', fontSize: 13, marginBottom: 7 }}>
        logged the old way · {total} regulation {total === 1 ? 'point' : 'points'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: '#65718f' }}>
        {REG_CHANNELS.map(c => (
          <span key={c.k}>{c.name} {values[c.k] || 0}/{c.cap}</span>
        ))}
      </div>
    </div>
  )
}

// ─── RegulationSection — recovery toggle + the grid (or old read-out) + good signs ───
// The four pip channels retired; the daily grid takes their place. recovery-sleep
// and the flow / crisis good-signs stay exactly as they were.
function RegulationSection({ recovery, onRecovery, goodSigns, onGood, regLog, oldPip, onEditAction, isPurple = false, readOnly = false }) {
  return (
    <section className="reg-section">
      <div className="ledger-head">
        <div className="ledger-title">regulation</div>
        <label className="recovery-toggle">
          <input type="checkbox" checked={recovery} onChange={e => onRecovery(e.target.checked)} />
          <span>recovery sleep <i>(beyond regular sleep)</i></span>
        </label>
      </div>
      {oldPip
        ? <OldPipReadout values={oldPip} />
        : <RegulationGrid
            rows={regLog.rows}
            onAddRoutine={regLog.addRoutine}
            onAddAction={regLog.addAction}
            onRemove={regLog.removeRow}
            onEditAction={onEditAction}
            isPurple={isPurple}
            readOnly={readOnly}
          />}
      <div className="good-signs-row">
        {GOOD_SIGNS.map(s => (
          <button key={s.k}
                  className={`signal good-signal ${goodSigns[s.k] ? 'lit' : ''}`}
                  onClick={() => onGood(s.k)}
                  title={s.name}>
            <span className="signal-glyph">{s.glyph}</span>
            <span className="signal-name">{s.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── WarningSigns ───
function WarningSigns({ flags, onToggle }) {
  return (
    <section className="signals-section">
      <div className="ledger-head">
        <div className="ledger-title">warning signs</div>
        <div className="ledger-count">{Object.values(flags).filter(Boolean).length} marked</div>
      </div>
      <div className="signals-row">
        {WARNING_SIGNS.map(s => (
          <button key={s.k}
                  className={`signal ${flags[s.k] ? 'lit' : ''}`}
                  onClick={() => onToggle(s.k)}
                  title={s.name}>
            <span className="signal-glyph">{s.glyph}</span>
            <span className="signal-name">{s.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── MeltdownSection ───
function MeltdownSection({ active, onToggle }) {
  return (
    <section className="signals-section">
      <div className="ledger-head">
        <div className="ledger-title">crisis</div>
      </div>
      <div className="signals-row">
        <button className={`signal ${active ? 'lit' : ''}`} onClick={onToggle}>
          <span className="signal-glyph">▽</span>
          <span className="signal-name">{active ? 'yes' : 'no'}</span>
        </button>
      </div>
    </section>
  )
}

// ─── PurpleOverrideSection ───
function PurpleOverrideSection({ isPurple, override, onChange }) {
  if (!isPurple && override !== 'extend') {
    return (
      <section className="signals-section">
        <div className="ledger-head">
          <div className="ledger-title" style={{ color: 'rgba(168,144,212,0.5)' }}>recovery mode</div>
        </div>
        <div className="purple-override-section">
          <span className="purple-override-label">not active</span>
          <button className={`purple-override-btn ${override === 'extend' ? 'active' : ''}`}
            onClick={() => onChange(override === 'extend' ? null : 'extend')}>
            extend
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className="signals-section">
      <div className="ledger-head">
        <div className="ledger-title" style={{ color: '#A673E4' }}>recovery mode</div>
      </div>
      <div className="purple-override-section">
        <span className="purple-override-label">active</span>
        <button className={`purple-override-btn ${override === 'cancel' ? 'active' : ''}`}
          onClick={() => onChange(override === 'cancel' ? null : 'cancel')}>
          cancel
        </button>
        <button className={`purple-override-btn ${override === 'extend' ? 'active' : ''}`}
          onClick={() => onChange(override === 'extend' ? null : 'extend')}>
          extend
        </button>
      </div>
    </section>
  )
}

// ─── Sky helpers ───────────────────────────────────────────────────────────────

function polarXY(cx, cy, angleDeg, r) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sparklePath(cx, cy, outer, inner) {
  const pts = []
  for (let i = 0; i < 8; i++) {
    const rad = (i * 45 - 90) * Math.PI / 180
    const r = i % 2 === 0 ? outer : inner
    pts.push(`${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`)
  }
  return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z'
}

// Silver ring stops — shared by peak and regulation orbs
const _SILVER_STOPS = [
  { o: '0%',   c: '#18182a' }, { o: '14%',  c: '#50506a' },
  { o: '30%',  c: '#9898b0' }, { o: '48%',  c: '#c8c8dc' },
  { o: '60%',  c: '#e8e8f4' }, { o: '67%',  c: '#ffffff' },
  { o: '76%',  c: '#cccce0' }, { o: '89%',  c: '#606078' },
  { o: '100%', c: '#1c1c2c' },
]

const SKY_COLORS = {
  peak: {
    id: 'sky-silver-peak',
    ringStops: _SILVER_STOPS,
    glowColor: '#e8e8ff', glowDuration: 28,
    barMid: '#b8b8cc', number: '#c8c8dc', star: '#d0d0e8',
  },
  le: {
    id: 'sky-silver-le',
    ringStops: _SILVER_STOPS,
    glowColor: '#ffffff', glowDuration: 38,
    barMid: '#c8c8d8', number: '#e0e0f0', star: '#d8d8ec',
  },
  reg: {
    id: 'sky-silver-reg',
    ringStops: _SILVER_STOPS,
    glowColor: '#e8e8ff', glowDuration: 50,
    barMid: '#b8b8cc', number: '#c8c8dc', star: '#d0d0e8',
  },
}

// Jewel-tone ring stops for the LE orb, keyed by band name
const BAND_RING_STOPS = {
  green: [
    { o: '0%',   c: '#051a10' }, { o: '14%',  c: '#0e5430' },
    { o: '30%',  c: '#178a55' }, { o: '48%',  c: '#22aa6e' },
    { o: '60%',  c: '#2FBE86' }, { o: '67%',  c: '#82e6bf' },
    { o: '76%',  c: '#1fa068' }, { o: '89%',  c: '#0e5a38' },
    { o: '100%', c: '#051a10' },
  ],
  yellow: [
    { o: '0%',   c: '#161002' }, { o: '14%',  c: '#4e3a06' },
    { o: '30%',  c: '#7e5e0e' }, { o: '48%',  c: '#ab8418' },
    { o: '60%',  c: '#D6A520' }, { o: '67%',  c: '#ecca6a' },
    { o: '76%',  c: '#ab8418' }, { o: '89%',  c: '#5e4a0c' },
    { o: '100%', c: '#161002' },
  ],
  orange: [
    { o: '0%',   c: '#1f0c02' }, { o: '14%',  c: '#6a2e06' },
    { o: '30%',  c: '#a84e0e' }, { o: '48%',  c: '#e06c14' },
    { o: '60%',  c: '#FF8419' }, { o: '67%',  c: '#ffb066' },
    { o: '76%',  c: '#e06c14' }, { o: '89%',  c: '#7a3608' },
    { o: '100%', c: '#1f0c02' },
  ],
  red: [
    { o: '0%',   c: '#1c0408' }, { o: '14%',  c: '#5e0e16' },
    { o: '30%',  c: '#9e1824' }, { o: '48%',  c: '#c42030' },
    { o: '60%',  c: '#D8283A' }, { o: '67%',  c: '#f0707c' },
    { o: '76%',  c: '#c42030' }, { o: '89%',  c: '#6e1018' },
    { o: '100%', c: '#1c0408' },
  ],
  purple: [
    { o: '0%',   c: '#110d1e' }, { o: '14%',  c: '#38286a' },
    { o: '30%',  c: '#5c40a8' }, { o: '48%',  c: '#8060cc' },
    { o: '60%',  c: '#A673E4' }, { o: '67%',  c: '#d4b8f4' },
    { o: '76%',  c: '#8860cc' }, { o: '89%',  c: '#482880' },
    { o: '100%', c: '#110d1e' },
  ],
}
const BAND_GLOW_COLOR = {
  green:  '#aaf0d0',
  yellow: '#f0d480',
  orange: '#ffb066',
  red:    '#f08890',
  purple: '#d8b8f8',
}

const PEAK_STARS = [
  { a: 18,  r: 106, sz: 7,   t: 's' }, { a: 52,  r: 98,  sz: 5,   t: 's' },
  { a: 138, r: 104, sz: 6.5, t: 's' }, { a: 195, r: 109, sz: 5.5, t: 's' },
  { a: 262, r: 96,  sz: 7.5, t: 's' }, { a: 305, r: 104, sz: 4.5, t: 's' },
  { a: 344, r: 108, sz: 6,   t: 's' },
  { a: 5,   r: 95,  sz: 2,   t: 'd' }, { a: 35,  r: 113, sz: 1.5, t: 'd' },
  { a: 72,  r: 103, sz: 2,   t: 'd' }, { a: 112, r: 99,  sz: 1.5, t: 'd' },
  { a: 163, r: 115, sz: 2,   t: 'd' }, { a: 228, r: 106, sz: 1.5, t: 'd' },
  { a: 282, r: 113, sz: 2,   t: 'd' }, { a: 332, r: 98,  sz: 1.5, t: 'd' },
]
const LE_STARS = [
  { a: 12,  r: 137, sz: 8.5, t: 's' }, { a: 45,  r: 126, sz: 6,   t: 's' },
  { a: 82,  r: 140, sz: 7.5, t: 's' }, { a: 118, r: 130, sz: 5.5, t: 's' },
  { a: 158, r: 141, sz: 7,   t: 's' }, { a: 205, r: 132, sz: 5,   t: 's' },
  { a: 248, r: 136, sz: 8,   t: 's' }, { a: 292, r: 129, sz: 6,   t: 's' },
  { a: 328, r: 134, sz: 6.5, t: 's' },
  { a: 3,   r: 124, sz: 2,   t: 'd' }, { a: 28,  r: 142, sz: 1.5, t: 'd' },
  { a: 63,  r: 132, sz: 2,   t: 'd' }, { a: 100, r: 146, sz: 1.5, t: 'd' },
  { a: 138, r: 126, sz: 2,   t: 'd' }, { a: 180, r: 136, sz: 1.5, t: 'd' },
  { a: 222, r: 144, sz: 2,   t: 'd' }, { a: 268, r: 124, sz: 1.5, t: 'd' },
  { a: 310, r: 139, sz: 2,   t: 'd' }, { a: 350, r: 131, sz: 1.5, t: 'd' },
]
const REG_STARS = [
  { a: 32,  r: 105, sz: 6.5, t: 's' }, { a: 78,  r: 99,  sz: 5,   t: 's' },
  { a: 122, r: 109, sz: 7.5, t: 's' }, { a: 172, r: 103, sz: 5.5, t: 's' },
  { a: 218, r: 111, sz: 7,   t: 's' }, { a: 268, r: 95,  sz: 4.5, t: 's' },
  { a: 315, r: 106, sz: 6,   t: 's' },
  { a: 15,  r: 99,  sz: 2,   t: 'd' }, { a: 55,  r: 115, sz: 1.5, t: 'd' },
  { a: 100, r: 104, sz: 2,   t: 'd' }, { a: 148, r: 96,  sz: 1.5, t: 'd' },
  { a: 195, r: 114, sz: 2,   t: 'd' }, { a: 245, r: 105, sz: 1.5, t: 'd' },
  { a: 292, r: 111, sz: 2,   t: 'd' }, { a: 340, r: 101, sz: 1.5, t: 'd' },
]

const PEAK_MOB_STARS = [
  { x: 9,  y: 6,  sz: 5,   t: 's', op: 0.72 }, { x: 26, y: 11, sz: 3,   t: 's', op: 0.58 },
  { x: 18, y: 15, sz: 1.8, t: 'd', op: 0.40 }, { x: 31, y: 29, sz: 4.5, t: 's', op: 0.65 },
  { x: 12, y: 38, sz: 1.5, t: 'd', op: 0.32 }, { x: 7,  y: 47, sz: 6,   t: 's', op: 0.75 },
  { x: 28, y: 53, sz: 2,   t: 'd', op: 0.50 }, { x: 20, y: 61, sz: 3.5, t: 's', op: 0.60 },
  { x: 9,  y: 72, sz: 1.5, t: 'd', op: 0.38 }, { x: 25, y: 80, sz: 4,   t: 's', op: 0.68 },
  { x: 15, y: 87, sz: 1.5, t: 'd', op: 0.42 },
]
const LE_MOB_STARS = [
  { x: 22, y: 4,  sz: 4,   t: 's', op: 0.60 }, { x: 9,  y: 13, sz: 1.5, t: 'd', op: 0.38 },
  { x: 29, y: 20, sz: 5.5, t: 's', op: 0.70 }, { x: 14, y: 25, sz: 3,   t: 's', op: 0.52 },
  { x: 31, y: 35, sz: 1.8, t: 'd', op: 0.44 }, { x: 8,  y: 49, sz: 5,   t: 's', op: 0.78 },
  { x: 24, y: 58, sz: 2,   t: 'd', op: 0.36 }, { x: 17, y: 65, sz: 4.5, t: 's', op: 0.63 },
  { x: 7,  y: 74, sz: 1.5, t: 'd', op: 0.45 }, { x: 27, y: 80, sz: 3.5, t: 's', op: 0.55 },
  { x: 13, y: 88, sz: 2,   t: 'd', op: 0.40 },
]
const REG_MOB_STARS = [
  { x: 17, y: 3,  sz: 3.5, t: 's', op: 0.65 }, { x: 28, y: 12, sz: 5,   t: 's', op: 0.72 },
  { x: 8,  y: 18, sz: 1.8, t: 'd', op: 0.40 }, { x: 23, y: 23, sz: 4,   t: 's', op: 0.55 },
  { x: 11, y: 37, sz: 1.5, t: 'd', op: 0.35 }, { x: 30, y: 44, sz: 5.5, t: 's', op: 0.75 },
  { x: 16, y: 54, sz: 2,   t: 'd', op: 0.48 }, { x: 7,  y: 62, sz: 3,   t: 's', op: 0.58 },
  { x: 26, y: 69, sz: 1.5, t: 'd', op: 0.38 }, { x: 19, y: 77, sz: 4.5, t: 's', op: 0.68 },
  { x: 29, y: 86, sz: 1.8, t: 'd', op: 0.42 },
]

// ─── SkyOrb ───
function SkyOrb({ size, colors, numStr, label, stars, detailNode, onClick, animClass, bandBadge }) {
  const [hov, setHov] = useState(false)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    let t
    if (hov) { t = setTimeout(() => setVis(true), 600) }
    else { setVis(false) }
    return () => clearTimeout(t)
  }, [hov])

  const pad = 30
  const svgSize = size + pad * 2
  const cx = svgSize / 2, cy = svgSize / 2
  const outerR = size * 0.455, innerR = size * 0.395

  return (
    <div className={`sky-orb-wrap${animClass ? ' ' + animClass : ''}`}
         style={{ height: size, cursor: onClick ? 'pointer' : undefined }}
         onClick={onClick}
         onMouseEnter={() => setHov(true)}
         onMouseLeave={() => setHov(false)}>
      <div className="sky-orb" style={{ width: size, height: size }}>
        <svg width={svgSize} height={svgSize}
          style={{ position: 'absolute', top: -pad, left: -pad, pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`${colors.id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.ringStops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}
            </linearGradient>
            <radialGradient id={`${colors.id}-well`} cx="50%" cy="50%" r="50%">
              <stop offset="30%" stopColor="#0D0E15" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#0D0E15" stopOpacity="0" />
            </radialGradient>
            <filter id={`${colors.id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`${colors.id}-travel`} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="wide" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4"  result="tight" />
              <feMerge><feMergeNode in="wide" /><feMergeNode in="tight" /></feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={outerR * 1.35} fill={`url(#${colors.id}-well)`} />
          <circle cx={cx} cy={cy} r={outerR} fill="none"
            stroke={`url(#${colors.id}-grad)`} strokeWidth="2"
            filter={`url(#${colors.id}-glow)`} />
          <circle cx={cx} cy={cy} r={innerR} fill="none"
            stroke={`url(#${colors.id}-grad)`} strokeWidth="1" opacity="0.5" />
          <circle cx={cx} cy={cy} r={outerR} fill="none"
            stroke={colors.glowColor} strokeWidth="6"
            strokeDasharray={`3 ${(2 * Math.PI * outerR - 3).toFixed(1)}`}
            strokeLinecap="round"
            filter={`url(#${colors.id}-travel)`}
            opacity="0.58" className="sky-ring-glow"
            style={{ animationDuration: `${colors.glowDuration}s` }} />
          {stars.map((s, i) => {
            const { x, y } = polarXY(cx, cy, s.a, s.r)
            const delay = `-${((i * 1.13 + s.a * 0.041) % 5.7).toFixed(2)}s`
            const dur   = `${(1.6 + ((i * 0.67 + s.sz * 0.55) % 3.2)).toFixed(2)}s`
            return s.t === 'd'
              ? <circle key={i} className="sky-star" cx={x} cy={y} r={s.sz}
                  fill={colors.star} style={{ animationDelay: delay, animationDuration: dur }} />
              : <path key={i} className="sky-star" d={sparklePath(x, y, s.sz, s.sz * 0.18)}
                  fill={colors.star} style={{ animationDelay: delay, animationDuration: dur }} />
          })}
        </svg>
        <div className="sky-orb-inner">
          <div className="sky-orb-num" style={{ fontSize: size > 230 ? '68px' : '50px', color: colors.number }}>
            {numStr}
          </div>
          <div className="sky-orb-lbl">{label}</div>
          {bandBadge && (
            <div className="sky-band-badge" style={{ color: bandBadge.color }}>{bandBadge.label}</div>
          )}
        </div>
      </div>
      <div className={`sky-orb-detail${vis ? ' sky-orb-detail--show' : ''}`}>{detailNode}</div>
    </div>
  )
}

// ─── SkyNavOrb ───
function SkyNavOrb({ colors, numStr, active, onClick }) {
  const size = 48, pad = 10
  const svgSize = size + pad * 2
  const cx = svgSize / 2, cy = svgSize / 2
  const outerR = size * 0.455
  return (
    <button className={`sky-nav-orb${active ? ' sky-nav-orb--active' : ''}`} onClick={onClick}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={svgSize} height={svgSize}
          style={{ position: 'absolute', top: -pad, left: -pad, pointerEvents: 'none', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`${colors.id}-nav-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.ringStops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}
            </linearGradient>
            <filter id={`${colors.id}-nav-glow`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={outerR} fill="none"
            stroke={`url(#${colors.id}-nav-grad)`} strokeWidth="1.5"
            filter={`url(#${colors.id}-nav-glow)`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Cagliostro", serif', fontSize: '15px', lineHeight: 1, color: colors.number }}>
            {numStr}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── SkyMobileRow ───
function SkyMobileRow({ colors, numStr, label, detailNode, mobileStars, onClick, bandBadge }) {
  const BAR_H = 92, SVG_W = 34
  return (
    <div className="sky-mob-row" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="sky-mob-bar-col">
        <svg width={SVG_W} height={BAR_H} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`${colors.id}-vbar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={colors.barMid} stopOpacity="0" />
              <stop offset="22%"  stopColor={colors.barMid} stopOpacity="1" />
              <stop offset="78%"  stopColor={colors.barMid} stopOpacity="1" />
              <stop offset="100%" stopColor={colors.barMid} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="5" height={BAR_H} fill={`url(#${colors.id}-vbar)`} rx="2" />
          {mobileStars.map((s, i) =>
            s.t === 'd'
              ? <circle key={i} cx={s.x} cy={s.y} r={s.sz} fill={colors.star} opacity={s.op} />
              : <path key={i} d={sparklePath(s.x, s.y, s.sz, s.sz * 0.18)} fill={colors.star} opacity={s.op} />
          )}
        </svg>
      </div>
      <div className="sky-mob-content">
        <div className="sky-mob-num-wrap">
          <div className="sky-orb-lbl sky-mob-lbl" style={{ color: colors.number, opacity: 0.75 }}>{label}</div>
          <div className="sky-mob-num" style={{ color: colors.number }}>{numStr}</div>
          {bandBadge && (
            <div className="sky-band-badge" style={{ color: bandBadge.color }}>{bandBadge.label}</div>
          )}
        </div>
        <div className="sky-mob-detail">{detailNode}</div>
      </div>
    </div>
  )
}

// ─── Sky ───
function Sky({ userEvents, regulation, openingBalance, settings, flowOverride = false, dateStr, drillThrough, onOrb, onClose, saveStatus, isPurple = false, regLogTotal = null, regLogRows = [] }) {
  const [expanding, setExpanding] = useState(null)

  function handleOrbClick(key) {
    if (!onOrb) return
    setExpanding(key)
    setTimeout(() => { setExpanding(null); onOrb(key) }, 380)
  }

  // Per-axis sums are kept inline — needed for the breakdown detail panels
  const axisSums = { E: 0, S: 0, P: 0, M: 0, X: 0 }
  for (const e of userEvents) {
    if (e.cancelled) continue
    axisSums.E += e.E || 0; axisSums.S += e.S || 0; axisSums.P += e.P || 0
    axisSums.M += e.M || 0; axisSums.X += e.X || 0
  }
  const highestAxis = Object.entries(axisSums).reduce((a, b) => b[1] > a[1] ? b : a, ['E', 0])

  // Orb numbers — delegate to computeDisplayValues so today, history, and tooltip
  // all run through the same formula. Edit math.js and all three update.
  const { peakDebit: peak, activeRegulation: activeReg, siFlowBonus, livedExperience } =
    computeDisplayValues({
      date:          dateStr || todayDateStr(),
      openingBalance,
      flowActivity:  flowOverride,
      regulationLogTotal: regLogTotal,
      regulation: {
        sensoryComfort: regulation.sensory || 0,
        audioVisual:    regulation.av      || 0,
        environment:    regulation.env     || 0,
        bodyRest:       regulation.body    || 0,
      },
      events: userEvents.map(e => ({
        emotional:      e.E        || 0,
        sensory:        e.S        || 0,
        predictability: e.P        || 0,
        masking:        e.M        || 0,
        ef:             e.X        || 0,
        flow:           e.flow     || false,
        siFlow:         e.siFlow   ?? null,
        cancelled:      e.cancelled || false,
      })),
    }, settings)
  const siFlowActive = userEvents.some(e => !e.cancelled && e.siFlow != null)

  const PEAK_BREAKDOWN = [
    { k: 'E', name: 'emotional' }, { k: 'S', name: 'sensory' },
    { k: 'P', name: 'predictability' }, { k: 'M', name: 'masking' }, { k: 'X', name: 'EF' },
  ]

  const peakDetail = (
    <div className="sky-detail sky-detail--grid">
      {PEAK_BREAKDOWN.map(({ k, name }) => (
        <div key={k} className={`sky-det-cell${highestAxis[0] === k && highestAxis[1] > 0 ? ' sky-det-amber' : ''}`}>
          <span>{name}</span><span>{Math.round(axisSums[k])}</span>
        </div>
      ))}
    </div>
  )
  const leDetail = (
    <div className="sky-detail sky-detail--le">
      <span>{Math.round(peak)} peak</span>
      <span className="sky-det-sep">·</span>
      <span>{Math.round(activeReg)} reg</span>
      {siFlowActive && <>
        <span className="sky-det-sep">·</span>
        <span style={{ color: '#5abf7a' }}>−{siFlowBonus} SI</span>
      </>}
    </div>
  )
  const regDetail = regLogTotal != null
    ? (
      <div className="sky-detail sky-detail--grid">
        {regLogRows.map(r => (
          <div key={r.id} className="sky-det-cell">
            <span>{r.label}</span><span>+{r.points}</span>
          </div>
        ))}
      </div>
    )
    : (
      <div className="sky-detail sky-detail--grid">
        {REG_CHANNELS.map(c => {
          const cur = regulation[c.k] || 0
          const under = (c.cap - cur) > 2
          return (
            <div key={c.k} className={`sky-det-cell${under ? ' sky-det-teal' : ''}`}>
              <span>{c.name}</span><span>{Math.round(cur)}/{c.cap}</span>
            </div>
          )
        })}
      </div>
    )

  const peakStr = String(Math.round(peak))
  const leStr   = String(Math.round(livedExperience))
  const regStr  = String(Math.round(activeReg))

  // Band-responsive colouring for the LE orb — ring, glow, number and star all jewel-toned
  const leThr       = settings?.livedExperienceThresholds ?? { yellow: 15, orange: 25, critical: 30 }
  const leBand      = isPurple ? 'purple' : bandOf(Math.round(livedExperience), leThr)
  const leNumColor  = bandColor(Math.round(livedExperience), leThr, isPurple)
  const leBandLabel = leBand
  const LE_COLORS   = {
    ...SKY_COLORS.le,
    ringStops: BAND_RING_STOPS[leBand] ?? SKY_COLORS.le.ringStops,
    glowColor: BAND_GLOW_COLOR[leBand] ?? SKY_COLORS.le.glowColor,
    number: leNumColor,
    star:   leNumColor,
  }
  const leBadge     = leBandLabel !== 'green' ? { label: leBandLabel, color: leNumColor } : null

  if (drillThrough) {
    return (
      <div className="sky sky--drill">
        <div className="sky-nav">
          <SkyNavOrb colors={SKY_COLORS.peak} numStr={peakStr}
            active={drillThrough === 'peak'}
            onClick={() => drillThrough === 'peak' ? onClose?.() : onOrb?.('peak')} />
          <SkyNavOrb colors={LE_COLORS} numStr={leStr}
            active={drillThrough === 'le'}
            onClick={() => drillThrough === 'le' ? onClose?.() : onOrb?.('le')} />
          <SkyNavOrb colors={SKY_COLORS.reg} numStr={regStr}
            active={drillThrough === 'reg'}
            onClick={() => drillThrough === 'reg' ? onClose?.() : onOrb?.('reg')} />
          {saveStatus && <span className="sky-nav-status">{saveStatus}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="sky">
      <div className="sky-desk">
        <SkyOrb size={200} colors={SKY_COLORS.peak} numStr={peakStr}
          label="today's peak" stars={PEAK_STARS} detailNode={peakDetail}
          onClick={() => handleOrbClick('peak')}
          animClass={expanding === 'peak' ? 'sky-orb-wrap--expanding' : expanding ? 'sky-orb-wrap--fading' : ''} />
        <SkyOrb size={260} colors={LE_COLORS} numStr={leStr}
          label="lived experience" stars={LE_STARS} detailNode={leDetail}
          bandBadge={leBadge}
          onClick={() => handleOrbClick('le')}
          animClass={expanding === 'le' ? 'sky-orb-wrap--expanding' : expanding ? 'sky-orb-wrap--fading' : ''} />
        <SkyOrb size={200} colors={SKY_COLORS.reg} numStr={regStr}
          label="regulation" stars={REG_STARS} detailNode={regDetail}
          onClick={() => handleOrbClick('reg')}
          animClass={expanding === 'reg' ? 'sky-orb-wrap--expanding' : expanding ? 'sky-orb-wrap--fading' : ''} />
      </div>
      <div className="sky-mob">
        <SkyMobileRow colors={SKY_COLORS.peak} numStr={peakStr}
          label="today's peak" detailNode={peakDetail} mobileStars={PEAK_MOB_STARS}
          onClick={() => onOrb?.('peak')} />
        <div className="sky-mob-div" />
        <SkyMobileRow colors={LE_COLORS} numStr={leStr}
          label="lived experience" detailNode={leDetail} mobileStars={LE_MOB_STARS}
          bandBadge={leBadge}
          onClick={() => onOrb?.('le')} />
        <div className="sky-mob-div" />
        <SkyMobileRow colors={SKY_COLORS.reg} numStr={regStr}
          label="regulation" detailNode={regDetail} mobileStars={REG_MOB_STARS}
          onClick={() => onOrb?.('reg')} />
      </div>
    </div>
  )
}

// The day's peak (opening + events + tax) — the waterline's starting level.
// Regulation never moves peak, so the pips are passed as zero here.
function dayPeakDebit({ dateStr, openingBalance, evts, gs, settings }) {
  const { peakDebit } = computeDisplayValues({
    date: dateStr, openingBalance, flowActivity: gs.flow, regulationLogTotal: null,
    regulation: { sensoryComfort: 0, audioVisual: 0, environment: 0, bodyRest: 0 },
    events: evts.map(e => ({
      emotional: e.E || 0, sensory: e.S || 0, predictability: e.P || 0,
      masking: e.M || 0, ef: e.X || 0,
      flow: e.flow || false, siFlow: e.siFlow ?? null, cancelled: e.cancelled || false,
    })),
  }, settings)
  return peakDebit
}

// ─── TrackerDayEditor (V2) ───
// Same as TrackerRoom's TrackerDayEditor but uses V2 data functions.
// fillGapsBefore is omitted — V2 tables already have all historical data.
function TrackerDayEditor({ session, settings, dateStr: dateProp, onBack, resetKey, drillThrough, onDrillThrough, onEditAction }) {
  const dateStr = dateProp || todayDateStr()
  const isToday = dateStr === todayDateStr()
  const [loading,        setLoading]        = useState(true)
  const [userEvents,     setUserEvents]     = useState([])
  const [regulation,     setRegulation]     = useState({ sensory: 0, av: 0, env: 0, body: 0 })
  const [recovery,       setRecovery]       = useState(false)
  const [warning,        setWarning]        = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns,      setGoodSigns]      = useState({ flow: false, crisis: false })
  const [meltdown,       setMeltdown]       = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saveStatus,     setSaveStatus]     = useState('')
  const [stampedTax,     setStampedTax]     = useState(settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
  const [autoFilledDays, setAutoFilledDays] = useState([])
  const [bannerDismissed,setBannerDismissed]= useState(false)
  const [seededIds,      setSeededIds]      = useState(new Set())
  const [allEntries,     setAllEntries]     = useState([])
  const [purpleOverride, setPurpleOverride] = useState(null)

  // The day's regulation grid. After each add/remove, re-save so the waterline
  // split + closing balance (driven by the capacity total) recompute and carry
  // forward correctly.
  const regLog = useRegLog(session.user.id, dateStr, (next) =>
    autoSave({ regLogRows: next }))
  const regLogTotal = regLog.hasRows ? regLog.total : null

  useEffect(() => { onDrillThrough?.(null) }, [resetKey, onDrillThrough])

  useEffect(() => {
    async function init() {
      try {
        // On the today view, fill any trailing gap of missed days with quiet
        // placeholder entries (sleep + tax) so the chain stays unbroken. They're
        // flagged auto_filled so the banner below can flag them for review.
        if (isToday) {
          await backfillMissedDays(session.user.id, settings, dateStr)
        }
        const entries = await loadAllEntriesV2(session.user.id)
        setAllEntries(entries)
        setAutoFilledDays(entries.filter(e => e.entry_data?.autoFilled).map(e => e.date).sort())
        // Opening balance is ALWAYS derived from the chain — never trusted from the
        // day's own stored value — so a late-entered day or a gap of missed days
        // still carries forward correctly (sleep −5 and tax per missed day).
        const opening = resolveOpeningBalance(
          dateStr, entries,
          { taxValue: settings.taxValue, taxStartDate: settings.taxStartDate },
        )
        setOpeningBalance(opening)
        setYesterdayClosing(opening)

        const existing = entries.find(e => e.date === dateStr)
        if (existing) {
          setStampedTax(existing.entry_data.autisticTaxRate ?? settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
          setPurpleOverride(existing.entry_data.purpleOverride ?? null)
          const state = dbToInternal(existing)
          setUserEvents(state.userEvents)
          setRegulation(state.regulation)
          setRecovery(state.recovery)
          setWarning(state.warning)
          setGoodSigns(state.goodSigns)
          setMeltdown(state.meltdown)
        }
        loadSeededEventIds(session.user.id).then(ids => setSeededIds(ids)).catch(() => {})
      } catch (err) {
        console.error('failed to load entry (v2)', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [dateStr, session.user.id])

  const taxCancelled = !taxActive(dateStr, settings.taxStartDate, userEvents) || goodSigns.flow

  if (loading) return <div className="history-loading">opening the almanac…</div>

  const purpleState = getPurpleState(dateStr, allEntries, settings.purpleFloors, purpleOverride)

  async function autoSave(patch = {}) {
    const evts  = patch.userEvents    ?? userEvents
    const reg   = patch.regulation    ?? regulation
    const rec   = patch.recovery      ?? recovery
    const warn  = patch.warning       ?? warning
    const gs    = patch.goodSigns     ?? goodSigns
    const melt  = patch.meltdown      ?? meltdown
    const pOver = patch.purpleOverride !== undefined ? patch.purpleOverride : purpleOverride
    const rowsNow = patch.regLogRows ?? regLog.rows
    setSaveStatus('saving…')
    try {
      // THE WATERLINE — recompute the whole day's capacity/recovery split from the
      // current peak + floor. ANY change (a routine, an action, OR a mid-day event
      // that raises peak) re-runs it for this one day, so points that had overflowed
      // to recovery can correctly become capacity again. Stored, not derived-on-read.
      const ps   = getPurpleState(dateStr, allEntries, settings.purpleFloors, pOver)
      const floor = ps.isPurple ? ps.floor : null
      const peak = dayPeakDebit({ dateStr, openingBalance, evts, gs, settings: { ...settings, taxValue: stampedTax } })
      const split = splitDayRows(rowsNow, peak, floor)
      if (rowsNow.length) {
        await persistDaySplit(split, rowsNow)
        regLog.applyRows(split)
      }
      // Capacity (the `points` side, down to the floor) feeds the existing lived-
      // experience math unchanged; the recovery overflow is its own channel.
      const capacityTotal = rowsNow.length ? sumRegLog(split) : null

      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs,
        settings: { ...settings, taxValue: stampedTax },
        yesterdayClosing, meltdown: melt,
        purpleOverride: pOver, regLogTotal: capacityTotal,
      })
      // Floor = the lowest the day can READ and CARRY forward. The waterline already
      // keeps lived experience ≥ floor whenever peak ≥ floor; this also covers the
      // quiet case where peak itself sits below the floor (little or no regulation).
      if (ps.isPurple && ps.floor != null) {
        entryData.livedExperience = Math.max(entryData.livedExperience, ps.floor)
        entryData.closingBalance  = Math.max(entryData.closingBalance,  ps.floor)
      }
      await saveEntryV2({ dateStr, entryData, peakDebit, userId: session.user.id })
      if (!isToday) await recalculateFromDateV2(session.user.id, dateStr, settings)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('auto-save failed (v2)', err)
      setSaveStatus('auto-save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd    = (ev) => { const n=[...userEvents,ev];              setUserEvents(n); autoSave({ userEvents: n }) }
  const onUpdate = (ev) => { const n=userEvents.map(x=>x.id===ev.id?ev:x); setUserEvents(n); autoSave({ userEvents: n }) }
  const onDelete = (id) => { const n=userEvents.filter(x=>x.id!==id);      setUserEvents(n); autoSave({ userEvents: n }) }
  const onWarning   = (k)   => { const n={...warning,[k]:!warning[k]};  setWarning(n);   autoSave({ warning: n }) }
  const onGood      = (k)   => { const n={...goodSigns,[k]:!goodSigns[k]}; setGoodSigns(n); autoSave({ goodSigns: n }) }
  const onRecovery  = (v)   => { setRecovery(v); autoSave({ recovery: v }) }
  const onMeltdown  = ()    => { const n=!meltdown; setMeltdown(n); autoSave({ meltdown: n }) }
  const onPurpleOverride = (val) => { setPurpleOverride(val); autoSave({ purpleOverride: val }) }

  async function handleSeed(eventId, eventText) {
    try {
      await seedEntry({ userId: session.user.id, expression: eventText, sourceEventId: eventId, entryDate: dateStr })
      setSeededIds(prev => new Set([...prev, eventId]))
    } catch (err) {
      console.error('seed to L+F failed', err)
    }
  }

  return (
    <>
      {onBack && (
        <>
          <button className="back-link" onClick={onBack}>← back to history</button>
          <div className="history-edit-date">{formatDateStr(dateStr)}</div>
        </>
      )}
      {!onBack && autoFilledDays.length > 0 && !bannerDismissed && (
        <div className="autofill-banner">
          <span className="autofill-banner-text">
            {autoFilledDays.length === 1 ? 'A day was' : `${autoFilledDays.length} days were`} auto-filled because nothing
            was logged — sleep and the autistic tax only. Edit anytime in History to add what really happened.
            <span className="autofill-banner-dates"> ({autoFilledDays.map(formatDateStr).join(', ')})</span>
          </span>
          <button className="autofill-banner-close" onClick={() => setBannerDismissed(true)} aria-label="dismiss">×</button>
        </div>
      )}
      <Sky
        userEvents={userEvents}
        regulation={regulation}
        openingBalance={openingBalance}
        settings={{ ...settings, taxValue: stampedTax }}
        flowOverride={goodSigns.flow}
        dateStr={dateStr}
        drillThrough={drillThrough}
        onOrb={onDrillThrough}
        onClose={() => onDrillThrough?.(null)}
        saveStatus={saveStatus}
        isPurple={purpleState.isPurple}
        regLogTotal={regLogTotal}
        regLogRows={regLog.rows}
      />
      {drillThrough && (
        <div className="sky-drill" key={drillThrough}>
          {(drillThrough === 'peak' || drillThrough === 'le') && (
            <>
              <section className="events-section">
                <AutisticTaxLine rate={stampedTax} cancelled={taxCancelled} />
                <div className="ledger-head">
                  <div className="ledger-title">events · today</div>
                  <div className="ledger-count">{userEvents.filter(e => !e.cancelled).length} active</div>
                </div>
                <div className="events">
                  {userEvents.map(e => (
                    <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} seededIds={seededIds} onSeed={handleSeed} />
                  ))}
                </div>
                <Composer onAdd={onAdd} />
              </section>
              <WarningSigns flags={warning} onToggle={onWarning} />
              <MeltdownSection active={meltdown} onToggle={onMeltdown} />
              <PurpleOverrideSection
                isPurple={purpleState.isPurple}
                override={purpleOverride}
                onChange={onPurpleOverride}
              />
            </>
          )}
          {(drillThrough === 'reg' || drillThrough === 'le') && (
            <RegulationSection
              recovery={recovery}
              onRecovery={onRecovery}
              goodSigns={goodSigns}
              onGood={onGood}
              regLog={regLog}
              onEditAction={onEditAction}
              isPurple={purpleState.isPurple}
            />
          )}
        </div>
      )}
    </>
  )
}

// ─── HistoryDateEditor helpers ───
function hedParseDate(s) { return new Date(s + 'T12:00:00') }
function hedToDateStr(d) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}
function hedAddDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function hedWeekMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(12, 0, 0, 0)
  return d
}
function hedPeakColor(peak, thr) {
  if (peak >= (thr.critical ?? 30)) return '#e84040'
  if (peak >= (thr.orange   ?? 25)) return '#e8822a'
  if (peak >= (thr.yellow   ?? 15)) return '#f0b825'
  return '#2ed468'
}
function calcSkyNums(userEvents, regulation, openingBalance, settings, goodSigns, dateStr, regLogTotal = null) {
  // Thin wrapper — delegates to computeDisplayValues so all three views share one formula
  const { peakDebit, activeRegulation, livedExperience } = computeDisplayValues({
    date:          dateStr,
    openingBalance,
    flowActivity:  goodSigns.flow,
    regulationLogTotal: regLogTotal,
    regulation: {
      sensoryComfort: regulation.sensory || 0,
      audioVisual:    regulation.av      || 0,
      environment:    regulation.env     || 0,
      bodyRest:       regulation.body    || 0,
    },
    events: userEvents.map(e => ({
      emotional:      e.E        || 0,
      sensory:        e.S        || 0,
      predictability: e.P        || 0,
      masking:        e.M        || 0,
      ef:             e.X        || 0,
      flow:           e.flow     || false,
      siFlow:         e.siFlow   ?? null,
      cancelled:      e.cancelled || false,
    })),
  }, settings)
  return { peak: peakDebit, reg: activeRegulation, le: livedExperience }
}

const HED_DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const HED_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── WeekStrip ───
function WeekStrip({ weekStart, selectedDate, entryMap, thresholds, todayStr, onSelect, onPrev, onNext }) {
  const days = Array.from({ length: 7 }, (_, i) => hedAddDays(weekStart, i))
  const monthLabel = `${HED_MON[weekStart.getMonth()]} ${weekStart.getFullYear()}`

  return (
    <div className="hed-week-strip">
      <div className="hed-week-head">
        <button className="hed-week-arrow" onClick={onPrev} aria-label="previous week">‹</button>
        <span className="hed-week-month">{monthLabel}</span>
        <button className="hed-week-arrow" onClick={onNext} aria-label="next week">›</button>
      </div>
      <div className="hed-week-days">
        {days.map((day, i) => {
          const ds        = hedToDateStr(day)
          const entry     = entryMap[ds]
          const leVal     = entry?.entry_data?.livedExperience ?? entry?.entry_data?.closingBalance ?? 0
          const isSelected = ds === selectedDate
          const isToday   = ds === todayStr
          const isFuture  = ds > todayStr
          const color     = entry ? hedPeakColor(leVal, thresholds) : undefined
          return (
            <button key={ds}
              className={[
                'hed-day',
                entry      ? 'hed-day--logged'  : '',
                isSelected ? 'hed-day--selected' : '',
                isToday    ? 'hed-day--today'    : '',
                isFuture   ? 'hed-day--future'   : '',
              ].filter(Boolean).join(' ')}
              onClick={!isFuture ? () => onSelect(ds) : undefined}
              disabled={isFuture}
              style={color ? { '--hed-day-color': color } : undefined}>
              <span className="hed-dow">{HED_DOW[i]}</span>
              <span className="hed-day-num">{day.getDate()}</span>
              {entry && <span className="hed-day-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── HistoryDateEditor (V2) ───
function HistoryDateEditor({ session, settings, dateStr: initialDateStr, onBack, onEditAction }) {
  const [dateStr, setDateStr]       = useState(initialDateStr)
  const [weekStart, setWeekStart]   = useState(() => hedWeekMonday(hedParseDate(initialDateStr)))
  const [allEntries, setAllEntries] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [userEvents, setUserEvents] = useState([])
  const [regulation, setRegulation] = useState({ sensory: 0, av: 0, env: 0, body: 0 })
  const [recovery, setRecovery]     = useState(false)
  const [warning, setWarning]       = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns, setGoodSigns]   = useState({ flow: false, crisis: false })
  const [meltdown, setMeltdown]     = useState(false)
  const [openingBalance, setOpeningBalance]   = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saveStatus, setSaveStatus]   = useState('')
  const [stampedTax, setStampedTax]   = useState(settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
  const [seededIds,  setSeededIds]    = useState(new Set())
  const [purpleOverride, setPurpleOverride] = useState(null)
  const todayStr = todayDateStr()

  // Day's regulation grid. Re-save on every change so the waterline split + the
  // closing balance recompute for THIS day and the cascade carries forward (the
  // cascade never re-floors or re-splits the OTHER days it touches).
  const regLog = useRegLog(session.user.id, dateStr, (next) =>
    autoSave({ regLogRows: next }))
  const regLogTotal = regLog.hasRows ? regLog.total : null
  // Older days logged with the retired pip channels stay read-only (no grid rows,
  // but a saved pip number). New or empty days get the editable grid.
  const pipSum = (regulation.sensory || 0) + (regulation.av || 0) + (regulation.env || 0) + (regulation.body || 0)
  const showOldPip = regLog.loaded && !regLog.hasRows && pipSum > 0

  useEffect(() => {
    loadAllEntriesV2(session.user.id)
      .then(rows => setAllEntries(rows))
      .catch(() => setAllEntries([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setSaveStatus('')
    async function init() {
      try {
        const rows = await loadAllEntriesV2(session.user.id)
        setAllEntries(rows)
        // Opening balance is ALWAYS derived from the chain (gap-aware), never
        // trusted from the day's own stored value — so editing or opening any
        // historical day, including a never-logged gap day, carries forward right.
        const opening = resolveOpeningBalance(
          dateStr, rows,
          { taxValue: settings.taxValue, taxStartDate: settings.taxStartDate },
        )
        setOpeningBalance(opening)
        setYesterdayClosing(opening)

        const existing = rows.find(e => e.date === dateStr)
        if (existing) {
          setStampedTax(existing.entry_data.autisticTaxRate ?? settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
          setPurpleOverride(existing.entry_data.purpleOverride ?? null)
          const state = dbToInternal(existing)
          setUserEvents(state.userEvents)
          setRegulation(state.regulation)
          setRecovery(state.recovery)
          setWarning(state.warning)
          setGoodSigns(state.goodSigns)
          setMeltdown(state.meltdown)
        } else {
          setUserEvents([])
          setRegulation({ sensory: 0, av: 0, env: 0, body: 0 })
          setRecovery(false)
          setWarning({ skin: false, vision: false, thought: false, other: false })
          setGoodSigns({ flow: false, crisis: false })
          setMeltdown(false)
          setPurpleOverride(null)
        }
        loadSeededEventIds(session.user.id).then(ids => setSeededIds(ids)).catch(() => {})
      } catch (err) { console.error('failed to load entry (v2)', err) }
      finally { setLoading(false) }
    }
    init()
  }, [dateStr])

  const entryMap = useMemo(() => {
    if (!allEntries) return {}
    const m = {}
    for (const e of allEntries) m[e.date] = e
    return m
  }, [allEntries])

  const taxCancelled = !taxActive(dateStr, settings.taxStartDate, userEvents) || goodSigns.flow

  const purpleState = getPurpleState(dateStr, allEntries ?? [], settings.purpleFloors, purpleOverride)

  async function autoSave(patch = {}) {
    const evts  = patch.userEvents    ?? userEvents
    const reg   = patch.regulation    ?? regulation
    const rec   = patch.recovery      ?? recovery
    const warn  = patch.warning       ?? warning
    const gs    = patch.goodSigns     ?? goodSigns
    const melt  = patch.meltdown      ?? meltdown
    const pOver = patch.purpleOverride !== undefined ? patch.purpleOverride : purpleOverride
    const rowsNow = patch.regLogRows ?? regLog.rows
    setSaveStatus('saving…')
    try {
      // THE WATERLINE — editing an earlier day recomputes THAT day's split (only the
      // day being edited; the cascade below never re-derives other days' splits).
      const ps    = getPurpleState(dateStr, allEntries ?? [], settings.purpleFloors, pOver)
      const floor = ps.isPurple ? ps.floor : null
      const peak  = dayPeakDebit({ dateStr, openingBalance, evts, gs, settings: { ...settings, taxValue: stampedTax } })
      const split = splitDayRows(rowsNow, peak, floor)
      if (rowsNow.length) {
        await persistDaySplit(split, rowsNow)
        regLog.applyRows(split)
      }
      const capacityTotal = rowsNow.length ? sumRegLog(split) : null

      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs,
        settings: { ...settings, taxValue: stampedTax },
        yesterdayClosing, meltdown: melt,
        purpleOverride: pOver, regLogTotal: capacityTotal,
      })
      if (ps.isPurple && ps.floor != null) {
        entryData.livedExperience = Math.max(entryData.livedExperience, ps.floor)
        entryData.closingBalance  = Math.max(entryData.closingBalance,  ps.floor)
      }
      await saveEntryV2({ dateStr, entryData, peakDebit, userId: session.user.id })
      await recalculateFromDateV2(session.user.id, dateStr, settings)
      loadAllEntriesV2(session.user.id).then(rows => setAllEntries(rows)).catch(() => {})
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('auto-save failed (v2)', err)
      setSaveStatus('auto-save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd    = (ev) => { const n=[...userEvents,ev];              setUserEvents(n); autoSave({ userEvents: n }) }
  const onUpdate = (ev) => { const n=userEvents.map(x=>x.id===ev.id?ev:x); setUserEvents(n); autoSave({ userEvents: n }) }
  const onDelete = (id) => { const n=userEvents.filter(x=>x.id!==id);      setUserEvents(n); autoSave({ userEvents: n }) }
  const onWarning   = (k)   => { const n={...warning,[k]:!warning[k]};  setWarning(n);   autoSave({ warning: n }) }
  const onGood      = (k)   => { const n={...goodSigns,[k]:!goodSigns[k]}; setGoodSigns(n); autoSave({ goodSigns: n }) }
  const onRecovery  = (v)   => { setRecovery(v); autoSave({ recovery: v }) }
  const onMeltdown  = ()    => { const n=!meltdown; setMeltdown(n); autoSave({ meltdown: n }) }
  const onPurpleOverride = (val) => { setPurpleOverride(val); autoSave({ purpleOverride: val }) }

  async function handleSeed(eventId, eventText) {
    try {
      await seedEntry({ userId: session.user.id, expression: eventText, sourceEventId: eventId, entryDate: dateStr })
      setSeededIds(prev => new Set([...prev, eventId]))
    } catch (err) {
      console.error('seed to L+F failed', err)
    }
  }

  function handleSelectDate(ds) {
    setDateStr(ds)
    const d = hedParseDate(ds)
    if (d < weekStart || d > hedAddDays(weekStart, 6)) setWeekStart(hedWeekMonday(d))
  }

  const skyNums  = calcSkyNums(userEvents, regulation, openingBalance, { ...settings, taxValue: stampedTax }, goodSigns, dateStr, regLogTotal)
  const [y, mo, da] = dateStr.split('-').map(Number)
  const dateLabel    = `${HED_MON[mo-1]} ${da} · ${y}`

  return (
    <div className="hed">
      <div className="hed-head">
        <button className="hed-back" onClick={onBack}>←</button>
        <span className="hed-date-label">{dateLabel}</span>
        {saveStatus && <span className="hed-status">{saveStatus}</span>}
      </div>

      <WeekStrip
        weekStart={weekStart}
        selectedDate={dateStr}
        entryMap={entryMap}
        thresholds={settings.livedExperienceThresholds}
        todayStr={todayStr}
        onSelect={handleSelectDate}
        onPrev={() => setWeekStart(d => hedAddDays(d, -7))}
        onNext={() => setWeekStart(d => hedAddDays(d, 7))}
      />

      <div className="hed-sky-nums">
        <div className="hed-sky-num">
          <span className="hed-sky-val" style={{ color: SKY_COLORS.peak.number }}>
            {loading ? '·' : skyNums.peak}
          </span>
          <span className="hed-sky-lbl">peak</span>
        </div>
        <div className="hed-sky-sep">·</div>
        <div className="hed-sky-num">
          <span className="hed-sky-val" style={{ color: SKY_COLORS.le.number }}>
            {loading ? '·' : skyNums.le}
          </span>
          <span className="hed-sky-lbl">lived exp</span>
        </div>
        <div className="hed-sky-sep">·</div>
        <div className="hed-sky-num">
          <span className="hed-sky-val" style={{ color: SKY_COLORS.reg.number }}>
            {loading ? '·' : skyNums.reg}
          </span>
          <span className="hed-sky-lbl">regulation</span>
        </div>
      </div>

      {loading
        ? <div className="history-loading">opening the almanac…</div>
        : (
          <>
            <section className="events-section">
              <AutisticTaxLine rate={stampedTax} cancelled={taxCancelled} />
              <div className="ledger-head">
                <div className="ledger-title">events</div>
                <div className="ledger-count">{userEvents.filter(e => !e.cancelled).length} active</div>
              </div>
              <div className="events">
                {userEvents.map(e => (
                  <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} seededIds={seededIds} onSeed={handleSeed} />
                ))}
              </div>
              <Composer onAdd={onAdd} />
            </section>
            <RegulationSection
              recovery={recovery}
              onRecovery={onRecovery}
              goodSigns={goodSigns}
              onGood={onGood}
              regLog={regLog}
              oldPip={showOldPip ? regulation : null}
              onEditAction={onEditAction}
              isPurple={purpleState.isPurple}
            />
            <WarningSigns flags={warning} onToggle={onWarning} />
            <MeltdownSection active={meltdown} onToggle={onMeltdown} />
            <PurpleOverrideSection
              isPurple={purpleState.isPurple}
              override={purpleOverride}
              onChange={onPurpleOverride}
            />
          </>
        )
      }
    </div>
  )
}

// ─── AutisticTaxLine ───
function AutisticTaxLine({ rate, cancelled }) {
  return (
    <div className={`autistic-tax-line${cancelled ? ' cancelled' : ''}`}>
      autistic tax: {rate}
    </div>
  )
}

// ─── ThresholdSettings ───
function ThresholdSettings({ settings, onThresholdsChange }) {
  const [leYellow,   setLeYellow]   = useState(settings.livedExperienceThresholds?.yellow   ?? 15)
  const [leOrange,   setLeOrange]   = useState(settings.livedExperienceThresholds?.orange   ?? 25)
  const [leCritical, setLeCritical] = useState(settings.livedExperienceThresholds?.critical ?? 30)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSave() {
    setSaving(true); setStatus('')
    try {
      const updated = { yellow: Number(leYellow), orange: Number(leOrange), critical: Number(leCritical) }
      await saveThresholds(updated)
      onThresholdsChange?.(updated)
      setStatus('saved')
      setTimeout(() => setStatus(''), 3000)
    } catch { setStatus('failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="settings-section">
      <div className="ledger-head">
        <div className="ledger-title">lived experience thresholds</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>yellow threshold</label>
          <div className="settings-field-desc">day reads as caution when lived experience reaches this number</div>
        </div>
        <input type="number" className="settings-number-input" value={leYellow} min={1} onChange={e => setLeYellow(e.target.value)} />
      </div>
      <div className="settings-field-row">
        <div>
          <label>orange threshold</label>
          <div className="settings-field-desc">day reads as escalating when lived experience reaches this number</div>
        </div>
        <input type="number" className="settings-number-input" value={leOrange} min={1} onChange={e => setLeOrange(e.target.value)} />
      </div>
      <div className="settings-field-row">
        <div>
          <label>critical threshold</label>
          <div className="settings-field-desc">day reads as critical when lived experience reaches this number</div>
        </div>
        <input type="number" className="settings-number-input" value={leCritical} min={1} onChange={e => setLeCritical(e.target.value)} />
      </div>
      <div className="save-bar">
        <span className="save-bar-status">{status}</span>
        <button className="save-bar-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'saving…' : 'save thresholds'}
        </button>
      </div>
    </div>
  )
}

// ─── AutisticTaxSettings ───
function AutisticTaxSettings({ settings, onTaxChange }) {
  const [value, setValue] = useState(settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSave() {
    setSaving(true); setStatus('')
    try {
      await saveTaxValue(Number(value))
      onTaxChange?.(Number(value))
      setStatus('saved')
      setTimeout(() => setStatus(''), 3000)
    } catch { setStatus('failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="settings-section">
      <div className="ledger-head">
        <div className="ledger-title">autistic tax</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>daily cost</label>
          <div className="settings-field-desc">applied each day — cancelled automatically on flow and SI flow days. changes apply from today forward; old days are not affected.</div>
        </div>
        <input type="number" className="settings-number-input" value={value} min={0} onChange={e => setValue(e.target.value)} />
      </div>
      <div className="save-bar">
        <span className="save-bar-status">{status}</span>
        <button className="save-bar-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'saving…' : 'save'}
        </button>
      </div>
    </div>
  )
}

// ─── PurpleSettings ───
function PurpleSettings({ settings, onPurpleChange }) {
  const [day1Floor, setDay1Floor] = useState(settings.purpleFloors?.floor_day1 ?? 25)
  const [day2Floor, setDay2Floor] = useState(settings.purpleFloors?.floor_day2 ?? 15)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSave() {
    setSaving(true); setStatus('')
    try {
      const updated = { floor_day1: Number(day1Floor), floor_day2: Number(day2Floor) }
      await savePurpleFloors(updated)
      onPurpleChange?.(updated)
      setStatus('saved')
      setTimeout(() => setStatus(''), 3000)
    } catch { setStatus('failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="settings-section">
      <div className="ledger-head">
        <div className="ledger-title">purple recovery mode</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>day 1 floor</label>
          <div className="settings-field-desc">minimum lived experience the day after a crisis (and the closing balance that carries forward)</div>
        </div>
        <input type="number" className="settings-number-input" value={day1Floor} min={0} onChange={e => setDay1Floor(e.target.value)} />
      </div>
      <div className="settings-field-row">
        <div>
          <label>day 2 floor</label>
          <div className="settings-field-desc">minimum for the second day after a crisis</div>
        </div>
        <input type="number" className="settings-number-input" value={day2Floor} min={0} onChange={e => setDay2Floor(e.target.value)} />
      </div>
      <div className="save-bar">
        <span className="save-bar-status">{status}</span>
        <button className="save-bar-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'saving…' : 'save'}
        </button>
      </div>
    </div>
  )
}

const HIST_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const HIST_DOW    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── TrackerV2Room shell ───
export default function TrackerV2Room({ onHome, onRoom, onEditAction, session, settings: settingsProp, onThresholdsChange, initialTab }) {
  const [settings, setSettings] = useState(settingsProp ?? null)
  const [tab,      setTab]      = useState(initialTab ?? 'today')
  const [editDate, setEditDate] = useState(null)
  const [todayResetKey,  setTodayResetKey]  = useState(0)
  const [drillThrough,   setDrillThrough]   = useState(null)
  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  // Update local settings if parent passes new ones
  useEffect(() => { if (settingsProp) setSettings(settingsProp) }, [settingsProp])

  const handleTaxChange = (newVal) => {
    setSettings(prev => ({ ...prev, taxValue: newVal }))
  }

  const handleThresholdsChange = (updated) => {
    setSettings(prev => ({
      ...prev,
      thresholds: { yellow: updated.yellow, orange: updated.orange ?? 25, critical: updated.critical },
      livedExperienceThresholds: { yellow: updated.yellow, orange: updated.orange ?? 25, critical: updated.critical },
    }))
    onThresholdsChange?.(updated)
  }

  const handlePurpleChange = (updated) => {
    setSettings(prev => ({ ...prev, purpleFloors: updated }))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleTabChange(t) {
    if (t === 'today') { setTodayResetKey(k => k + 1); setDrillThrough(null) }
    setTab(t)
    if (t !== 'history') setEditDate(null)
  }

  useEffect(() => {
    const vf = document.querySelector('.view-fade')
    if (!vf) return
    if (tab === 'today' && !drillThrough) {
      vf.style.overflowY = 'hidden'
      const hdr  = vf.querySelector('.room-header-wrap')
      const hdrH = hdr ? hdr.getBoundingClientRect().height : 80
      vf.style.setProperty('--today-h', `${window.innerHeight - hdrH - 20}px`)
    } else {
      vf.style.overflowY = ''
      vf.style.removeProperty('--today-h')
    }
    return () => { vf.style.overflowY = ''; vf.style.removeProperty('--today-h') }
  }, [tab, drillThrough])

  const showHistoryNav = tab === 'history' && !editDate

  if (!settings) return null

  return (
    <>
      <div className="room-header-wrap">
        <div className="room-head">
          <h2 className="room-title">{tab === 'settings' ? 'settings' : 'Capacity Tracker'}</h2>
          <RoomMark date={todayDisplayStr()} onSettings={() => setTab('settings')} />
        </div>
        {tab !== 'settings' && (
          <div className="room-tabs">
            {['today', 'history'].map(t => (
              <button key={t}
                      type="button"
                      className={`room-tab ${tab === t ? 'active' : ''}`}
                      onClick={() => handleTabChange(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        {showHistoryNav && (
          <>
            <div className="cal-month-nav">
              <button className="cal-month-arrow" onClick={prevMonth} aria-label="Previous month">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13,4 7,10 13,16" />
                </svg>
              </button>
              <div className="cal-month-label">{HIST_MONTHS[viewMonth]} {viewYear}</div>
              <button className="cal-month-arrow" onClick={nextMonth} aria-label="Next month">
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7,4 13,10 7,16" />
                </svg>
              </button>
            </div>
            <div className="cal-dow-header">
              {HIST_DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
            </div>
          </>
        )}
      </div>

      {/* Today stays mounted so unsaved state survives tab switches */}
      <div style={{
        display: tab === 'today' ? 'flex' : 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 'var(--today-h, calc(100svh - 100px))',
      }}>
        <TrackerDayEditor session={session} settings={settings} resetKey={todayResetKey} drillThrough={drillThrough} onDrillThrough={setDrillThrough} onEditAction={onEditAction} />
      </div>

      {tab === 'history' && !editDate && (
        <TrackerHistory
          settings={settings}
          session={session}
          onEditDate={date => setEditDate(date)}
          viewYear={viewYear}
          viewMonth={viewMonth}
          loadEntries={loadAllEntriesV2}
        />
      )}
      {tab === 'history' && editDate && (
        <HistoryDateEditor
          session={session}
          settings={settings}
          dateStr={editDate}
          onBack={() => setEditDate(null)}
          onEditAction={onEditAction}
        />
      )}
      {tab === 'settings' && (
        <>
          <ThresholdSettings settings={settings} onThresholdsChange={handleThresholdsChange} />
          <PurpleSettings settings={settings} onPurpleChange={handlePurpleChange} />
          <AutisticTaxSettings settings={settings} onTaxChange={handleTaxChange} />
          {onRoom && (
            <div className="settings-section">
              <div className="ledger-head">
                <div className="ledger-title">project notes</div>
              </div>
              <div className="settings-field-row">
                <div>
                  <label>engine room</label>
                  <div className="settings-field-desc">project docs, formula reference, and architecture notes</div>
                </div>
                <button className="save-bar-btn" onClick={() => onRoom('engine-room')}>
                  open
                </button>
              </div>
            </div>
          )}
          <div className="settings-signout">
            <button className="settings-signout-btn" onClick={() => supabase.auth.signOut()}>
              sign out
            </button>
          </div>
        </>
      )}
    </>
  )
}
