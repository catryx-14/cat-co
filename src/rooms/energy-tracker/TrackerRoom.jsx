import { useState, useEffect, useMemo } from 'react'
import RoomMark from '../../shared/components/RoomMark.jsx'
import TrackerHistory from './TrackerHistory.jsx'
import { supabase } from '../../shared/lib/supabase.js'
import { loadEntry, loadAllEntries, dbToInternal, internalToDb, saveEntry, saveThresholds, recalculateAllEntries, recalculateFromDate, todayDateStr, yesterdayDateStr } from '../../shared/lib/db.js'
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

const SKY_COLORS = {
  peak: {
    id: 'sky-gold',
    // Gold leaf: deep shadow → warm body → bright → near-white sheen → back down
    ringStops: [
      { o: '0%',   c: '#1c0e00' },
      { o: '14%',  c: '#6a3e04' },
      { o: '30%',  c: '#a8680e' },
      { o: '48%',  c: '#d4901a' },
      { o: '60%',  c: '#f4cc3a' },
      { o: '67%',  c: '#fff8a0' },
      { o: '76%',  c: '#e0b028' },
      { o: '89%',  c: '#7a4a08' },
      { o: '100%', c: '#1c0e00' },
    ],
    glowColor: '#fffce8',
    glowDuration: 28,
    barMid: '#d4a020',
    number: '#d4a020',
    star: '#e8c040',
  },
  le: {
    id: 'sky-silver',
    // Polished silver: dark steel → cool grey → bright → near-white → grey → shadow
    ringStops: [
      { o: '0%',   c: '#18182a' },
      { o: '14%',  c: '#50506a' },
      { o: '30%',  c: '#9898b0' },
      { o: '48%',  c: '#c8c8dc' },
      { o: '60%',  c: '#e8e8f4' },
      { o: '67%',  c: '#ffffff' },
      { o: '76%',  c: '#cccce0' },
      { o: '89%',  c: '#606078' },
      { o: '100%', c: '#1c1c2c' },
    ],
    glowColor: '#ffffff',
    glowDuration: 38,
    barMid: '#c8c8d8',
    number: '#e0e0f0',
    star: '#d8d8ec',
  },
  reg: {
    id: 'sky-teal',
    // Patinated teal metal: deep verdigris → teal body → bright aqua → near-white mint → shadow
    ringStops: [
      { o: '0%',   c: '#061e1a' },
      { o: '14%',  c: '#1a5e52' },
      { o: '30%',  c: '#228878' },
      { o: '48%',  c: '#30aa92' },
      { o: '60%',  c: '#50d0b0' },
      { o: '67%',  c: '#a8fff0' },
      { o: '76%',  c: '#3ab898' },
      { o: '89%',  c: '#1a6055' },
      { o: '100%', c: '#061e1a' },
    ],
    glowColor: '#c8fff4',
    glowDuration: 50,
    barMid: '#2a9d8f',
    number: '#4ab8a0',
    star: '#40c8a8',
  },
}

// Stars: { a: angle from top clockwise °, r: radius from centre, sz: outer half-size, t: 's'|'d' }
// Radii scaled for 200px (Peak/Reg) and 260px (LE) circles
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

// Mobile stars: { x, y: px in bar SVG coord space, sz, t, op }
// Each constellation designed to feel scattered and organic — no repeating x/y rhythm
const PEAK_MOB_STARS = [
  { x: 9,  y: 6,  sz: 5,   t: 's', op: 0.72 },
  { x: 26, y: 11, sz: 3,   t: 's', op: 0.58 },
  { x: 18, y: 15, sz: 1.8, t: 'd', op: 0.40 },
  { x: 31, y: 29, sz: 4.5, t: 's', op: 0.65 },
  { x: 12, y: 38, sz: 1.5, t: 'd', op: 0.32 },
  { x: 7,  y: 47, sz: 6,   t: 's', op: 0.75 },
  { x: 28, y: 53, sz: 2,   t: 'd', op: 0.50 },
  { x: 20, y: 61, sz: 3.5, t: 's', op: 0.60 },
  { x: 9,  y: 72, sz: 1.5, t: 'd', op: 0.38 },
  { x: 25, y: 80, sz: 4,   t: 's', op: 0.68 },
  { x: 15, y: 87, sz: 1.5, t: 'd', op: 0.42 },
]
const LE_MOB_STARS = [
  { x: 22, y: 4,  sz: 4,   t: 's', op: 0.60 },
  { x: 9,  y: 13, sz: 1.5, t: 'd', op: 0.38 },
  { x: 29, y: 20, sz: 5.5, t: 's', op: 0.70 },
  { x: 14, y: 25, sz: 3,   t: 's', op: 0.52 },
  { x: 31, y: 35, sz: 1.8, t: 'd', op: 0.44 },
  { x: 8,  y: 49, sz: 5,   t: 's', op: 0.78 },
  { x: 24, y: 58, sz: 2,   t: 'd', op: 0.36 },
  { x: 17, y: 65, sz: 4.5, t: 's', op: 0.63 },
  { x: 7,  y: 74, sz: 1.5, t: 'd', op: 0.45 },
  { x: 27, y: 80, sz: 3.5, t: 's', op: 0.55 },
  { x: 13, y: 88, sz: 2,   t: 'd', op: 0.40 },
]
const REG_MOB_STARS = [
  { x: 17, y: 3,  sz: 3.5, t: 's', op: 0.65 },
  { x: 28, y: 12, sz: 5,   t: 's', op: 0.72 },
  { x: 8,  y: 18, sz: 1.8, t: 'd', op: 0.40 },
  { x: 23, y: 23, sz: 4,   t: 's', op: 0.55 },
  { x: 11, y: 37, sz: 1.5, t: 'd', op: 0.35 },
  { x: 30, y: 44, sz: 5.5, t: 's', op: 0.75 },
  { x: 16, y: 54, sz: 2,   t: 'd', op: 0.48 },
  { x: 7,  y: 62, sz: 3,   t: 's', op: 0.58 },
  { x: 26, y: 69, sz: 1.5, t: 'd', op: 0.38 },
  { x: 19, y: 77, sz: 4.5, t: 's', op: 0.68 },
  { x: 29, y: 86, sz: 1.8, t: 'd', op: 0.42 },
]

// ─── SkyOrb ───
function SkyOrb({ size, colors, numStr, label, stars, detailNode, onClick, animClass }) {
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
  const cx = svgSize / 2
  const cy = svgSize / 2
  const outerR = size * 0.455
  const innerR = size * 0.395

  return (
    <div className={`sky-orb-wrap${animClass ? ' ' + animClass : ''}`}
         style={{ height: size, cursor: onClick ? 'pointer' : undefined }}
         onClick={onClick}
         onMouseEnter={() => setHov(true)}
         onMouseLeave={() => setHov(false)}>
      <div className="sky-orb" style={{ width: size, height: size }}>
        <svg
          width={svgSize}
          height={svgSize}
          style={{ position: 'absolute', top: -pad, left: -pad, pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`${colors.id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.ringStops.map((s, i) => (
                <stop key={i} offset={s.o} stopColor={s.c} />
              ))}
            </linearGradient>
            <filter id={`${colors.id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Pure glow — no SourceGraphic merge, so output is only the blurred bloom */}
            <filter id={`${colors.id}-travel`} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="wide" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4"  result="tight" />
              <feMerge>
                <feMergeNode in="wide" />
                <feMergeNode in="tight" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={cx} cy={cy} r={outerR}
            fill="none"
            stroke={`url(#${colors.id}-grad)`}
            strokeWidth="2"
            filter={`url(#${colors.id}-glow)`}
          />
          <circle cx={cx} cy={cy} r={innerR}
            fill="none"
            stroke={`url(#${colors.id}-grad)`}
            strokeWidth="1"
            opacity="0.5"
          />
          {/* Travelling bead — 3px point stroke, all shape dissolved by blur into a soft bloom */}
          <circle cx={cx} cy={cy} r={outerR}
            fill="none"
            stroke={colors.glowColor}
            strokeWidth="6"
            strokeDasharray={`3 ${(2 * Math.PI * outerR - 3).toFixed(1)}`}
            strokeLinecap="round"
            filter={`url(#${colors.id}-travel)`}
            opacity="0.58"
            className="sky-ring-glow"
            style={{ animationDuration: `${colors.glowDuration}s` }}
          />

          {stars.map((s, i) => {
            const { x, y } = polarXY(cx, cy, s.a, s.r)
            const delay = `-${((i * 1.13 + s.a * 0.041) % 5.7).toFixed(2)}s`
            const dur   = `${(1.6 + ((i * 0.67 + s.sz * 0.55) % 3.2)).toFixed(2)}s`
            return s.t === 'd'
              ? <circle key={i} className="sky-star" cx={x} cy={y} r={s.sz}
                  fill={colors.star}
                  style={{ animationDelay: delay, animationDuration: dur }} />
              : <path key={i} className="sky-star" d={sparklePath(x, y, s.sz, s.sz * 0.18)}
                  fill={colors.star}
                  style={{ animationDelay: delay, animationDuration: dur }} />
          })}
        </svg>

        <div className="sky-orb-inner">
          <div className="sky-orb-num" style={{ fontSize: size > 230 ? '68px' : '50px', color: colors.number }}>
            {numStr}
          </div>
          <div className="sky-orb-lbl">{label}</div>
        </div>
      </div>

      <div className={`sky-orb-detail${vis ? ' sky-orb-detail--show' : ''}`}>
        {detailNode}
      </div>
    </div>
  )
}

// ─── SkyNavOrb ───
function SkyNavOrb({ colors, numStr, active, onClick }) {
  const size = 48
  const pad = 10
  const svgSize = size + pad * 2
  const cx = svgSize / 2
  const cy = svgSize / 2
  const outerR = size * 0.455

  return (
    <button className={`sky-nav-orb${active ? ' sky-nav-orb--active' : ''}`} onClick={onClick}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={svgSize} height={svgSize}
          style={{ position: 'absolute', top: -pad, left: -pad, pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`${colors.id}-nav-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.ringStops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}
            </linearGradient>
            <filter id={`${colors.id}-nav-glow`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={outerR}
            fill="none"
            stroke={`url(#${colors.id}-nav-grad)`}
            strokeWidth="1.5"
            filter={`url(#${colors.id}-nav-glow)`}
          />
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
function SkyMobileRow({ colors, numStr, label, detailNode, mobileStars, onClick }) {
  const BAR_H = 92
  const SVG_W = 34

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
        </div>
        <div className="sky-mob-detail">{detailNode}</div>
      </div>
    </div>
  )
}

// ─── Sky ───
function Sky({ userEvents, regulation, openingBalance, siCarryIn = 0, settings, flowOverride = false, dateStr, drillThrough, onOrb, onClose, saveStatus }) {
  const [expanding, setExpanding] = useState(null)

  function handleOrbClick(key) {
    if (!onOrb) return
    setExpanding(key)
    setTimeout(() => {
      setExpanding(null)
      onOrb(key)
    }, 380)
  }
  const { taxValue, taxStartDate } = settings
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

  const PEAK_BREAKDOWN = [
    { k: 'E', name: 'emotional' },
    { k: 'S', name: 'sensory' },
    { k: 'X', name: 'EF' },
    { k: 'V', name: 'veracity' },
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
      <span>{Math.round(nonSleepReg)} reg</span>
      {siFlowActive && <>
        <span className="sky-det-sep">·</span>
        <span style={{ color: '#5abf7a' }}>−{Math.round(totalSICredit)} SI</span>
      </>}
    </div>
  )

  const regDetail = (
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
  const regStr  = String(Math.round(nonSleepReg))

  if (drillThrough) {
    return (
      <div className="sky sky--drill">
        <div className="sky-nav">
          <SkyNavOrb colors={SKY_COLORS.peak} numStr={peakStr}
            active={drillThrough === 'peak'}
            onClick={() => drillThrough === 'peak' ? onClose?.() : onOrb?.('peak')} />
          <SkyNavOrb colors={SKY_COLORS.le} numStr={leStr}
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
        <SkyOrb size={260} colors={SKY_COLORS.le} numStr={leStr}
          label="lived experience" stars={LE_STARS} detailNode={leDetail}
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
        <SkyMobileRow colors={SKY_COLORS.le} numStr={leStr}
          label="lived experience" detailNode={leDetail} mobileStars={LE_MOB_STARS}
          onClick={() => onOrb?.('le')} />
        <div className="sky-mob-div" />
        <SkyMobileRow colors={SKY_COLORS.reg} numStr={regStr}
          label="regulation" detailNode={regDetail} mobileStars={REG_MOB_STARS}
          onClick={() => onOrb?.('reg')} />
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
  const [siCarryIn, setSiCarryIn] = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saveStatus, setSaveStatus] = useState('')
  const [drillThrough, setDrillThrough] = useState(null)

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
              const carryover = d.siFlowCarryoverBonus ?? d.carryoverBonus ?? 0
              setOpeningBalance(Math.round(Math.max(0, closing - sleep + carryover)))
              setSiCarryIn(carryover)
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
            const carryover = d.siFlowCarryoverBonus ?? d.carryoverBonus ?? 0
            setOpeningBalance(Math.max(0, closing - sleep + carryover))
            setSiCarryIn(carryover)
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

  if (loading) {
    return <div className="history-loading">opening the almanac…</div>
  }

  async function autoSave(patch = {}) {
    const evts = patch.userEvents ?? userEvents
    const reg  = patch.regulation ?? regulation
    const rec  = patch.recovery   ?? recovery
    const warn = patch.warning    ?? warning
    const gs   = patch.goodSigns  ?? goodSigns
    const melt = patch.meltdown   ?? meltdown
    setSaveStatus('saving…')
    try {
      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs, settings, yesterdayClosing, meltdown: melt,
      })
      await saveEntry({ dateStr, entryData, peakDebit, userId: session.user.id })
      await recalculateFromDate(session.user.id, dateStr)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('auto-save failed', err)
      setSaveStatus('auto-save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd = (ev) => {
    const next = [...userEvents, ev]
    setUserEvents(next)
    autoSave({ userEvents: next })
  }
  const onUpdate = (ev) => {
    const next = userEvents.map(x => x.id === ev.id ? ev : x)
    setUserEvents(next)
    autoSave({ userEvents: next })
  }
  const onDelete = (id) => {
    const next = userEvents.filter(x => x.id !== id)
    setUserEvents(next)
    autoSave({ userEvents: next })
  }
  const onRegChange = (k, v) => {
    const next = { ...regulation, [k]: v }
    setRegulation(next)
    autoSave({ regulation: next })
  }
  const onWarning = (k) => {
    const next = { ...warning, [k]: !warning[k] }
    setWarning(next)
    autoSave({ warning: next })
  }
  const onGood = (k) => {
    const next = { ...goodSigns, [k]: !goodSigns[k] }
    setGoodSigns(next)
    autoSave({ goodSigns: next })
  }
  const onRecovery = (v) => {
    setRecovery(v)
    autoSave({ recovery: v })
  }
  const onMeltdown = () => {
    const next = !meltdown
    setMeltdown(next)
    autoSave({ meltdown: next })
  }

  return (
    <>
      {onBack && (
        <>
          <button className="back-link" onClick={onBack}>← back to history</button>
          <div className="history-edit-date">{formatDateStr(dateStr)}</div>
        </>
      )}
      <Sky
        userEvents={userEvents}
        regulation={regulation}
        openingBalance={openingBalance}
        siCarryIn={siCarryIn}
        settings={settings}
        flowOverride={goodSigns.flow}
        dateStr={dateStr}
        drillThrough={drillThrough}
        onOrb={setDrillThrough}
        onClose={() => setDrillThrough(null)}
        saveStatus={saveStatus}
      />
      {drillThrough && (
        <div className="sky-drill" key={drillThrough}>
          {(drillThrough === 'peak' || drillThrough === 'le') && (
            <>
              <section className="events-section">
                <div className="ledger-head">
                  <div className="ledger-title">events · today</div>
                  <div className="ledger-count">{userEvents.filter(e => !e.cancelled).length} active</div>
                </div>
                <div className="events">
                  {allEvents.map(e => (
                    <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
                  ))}
                </div>
                <Composer onAdd={onAdd} />
              </section>
              <WarningSigns flags={warning} onToggle={onWarning} />
              <MeltdownSection active={meltdown} onToggle={onMeltdown} />
            </>
          )}
          {(drillThrough === 'reg' || drillThrough === 'le') && (
            <Regulation
              values={regulation}
              onChange={onRegChange}
              recovery={recovery}
              onRecovery={onRecovery}
              goodSigns={goodSigns}
              onGood={onGood}
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
  if (peak >= thr.critical) return '#e84040'
  if (peak >= thr.yellow)   return '#f0b825'
  return '#2ed468'
}
function calcSkyNums(userEvents, regulation, openingBalance, settings, goodSigns, dateStr) {
  const { taxValue, taxStartDate } = settings
  const taxApplies = taxActive(dateStr, taxStartDate, userEvents) && !goodSigns.flow
  const taxPoints = taxApplies ? taxValue : 0
  const axisSums = { E: 0, S: 0, V: 0, X: 0 }
  for (const e of userEvents) {
    if (e.cancelled) continue
    axisSums.E += e.E||0; axisSums.S += e.S||0; axisSums.V += e.V||0; axisSums.X += e.X||0
  }
  const peak = openingBalance + axisSums.E + axisSums.S + axisSums.V + axisSums.X + taxPoints
  const reg  = nonSleepRegTotal(regulation)
  const siCredit = userEvents.reduce((sum, e) => {
    if (!e.siFlow || e.cancelled) return sum
    return sum + ((e.E||0)+(e.S||0)+(e.V||0)+(e.X||0)) * 0.3
  }, 0)
  return { peak: Math.round(peak), le: Math.round(Math.max(0, peak - reg - siCredit)), reg: Math.round(reg) }
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
          const ds = hedToDateStr(day)
          const entry = entryMap[ds]
          const peak  = entry?.entry_data?.peakDebit ?? 0
          const isSelected = ds === selectedDate
          const isToday    = ds === todayStr
          const isFuture   = ds > todayStr
          const color = entry ? hedPeakColor(peak, thresholds) : undefined

          return (
            <button
              key={ds}
              className={[
                'hed-day',
                entry      ? 'hed-day--logged'   : '',
                isSelected ? 'hed-day--selected'  : '',
                isToday    ? 'hed-day--today'     : '',
                isFuture   ? 'hed-day--future'    : '',
              ].filter(Boolean).join(' ')}
              onClick={!isFuture ? () => onSelect(ds) : undefined}
              disabled={isFuture}
              style={color ? { '--hed-day-color': color } : undefined}
            >
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

// ─── HistoryDateEditor ───
function HistoryDateEditor({ session, settings, dateStr: initialDateStr, onBack }) {
  const [dateStr, setDateStr]       = useState(initialDateStr)
  const [weekStart, setWeekStart]   = useState(() => hedWeekMonday(hedParseDate(initialDateStr)))
  const [allEntries, setAllEntries] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [userEvents, setUserEvents] = useState([])
  const [regulation, setRegulation] = useState({ sensory: 0, av: 0, env: 0, body: 0, sleep: 5 })
  const [recovery, setRecovery]     = useState(false)
  const [warning, setWarning]       = useState({ skin: false, vision: false, thought: false, other: false })
  const [goodSigns, setGoodSigns]   = useState({ flow: false, crisis: false })
  const [meltdown, setMeltdown]     = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [yesterdayClosing, setYesterdayClosing] = useState(0)
  const [saveStatus, setSaveStatus] = useState('')
  const todayStr = todayDateStr()

  useEffect(() => {
    loadAllEntries(session.user.id)
      .then(rows => setAllEntries(rows))
      .catch(() => setAllEntries([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setSaveStatus('')
    async function init() {
      try {
        const existing = await loadEntry(dateStr, session.user.id)
        if (existing) {
          const state = dbToInternal(existing)
          setOpeningBalance(state.openingBalance)
          setYesterdayClosing(existing.entry_data.yesterdayClosing ?? state.openingBalance)
          setUserEvents(state.userEvents)
          setRegulation(state.regulation)
          setRecovery(state.recovery)
          setWarning(state.warning)
          setGoodSigns(state.goodSigns)
          setMeltdown(state.meltdown)
        } else {
          setOpeningBalance(0); setYesterdayClosing(0)
          setUserEvents([])
          setRegulation({ sensory: 0, av: 0, env: 0, body: 0, sleep: 5 })
          setRecovery(false)
          setWarning({ skin: false, vision: false, thought: false, other: false })
          setGoodSigns({ flow: false, crisis: false })
          setMeltdown(false)
        }
      } catch (err) { console.error('failed to load entry', err) }
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

  const allEventsWithTax = [
    ...userEvents,
    ...(() => {
      const anyFlow = userEvents.some(e => e.flow) || goodSigns.flow
      const applies = taxActive(dateStr, settings.taxStartDate, userEvents) && !goodSigns.flow
      return [{ id: 'autistic-tax', bucket: 'evening',
        text: anyFlow ? 'autistic tax — cancelled by flow state' : 'autistic tax',
        E: 0, S: applies ? settings.taxValue : 0, V: 0, X: 0,
        delayed: false, flow: false, cancelled: !applies, system: true }]
    })(),
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
      const { entryData, peakDebit } = internalToDb({
        dateStr, openingBalance, userEvents: evts, regulation: reg,
        recovery: rec, warning: warn, goodSigns: gs, settings, yesterdayClosing, meltdown: melt,
      })
      await saveEntry({ dateStr, entryData, peakDebit, userId: session.user.id })
      await recalculateFromDate(session.user.id, dateStr)
      loadAllEntries(session.user.id).then(rows => setAllEntries(rows)).catch(() => {})
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    } catch (err) {
      console.error('auto-save failed', err)
      setSaveStatus('auto-save failed')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  const onAdd    = (ev) => { const n=[...userEvents,ev];        setUserEvents(n); autoSave({ userEvents: n }) }
  const onUpdate = (ev) => { const n=userEvents.map(x=>x.id===ev.id?ev:x); setUserEvents(n); autoSave({ userEvents: n }) }
  const onDelete = (id) => { const n=userEvents.filter(x=>x.id!==id);     setUserEvents(n); autoSave({ userEvents: n }) }
  const onRegChange = (k, v) => { const n={...regulation,[k]:v};      setRegulation(n); autoSave({ regulation: n }) }
  const onWarning   = (k)    => { const n={...warning,[k]:!warning[k]};  setWarning(n);   autoSave({ warning: n }) }
  const onGood      = (k)    => { const n={...goodSigns,[k]:!goodSigns[k]}; setGoodSigns(n); autoSave({ goodSigns: n }) }
  const onRecovery  = (v)    => { setRecovery(v); autoSave({ recovery: v }) }
  const onMeltdown  = ()     => { const n=!meltdown; setMeltdown(n); autoSave({ meltdown: n }) }

  function handleSelectDate(ds) {
    setDateStr(ds)
    const d = hedParseDate(ds)
    if (d < weekStart || d > hedAddDays(weekStart, 6)) {
      setWeekStart(hedWeekMonday(d))
    }
  }

  const skyNums = calcSkyNums(userEvents, regulation, openingBalance, settings, goodSigns, dateStr)
  const [y, mo, da] = dateStr.split('-').map(Number)
  const dateLabel = `${HED_MON[mo-1]} ${da} · ${y}`

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
        thresholds={settings.thresholds}
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
              <div className="ledger-head">
                <div className="ledger-title">events</div>
                <div className="ledger-count">{userEvents.filter(e => !e.cancelled).length} active</div>
              </div>
              <div className="events">
                {allEventsWithTax.map(e => (
                  <EventRow key={e.id} e={e} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
              </div>
              <Composer onAdd={onAdd} />
            </section>
            <Regulation
              values={regulation}
              onChange={onRegChange}
              recovery={recovery}
              onRecovery={onRecovery}
              goodSigns={goodSigns}
              onGood={onGood}
            />
            <WarningSigns flags={warning} onToggle={onWarning} />
            <MeltdownSection active={meltdown} onToggle={onMeltdown} />
          </>
        )
      }
    </div>
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

// ─── RecalculateSection ───
function RecalculateSection({ session }) {
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')

  async function handleRecalculate() {
    if (!window.confirm('Recalculate all history entries in chronological order? This will update opening balances and closing balances throughout your history.')) return
    setRunning(true)
    setStatus('')
    try {
      const count = await recalculateAllEntries(session.user.id)
      setStatus(`done — ${count} ${count === 1 ? 'entry' : 'entries'} updated`)
      setTimeout(() => setStatus(''), 6000)
    } catch (err) {
      console.error('recalculate failed', err)
      setStatus('something went wrong')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="settings-section" style={{ marginTop: '8px' }}>
      <div className="settings-divider" />
      <div className="ledger-head" style={{ marginTop: '20px' }}>
        <div className="ledger-title">history</div>
      </div>
      <div className="settings-field-row">
        <div>
          <label>recalculate history</label>
          <div className="settings-field-desc">recompute all past balances in sequence, oldest first</div>
        </div>
        <button className="save-bar-btn" onClick={handleRecalculate} disabled={running} style={{ whiteSpace: 'nowrap' }}>
          {running ? 'running…' : 'recalculate'}
        </button>
      </div>
      {status && <div className="settings-recalc-status">{status}</div>}
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
        <HistoryDateEditor
          session={session}
          settings={settings}
          dateStr={editDate}
          onBack={() => setEditDate(null)}
        />
      )}
      {tab === 'settings' && (
        <>
          <ThresholdSettings settings={settings} onThresholdsChange={onThresholdsChange} />
          <RecalculateSection session={session} />
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
