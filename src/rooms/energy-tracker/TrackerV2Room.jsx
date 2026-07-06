/**
 * TrackerV2Room — Cat's capacity tracker, backed by energy_events + energy_daily.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import WeekRing from '../../components/jewelry/WeekRing.jsx'
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
import { openingBand, greetingWindowFor, loadSetTheDay } from '../../shared/lib/setTheDay.js'
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
        <button className="save jbtn" onClick={save}>save</button>
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
function RegulationSection({ recovery, onRecovery, regLog, oldPip, onEditAction, isPurple = false, readOnly = false }) {
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
// The crisis yes/no toggle, with the "crisis recovery" marker alongside it —
// recovery is a crisis-related state, so it lives here rather than under
// regulation. (Day-level "flow activity" was removed; flow is set per event.)
function MeltdownSection({ active, onToggle, goodSigns, onGood }) {
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
        <button className={`signal good-signal ${goodSigns?.crisis ? 'lit' : ''}`}
                onClick={() => onGood('crisis')}
                title="crisis recovery">
          <span className="signal-glyph">△</span>
          <span className="signal-name">crisis recovery</span>
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

// ─── Shared sparkle + number-row helpers (kept from the retired sky page) ──────

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
  if (peak >= (thr.yellow   ?? 15)) return '#F6C73A'
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
          {/* lived experience takes the day's band colour — same logic the today
              sky view uses for its LE figure (gold/orange/red/purple). */}
          <span className="hed-sky-val" style={{ color: bandColor(Math.round(skyNums.le), settings.livedExperienceThresholds, purpleState.isPurple) }}>
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
              regLog={regLog}
              oldPip={showOldPip ? regulation : null}
              onEditAction={onEditAction}
              isPurple={purpleState.isPurple}
            />
            <WarningSigns flags={warning} onToggle={onWarning} />
            <MeltdownSection active={meltdown} onToggle={onMeltdown} goodSigns={goodSigns} onGood={onGood} />
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
        <button className="save-bar-btn jbtn" onClick={handleSave} disabled={saving}>
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
        <button className="save-bar-btn jbtn" onClick={handleSave} disabled={saving}>
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
        <button className="save-bar-btn jbtn" onClick={handleSave} disabled={saving}>
          {saving ? 'saving…' : 'save'}
        </button>
      </div>
    </div>
  )
}

const HIST_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const HIST_DOW    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Today's sky — band-statement colour (mirrors today's band). The std_* content
// tables never carry red (red → orange fallback), but the STATEMENT can still colour
// red on a genuine crisis-adjacent opening — brightened off the ring's ruby so it
// stays readable on the dark ground. ────────────────────────────────────────────
const SKY_BAND_TEXT = {
  green:  '#2FBE86',
  yellow: '#F6C73A',
  orange: '#FF8419',
  red:    '#FF5A6A',
  purple: '#A673E4',
}

// ─── StarMark — the one small 4-point star on the today circle, and the gold
// separators between the "today might want" suggestions. Same sparkle geometry as
// the retired orbs, shrunk to garnish size. ────────────────────────────────────
function StarMark({ size = 7, color = 'var(--candle)', className, style }) {
  const box = size * 2 + 2
  const c = box / 2
  return (
    <svg className={className} width={box} height={box} viewBox={`0 0 ${box} ${box}`}
         style={{ overflow: 'visible', flex: 'none', ...style }} aria-hidden="true">
      <path d={sparklePath(c, c, size, size * 0.4)} fill={color} />
    </svg>
  )
}

// ─── FadingDivider — the slim fading line the history tab already uses between week
// rows (same element, same style), reused here to frame the woven-in voice. ──────
function FadingDivider() {
  return (
    <div className="week-sep tsky-div" aria-hidden="true">
      <div className="week-sep-line week-sep-line--l" />
      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
      <div className="week-sep-line week-sep-line--r" />
    </div>
  )
}

// ─── RollingStrip — evolves the history WeekStrip into a rolling 7-day window:
// today always at the RIGHT edge, the six previous days trailing left (NOT a Mon–Sun
// calendar week — so Monday no longer hides the weekend behind the back arrow).
// Arrows page a week further back; the forward arrow is inert once the window ends
// at today.
//   solid ring  = an entered day, coloured by its lived-experience band
//   dashed ring = a placeholder day (sleep/tax carry-forward only — the app's guess)
//   dim         = future, not tappable
//   glow        = the day currently being edited
// One small 4-point star sits just off the today circle — the only day that gets one.
function RollingStrip({ anchorEnd, selectedDate, entryMap, thresholds, todayStr, allEntries, purpleFloors, onSelect, onPrev, onNext, canForward }) {
  const end  = hedParseDate(anchorEnd)
  const days = Array.from({ length: 7 }, (_, i) => hedAddDays(end, i - 6))
  return (
    <div className="tsky-strip">
      <button className="tsky-strip-arrow" onClick={onPrev} aria-label="earlier days">‹</button>
      <div className="tsky-strip-days">
        {days.map(day => {
          const ds         = hedToDateStr(day)
          const entry      = entryMap[ds]
          const isFuture   = ds > todayStr
          const isToday    = ds === todayStr
          const isSelected = ds === selectedDate
          // Entered = a real save (backfilled placeholders carry auto_filled; a user
          // edit clears it). Everything else reads as the app's guess → dashed.
          const entered    = !!entry && !entry.entry_data?.autoFilled
          let color
          if (entered) {
            const leVal = entry.entry_data?.livedExperience ?? entry.entry_data?.closingBalance ?? 0
            const ps    = getPurpleState(ds, allEntries, purpleFloors, entry.entry_data?.purpleOverride ?? null)
            color = bandColor(Math.round(leVal), thresholds, ps.isPurple)
          }
          const cls = [
            'tsky-day',
            entered    ? 'tsky-day--entered'     : 'tsky-day--placeholder',
            isFuture   ? 'tsky-day--future'      : '',
            isSelected ? 'tsky-day--editing'     : '',
            isToday    ? 'tsky-day--today'       : '',
          ].filter(Boolean).join(' ')
          return (
            <button key={ds} className={cls}
              onClick={!isFuture ? () => onSelect(ds) : undefined}
              disabled={isFuture}
              style={color ? { '--tsky-day-color': color } : undefined}>
              <span className="tsky-dow">{HED_DOW[(day.getDay() + 6) % 7]}</span>
              <span className="tsky-ring">
                {entered
                  ? <WeekRing color={color} size={52} className="tsky-ring-art" />
                  : null}
                <span className="tsky-day-num">{day.getDate()}</span>
              </span>
            </button>
          )
        })}
      </div>
      <button
        className={`tsky-strip-arrow${canForward ? '' : ' tsky-strip-arrow--off'}`}
        onClick={canForward ? onNext : undefined}
        disabled={!canForward}
        aria-label="later days">›</button>
    </div>
  )
}

// ─── useTodaysSky — the woven-in voice. ALWAYS about TODAY, never the selected day:
// greeting off the clock, band line + quote + suggestions off today's opening-frame
// band. Re-loads whenever today's band shifts (e.g. editing a past day cascades a
// new opening balance onto today). Content + tables unchanged (id=154). ──────────
function useTodaysSky({ userId, band, timeWindow, todayStr }) {
  const [voice, setVoice] = useState({ greeting: null, bandLine: null, quote: null, suggestions: [] })
  useEffect(() => {
    if (!userId || !band || !timeWindow || !todayStr) return
    let alive = true
    loadSetTheDay({ userId, band, window: timeWindow, dateStr: todayStr })
      .then(d => { if (alive) setVoice(d) })
      .catch(err => console.error("failed to load today's sky", err))
    return () => { alive = false }
  }, [userId, band, timeWindow, todayStr])
  return voice
}

// ─── TodayLanding — the tracker's new front door (engine room id=166). The combined
// day editor IS the landing: it opens on today, the rolling strip steps back through
// the week, and the "Today's sky" voice is woven in above as typography (no box).
// The editor body below is the same one History uses, unchanged.
function TodayLanding({ session, settings, resetKey, onEditAction }) {
  const todayStr = todayDateStr()
  const [dateStr,   setDateStr]   = useState(todayStr)
  const [anchorEnd, setAnchorEnd] = useState(todayStr)   // rightmost day of the rolling window
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [userEvents, setUserEvents] = useState([])
  const [regulation, setRegulation] = useState({ sensory: 0, av: 0, env: 0, body: 0 })
  const [recovery, setRecovery]   = useState(false)
  const [warning, setWarning]     = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns, setGoodSigns] = useState({ flow: false, crisis: false })
  const [meltdown, setMeltdown]   = useState(false)
  const [openingBalance, setOpeningBalance]     = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saveStatus, setSaveStatus] = useState('')
  const [stampedTax, setStampedTax] = useState(settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
  const [seededIds, setSeededIds]   = useState(new Set())
  const [purpleOverride, setPurpleOverride] = useState(null)
  const backfilledRef = useRef(false)

  const regLog = useRegLog(session.user.id, dateStr, (next) => autoSave({ regLogRows: next }))
  const regLogTotal = regLog.hasRows ? regLog.total : null
  const pipSum = (regulation.sensory || 0) + (regulation.av || 0) + (regulation.env || 0) + (regulation.body || 0)
  const showOldPip = regLog.loaded && !regLog.hasRows && pipSum > 0

  // Tapping the "today" tab (resetKey bumps) always returns the landing to today.
  useEffect(() => { setDateStr(todayStr); setAnchorEnd(todayStr) }, [resetKey])

  useEffect(() => {
    setLoading(true); setSaveStatus('')
    let alive = true
    async function init() {
      try {
        // Today's responsibility: fill any trailing gap of missed days with quiet
        // placeholder rows so the chain stays unbroken. Once per mount only.
        if (!backfilledRef.current) {
          backfilledRef.current = true
          await backfillMissedDays(session.user.id, settings, todayStr)
        }
        const entries = await loadAllEntriesV2(session.user.id)
        if (!alive) return
        setAllEntries(entries)
        const opening = resolveOpeningBalance(
          dateStr, entries,
          { taxValue: settings.taxValue, taxStartDate: settings.taxStartDate },
        )
        setOpeningBalance(opening); setYesterdayClosing(opening)

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
        } else {
          setStampedTax(settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
          setPurpleOverride(null)
          setUserEvents([])
          setRegulation({ sensory: 0, av: 0, env: 0, body: 0 })
          setRecovery(false)
          setWarning({ skin: false, vision: false, thought: false, other: false })
          setGoodSigns({ flow: false, crisis: false })
          setMeltdown(false)
        }
        loadSeededEventIds(session.user.id).then(ids => { if (alive) setSeededIds(ids) }).catch(() => {})
      } catch (err) {
        console.error('failed to load entry (v2)', err)
      } finally {
        if (alive) setLoading(false)
      }
    }
    init()
    return () => { alive = false }
  }, [dateStr, session.user.id])

  const entryMap = useMemo(() => {
    const m = {}
    for (const e of allEntries) m[e.date] = e
    return m
  }, [allEntries])

  const taxCancelled = !taxActive(dateStr, settings.taxStartDate, userEvents) || goodSigns.flow
  const purpleState  = getPurpleState(dateStr, allEntries, settings.purpleFloors, purpleOverride)

  // ── The voice — always TODAY, never the selected day. Reads the opening frame
  // (opening balance + the day's autistic tax), the same rule the box shipped with.
  const todayEntry    = entryMap[todayStr]
  const todayOverride = todayEntry?.entry_data?.purpleOverride ?? null
  const todayPurple   = getPurpleState(todayStr, allEntries, settings.purpleFloors, todayOverride)
  const todayOpening  = useMemo(
    () => resolveOpeningBalance(todayStr, allEntries, { taxValue: settings.taxValue, taxStartDate: settings.taxStartDate }),
    [allEntries, todayStr, settings.taxValue, settings.taxStartDate],
  )
  const todayTax = todayStr >= (settings.taxStartDate ?? '2000-01-01')
    ? (todayEntry?.entry_data?.autisticTaxRate ?? settings.taxValue ?? DEFAULT_AUTISTIC_TAX)
    : 0
  const todayFrame = Math.round(todayOpening + todayTax)
  // Colour allows red (a genuine crisis-adjacent opening); content falls red→orange
  // via openingBand, because the std_* tables only carry green/yellow/orange/purple.
  const todayBandRaw       = todayPurple.isPurple ? 'purple' : bandOf(todayFrame, settings.livedExperienceThresholds)
  const todayBandContent   = openingBand(todayOpening + todayTax, settings.livedExperienceThresholds, todayPurple.isPurple)
  const bandStatementColor = SKY_BAND_TEXT[todayBandRaw] || SKY_BAND_TEXT.green
  const voice = useTodaysSky({ userId: session.user.id, band: todayBandContent, timeWindow: greetingWindowFor(), todayStr })

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
      // Re-derive opening from the freshest chain at save time (safeguard against a
      // stale opening if a prior day was edited after this view mounted).
      const freshEntries = await loadAllEntriesV2(session.user.id)
      const opening = resolveOpeningBalance(dateStr, freshEntries,
        { taxValue: settings.taxValue, taxStartDate: settings.taxStartDate })
      if (opening !== openingBalance) { setOpeningBalance(opening); setYesterdayClosing(opening) }

      const ps    = getPurpleState(dateStr, freshEntries, settings.purpleFloors, pOver)
      const floor = ps.isPurple ? ps.floor : null
      const peak  = dayPeakDebit({ dateStr, openingBalance: opening, evts, gs, settings: { ...settings, taxValue: stampedTax } })
      const split = splitDayRows(rowsNow, peak, floor)
      if (rowsNow.length) {
        await persistDaySplit(split, rowsNow)
        regLog.applyRows(split)
      }
      const capacityTotal = rowsNow.length ? sumRegLog(split) : null

      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance: opening, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs,
        settings: { ...settings, taxValue: stampedTax },
        yesterdayClosing: opening, meltdown: melt,
        purpleOverride: pOver, regLogTotal: capacityTotal,
      })
      if (ps.isPurple && ps.floor != null) {
        entryData.livedExperience = Math.max(entryData.livedExperience, ps.floor)
        entryData.closingBalance  = Math.max(entryData.closingBalance,  ps.floor)
      }
      await saveEntryV2({ dateStr, entryData, peakDebit, userId: session.user.id })
      // A past-day edit cascades forward; today has nothing after it, so skip.
      if (dateStr !== todayStr) await recalculateFromDateV2(session.user.id, dateStr, settings)

      const reloaded = await loadAllEntriesV2(session.user.id)
      setAllEntries(reloaded)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('auto-save failed (v2)', err)
      setSaveStatus('auto-save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd    = (ev) => { const n=[...userEvents,ev];                   setUserEvents(n); autoSave({ userEvents: n }) }
  const onUpdate = (ev) => { const n=userEvents.map(x=>x.id===ev.id?ev:x); setUserEvents(n); autoSave({ userEvents: n }) }
  const onDelete = (id) => { const n=userEvents.filter(x=>x.id!==id);      setUserEvents(n); autoSave({ userEvents: n }) }
  const onWarning   = (k) => { const n={...warning,[k]:!warning[k]};       setWarning(n);   autoSave({ warning: n }) }
  const onGood      = (k) => { const n={...goodSigns,[k]:!goodSigns[k]};   setGoodSigns(n); autoSave({ goodSigns: n }) }
  const onRecovery  = (v) => { setRecovery(v); autoSave({ recovery: v }) }
  const onMeltdown  = ()  => { const n=!meltdown; setMeltdown(n); autoSave({ meltdown: n }) }
  const onPurpleOverride = (val) => { setPurpleOverride(val); autoSave({ purpleOverride: val }) }

  async function handleSeed(eventId, eventText) {
    try {
      await seedEntry({ userId: session.user.id, expression: eventText, sourceEventId: eventId, entryDate: dateStr })
      setSeededIds(prev => new Set([...prev, eventId]))
    } catch (err) {
      console.error('seed to L+F failed', err)
    }
  }

  function pageBack() { setAnchorEnd(prev => hedToDateStr(hedAddDays(hedParseDate(prev), -7))) }
  function pageForward() {
    setAnchorEnd(prev => {
      const next = hedToDateStr(hedAddDays(hedParseDate(prev), 7))
      return next > todayStr ? todayStr : next
    })
  }
  const canForward = anchorEnd < todayStr

  const skyNums = calcSkyNums(userEvents, regulation, openingBalance, { ...settings, taxValue: stampedTax }, goodSigns, dateStr, regLogTotal)
  const yesterdayStr = hedToDateStr(hedAddDays(hedParseDate(todayStr), -1))
  const [ , emo, eda] = dateStr.split('-').map(Number)
  const editingLabel = dateStr === todayStr ? 'today'
    : dateStr === yesterdayStr ? 'yesterday'
    : `${HED_MON[emo - 1]} ${eda}`

  return (
    <div className="tsky">
      {/* 1 — day greeting: normal weight is bold, non-italic, the loudest voice */}
      {voice.greeting && <div className="tsky-greeting">{voice.greeting}</div>}

      {/* 2 — band statement: italic, colour mirrors today's band (incl. red) */}
      {voice.bandLine && (
        <div className="tsky-bandline" style={{ color: bandStatementColor }}>{voice.bandLine}</div>
      )}

      {/* 3 — the rolling 7-day strip */}
      <RollingStrip
        anchorEnd={anchorEnd}
        selectedDate={dateStr}
        entryMap={entryMap}
        thresholds={settings.livedExperienceThresholds}
        todayStr={todayStr}
        allEntries={allEntries}
        purpleFloors={settings.purpleFloors}
        onSelect={setDateStr}
        onPrev={pageBack}
        onNext={pageForward}
        canForward={canForward}
      />
      <div className="tsky-editing">
        editing {editingLabel}
        {saveStatus && <span className="tsky-editing-status"> · {saveStatus}</span>}
      </div>

      {/* 4 — fading divider */}
      <FadingDivider />

      {/* 5 — quote: italic, design gold */}
      {voice.quote && <div className="tsky-quote">{voice.quote}</div>}

      {/* 6 — "today might want": quiet ink, small gold 4-point stars as separators */}
      {voice.suggestions?.length > 0 && (
        <div className="tsky-suggests">
          <div className="tsky-suglabel">today might want</div>
          <div className="tsky-sugline">
            {voice.suggestions.map((s, i) => (
              <span className="tsky-sugitem" key={i}>
                {i > 0 && <StarMark size={4} className="tsky-sugsep" />}
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 7 — fading divider */}
      <FadingDivider />

      {/* 8 — the day summary numbers, then the editor exactly as it exists today */}
      <div className="hed-sky-nums">
        <div className="hed-sky-num">
          <span className="hed-sky-val" style={{ color: SKY_COLORS.peak.number }}>
            {loading ? '·' : skyNums.peak}
          </span>
          <span className="hed-sky-lbl">peak</span>
        </div>
        <div className="hed-sky-sep">·</div>
        <div className="hed-sky-num">
          <span className="hed-sky-val" style={{ color: bandColor(Math.round(skyNums.le), settings.livedExperienceThresholds, purpleState.isPurple) }}>
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
              regLog={regLog}
              oldPip={showOldPip ? regulation : null}
              onEditAction={onEditAction}
              isPurple={purpleState.isPurple}
            />
            <WarningSigns flags={warning} onToggle={onWarning} />
            <MeltdownSection active={meltdown} onToggle={onMeltdown} goodSigns={goodSigns} onGood={onGood} />
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

// ─── TrackerV2Room shell ───
export default function TrackerV2Room({ onHome, onRoom, onEditAction, session, settings: settingsProp, onThresholdsChange, initialTab }) {
  const [settings, setSettings] = useState(settingsProp ?? null)
  const [tab,      setTab]      = useState(initialTab ?? 'today')
  const [editDate, setEditDate] = useState(null)
  const [todayResetKey,  setTodayResetKey]  = useState(0)
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
    if (t === 'today') { setTodayResetKey(k => k + 1) }
    setTab(t)
    if (t !== 'history') setEditDate(null)
  }

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
      <div style={{ display: tab === 'today' ? 'block' : 'none' }}>
        <TodayLanding session={session} settings={settings} resetKey={todayResetKey} onEditAction={onEditAction} />
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
                <button className="save-bar-btn jbtn" onClick={() => onRoom('engine-room')}>
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
