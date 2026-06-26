/**
 * regulationLog.js — data layer for the daily regulation grid.
 *
 * Reads the picker lists (routines + actions) and reads/writes the per-day
 * `regulation_log` table that feeds the Regulation ring. A log row exists iff it
 * currently counts: clearing a box or de-selecting an all-day choice DELETES the
 * row. label/points are written as SNAPSHOTS at log time so history stays honest
 * even if a routine/action is later renamed or re-pointed.
 *
 * See engine room id=80 (schema) and id=145 "LOCKED pt 5" for the model.
 */

import { supabase } from './supabase.js'

const nowIso = () => new Date().toISOString()

// Default routine dose when a routine somehow has no green/caution dose yet.
const ROUTINE_DEFAULT_POINTS = 6

// ── Picker lists ─────────────────────────────────────────────────────────────

/**
 * All routines for the slot pickers. Each logs its green/caution dose
 * (6 points for now — the purple band-face split is deferred). No morning/evening
 * tagging on routines yet, so the same list is offered in both slots.
 * Returns: [{ id, name, points }]
 */
export async function loadRoutineOptions() {
  const { data, error } = await supabase
    .from('routines')
    .select('id, name, sort_order, routine_faces(band, routine_doses(points_today, sort_order))')
    .order('sort_order')
  if (error) throw error

  return (data || []).map(r => {
    // Prefer a green face's dose, then caution; take its first dose's points.
    const faces = r.routine_faces || []
    const face =
      faces.find(f => f.band === 'green') ||
      faces.find(f => f.band === 'caution') ||
      faces[0]
    const doses = (face?.routine_doses || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const points = doses[0]?.points_today ?? ROUTINE_DEFAULT_POINTS
    return { id: r.id, name: r.name, points }
  })
}

/**
 * Cat's curated actions for the activity picker (NOT the 83-card shelf).
 * Returns: [{ id, name, points, action_type }]
 */
export async function loadActionOptions() {
  const { data, error } = await supabase
    .from('actions')
    .select('id, name, points, action_type, sort_order')
    .order('sort_order')
  if (error) throw error
  return (data || []).map(a => ({
    id: a.id, name: a.name, points: a.points, action_type: a.action_type,
  }))
}

// ── Per-day log ──────────────────────────────────────────────────────────────

/** All log rows for one day, ordered (routines first by slot, then activities). */
export async function loadRegulationLog(userId, dateStr) {
  const { data, error } = await supabase
    .from('regulation_log')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .order('sort_order')
  if (error) throw error
  return data || []
}

/**
 * Map of date → summed regulation points across the whole user's log, for
 * plumbing the regulation source into the formula chain for every day at once.
 * Returns: { [date]: totalPoints }
 */
export async function loadRegLogTotalsByDate(userId) {
  const { data, error } = await supabase
    .from('regulation_log')
    .select('date, points')
    .eq('user_id', userId)
  if (error) throw error
  const totals = {}
  for (const row of (data || [])) {
    totals[row.date] = (totals[row.date] || 0) + (row.points || 0)
  }
  return totals
}

// ── Writes ───────────────────────────────────────────────────────────────────

/**
 * Log (or swap) a routine in a slot. Only one routine per slot per day is
 * allowed (DB partial-unique index), so any existing routine in that slot is
 * removed first — this makes swapping a routine work cleanly.
 * Returns the inserted row.
 */
export async function addRoutineLog({ userId, dateStr, slot, routine }) {
  const { error: delErr } = await supabase
    .from('regulation_log')
    .delete()
    .eq('user_id', userId)
    .eq('date', dateStr)
    .eq('kind', 'routine')
    .eq('slot', slot)
  if (delErr) throw delErr

  const { data, error } = await supabase
    .from('regulation_log')
    .insert({
      user_id: userId,
      date: dateStr,
      kind: 'routine',
      routine_id: routine.id,
      slot,
      label: routine.name,      // snapshot
      points: routine.points,   // snapshot
      sort_order: slot === 'morning' ? 0 : 1,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Log an action into the activity grid. Returns the inserted row. */
export async function addActionLog({ userId, dateStr, action, sortOrder }) {
  const { data, error } = await supabase
    .from('regulation_log')
    .insert({
      user_id: userId,
      date: dateStr,
      kind: 'action',
      action_id: action.id,
      action_type: action.action_type,   // snapshot
      label: action.name,                 // snapshot
      points: action.points,              // snapshot
      sort_order: sortOrder,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Remove a single log row (clearing a box / de-selecting a choice). */
export async function deleteRegLogRow(id) {
  const { error } = await supabase.from('regulation_log').delete().eq('id', id)
  if (error) throw error
}

/** Sum the points of a set of log rows. */
export function sumRegLog(rows) {
  return (rows || []).reduce((t, r) => t + (r.points || 0), 0)
}
