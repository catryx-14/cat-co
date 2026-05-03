import { useState, useEffect, useMemo, useRef } from 'react'
import { loadAllEntries } from '../../shared/lib/db.js'
import meltdownIcon from '../../assets/icons/Aris Shutdown.png'
import siFlowIcon   from '../../assets/icons/Aris Flow.jpg'

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(s) { return new Date(s + 'T12:00:00') }

function toDateStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function weekMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(12, 0, 0, 0)
  return d
}

function monthName(d) {
  return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
}

// ── Colour / display helpers ──────────────────────────────────────────────────

function peakColor(peak, thr) {
  if (peak >= thr.critical) return '#e84040'
  if (peak >= thr.yellow)   return '#f0b825'
  return '#2ed468'
}

function peakGlowClass(peak, thr) {
  if (peak >= thr.critical) return 'arc-glow--red'
  if (peak >= thr.yellow)   return 'arc-glow--amber'
  return 'arc-glow--green'
}

// Blend a hex colour toward white by `factor` (0–1)
function lighten(hex, factor) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `rgb(${Math.round(r+(255-r)*factor)},${Math.round(g+(255-g)*factor)},${Math.round(b+(255-b)*factor)})`
}

// ── Arc star geometry ─────────────────────────────────────────────────────────

// Arc: 210° clockwise from 210° (upper-left) → 60° (lower-right)
const CX = 44, CY = 46, R = 33
const START_DEG = 210, ARC_DEG = 210

function ptAt(t) {
  const rad = (START_DEG + t * ARC_DEG) * Math.PI / 180
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)]
}

// 4-point sparkle: tips at N/E/S/W, pinch points at diagonals
function sparkle(outer, inner) {
  const i = +(inner / Math.SQRT2).toFixed(3)
  const o = +outer.toFixed(3)
  return `M${o},0 L${i},${-i} L0,${-o} L${-i},${-i} L${-o},0 L${-i},${i} L0,${o} L${i},${i} Z`
}

const DIMS = {
  large:  [7.0, 1.5],
  medium: [4.2, 1.0],
  small:  [2.6, 0.65],
}

// Stars for a logged day — dense centre, dot trails at both ends
const ARC_STARS = [
  { t:0.00, type:'dot',    op:0.18, r:1.0 },
  { t:0.06, type:'dot',    op:0.30, r:1.3 },
  { t:0.13, type:'small',  op:0.52 },
  { t:0.22, type:'medium', op:0.72 },
  { t:0.31, type:'large',  op:0.90 },
  { t:0.41, type:'large',  op:1.00 },
  { t:0.50, type:'large',  op:1.00 },
  { t:0.59, type:'large',  op:1.00 },
  { t:0.69, type:'large',  op:0.90 },
  { t:0.78, type:'medium', op:0.72 },
  { t:0.87, type:'small',  op:0.52 },
  { t:0.94, type:'dot',    op:0.30, r:1.3 },
  { t:1.00, type:'dot',    op:0.18, r:1.0 },
]

// Future day — gold ghost dots only, opacity peaks at centre
const FUTURE_DOTS = [0, 0.13, 0.25, 0.38, 0.50, 0.62, 0.75, 0.87, 1.0].map(t => ({
  t, op: +(0.10 + 0.14 * Math.sin(Math.PI * t)).toFixed(3),
}))

// Past empty day — very dim grey dots
const PAST_DOTS = FUTURE_DOTS.map(s => ({ t: s.t, op: +(s.op * 0.4).toFixed(3) }))

function ArcStars({ stars, color, live = false }) {
  return stars.map((s, i) => {
    const [x, y] = ptAt(s.t)
    if (s.type === 'dot' || !s.type) {
      return <circle key={i} cx={x} cy={y} r={s.r ?? 1.2} fill={color} opacity={s.op} />
    }
    const [outer, inner] = DIMS[s.type]
    // Centre stars lighten toward warm cream; ends stay base colour
    const centreFactor = live ? Math.pow(Math.sin(Math.PI * s.t), 2) * 0.45 : 0
    const fill = live ? lighten(color, centreFactor) : color
    // Small fixed-seed brightness nudge so adjacent stars aren't identical
    const nudge = live ? 0.78 + ((i * 13) % 7) * 0.032 : 1
    return (
      <g key={i} transform={`translate(${x},${y})`} opacity={+(s.op * nudge).toFixed(3)}>
        <path d={sparkle(outer, inner)} fill={fill} />
        {/* Hot white core on large/medium — sells the "real point of light" */}
        {live && s.type !== 'small' && (
          <circle cx={0} cy={0} r={s.type === 'large' ? 1.5 : 0.9}
            fill="rgba(255,252,220,0.82)" />
        )}
      </g>
    )
  })
}

// ── Week separator ────────────────────────────────────────────────────────────

// Tick x-positions at each column centre, within a 0–100 viewBox
const TICK_X = [1,3,5,7,9,11,13].map(n => +((n / 14) * 100).toFixed(2))

function WeekSep() {
  return (
    <div className="week-sep" aria-hidden="true">
      {/* Light trail — barely-there radial bleed from the star outward */}
      <div className="week-sep-trail" />
      {/* Star — the main event */}
      <div className="week-sep-ornament">
        <svg viewBox="-22 -22 44 44" width="44" height="44">
          <defs>
            <filter id="ws-star-glow" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="4.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#ws-star-glow)" className="week-sep-star">
            <path d={sparkle(9.0, 2.0)}  fill="rgba(222,194,90,0.72)" />
            <path d={sparkle(6.2, 1.4)}  fill="rgba(244,228,148,0.90)" />
            <path d={sparkle(3.8, 0.88)} fill="rgba(255,248,200,0.98)" />
            <circle cx="0" cy="0" r="1.6" fill="rgba(255,255,252,1.0)" />
          </g>
        </svg>
      </div>
    </div>
  )
}

// ── Day tooltip ───────────────────────────────────────────────────────────────

const FULL_DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const FULL_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function DayTooltip({ entry, date, col }) {
  const d = entry.entry_data
  const peak    = d.peakDebit       ?? 0
  const le      = d.livedExperience ?? d.closingBalance ?? 0
  const reg     = d.regulation
    ? (d.regulation.sensoryComfort ?? 0) + (d.regulation.audioVisual ?? 0) +
      (d.regulation.environment    ?? 0) + (d.regulation.bodyRest    ?? 0)
    : 0
  const events  = d.events   ?? []
  const hasMelt = d.meltdown  ?? false
  const hasSI   = d.siFlowActive ?? false
  const fullDate = `${FULL_DOW[date.getDay()]} ${date.getDate()} ${FULL_MON[date.getMonth()]}`

  const edgeClass = col <= 1 ? 'cal-tooltip--edge-left'
                  : col >= 5 ? 'cal-tooltip--edge-right'
                  : ''

  return (
    <div className={`cal-tooltip ${edgeClass}`.trim()}>
      <div className="cal-tip-date">{fullDate}</div>
      <div className="cal-tip-row">
        <span>peak <b>{peak}</b></span>
        <span className="cal-tip-dot">·</span>
        <span>lived experience <b>{le}</b></span>
        <span className="cal-tip-dot">·</span>
        <span>regulation <b>{Math.round(reg)}</b></span>
      </div>
      {events.length > 0 && (
        <div className="cal-tip-row cal-tip-events">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </div>
      )}
      {(hasSI || hasMelt) && (
        <div className="cal-tip-icons">
          {hasSI   && <span className="cal-tip-badge cal-tip-badge--si">SI flow</span>}
          {hasMelt && <span className="cal-tip-badge cal-tip-badge--melt">shutdown</span>}
        </div>
      )}
    </div>
  )
}

// ── Day cell ──────────────────────────────────────────────────────────────────

function DayCell({ date, entry, thresholds, onClick, isToday, isFuture, col }) {
  const [showTip, setShowTip] = useState(false)
  const tipTimer = useRef(null)

  function handleMouseEnter() {
    if (!entry) return
    tipTimer.current = setTimeout(() => setShowTip(true), 600)
  }
  function handleMouseLeave() {
    clearTimeout(tipTimer.current)
    setShowTip(false)
  }
  useEffect(() => () => clearTimeout(tipTimer.current), [])

  const d = entry?.entry_data
  const peak = d?.peakDebit ?? 0
  const isPastEmpty = !isFuture && !entry

  let stars, starColor, glowClass = ''
  if (entry) {
    stars = ARC_STARS
    starColor = peakColor(peak, thresholds)
    glowClass = peakGlowClass(peak, thresholds)
  } else if (isFuture) {
    stars = FUTURE_DOTS
    starColor = '#c9a460'
  } else {
    stars = PAST_DOTS
    starColor = '#707085'
  }

  const hasMelt = d?.meltdown     ?? false
  const hasSI   = d?.siFlowActive ?? false

  return (
    <div
      className={[
        'cal-cell',
        entry       ? 'cal-cell--logged' : '',
        isFuture    ? 'cal-cell--future' : '',
        isPastEmpty ? 'cal-cell--empty'  : '',
        isToday     ? 'cal-cell--today'  : '',
      ].join(' ').trim()}
      onClick={entry ? () => onClick(toDateStr(date)) : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg className={`cal-arc${glowClass ? ` ${glowClass}` : ''}`} viewBox="0 0 88 96">
        <ArcStars stars={stars} color={starColor} live={!!entry} />
      </svg>

      <div className="cal-inner">
        <div className={`cal-date${isFuture ? ' cal-date--future' : ''}`}>
          {date.getDate()}
        </div>
        {(hasMelt || hasSI) && (
          <div className={`cal-icons${hasMelt && hasSI ? ' cal-icons--pair' : ''}`}>
            {hasMelt && (
              <span className="cal-icon-wrap cal-icon-wrap--meltdown">
                <img src={meltdownIcon} className="cal-icon" alt="meltdown" />
              </span>
            )}
            {hasSI && (
              <span className="cal-icon-wrap cal-icon-wrap--siflow">
                <img src={siFlowIcon} className="cal-icon" alt="SI flow" />
              </span>
            )}
          </div>
        )}
      </div>

      {showTip && entry && <DayTooltip entry={entry} date={date} col={col} />}
    </div>
  )
}

// ── Week row ──────────────────────────────────────────────────────────────────

function WeekRow({ week, entryMap, thresholds, todayStr, onEdit }) {
  const label = `${monthName(week.days[0])} ${week.days[0].getFullYear()}`
  return (
    <div className="cal-week">
      <div className="cal-week-label">{label}</div>
      <div className="cal-week-days">
        {week.days.map((day, i) => {
          const ds = toDateStr(day)
          return (
            <DayCell
              key={ds}
              date={day}
              entry={entryMap[ds] || null}
              thresholds={thresholds}
              onClick={onEdit}
              isToday={ds === todayStr}
              isFuture={ds > todayStr}
              col={i}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Build week list ───────────────────────────────────────────────────────────

function buildWeeks(entries) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  let earliest = entries.length > 0
    ? new Date(Math.min(...entries.map(e => parseDate(e.date))))
    : today

  const future2 = addDays(today, 14)
  let cur = weekMonday(earliest)
  const lastMon = weekMonday(future2)

  const weeks = []
  while (cur <= lastMon) {
    weeks.push({ days: Array.from({ length: 7 }, (_, i) => addDays(cur, i)) })
    cur = addDays(cur, 7)
  }

  return weeks // oldest at top, newest at bottom
}

// ── TrackerHistory ────────────────────────────────────────────────────────────

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TrackerHistory({ settings, session, onEditDate }) {
  const [entries, setEntries] = useState(null)
  const { thresholds } = settings
  const bottomRef = useRef(null)

  useEffect(() => {
    loadAllEntries(session.user.id)
      .then(rows => setEntries(rows))
      .catch(err => { console.error(err); setEntries([]) })
  }, [])

  // Dim bokeh while history is visible — data is the visual here
  useEffect(() => {
    const bokeh = document.getElementById('bokeh-layer')
    const prev = bokeh?.style.opacity ?? ''
    if (bokeh) bokeh.style.opacity = '0.10'
    return () => { if (bokeh) bokeh.style.opacity = prev }
  }, [])

  useEffect(() => {
    if (entries !== null) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [entries])

  const { entryMap, weeks, todayStr } = useMemo(() => {
    const todayStr = toDateStr(new Date())
    if (!entries) return { entryMap: {}, weeks: [], todayStr }
    const entryMap = {}
    for (const e of entries) entryMap[e.date] = e
    return { entryMap, weeks: buildWeeks(entries), todayStr }
  }, [entries])

  if (entries === null) {
    return <div className="history-loading">opening the almanac…</div>
  }

  return (
    <div className="celestial-cal">
      <div className="cal-scroll-wrap">
        <div className="cal-dow-header">
          {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>

        {weeks.map((week, wi) => (
          <div key={toDateStr(week.days[0])}>
            {wi > 0 && <WeekSep />}
            <WeekRow
              week={week}
              entryMap={entryMap}
              thresholds={thresholds}
              todayStr={todayStr}
              onEdit={onEditDate}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {entries.length === 0 && (
        <div className="history-footnote">no past entries yet — begin and the stars will gather</div>
      )}
    </div>
  )
}
