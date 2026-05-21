/**
 * TrackerV2Room — Capacity Tracker backed by energy_events + energy_daily
 *
 * Test UI on the tracker-v2 branch.  Works exactly like the live tracker but
 * reads/writes the new normalised tables instead of the energy_entries JSON blob.
 *
 * Access: add ?room=tracker-v2 to the app URL.
 * This file lives on the tracker-v2 branch — Cat's live tracker is unaffected.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../shared/lib/supabase.js'
import {
  loadEntryV2,
  loadAllEntriesV2,
  saveEntryV2,
  recalculateFromDateV2,
  dbToInternal,
  internalToDb,
} from '../../shared/lib/db-v2.js'
import { loadSettings } from '../../shared/lib/db.js'
import { taxActive, nonSleepRegTotal } from '../../shared/lib/math.js'

// ── Constants (same as live tracker) ──────────────────────────────────────

const AXIS_DEFS = [
  { k: 'E', name: 'emotional',      label: 'E' },
  { k: 'S', name: 'sensory',        label: 'S' },
  { k: 'P', name: 'predictability', label: 'P' },
  { k: 'M', name: 'masking',        label: 'M' },
  { k: 'X', name: 'EF',             label: 'X' },
]

const REG_CHANNELS = [
  { k: 'sensory', name: 'sensory comfort', cap: 4 },
  { k: 'av',      name: 'audio / visual',  cap: 5 },
  { k: 'env',     name: 'environment',     cap: 6 },
  { k: 'body',    name: 'body / rest',     cap: 5 },
]

const WARNING_SIGNS = [
  { k: 'skin',    name: 'skin reactions' },
  { k: 'vision',  name: 'vision reactions' },
  { k: 'thought', name: 'thought reactions' },
  { k: 'other',   name: 'other' },
]

const GOOD_SIGNS = [
  { k: 'flow',   name: 'flow activity' },
  { k: 'crisis', name: 'crisis recovery' },
]

const BUCKETS = ['late night', 'morning', 'midday', 'afternoon', 'evening', 'night']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDate(s) {
  const [y,m,d] = s.split('-').map(Number)
  const mon = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m-1]
  return `${y} · ${mon} · ${String(d).padStart(2,'0')}`
}
function nowBucket() {
  const h = new Date().getHours()
  if (h < 5) return 'late night'
  if (h < 11) return 'morning'
  if (h < 14) return 'midday'
  if (h < 18) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

// ── Inline styles ─────────────────────────────────────────────────────────

const C = {
  page:     { fontFamily: 'monospace', fontSize: 13, padding: 0, background: '#0f0f0f', color: '#e0e0e0', minHeight: '100vh' },
  header:   { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#141414', borderBottom: '1px solid #222' },
  title:    { fontSize: 16, fontWeight: 'bold', color: '#7eb8f7', flex: 1 },
  badge:    { background: '#1e3a1e', color: '#4ade80', fontSize: 10, padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5 },
  btn:      { background: '#2a2a2a', border: '1px solid #444', color: '#ccc', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  tabs:     { display: 'flex', borderBottom: '1px solid #222' },
  tab:      { padding: '8px 20px', cursor: 'pointer', fontSize: 12, color: '#666', borderBottom: '2px solid transparent' },
  tabA:     { color: '#7eb8f7', borderBottom: '2px solid #7eb8f7' },
  body:     { padding: 16, maxWidth: 680 },

  // Balance bar
  balRow:   { display: 'flex', gap: 0, marginBottom: 16, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden' },
  balCell:  { flex: 1, padding: '10px 12px', textAlign: 'center', borderRight: '1px solid #222' },
  balNum:   { fontSize: 22, fontWeight: 'bold', lineHeight: 1.1 },
  balLbl:   { fontSize: 10, color: '#666', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section
  secHead:  { display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 20, marginBottom: 10 },
  secTitle: { fontSize: 11, fontWeight: 'bold', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 },
  secCount: { fontSize: 11, color: '#555' },

  // Events
  evRow:    { padding: '8px 0', borderBottom: '1px solid #1a1a1a' },
  evTop:    { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 },
  evBucket: { color: '#555', fontSize: 11, minWidth: 72 },
  evText:   { flex: 1, color: '#ddd' },
  evPts:    { color: '#f4d49e', fontSize: 12 },
  evAxes:   { display: 'flex', gap: 12, paddingLeft: 80, flexWrap: 'wrap' },
  evAxis:   { display: 'flex', alignItems: 'center', gap: 4 },
  evAxisLbl:{ color: '#555', fontSize: 11, width: 14 },
  pip:      { width: 7, height: 7, borderRadius: 1, background: '#2a2a2a', cursor: 'pointer' },
  pipOn:    { background: '#7eb8f7' },
  evMeta:   { display: 'flex', gap: 8, paddingLeft: 80, marginTop: 4, flexWrap: 'wrap' },
  evTag:    { fontSize: 10, padding: '1px 5px', borderRadius: 3, background: '#1a2a1a', color: '#4ade80' },
  evTagSI:  { background: '#1a2040', color: '#7eb8f7' },
  evTagDel: { background: '#2a2010', color: '#f4d49e' },
  evTagCan: { background: '#2a1a1a', color: '#666' },
  evEditBtn:{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11, padding: '0 4px' },
  evCancelled: { textDecoration: 'line-through', color: '#444' },

  // Composer
  compWrap: { marginTop: 10, background: '#141414', borderRadius: 6, padding: 10 },
  compInput:{ width: '100%', background: '#1a1a1a', border: '1px solid #333', color: '#e0e0e0', padding: '6px 8px', borderRadius: 4, fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'monospace' },
  compAxes: { display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  compMeta: { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  compLabel:{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: '#888', cursor: 'pointer' },
  compSave: { background: '#1e3a5a', border: 'none', color: '#7eb8f7', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginLeft: 'auto' },
  compSel:  { background: '#1a1a1a', border: '1px solid #333', color: '#888', fontSize: 11, padding: '2px 4px', borderRadius: 3 },
  siBtnWrap:{ display: 'flex', gap: 4 },
  siBtn:    { background: '#1a1a2a', border: '1px solid #333', color: '#666', fontSize: 10, padding: '2px 6px', borderRadius: 3, cursor: 'pointer' },
  siBtnA:   { background: '#1a2040', border: '1px solid #7eb8f7', color: '#7eb8f7' },

  // Regulation
  regRow:   { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  regChan:  { display: 'flex', flexDirection: 'column', gap: 4 },
  regName:  { fontSize: 11, color: '#666', marginBottom: 2 },
  regPips:  { display: 'flex', gap: 3 },
  regPip:   { width: 10, height: 10, borderRadius: 2, background: '#2a2a2a', cursor: 'pointer' },
  regPipOn: { background: '#2a9d8f' },

  // Warning / good signs
  signRow:  { display: 'flex', gap: 8, flexWrap: 'wrap' },
  signBtn:  { background: '#1a1a1a', border: '1px solid #333', color: '#555', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  signBtnA: { background: '#2d1a1a', border: '1px solid #f87171', color: '#f87171' },
  goodBtnA: { background: '#1a2d1a', border: '1px solid #4ade80', color: '#4ade80' },

  // Status
  status:   { color: '#4ade80', fontSize: 11, marginLeft: 8 },
  statusErr:{ color: '#f87171', fontSize: 11, marginLeft: 8 },

  // Comparison banner
  compare:  { margin: '16px 0 0', padding: '8px 12px', borderRadius: 6, fontSize: 11 },
  compOk:   { background: '#1a2d1a', color: '#4ade80' },
  compMiss: { background: '#2d1a1a', color: '#f87171' },

  // History
  histDay:  { display: 'flex', gap: 12, alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' },
  histDate: { color: '#888', minWidth: 100, fontSize: 11 },
  histNums: { display: 'flex', gap: 16, flex: 1 },
  histNum:  { fontSize: 12 },
}

// ── Pip row (axis selectors) ────────────────────────────────────────────────

function PipRow({ value, max = 6, onSet, color = '#7eb8f7', readOnly = false }) {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{ ...C.pip, ...(i < value ? { ...C.pipOn, background: color } : {}), cursor: readOnly ? 'default' : 'pointer' }}
          onClick={readOnly ? undefined : () => onSet(i + 1 === value ? 0 : i + 1)}
        />
      ))}
    </span>
  )
}

// ── Composer ───────────────────────────────────────────────────────────────

function Composer({ onAdd }) {
  const [text,    setText]   = useState('')
  const [axes,    setAxes]   = useState({ E: 0, S: 0, P: 0, M: 0, X: 0 })
  const [delayed, setDelayed]= useState(false)
  const [flow,    setFlow]   = useState(false)
  const [siFlow,  setSiFlow] = useState(null)
  const [bucket,  setBucket] = useState(nowBucket())

  function reset() {
    setText(''); setAxes({ E:0,S:0,P:0,M:0,X:0 }); setDelayed(false); setFlow(false); setSiFlow(null); setBucket(nowBucket())
  }
  function save() {
    if (!text.trim()) return
    onAdd({ id: 'e' + Date.now(), bucket, text: text.trim(), ...axes, delayed, flow, siFlow, cancelled: false })
    reset()
  }
  function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } }
  function toggleSiFlow(opt) {
    const next = siFlow === opt ? null : opt
    setSiFlow(next)
    if (next != null) setFlow(true)
  }

  const total = axes.E + axes.S + axes.P + axes.M + axes.X

  return (
    <div style={C.compWrap}>
      <textarea
        style={C.compInput}
        placeholder="something happened…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={onKey}
        rows={2}
      />
      <div style={C.compAxes}>
        {AXIS_DEFS.map(({ k, name, label }) => (
          <div key={k} style={C.evAxis} title={name}>
            <span style={{ ...C.evAxisLbl, color: axes[k] > 0 ? '#7eb8f7' : '#555' }}>{label}</span>
            <PipRow value={axes[k]} onSet={v => setAxes(a => ({ ...a, [k]: v }))} />
          </div>
        ))}
        {total > 0 && <span style={{ color: '#f4d49e', fontSize: 11, alignSelf: 'center' }}>{total}pts</span>}
      </div>
      <div style={C.compMeta}>
        <select style={C.compSel} value={bucket} onChange={e => setBucket(e.target.value)}>
          {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <label style={C.compLabel}>
          <input type="checkbox" checked={delayed} onChange={e => setDelayed(e.target.checked)} />
          delayed
        </label>
        <label style={C.compLabel}>
          <input type="checkbox" checked={flow} onChange={e => setFlow(e.target.checked)} />
          flow
        </label>
        <span style={{ color: '#666', fontSize: 11 }}>SI flow:</span>
        <div style={C.siBtnWrap}>
          {['present', 'pulled'].map(opt => (
            <button key={opt} style={{ ...C.siBtn, ...(siFlow === opt ? C.siBtnA : {}) }}
              onClick={() => toggleSiFlow(opt)}>{opt}</button>
          ))}
        </div>
        <button style={C.compSave} onClick={save}>save</button>
      </div>
    </div>
  )
}

// ── EventRow ───────────────────────────────────────────────────────────────

function EventRow({ e, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(e)
  useEffect(() => { setDraft(e) }, [e])

  const total = (e.E||0)+(e.S||0)+(e.P||0)+(e.M||0)+(e.X||0)

  if (e.system) {
    return (
      <div style={C.evRow}>
        <div style={C.evTop}>
          <span style={C.evBucket}>{e.bucket}</span>
          <span style={{ ...C.evText, color: e.cancelled ? '#333' : '#555', fontStyle: 'italic', textDecoration: e.cancelled ? 'line-through' : 'none' }}>
            {e.text}
          </span>
          {!e.cancelled && <span style={{ ...C.evPts, color: '#666' }}>+{(e.S||0)}pts</span>}
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div style={{ ...C.evRow, background: '#141414', borderRadius: 4, padding: '8px 10px' }}>
        <textarea
          style={{ ...C.compInput, marginBottom: 8 }}
          value={draft.text}
          onChange={ev => setDraft(d => ({ ...d, text: ev.target.value }))}
          rows={2}
          autoFocus
        />
        <div style={C.compAxes}>
          {AXIS_DEFS.map(({ k, name, label }) => (
            <div key={k} style={C.evAxis} title={name}>
              <span style={{ ...C.evAxisLbl, color: draft[k] > 0 ? '#7eb8f7' : '#555' }}>{label}</span>
              <PipRow value={draft[k]} onSet={v => setDraft(d => ({ ...d, [k]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ ...C.compMeta, marginTop: 8 }}>
          <select style={C.compSel} value={draft.bucket} onChange={ev => setDraft(d => ({ ...d, bucket: ev.target.value }))}>
            {BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label style={C.compLabel}>
            <input type="checkbox" checked={!!draft.delayed} onChange={ev => setDraft(d => ({ ...d, delayed: ev.target.checked }))} />
            delayed
          </label>
          <label style={C.compLabel}>
            <input type="checkbox" checked={!!draft.flow} onChange={ev => setDraft(d => ({ ...d, flow: ev.target.checked }))} />
            flow
          </label>
          <label style={C.compLabel}>
            <input type="checkbox" checked={!!draft.cancelled} onChange={ev => setDraft(d => ({ ...d, cancelled: ev.target.checked }))} />
            cancelled
          </label>
          <div style={C.siBtnWrap}>
            {['present', 'pulled'].map(opt => (
              <button key={opt}
                style={{ ...C.siBtn, ...(draft.siFlow === opt ? C.siBtnA : {}) }}
                onClick={() => {
                  const next = draft.siFlow === opt ? null : opt
                  setDraft(d => ({ ...d, siFlow: next, flow: next != null ? true : d.flow }))
                }}>{opt}</button>
            ))}
          </div>
          <button style={{ ...C.evEditBtn, color: '#f87171' }} onClick={() => { if (window.confirm('delete?')) onDelete(e.id) }}>delete</button>
          <button style={C.evEditBtn} onClick={() => { setDraft(e); setEditing(false) }}>cancel</button>
          <button style={{ ...C.compSave }} onClick={() => { onUpdate(draft); setEditing(false) }}>save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={C.evRow} onClick={() => setEditing(true)} title="click to edit" role="button">
      <div style={C.evTop}>
        <span style={C.evBucket}>{e.bucket}</span>
        <span style={{ ...C.evText, ...(e.cancelled ? C.evCancelled : {}) }}>{e.text}</span>
        {!e.cancelled && total > 0 && <span style={C.evPts}>+{total}pts</span>}
        <button style={C.evEditBtn} onClick={ev => { ev.stopPropagation(); setEditing(true) }}>edit</button>
      </div>
      {(total > 0 || e.flow || e.siFlow) && (
        <div style={C.evAxes}>
          {AXIS_DEFS.map(({ k, label, name }) => e[k] > 0 && (
            <div key={k} style={C.evAxis} title={name}>
              <span style={{ ...C.evAxisLbl, color: '#7eb8f7' }}>{label}</span>
              <PipRow value={e[k]} readOnly />
            </div>
          ))}
          {e.flow   && <span style={C.evTag}>~ flow</span>}
          {e.siFlow && <span style={{ ...C.evTag, ...C.evTagSI }}>⟳ SI {e.siFlow}</span>}
          {e.delayed && <span style={{ ...C.evTag, ...C.evTagDel }}>delayed</span>}
          {e.cancelled && <span style={{ ...C.evTag, ...C.evTagCan }}>cancelled</span>}
        </div>
      )}
    </div>
  )
}

// ── Balance bar ────────────────────────────────────────────────────────────

function BalanceBar({ opening, userEvents, regulation, settings, dateStr, goodSigns }) {
  const { taxValue, taxStartDate } = settings
  const flowOverride = goodSigns?.flow ?? false
  const taxApplies = taxActive(dateStr, taxStartDate, userEvents) && !flowOverride

  let evPts = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    evPts += (e.E||0)+(e.S||0)+(e.P||0)+(e.M||0)+(e.X||0)
  }
  const taxPts = taxApplies ? taxValue : 0
  const peak   = opening + evPts + taxPts
  const reg    = nonSleepRegTotal(regulation)
  const siBon  = Math.round(
    userEvents.reduce((s, e) => e.siFlow && !e.cancelled
      ? s + (e.E||0)+(e.S||0)+(e.P||0)+(e.M||0)+(e.X||0) : s, 0) * 0.2
  )
  const lived  = Math.max(0, peak - reg - siBon)
  const closing = Math.max(0, peak - reg)

  const goldColor = '#d4a020'
  const tealColor = '#4ab8a0'
  const silverColor = '#c0c0d8'

  return (
    <div style={C.balRow}>
      <div style={{ ...C.balCell }}>
        <div style={{ ...C.balNum, color: '#888' }}>{opening}</div>
        <div style={C.balLbl}>opening</div>
      </div>
      <div style={{ ...C.balCell }}>
        <div style={{ ...C.balNum, color: goldColor }}>{peak}</div>
        <div style={C.balLbl}>peak{taxApplies ? ` (+${taxPts} tax)` : ''}</div>
      </div>
      <div style={{ ...C.balCell }}>
        <div style={{ ...C.balNum, color: tealColor }}>{reg}</div>
        <div style={C.balLbl}>regulation</div>
      </div>
      {siBon > 0 && (
        <div style={{ ...C.balCell }}>
          <div style={{ ...C.balNum, color: '#5abf7a' }}>−{siBon}</div>
          <div style={C.balLbl}>SI bonus</div>
        </div>
      )}
      <div style={{ ...C.balCell }}>
        <div style={{ ...C.balNum, color: silverColor }}>{lived}</div>
        <div style={C.balLbl}>lived exp</div>
      </div>
      <div style={{ ...C.balCell, borderRight: 'none' }}>
        <div style={{ ...C.balNum, color: '#e0e0e0' }}>{closing}</div>
        <div style={C.balLbl}>closing →</div>
      </div>
    </div>
  )
}

// ── Day editor ─────────────────────────────────────────────────────────────

function DayEditor({ session, settings, dateStr, isToday, onBack, oldClosing }) {
  const [loading,      setLoading]      = useState(true)
  const [userEvents,   setUserEvents]   = useState([])
  const [regulation,   setRegulation]   = useState({ sensory: 0, av: 0, env: 0, body: 0 })
  const [recovery,     setRecovery]     = useState(false)
  const [warning,      setWarning]      = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns,    setGoodSigns]    = useState({ flow: false, crisis: false })
  const [meltdown,     setMeltdown]     = useState(false)
  const [openingBal,   setOpeningBal]   = useState(0)
  const [yesterClosing,setYesterClosing]= useState(0)
  const [saveStatus,   setSaveStatus]   = useState('')
  const [oldPeak,      setOldPeak]      = useState(null)  // from energy_entries for comparison

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const entry = await loadEntryV2(dateStr, session.user.id)
        if (entry) {
          const state = dbToInternal(entry)
          setUserEvents(state.userEvents)
          setRegulation(state.regulation)
          setRecovery(state.recovery)
          setWarning(state.warning)
          setGoodSigns(state.goodSigns)
          setMeltdown(state.meltdown)
          setOpeningBal(state.openingBalance)
          setYesterClosing(entry.entry_data.closingBalance ?? 0)
        } else if (isToday) {
          // Today: get opening from yesterday's new-table closing
          const yest = await loadEntryV2(yesterdayStr(), session.user.id)
          if (yest) {
            const closing = yest.entry_data.closingBalance ?? 0
            setOpeningBal(Math.max(0, closing - 5))
            setYesterClosing(closing)
          }
        }

        // Fetch old closing from energy_entries for comparison banner
        const { data: oldRow } = await supabase
          .from('energy_entries')
          .select('entry_data')
          .eq('user_id', session.user.id)
          .eq('date', dateStr)
          .maybeSingle()
        if (oldRow) setOldPeak(oldRow.entry_data?.closingBalance ?? null)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [dateStr])

  // Build allEvents including system autistic-tax entry (same as live tracker)
  const anyFlow = userEvents.some(e => !e.cancelled && (e.flow || e.siFlow != null)) || goodSigns.flow
  const taxApplies = taxActive(dateStr, settings.taxStartDate, userEvents) && !goodSigns.flow
  const allEvents = [
    ...userEvents,
    {
      id: 'autistic-tax',
      bucket: 'evening',
      text: anyFlow ? 'autistic tax — cancelled by flow state' : 'autistic tax',
      E: 0, S: taxApplies ? settings.taxValue : 0, P: 0, M: 0, X: 0,
      delayed: false, flow: false, cancelled: !taxApplies,
      system: true,
    },
  ]

  async function autoSave(patch = {}) {
    const evts = patch.userEvents ?? userEvents
    const reg  = patch.regulation ?? regulation
    const rec  = patch.recovery   ?? recovery
    const warn = patch.warning    ?? warning
    const gs   = patch.goodSigns  ?? goodSigns
    const melt = patch.meltdown   ?? meltdown
    setSaveStatus('saving…')
    try {
      const { entryData } = internalToDb({
        dateStr, openingBalance: openingBal, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs, settings, yesterdayClosing: yesterClosing, meltdown: melt,
      })
      await saveEntryV2({ dateStr, entryData, userId: session.user.id })
      if (!isToday) await recalculateFromDateV2(session.user.id, dateStr)
      setSaveStatus('saved ✓')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('save failed', err)
      setSaveStatus('save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd    = ev => { const n=[...userEvents,ev];         setUserEvents(n); autoSave({ userEvents: n }) }
  const onUpdate = ev => { const n=userEvents.map(x=>x.id===ev.id?ev:x); setUserEvents(n); autoSave({ userEvents: n }) }
  const onDelete = id => { const n=userEvents.filter(x=>x.id!==id);      setUserEvents(n); autoSave({ userEvents: n }) }
  const onReg    = (k,v)=> { const n={...regulation,[k]:v};      setRegulation(n); autoSave({ regulation: n }) }
  const onWarn   = k => { const n={...warning,[k]:!warning[k]};  setWarning(n);   autoSave({ warning: n }) }
  const onGood   = k => { const n={...goodSigns,[k]:!goodSigns[k]}; setGoodSigns(n); autoSave({ goodSigns: n }) }
  const onRec    = v => { setRecovery(v); autoSave({ recovery: v }) }
  const onMelt   = () => { const n=!meltdown; setMeltdown(n); autoSave({ meltdown: n }) }

  // Compute current closing for comparison
  let evPts = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    evPts += (e.E||0)+(e.S||0)+(e.P||0)+(e.M||0)+(e.X||0)
  }
  const taxPts = taxApplies ? settings.taxValue : 0
  const currentPeak = openingBal + evPts + taxPts
  const currentReg  = nonSleepRegTotal(regulation)
  const currentClosing = Math.max(0, currentPeak - currentReg)

  const closingMatch = oldPeak === null ? null : (currentClosing === oldPeak)

  if (loading) return <div style={{ color: '#555', padding: 16 }}>loading…</div>

  return (
    <>
      {onBack && (
        <div style={{ marginBottom: 12 }}>
          <button style={C.btn} onClick={onBack}>← back</button>
          <span style={{ marginLeft: 12, color: '#888', fontSize: 13 }}>{fmtDate(dateStr)}</span>
        </div>
      )}

      <BalanceBar
        opening={openingBal}
        userEvents={userEvents}
        regulation={regulation}
        settings={settings}
        dateStr={dateStr}
        goodSigns={goodSigns}
      />

      {/* Events */}
      <div style={C.secHead}>
        <span style={C.secTitle}>events</span>
        <span style={C.secCount}>{userEvents.filter(e=>!e.cancelled).length} active</span>
        {saveStatus && (
          <span style={saveStatus.includes('failed') ? C.statusErr : C.status}>{saveStatus}</span>
        )}
      </div>
      {allEvents.map(e => (
        <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
      <Composer onAdd={onAdd} />

      {/* Regulation */}
      <div style={C.secHead}>
        <span style={C.secTitle}>regulation</span>
        <label style={{ ...C.compLabel, marginLeft: 'auto' }}>
          <input type="checkbox" checked={recovery} onChange={e => onRec(e.target.checked)} />
          <span style={{ fontSize: 11, color: '#666' }}>recovery sleep</span>
        </label>
      </div>
      <div style={C.regRow}>
        {REG_CHANNELS.map(ch => (
          <div key={ch.k} style={C.regChan}>
            <div style={C.regName}>{ch.name}</div>
            <div style={C.regPips}>
              {Array.from({ length: ch.cap }, (_, i) => (
                <span key={i}
                  style={{ ...C.regPip, ...(i < (regulation[ch.k]||0) ? C.regPipOn : {}) }}
                  onClick={() => onReg(ch.k, i+1 === regulation[ch.k] ? 0 : i+1)}
                />
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{regulation[ch.k]||0}/{ch.cap}</div>
          </div>
        ))}
      </div>

      {/* Good signs */}
      <div style={C.secHead}><span style={C.secTitle}>good signs</span></div>
      <div style={C.signRow}>
        {GOOD_SIGNS.map(s => (
          <button key={s.k}
            style={{ ...C.signBtn, ...(goodSigns[s.k] ? C.goodBtnA : {}) }}
            onClick={() => onGood(s.k)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Warning signs */}
      <div style={C.secHead}><span style={C.secTitle}>warning signs</span></div>
      <div style={C.signRow}>
        {WARNING_SIGNS.map(s => (
          <button key={s.k}
            style={{ ...C.signBtn, ...(warning[s.k] ? C.signBtnA : {}) }}
            onClick={() => onWarn(s.k)}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Meltdown */}
      <div style={C.secHead}><span style={C.secTitle}>meltdown / shutdown</span></div>
      <button style={{ ...C.signBtn, ...(meltdown ? C.signBtnA : {}) }} onClick={onMelt}>
        {meltdown ? '▽ yes' : '▽ no'}
      </button>

      {/* Comparison with old energy_entries */}
      {oldPeak !== null && (
        <div style={{ ...C.compare, ...(closingMatch ? C.compOk : C.compMiss) }}>
          {closingMatch
            ? `✓ closing balance matches energy_entries (both: ${currentClosing})`
            : `✗ closing mismatch — new: ${currentClosing}  |  old: ${oldPeak}`
          }
        </div>
      )}
    </>
  )
}

// ── History list ────────────────────────────────────────────────────────────

function HistoryList({ session, onSelect }) {
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    loadAllEntriesV2(session.user.id).then(setEntries).catch(() => setEntries([]))
  }, [])

  if (!entries) return <div style={{ color: '#555', padding: 16 }}>loading history…</div>

  return (
    <div>
      <div style={{ ...C.secHead, marginTop: 8 }}>
        <span style={C.secTitle}>all days — newest first</span>
        <span style={C.secCount}>{entries.length} days in new tables</span>
      </div>
      {entries.map(e => {
        const d = e.entry_data
        return (
          <div key={e.date} style={C.histDay} onClick={() => onSelect(e.date)}>
            <span style={C.histDate}>{fmtDate(e.date)}</span>
            <div style={C.histNums}>
              <span style={{ ...C.histNum, color: '#888' }}>↑ {d.openingBalance}</span>
              <span style={{ ...C.histNum, color: '#e0e0e0' }}>↓ {d.closingBalance}</span>
              <span style={{ ...C.histNum, color: '#555' }}>{d.events?.length ?? 0} events</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────

export default function TrackerV2Room({ onHome }) {
  const [session,  setSession]  = useState(null)
  const [settings, setSettings] = useState(null)
  const [tab,      setTab]      = useState('today')   // 'today' | 'history'
  const [editDate, setEditDate] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      const cfg = await loadSettings()
      setSettings(cfg)
    }
    init()
  }, [])

  if (!session || !settings) {
    return <div style={{ ...C.page, padding: 24, color: '#555' }}>loading…</div>
  }

  const today = todayStr()

  return (
    <div style={C.page}>
      {/* Header */}
      <div style={C.header}>
        <div style={C.title}>Capacity Tracker V2</div>
        <span style={C.badge}>tracker-v2 branch · new tables</span>
        <button style={C.btn} onClick={onHome}>← back to hub</button>
      </div>

      {/* Tabs */}
      {!editDate && (
        <div style={C.tabs}>
          {['today', 'history'].map(t => (
            <div key={t}
              style={{ ...C.tab, ...(tab === t ? C.tabA : {}) }}
              onClick={() => setTab(t)}>
              {t}
            </div>
          ))}
        </div>
      )}

      <div style={C.body}>
        {tab === 'today' && !editDate && (
          <>
            <div style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>{fmtDate(today)}</div>
            <DayEditor
              session={session}
              settings={settings}
              dateStr={today}
              isToday={true}
            />
          </>
        )}

        {tab === 'history' && !editDate && (
          <HistoryList
            session={session}
            onSelect={date => { setEditDate(date); setTab('history') }}
          />
        )}

        {editDate && (
          <DayEditor
            session={session}
            settings={settings}
            dateStr={editDate}
            isToday={editDate === today}
            onBack={() => setEditDate(null)}
          />
        )}
      </div>
    </div>
  )
}
