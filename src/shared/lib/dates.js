/**
 * dates.js — Date utility functions used throughout the app
 *
 * Kept separate from db.js because these are pure date helpers —
 * they don't touch the database and are needed in many places.
 */

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns today's date as 'YYYY-MM-DD' in local time. */
export function todayDateStr() {
  return localDateStr(new Date())
}

/** Returns yesterday's date as 'YYYY-MM-DD' in local time. */
export function yesterdayDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}

/** Adds n days (can be negative) to a 'YYYY-MM-DD' string, returning a 'YYYY-MM-DD' string. */
export function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localDateStr(dt)
}

/**
 * Returns today's date in the human-readable display format used in room headers.
 * Example: "2026 · may · 22"
 */
export function todayDisplayStr() {
  const d = new Date()
  const m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][d.getMonth()]
  return `${d.getFullYear()} · ${m} · ${d.getDate().toString().padStart(2,'0')}`
}
