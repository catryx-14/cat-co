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
