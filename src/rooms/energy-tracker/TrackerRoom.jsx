import { useState, useEffect } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import TrackerHistory from './TrackerHistory.jsx'
import { supabase } from '../../shared/lib/supabase.js'
import { loadEntry, dbToInternal, internalToDb, saveEntry, saveThresholds, todayDateStr, yesterdayDateStr } from '../../shared/lib/db.js'
import { taxActive, nonSleepRegTotal } from '../../shared/lib/math.js'

const AXIS_DEFS = [
  { k: 'E', name: 'emotional', meaning: 'how strong was the emotional charge of this event?' },
  { k: 'S', name: 'sensory',   meaning: 'how loud was the sensory load — sound, light, touch, demand on the body?' },
  { k: 'V', name: 'veracity',  meaning: 'did things go the way they were supposed to? did people / systems follow through as expected?' },
  { k: 'X', name: 'EF',        meaning: 'how much executive function did this cost — planning, switching, holding it together?' },
]

const REG_CHANNELS = [
  { k: 'sensory', name: 'sensory comfort', cap: 4 },
  { k: 'av',      name: 'audio / visual',  cap: 5 },
  { k: 'env',     name: 'environment',     cap: 6 },
  { k: 'body',    name: 'body / rest',     cap: 5 },
  { k: 'sleep',   name: 'sleep reset',     cap: 5 },
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

function todayDisplayStr() {
  const d = new Date()
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
  return `${d.getFullYear()} · ${m} · ${d.getDate().toString().padStart(2,'0')}`
}

// ─── AxisLabel ───
function AxisLabel({ axisKey, className }) {
  const [open, setOpen] = useState(false)
  const def = AXIS_DEFS.find(a => a.k === axisKey)
  return (
    <span className={`axis-label ${className || ''}`}
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
      {axisKey}
      {open && (
        <span className="axis-tip" onClick={e => e.stopPropagation()}>
          <b>{def.name}</b>
          <span>{def.meaning}</span>
          <i className="dismiss" onClick={() => setOpen(false)}>tap to dismiss</i>
        </span>
      )}
    </span>
  )
}

// ─── EventRow ───
function EventRow({ e, onUpdate, onDelete }) {
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
                    onClick={() => setDraft(d => ({ ...d, siFlow: d.siFlow === opt ? null : opt }))}>
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
      </div>
    </div>
  )
}

// ─── Composer ───
function Composer({ onAdd }) {
  const [text, setText] = useState('')
  const [axes, setAxes] = useState({ E: 0, S: 0, V: 0, X: 0 })
  const [delayed, setDelayed] = useState(false)
  const [flow, setFlow] = useState(false)
  const [siFlow, setSiFlow] = useState(null)
  const [bucket, setBucket] = useState(nowBucket())

  const set = (k, v) => setAxes(a => ({ ...a, [k]: a[k] === v ? 0 : v }))
  function reset() {
    setText(''); setAxes({ E: 0, S: 0, V: 0, X: 0 })
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
                onClick={() => setSiFlow(s => s === opt ? null : opt)}>
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

// ─── RegChannel ───
function RegChannel({ chan, value, onSet }) {
  const useDial = chan.cap > 8
  if (useDial) {
    const pct = value / chan.cap
    const r = 22, c = 2 * Math.PI * r
    return (
      <div className="reg-channel reg-dial-wrap">
        <div className="reg-dial">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(120,170,220,0.18)" strokeWidth="3"/>
            <circle cx="28" cy="28" r={r} fill="none"
              stroke="var(--reg-blue)" strokeWidth="3"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              transform="rotate(-90 28 28)"
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset .5s ease' }}
            />
            <text x="28" y="32" textAnchor="middle"
              fontFamily="Cagliostro, serif" fontSize="16"
              fill="var(--ink)">{value}</text>
          </svg>
          <div className="reg-dial-buttons">
            <button onClick={() => onSet(Math.max(0, value - 1))} aria-label="decrement">−</button>
            <button onClick={() => onSet(Math.min(chan.cap, value + 1))} aria-label="increment">+</button>
          </div>
        </div>
        <div className="reg-name">{chan.name}</div>
        <div className="reg-cap">/{chan.cap}</div>
      </div>
    )
  }
  return (
    <div className="reg-channel">
      <div className="reg-pips">
        {Array.from({ length: chan.cap }, (_, i) => (
          <span key={i}
                className={`reg-pip ${i < value ? 'on' : ''}`}
                onClick={() => onSet(i + 1 === value ? i : i + 1)}
                title={`${chan.name}: ${i + 1}/${chan.cap}`} />
        ))}
      </div>
      <div className="reg-name">{chan.name}</div>
      <div className="reg-cap">{value}/{chan.cap}</div>
    </div>
  )
}

// ─── Regulation (Tending) ───
function Regulation({ values, onChange, recovery, onRecovery, goodSigns, onGood }) {
  return (
    <section className="reg-section">
      <div className="ledger-head">
        <div className="ledger-title">tending</div>
        <label className="recovery-toggle">
          <input type="checkbox" checked={recovery} onChange={e => onRecovery(e.target.checked)} />
          <span>recovery sleep <i>(beyond regular sleep)</i></span>
        </label>
      </div>
      <div className="reg-row">
        {REG_CHANNELS.map(c => (
          <RegChannel key={c.k} chan={c} value={values[c.k] || 0}
            onSet={v => onChange(c.k, v)} />
        ))}
      </div>
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
        <div className="ledger-title">meltdown / shutdown</div>
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

// ─── Sky ───
function Sky({ userEvents, regulation, openingBalance, settings, flowOverride = false, dateStr }) {
  const { taxValue, thresholds, taxStartDate, livedExperienceThresholds } = settings
  const leThr = livedExperienceThresholds || { yellow: 12, critical: 22 }
  const taxApplies = taxActive(dateStr || todayDateStr(), taxStartDate, userEvents) && !flowOverride
  const taxPoints = taxApplies ? taxValue : 0

  const axisSums = { E: 0, S: 0, V: 0, X: 0 }
  for (const e of userEvents) {
    if (e.cancelled) continue
    axisSums.E += e.E || 0
    axisSums.S += e.S || 0
    axisSums.V += e.V || 0
    axisSums.X += e.X || 0
  }
  const evPts = axisSums.E + axisSums.S + axisSums.V + axisSums.X
  const peak = openingBalance + evPts + taxPoints
  const nonSleepReg = nonSleepRegTotal(regulation)

  const totalSICredit = userEvents.reduce((sum, e) => {
    if (!e.siFlow || e.cancelled) return sum
    return sum + ((e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)) * 0.3
  }, 0)
  const siFlowActive = userEvents.some(e => !e.cancelled && e.siFlow != null)
  const livedExperience = Math.max(0, peak - nonSleepReg - totalSICredit)

  const highestAxis = Object.entries(axisSums).reduce((a, b) => b[1] > a[1] ? b : a, ['E', 0])

  let leColor = '#5abf7a'
  if (livedExperience >= leThr.critical) leColor = '#c94a4a'
  else if (livedExperience >= leThr.yellow) leColor = '#c9a84c'

  const PEAK_BREAKDOWN = [
    { k: 'E', name: 'emotional' },
    { k: 'S', name: 'sensory' },
    { k: 'X', name: 'EF' },
    { k: 'V', name: 'veracity' },
  ]

  return (
    <div className="sky">
      <div className="sky-three-col">
        {/* Left: Today's Peak */}
        <div className="sky-col">
          <div className="sky-col-label">today's peak</div>
          <div className="sky-col-value" style={{ fontSize: '52px', color: '#e8dfc0' }}>{peak}</div>
          <div className="sky-breakdown">
            {PEAK_BREAKDOWN.map(({ k, name }) => (
              <div key={k} className={`sky-breakdown-row${highestAxis[0] === k && highestAxis[1] > 0 ? ' highlight-amber' : ''}`}>
                <span className="sky-bd-name">{name}</span>
                <span className="sky-bd-sep">·</span>
                <span className="sky-bd-val">{axisSums[k]}</span>
              </div>
            ))}
            <div className="sky-bd-divider" />
            <div className="sky-breakdown-row dimmer">
              <span className="sky-bd-name">autistic tax</span>
              <span className="sky-bd-sep">·</span>
              <span className="sky-bd-val">+{taxPoints}</span>
            </div>
          </div>
          {openingBalance > 0 && (
            <div className="sky-carry-in">opening carry-in: {openingBalance}</div>
          )}
        </div>

        <div className="sky-vert-divider" />

        {/* Centre: Lived Experience */}
        <div className="sky-col sky-col-centre">
          <div className="sky-col-label">lived experience</div>
          <div className="sky-col-value" style={{ fontSize: '72px', color: leColor }}>{livedExperience}</div>
          <div className="sky-le-caption">
            <span>{peak} peak</span>
            <span className="sky-le-sep">·</span>
            <span>−{nonSleepReg} reg</span>
            <span className="sky-le-sep">·</span>
            {siFlowActive
              ? <span style={{ color: '#5abf7a' }}>−{Math.round(totalSICredit * 10) / 10} SI</span>
              : <span style={{ color: 'var(--ink-faint)' }}>no SI</span>
            }
          </div>
        </div>

        <div className="sky-vert-divider" />

        {/* Right: Regulation */}
        <div className="sky-col">
          <div className="sky-col-label">regulation</div>
          <div className="sky-col-value" style={{ fontSize: '52px', color: '#e8dfc0' }}>{nonSleepReg}</div>
          <div className="sky-breakdown">
            {REG_CHANNELS.map(c => {
              const cur = regulation[c.k] || 0
              const underTended = (c.cap - cur) > 2
              return (
                <div key={c.k} className={`sky-breakdown-row${underTended ? ' highlight-teal' : ''}`}>
                  <span className="sky-bd-name">{c.name}</span>
                  <span className="sky-bd-sep">·</span>
                  <span className="sky-bd-val">{cur}/{c.cap}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TrackerDayEditor ───
function TrackerDayEditor({ session, settings, dateStr: dateProp, onBack }) {
  const dateStr = dateProp || todayDateStr()
  const isToday = dateStr === todayDateStr()
  const [loading, setLoading] = useState(true)
  const [userEvents, setUserEvents] = useState([])
  const [regulation, setRegulation] = useState({ sensory: 0, av: 0, env: 0, body: 0, sleep: 5 })
  const [recovery, setRecovery] = useState(false)
  const [warning, setWarning] = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns, setGoodSigns] = useState({ flow: false, crisis: false })
  const [meltdown, setMeltdown] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    async function init() {
      try {
        const existing = await loadEntry(dateStr, session.user.id)
        if (existing) {
          const state = dbToInternal(existing)
          if (isToday) {
            const yest = await loadEntry(yesterdayDateStr(), session.user.id)
            if (yest) {
              const d = yest.entry_data
              const closing = d.closingBalance ?? 0
              const sleep = d.sleepReset ?? 0
              const carryover = d.carryoverBonus ?? 0
              setOpeningBalance(Math.max(0, closing - sleep + carryover))
              setYesterdayClosing(closing)
            }
          } else {
            setOpeningBalance(state.openingBalance)
            setYesterdayClosing(existing.entry_data.yesterdayClosing ?? state.openingBalance)
          }
          setUserEvents(state.userEvents)
          setRegulation(state.regulation)
          setRecovery(state.recovery)
          setWarning(state.warning)
          setGoodSigns(state.goodSigns)
          setMeltdown(state.meltdown)
        } else if (isToday) {
          const yest = await loadEntry(yesterdayDateStr(), session.user.id)
          if (yest) {
            const d = yest.entry_data
            const closing = d.closingBalance ?? 0
            const sleep = d.sleepReset ?? 0
            const carryover = d.carryoverBonus ?? 0
            setOpeningBalance(Math.max(0, closing - sleep + carryover))
            setYesterdayClosing(closing)
          }
        }
      } catch (err) {
        console.error('failed to load entry', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [dateStr])

  const allEvents = [
    ...userEvents,
    ...((() => {
      const anyFlow = userEvents.some(e => e.flow) || goodSigns.flow
      const applies = taxActive(dateStr, settings.taxStartDate, userEvents) && !goodSigns.flow
      return [{
        id: 'autistic-tax',
        bucket: 'evening',
        text: anyFlow ? 'autistic tax — cancelled by flow state' : 'autistic tax',
        E: 0, S: applies ? settings.taxValue : 0, V: 0, X: 0,
        delayed: false, flow: false, cancelled: !applies,
        system: true,
      }]
    })()),
  ]

  async function handleSave() {
    setSaving(true)
    setSaveStatus('saving…')
    try {
      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance, userEvents, regulation,
        recovery, warning, goodSigns, settings, yesterdayClosing, meltdown,
      })
      await saveEntry({ dateStr, entryData, peakDebit, userId: session.user.id })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      console.error('save failed', err)
      setSaveStatus('something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="history-loading">opening the almanac…</div>
  }

  const onAdd = (ev) => setUserEvents(es => [...es, ev])
  const onUpdate = (ev) => setUserEvents(es => es.map(x => x.id === ev.id ? ev : x))
  const onDelete = (id) => setUserEvents(es => es.filter(x => x.id !== id))
  const onRegChange = (k, v) => setRegulation(r => ({ ...r, [k]: v }))
  const onWarning = (k) => setWarning(s => ({ ...s, [k]: !s[k] }))
  const onGood = (k) => setGoodSigns(s => ({ ...s, [k]: !s[k] }))

  return (
    <>
      {onBack && (
        <button className="back-link" onClick={onBack}>← back to history</button>
      )}
      <Sky
        userEvents={userEvents}
        regulation={regulation}
        openingBalance={openingBalance}
        settings={settings}
        flowOverride={goodSigns.flow}
        dateStr={dateStr}
      />

      <div className="ledger-head">
        <div className="ledger-title">events</div>
        <div className="ledger-count">{userEvents.length} so far</div>
      </div>

      <div className="events">
        {allEvents.map(e => (
          <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      <Composer onAdd={onAdd} />

      <Regulation
        values={regulation}
        onChange={onRegChange}
        recovery={recovery}
        onRecovery={setRecovery}
        goodSigns={goodSigns}
        onGood={onGood}
      />

      <WarningSigns flags={warning} onToggle={onWarning} />

      <MeltdownSection active={meltdown} onToggle={() => setMeltdown(v => !v)} />

      <div className="save-bar">
        <span className="save-bar-status">{saveStatus}</span>
        <button className="save-bar-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'saving…' : isToday ? 'save today' : 'save entry'}
        </button>
      </div>
    </>
  )
}

// ─── ThresholdSettings ───
function ThresholdSettings({ settings, onThresholdsChange }) {
  const [yellow, setYellow] = useState(settings.thresholds.yellow)
  const [critical, setCritical] = useState(settings.thresholds.critical)
  const [leYellow, setLeYellow] = useState(settings.livedExperienceThresholds?.yellow ?? 12)
  const [leCritical, setLeCritical] = useState(settings.livedExperienceThresholds?.critical ?? 22)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSave() {
    setSaving(true)
    setStatus('')
    try {
      const updated = {
        yellow: Number(yellow), critical: Number(critical),
        leYellow: Number(leYellow), leCritical: Number(leCritical),
      }
      await saveThresholds(updated)
      onThresholdsChange(updated)
      setStatus('saved')
      setTimeout(() => setStatus(''), 3000)
    } catch {
      setStatus('failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-section">
      <div className="ledger-head">
        <div className="ledger-title">thresholds</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>yellow threshold</label>
          <div className="settings-field-desc">day reads as overcast above this</div>
        </div>
        <input type="number" className="settings-number-input" value={yellow} min={1} onChange={e => setYellow(e.target.value)} />
      </div>
      <div className="settings-field-row">
        <div>
          <label>critical threshold</label>
          <div className="settings-field-desc">eclipse triggers at or above this</div>
        </div>
        <input type="number" className="settings-number-input" value={critical} min={1} onChange={e => setCritical(e.target.value)} />
      </div>

      <div className="settings-divider" />
      <div className="ledger-head" style={{ marginTop: '20px' }}>
        <div className="ledger-title">lived experience thresholds</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>lived experience yellow threshold</label>
          <div className="settings-field-desc">day reads as caution above this</div>
        </div>
        <input type="number" className="settings-number-input" value={leYellow} min={1} onChange={e => setLeYellow(e.target.value)} />
      </div>
      <div className="settings-field-row">
        <div>
          <label>lived experience critical threshold</label>
          <div className="settings-field-desc">day reads as critical above this</div>
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

// ─── TrackerRoom shell ───
export default function TrackerRoom({ onHome, session, settings, onThresholdsChange }) {
  const [tab, setTab] = useState('today')
  const [editDate, setEditDate] = useState(null)

  function handleTabChange(t) {
    setTab(t)
    if (t !== 'history') setEditDate(null)
  }

  return (
    <>
      <div className="room-head">
        <h2 className="room-title">Energy Tracker</h2>
        <RoomMark date={todayDisplayStr()} onHome={onHome} />
      </div>
      <div className="room-tabs">
        {['today', 'horizon', 'history', 'settings'].map(t => (
          <div key={t}
               className={`room-tab ${tab === t ? 'active' : ''}`}
               onClick={() => handleTabChange(t)}>
            {t}
          </div>
        ))}
      </div>

      {/* Today stays mounted so unsaved state survives tab switches */}
      <div style={{ display: tab === 'today' ? '' : 'none' }}>
        <TrackerDayEditor session={session} settings={settings} />
      </div>
      {tab === 'horizon' && <div className="placeholder">horizon — coming next</div>}
      {tab === 'history' && !editDate && (
        <TrackerHistory settings={settings} session={session} onEditDate={date => setEditDate(date)} />
      )}
      {tab === 'history' && editDate && (
        <TrackerDayEditor
          session={session}
          settings={settings}
          dateStr={editDate}
          onBack={() => setEditDate(null)}
        />
      )}
      {tab === 'settings' && (
        <>
          <ThresholdSettings settings={settings} onThresholdsChange={onThresholdsChange} />
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
