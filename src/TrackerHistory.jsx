import { useState, useEffect } from 'react'
import { loadAllEntries, deleteEntry } from './lib/db.js'
import { weatherOf, regWordOf, fullRegTotal, REG_FULL_AT } from './lib/math.js'

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

const SKY_EMOJI = ['☀️', '⛅', '🌑']

function Moon({ state }) {
  return (
    <div className="moon-wrap">
      <span className="moon-emoji">{SKY_EMOJI[state]}</span>
    </div>
  )
}

// ─── MoonRow ───
function MoonRow({ entry, expanded, onToggle, thresholds, onEdit, onDelete }) {
  const d = entry.entry_data
  const dateObj = parseDate(entry.date)
  const peak = d.peakDebit ?? entry.peak_debit ?? 0
  const openingBalance = d.openingBalance ?? 0
  const { word: weatherWord } = weatherOf(peak, thresholds.yellow, thresholds.critical)
  const skyState = peak >= thresholds.critical ? 2 : peak >= thresholds.yellow ? 1 : 0

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

  return (
    <div className={`moon-row ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
      <div className="moon-row-main">
        <div className="moon-col">
          <Moon regPct={regPct} state={skyState} />
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
        <div className="moon-actions" onClick={e => e.stopPropagation()}>
          <button className="moon-action-btn" onClick={() => onEdit(entry.date)}>edit</button>
          <button className="moon-action-btn delete" onClick={() => onDelete(entry.date)}>delete</button>
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
export default function TrackerHistory({ settings, onEditDate }) {
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

  async function handleDelete(date) {
    if (!window.confirm(`Delete the entry for ${date}? This cannot be undone.`)) return
    try {
      await deleteEntry(date)
      setEntries(es => es.filter(e => e.date !== date))
      if (expanded === date) setExpanded(null)
    } catch (err) {
      console.error('delete failed', err)
      alert('Failed to delete entry.')
    }
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
              thresholds={thresholds}
              onEdit={onEditDate}
              onDelete={handleDelete}
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
