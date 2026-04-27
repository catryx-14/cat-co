import { useState, useEffect } from 'react'
import { loadAllEntries, dbToInternal } from './lib/db.js'
import { weatherOf, regWordOf, fullRegTotal, REG_FULL_AT } from './lib/math.js'

const AXIS_DEFS = [
  { k: 'E', name: 'emotional' },
  { k: 'S', name: 'sensory' },
  { k: 'V', name: 'veracity' },
  { k: 'X', name: 'EF' },
]

const REG_CHANNELS = [
  { k: 'sensory', name: 'sensory comfort', cap: 4 },
  { k: 'av',      name: 'audio / visual',  cap: 5 },
  { k: 'env',     name: 'environment',     cap: 6 },
  { k: 'body',    name: 'body / rest',     cap: 5 },
  { k: 'sleep',   name: 'sleep reset',     cap: 5 },
]

function parseDate(dateStr) {
  return new Date(dateStr + 'T12:00:00')
}

function fmtDate(d) {
  const dow = ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()]
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
  return `${dow} · ${d.getDate().toString().padStart(2,'0')} ${m}`
}

function fmtRel(d) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const days = Math.round((today - target) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

// ─── Moon SVG ───
function Moon({ peak, regPct, intensity, size = 64 }) {
  const px = size + intensity * 6
  const haloOpacity = 0.18 + regPct * 0.55
  const haloRadius = 10 + regPct * 18
  const isEclipse = intensity >= 5
  const uid = Math.random().toString(36).slice(2, 8)
  const sunGradId = `sg-${uid}`
  const eclipseId = `ec-${uid}`
  const coronaId = `co-${uid}`
  const cloudGradId = `cg-${uid}`
  const vb = 100

  const cloudColor = (() => {
    if (intensity === 1) return { top: '#f4ecd9', bot: '#d4c8a8', op: 0.78 }
    if (intensity === 2) return { top: '#a89c9c', bot: '#5a5060', op: 0.86 }
    if (intensity === 3) return { top: '#8a6878', bot: '#3a2838', op: 0.92 }
    if (intensity === 4) return { top: '#3a2838', bot: '#1a1020', op: 0.95 }
    return null
  })()

  return (
    <div className="moon-wrap" style={{ width: px + haloRadius * 2, height: px + haloRadius * 2 }}>
      <div className="moon-disc" style={{
        width: px, height: px,
        filter: `drop-shadow(0 0 ${haloRadius}px rgba(232,201,140,${haloOpacity}))`,
      }}>
        <svg viewBox={`0 0 ${vb} ${vb}`} width={px} height={px}>
          <defs>
            <radialGradient id={sunGradId} cx="38%" cy="32%" r="65%">
              <stop offset="0%"   stopColor="#fff4d8"/>
              <stop offset="45%"  stopColor="#f0d9a8"/>
              <stop offset="100%" stopColor="#c98a2a"/>
            </radialGradient>
            {cloudColor && (
              <linearGradient id={cloudGradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor={cloudColor.top}/>
                <stop offset="100%" stopColor={cloudColor.bot}/>
              </linearGradient>
            )}
            {isEclipse && (
              <>
                <radialGradient id={coronaId} cx="50%" cy="50%" r="50%">
                  <stop offset="55%" stopColor="rgba(232,201,140,0)"/>
                  <stop offset="62%" stopColor="rgba(255,236,180,0.95)"/>
                  <stop offset="68%" stopColor="rgba(232,201,140,0.55)"/>
                  <stop offset="100%" stopColor="rgba(232,201,140,0)"/>
                </radialGradient>
                <radialGradient id={eclipseId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#0a0610"/>
                  <stop offset="80%"  stopColor="#000000"/>
                  <stop offset="100%" stopColor="#000000"/>
                </radialGradient>
              </>
            )}
          </defs>
          <circle cx="50" cy="50" r="32" fill={`url(#${sunGradId})`} />
          {cloudColor && (
            <g opacity={cloudColor.op}>
              {intensity >= 1 && <path d="M 24,62 Q 30,52 42,55 Q 52,48 62,54 Q 74,52 78,62 Q 80,72 70,72 L 30,72 Q 20,72 24,62 Z" fill={`url(#${cloudGradId})`}/>}
              {intensity >= 2 && <path d="M 18,38 Q 24,28 36,32 Q 48,26 58,32 Q 70,30 76,40 Q 78,48 68,50 L 28,50 Q 16,50 18,38 Z" fill={`url(#${cloudGradId})`} opacity="0.95"/>}
              {intensity >= 3 && <path d="M 14,48 Q 22,40 34,44 Q 46,38 58,44 Q 72,42 80,52 Q 82,62 70,62 L 26,62 Q 12,62 14,48 Z" fill={`url(#${cloudGradId})`} opacity="0.95"/>}
              {intensity >= 4 && <ellipse cx="50" cy="50" rx="38" ry="30" fill={`url(#${cloudGradId})`} opacity="0.92"/>}
            </g>
          )}
          {isEclipse && (
            <>
              <circle cx="50" cy="50" r="46" fill={`url(#${coronaId})`}/>
              <circle cx="50" cy="50" r="30" fill={`url(#${eclipseId})`}/>
              <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,236,180,0.85)" strokeWidth="1.2"/>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}

// ─── MoonRow ───
function MoonRow({ entry, expanded, onToggle }) {
  const d = entry.entry_data
  const dateObj = parseDate(entry.date)
  const peak = d.peakDebit ?? entry.peak_debit ?? 0
  const openingBalance = d.openingBalance ?? 0
  const { word: weatherWord, intensity } = weatherOf(peak)

  const reg = {
    sensory: d.regulation?.sensoryComfort ?? 0,
    av: d.regulation?.audioVisual ?? 0,
    env: d.regulation?.environment ?? 0,
    body: d.regulation?.bodyRest ?? 0,
    sleep: d.sleepReset ?? 0,
  }
  const regT = fullRegTotal(reg)
  const regPct = Math.min(1, regT / REG_FULL_AT)
  const rWord = regWordOf(regPct)
  const closingBalance = d.closingBalance ?? 0

  const warning = d.warningSign ?? {}
  const warnCount = Object.values(warning).filter(Boolean).length
  const goodCount = (d.flowActivity ? 1 : 0) + (warning.crisisResponse ? 1 : 0)

  const events = d.events ?? []
  const anyFlow = d.flowActivity ?? false

  return (
    <div className={`moon-row ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
      <div className="moon-row-main">
        <div className="moon-col">
          <Moon peak={peak} regPct={regPct} intensity={intensity} />
        </div>
        <div className="moon-meta">
          <div className="moon-date">
            {fmtDate(dateObj)}
            {openingBalance > 0 && (
              <span className="moon-carry" title={`woke carrying ${openingBalance}`}>← {openingBalance}</span>
            )}
          </div>
          <div className="moon-rel">{fmtRel(dateObj)}</div>
          <div className="moon-readout">
            <span className="moon-readout-group">peak <b>{peak}</b></span>
            <span className="moon-readout-group"><i>{weatherWord}</i></span>
            <span className="moon-readout-group"><i>{rWord}</i>{' at '}{Math.round(regPct * 100)}%</span>
            {closingBalance > 0 && <span className="moon-readout-group endload"><i>ends at {closingBalance}</i></span>}
          </div>
          <div className="moon-marks">
            {goodCount > 0 && <span className="mark good">{goodCount} good {goodCount === 1 ? 'sign' : 'signs'}</span>}
            {warnCount > 0 && <span className="mark warn">{warnCount} warning {warnCount === 1 ? 'sign' : 'signs'}</span>}
            {goodCount === 0 && warnCount === 0 && <span className="mark quiet">quiet day</span>}
          </div>
        </div>
        <div className="moon-chevron">{expanded ? '−' : '+'}</div>
      </div>

      {expanded && (
        <div className="moon-detail" onClick={ev => ev.stopPropagation()}>
          <div className="moon-detail-readonly">
            <div className="moon-detail-events">
              {events.map((e, i) => (
                <div key={i} className="moon-event">
                  <span className="moon-event-bucket">{e.bucket || ''}</span>
                  <span className="moon-event-text">
                    {e.summary}
                    {e.flow && <i className="moon-event-flow"> ~ flow</i>}
                  </span>
                  {(e.emotional + e.sensory + e.veracity + e.ef) > 0 && (
                    <span className="moon-event-axes">
                      {e.emotional > 0 && <span className="moon-axis axis-E">E{e.emotional}</span>}
                      {e.sensory > 0   && <span className="moon-axis axis-S">S{e.sensory}</span>}
                      {e.veracity > 0  && <span className="moon-axis axis-V">V{e.veracity}</span>}
                      {e.ef > 0        && <span className="moon-axis axis-X">X{e.ef}</span>}
                    </span>
                  )}
                </div>
              ))}
              {events.length === 0 && (
                <div style={{ fontFamily: 'Crimson Pro, serif', fontStyle: 'italic', color: 'var(--ink-faint)', fontSize: 13 }}>
                  no events recorded
                </div>
              )}
            </div>
            <div className="moon-detail-tend">
              <div className="moon-detail-label">tending</div>
              <div className="moon-tend-row">
                {REG_CHANNELS.map(c => (
                  <div key={c.k} className="moon-tend-channel">
                    <div className="moon-tend-name">{c.name}</div>
                    <div className="moon-tend-val">{reg[c.k] || 0}<span>/{c.cap}</span></div>
                  </div>
                ))}
              </div>
              {(warnCount > 0 || goodCount > 0) && (
                <div className="moon-tend-signals">
                  {d.flowActivity && <span className="moon-tend-sig good">flow activity</span>}
                  {warning.crisisResponse && <span className="moon-tend-sig good">crisis recovery</span>}
                  {warning.skin    && <span className="moon-tend-sig warn">skin</span>}
                  {warning.vision  && <span className="moon-tend-sig warn">vision</span>}
                  {warning.thought && <span className="moon-tend-sig warn">thought</span>}
                  {warning.sunny   && <span className="moon-tend-sig warn">other</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Almanac search ───
function Almanac({ entries, onPick }) {
  const [q, setQ] = useState('')
  if (!q.trim()) return (
    <div className="almanac">
      <input
        className="almanac-input"
        placeholder="ask the almanac… (e.g. dentist, flow, fireplace)"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
    </div>
  )

  const ql = q.trim().toLowerCase()
  const matches = []
  for (const row of entries) {
    for (const ev of (row.entry_data.events ?? [])) {
      if ((ev.summary ?? '').toLowerCase().includes(ql)) {
        matches.push({ row, ev })
      }
    }
  }

  const dateObj = (row) => parseDate(row.date)

  return (
    <div className="almanac">
      <input
        className="almanac-input"
        placeholder="ask the almanac…"
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus
      />
      <div className="almanac-results">
        <div className="almanac-count">{matches.length} {matches.length === 1 ? 'echo' : 'echoes'} found</div>
        {matches.map((m, i) => (
          <div key={i} className="almanac-match" onClick={() => onPick(m.row.date)}>
            <div className="almanac-match-date">
              {fmtDate(dateObj(m.row))} <span className="muted">· {fmtRel(dateObj(m.row))}</span>
            </div>
            <div className="almanac-match-text">{m.ev.summary}</div>
          </div>
        ))}
        {matches.length === 0 && <div className="almanac-empty">no echoes — try another word</div>}
      </div>
    </div>
  )
}

// ─── TrackerHistory ───
export default function TrackerHistory({ settings }) {
  const [entries, setEntries] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const { thresholds } = settings

  useEffect(() => {
    loadAllEntries()
      .then(rows => setEntries(rows))
      .catch(err => { console.error('history load failed', err); setEntries([]) })
  }, [])

  function toggle(date) {
    setExpanded(e => e === date ? null : date)
  }

  if (entries === null) {
    return <div className="history-loading">opening the almanac…</div>
  }

  return (
    <div className="history-tab">
      <Almanac entries={entries} onPick={date => {
        setExpanded(date)
        setTimeout(() => {
          const el = document.querySelector(`[data-history-date="${date}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }} />

      <div className="history-stream">
        {entries.map(row => (
          <div key={row.date} data-history-date={row.date}>
            <MoonRow
              entry={row}
              expanded={expanded === row.date}
              onToggle={() => toggle(row.date)}
            />
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="history-footnote">
          the almanac remembers {entries.length} {entries.length === 1 ? 'day' : 'days'} — older entries fade into the dark
        </div>
      )}
      {entries.length === 0 && (
        <div className="history-footnote">no past entries yet</div>
      )}
    </div>
  )
}
