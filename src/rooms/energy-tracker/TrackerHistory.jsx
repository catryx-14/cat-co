import { useState, useEffect, useMemo, useRef } from 'react'
import { loadAllEntries } from '../../shared/lib/db.js'
/* NIGHT GARDEN THEME VALUE — SI FLOW / SHUTDOWN ICONS
   Icons were cat photos: Aris Flow.jpg (243KB) and Aris Shutdown.png (2.2MB).
   Used in DayCell as <img src={icon} className="cal-icon"> inside .cal-icon-wrap.
   CSS classes: .cal-icon-wrap--siflow and .cal-icon-wrap--meltdown
   Image files preserved at: src/assets/icons/Aris Flow.jpg and Aris Shutdown.png
   Restore: re-import below and pass to CalIcon as src prop
*/
import meltdownIcon from '../../assets/icons/Aris Shutdown.png'  // preserved — not deleted
import siFlowIcon   from '../../assets/icons/Aris Flow.jpg'       // preserved — not deleted

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

/* NIGHT GARDEN THEME VALUE — ARC POINT SHAPES (sparkle stars)
   4-point sparkle function: tips at N/E/S/W, pinch points at diagonals
   sparkle(outer, inner) → SVG path string
   Sizes: large [7.0, 1.5], medium [4.2, 1.0], small [2.6, 0.65]
   Hot white core: large r=1.5, medium r=0.9 (rgba(255,252,220,0.82))
   Centre-lighten factor: Math.pow(Math.sin(Math.PI * t), 2) * 0.45 toward warm cream
   Brightness nudge: 0.78 + ((i * 13) % 7) * 0.032
   Restore by: changing ArcPoint to use the sparkle path instead of circle
*/
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

// ArcPoint — swappable component. MVP default: dot/pip. Night garden: sparkle star.
// shape prop: 'dot' (MVP default) | 'sparkle' (night garden)
function ArcPoint({ x, y, size, color, opacity, shape = 'dot' }) {
  if (shape === 'sparkle') {
    const [outer, inner] = DIMS[size] ?? DIMS.medium
    return (
      <g transform={`translate(${x},${y})`} opacity={opacity}>
        <path d={sparkle(outer, inner)} fill={color} />
      </g>
    )
  }
  // MVP default: simple pip
  const r = size === 'large' ? 2.2 : size === 'medium' ? 1.6 : size === 'small' ? 1.1 : 1.0
  return <circle cx={x} cy={y} r={r} fill={color} opacity={opacity} />
}

function ArcStars({ stars, color, live = false }) {
  return stars.map((s, i) => {
    const [x, y] = ptAt(s.t)
    if (s.type === 'dot' || !s.type) {
      return <circle key={i} cx={x} cy={y} r={s.r ?? 1.2} fill={color} opacity={s.op} />
    }
    // Centre stars lighten toward warm cream; ends stay base colour
    const centreFactor = live ? Math.pow(Math.sin(Math.PI * s.t), 2) * 0.45 : 0
    const fill = live ? lighten(color, centreFactor) : color
    const nudge = live ? 0.78 + ((i * 13) % 7) * 0.032 : 1
    return (
      <ArcPoint
        key={i}
        x={x} y={y}
        size={s.type}
        color={fill}
        opacity={+(s.op * nudge).toFixed(3)}
        shape="dot"
      />
    )
  })
}

// ── Week separator ────────────────────────────────────────────────────────────

/* NIGHT GARDEN THEME VALUE — LENS FLARE WEEK SEPARATOR
   SVG sparkle at centre: sparkle(5.0, 1.2) fill rgba(244,212,158,0.82)
   Hot white core: circle r=0.9 fill rgba(255,252,225,0.95)
   feGaussianBlur stdDeviation=1.6 with feMerge for glow
   Lines: .week-sep-line--l and .week-sep-line--r extending from centre sparkle
   Restore: replace the plain div below with the sparkle SVG version
*/
function WeekSep() {
  return (
    <div className="week-sep" aria-hidden="true">
      <div className="week-sep-line week-sep-line--l" />
      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
      <div className="week-sep-line week-sep-line--r" />
    </div>
  )
}

// ── CalIcon — swappable icon slot ─────────────────────────────────────────────
// MVP default: coloured pip. Night garden: cat photo (src prop).
// shape: 'pip' (MVP) | 'image' (night garden). color: pip fill color.
function CalIcon({ shape = 'pip', src, alt, color = 'rgba(255,255,255,0.6)' }) {
  if (shape === 'image' && src) {
    return <img src={src} className="cal-icon" alt={alt} />
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 4px ${color}`,
      flexShrink: 0,
    }} />
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

function DayCell({ date, entry, thresholds, onClick, isToday, isFuture, isOutOfMonth, col }) {
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
  const leVal = d?.livedExperience ?? d?.closingBalance ?? 0
  const isPastEmpty = !isFuture && !entry

  let stars, starColor, glowClass = ''
  if (entry) {
    stars = ARC_STARS
    starColor = peakColor(leVal, thresholds)
    glowClass = peakGlowClass(leVal, thresholds)
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
        isOutOfMonth ? 'cal-cell--out-of-month' : '',
      ].join(' ').trim()}
      onClick={entry && !isOutOfMonth ? () => onClick(toDateStr(date)) : undefined}
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
                <CalIcon shape="pip" color="rgba(168, 19, 42, 0.85)" />
              </span>
            )}
            {hasSI && (
              <span className="cal-icon-wrap cal-icon-wrap--siflow">
                <CalIcon shape="pip" color="rgba(58, 120, 216, 0.85)" />
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

function WeekRow({ week, entryMap, thresholds, todayStr, onEdit, viewMonth }) {
  return (
    <div className="cal-week">
      <div className="cal-week-days">
        {week.days.map((day, i) => {
          const ds = toDateStr(day)
          const outOfMonth = viewMonth !== undefined && day.getMonth() !== viewMonth
          return (
            <DayCell
              key={ds}
              date={day}
              entry={outOfMonth ? null : (entryMap[ds] || null)}
              thresholds={thresholds}
              onClick={outOfMonth ? undefined : onEdit}
              isToday={ds === todayStr}
              isFuture={ds > todayStr}
              isOutOfMonth={outOfMonth}
              col={i}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Build weeks for a specific month ─────────────────────────────────────────

function buildMonthWeeks(year, month) {
  const firstDay = new Date(year, month, 1)
  firstDay.setHours(12, 0, 0, 0)
  const lastDay = new Date(year, month + 1, 0)
  lastDay.setHours(12, 0, 0, 0)
  let cur = weekMonday(firstDay)
  const weeks = []
  while (cur <= lastDay) {
    weeks.push({ days: Array.from({ length: 7 }, (_, i) => addDays(cur, i)) })
    cur = addDays(cur, 7)
  }
  return weeks
}

// ── TrackerHistory ────────────────────────────────────────────────────────────

export default function TrackerHistory({ settings, session, onEditDate, viewYear, viewMonth }) {
  const [entries, setEntries] = useState(null)
  const thresholds = settings.livedExperienceThresholds

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

  const { entryMap, weeks, todayStr } = useMemo(() => {
    const todayStr = toDateStr(new Date())
    const entryMap = {}
    if (entries) for (const e of entries) entryMap[e.date] = e
    return { entryMap, weeks: buildMonthWeeks(viewYear, viewMonth), todayStr }
  }, [entries, viewYear, viewMonth])

  if (entries === null) {
    return <div className="history-loading">opening the almanac…</div>
  }

  return (
    <div className="celestial-cal">
      {weeks.map((week, wi) => {
        const weekStr = toDateStr(week.days[0])
        return (
          <div key={weekStr}>
            {wi > 0 && <WeekSep />}
            <WeekRow
              week={week}
              entryMap={entryMap}
              thresholds={thresholds}
              todayStr={todayStr}
              onEdit={onEditDate}
              viewMonth={viewMonth}
            />
          </div>
        )
      })}

      {entries.length === 0 && (
        <div className="history-footnote">no past entries yet — begin and the stars will gather</div>
      )}
    </div>
  )
}
