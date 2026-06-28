/**
 * setTheDay.js — data + selection logic for the "Set the Day" box on the sky view.
 *
 * The box has four layers (id=154):
 *   greeting    ← the CLOCK (local time → one of four windows)
 *   band line   ← today's BAND (fixed orientation, does not rotate)
 *   quote       ← today's BAND (rotating warmth, frozen for the day)
 *   suggestions ← travel with the chosen quote ("today might want")
 *
 * Two independent inputs that never touch: the clock drives the greeting, the
 * opening-balance band drives the rest. Copy is pulled from three seeded,
 * personal tables (std_greetings / std_band_lines / std_quotes). No new tables.
 */

import { supabase } from './supabase.js'
import { bandOf } from './math.js'

// Greeting windows — gentle, approximate, and kept here as a small config so the
// boundaries are easy to tune without hunting through the component. Each entry is
// the inclusive START hour (local) of that window; the list wraps around midnight.
export const GREETING_WINDOWS = [
  { window: 'morning',   startHour: 5 },   // 05:00–10:59
  { window: 'midday',    startHour: 11 },  // 11:00–15:59
  { window: 'evening',   startHour: 16 },  // 16:00–20:59
  { window: 'latenight', startHour: 21 },  // 21:00–04:59 (wraps midnight)
]

/** Local clock hour → greeting window. */
export function greetingWindowFor(date = new Date()) {
  const h = date.getHours()
  // Walk the windows; the last one whose startHour we've passed wins. Hours before
  // the first window (00:00–04:59) belong to the wrap-around late-night window.
  let current = GREETING_WINDOWS[GREETING_WINDOWS.length - 1].window
  for (const w of GREETING_WINDOWS) {
    if (h >= w.startHour) current = w.window
  }
  return current
}

/**
 * Today's BAND for the box's lower three layers — read off the OPENING BALANCE,
 * frozen at day start (never re-derived from lived experience through the day).
 *   - purple recovery mode overrides the number-band entirely.
 *   - the red range (≥ critical) has NO Set-the-Day band — red = crisis = First
 *     Aid — so it falls back to the orange band line/quote. Never show red here.
 */
export function openingBand(openingBalance, thresholds, isPurple) {
  if (isPurple) return 'purple'
  const b = bandOf(Math.round(openingBalance ?? 0), thresholds)
  return b === 'red' ? 'orange' : b
}

/** A stable integer for a calendar day (days since the epoch) — the round-robin clock. */
export function dayIndex(dateStr) {
  const t = Date.parse(`${dateStr}T00:00:00Z`)
  return Number.isNaN(t) ? 0 : Math.floor(t / 86400000)
}

/**
 * Round-robin pick: frozen within a day, advances across days, so a small pool
 * doesn't repeat back-to-back. Pool of 1 just returns the one; empty returns null.
 */
export function pickForDay(pool, dateStr) {
  if (!pool || pool.length === 0) return null
  return pool[((dayIndex(dateStr) % pool.length) + pool.length) % pool.length]
}

/**
 * Load + choose everything the box needs for `dateStr`, given the day's band and
 * the current greeting window. Returns { greeting, bandLine, quote, suggestions }.
 * Any layer whose row is missing comes back null/[] so the box can omit it
 * gracefully (no blank, no error).
 */
export async function loadSetTheDay({ userId, band, window, dateStr }) {
  const [greetRes, lineRes, quoteRes] = await Promise.all([
    supabase.from('std_greetings')
      .select('id, text, sort_order')
      .eq('user_id', userId).eq('time_window', window).eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('std_band_lines')
      .select('text')
      .eq('user_id', userId).eq('band', band)
      .limit(1),
    supabase.from('std_quotes')
      .select('id, text, suggestions, sort_order')
      .eq('user_id', userId).eq('band', band).eq('active', true)
      .order('sort_order', { ascending: true }),
  ])
  if (greetRes.error) throw greetRes.error
  if (lineRes.error)  throw lineRes.error
  if (quoteRes.error) throw quoteRes.error

  const greeting = pickForDay(greetRes.data || [], dateStr)
  const quote    = pickForDay(quoteRes.data || [], dateStr)
  return {
    greeting:    greeting?.text ?? null,
    bandLine:    lineRes.data?.[0]?.text ?? null,
    quote:       quote?.text ?? null,
    suggestions: quote?.suggestions ?? [],
  }
}
