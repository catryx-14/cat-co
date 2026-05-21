/**
 * db-v2.js — Data layer for energy_events + energy_daily tables
 *
 * Mirrors the API of db.js so TrackerV2Room can use the same internal state
 * shape and the same dbToInternal / internalToDb conversion utilities.
 *
 * The key difference: instead of one JSONB blob per day (energy_entries),
 * we have two properly-normalised tables:
 *   energy_events  — one row per logged event
 *   energy_daily   — one row per day (inputs + stamped closing balance)
 */

import { supabase } from './supabase.js'
import { dbToInternal, internalToDb } from './db.js'

// ── Conversion helpers ─────────────────────────────────────────────────────

/**
 * Assembles energy_daily + energy_events rows into the same "entry_data" shape
 * that dbToInternal() already knows how to read.  This lets TrackerV2Room reuse
 * all the existing internal-state logic without duplication.
 */
function buildEntryData(daily, events) {
  return {
    date: daily.date,
    openingBalance: daily.opening_balance ?? 0,
    closingBalance: daily.closing_balance ?? 0,
    // Calculated fields are stored for reference but always recomputed at runtime
    peakDebit: 0,
    activeRegulation: 0,
    autisticTax: 0,
    siFlowBonus: 0,
    livedExperience: 0,
    flowActivity: daily.flow_activity ?? false,
    siFlowActive: daily.si_flow_active ?? false,
    meltdown: daily.meltdown ?? false,
    yellowThreshold: daily.yellow_threshold ?? 15,
    criticalThreshold: daily.critical_threshold ?? 30,
    events: (events ?? []).map(ev => ({
      summary: ev.summary ?? '',
      emotional: ev.emotional ?? 0,
      sensory: ev.sensory ?? 0,
      predictability: ev.predictability ?? 0,
      masking: ev.masking ?? 0,
      ef: ev.ef ?? 0,
      bucket: ev.bucket ?? 'morning',
      flow: ev.flow ?? false,
      siFlow: ev.si_flow ?? null,
      siFlowCredit: ev.si_flow_credit ?? null,
      delayed: ev.delayed ?? false,
      realizedOn: ev.realized_on ?? '',
      cancelled: ev.cancelled ?? false,
      _v2id: ev.id,   // preserve the DB row id so updates can target the right row
    })),
    regulation: {
      sensoryComfort: daily.reg_sensory ?? 0,
      audioVisual: daily.reg_audio_visual ?? 0,
      environment: daily.reg_environment ?? 0,
      bodyRest: daily.reg_body ?? 0,
      recoverySleep: daily.reg_recovery_sleep ?? false,
    },
    warningSign: {
      skin: daily.warn_skin ?? false,
      vision: daily.warn_vision ?? false,
      thought: daily.warn_thought ?? false,
      sunny: daily.warn_sunny ?? false,
      crisisResponse: daily.warn_crisis ?? false,
    },
  }
}

/**
 * Converts entryData (the output of internalToDb) into energy_daily columns.
 */
function entryDataToDailyRow(dateStr, entryData, userId) {
  const d = entryData
  return {
    user_id: userId,
    date: dateStr,
    opening_balance: d.openingBalance ?? 0,
    closing_balance: d.closingBalance ?? 0,
    reg_sensory:       d.regulation?.sensoryComfort ?? 0,
    reg_audio_visual:  d.regulation?.audioVisual ?? 0,
    reg_environment:   d.regulation?.environment ?? 0,
    reg_body:          d.regulation?.bodyRest ?? 0,
    reg_recovery_sleep: d.regulation?.recoverySleep ?? false,
    warn_skin:    d.warningSign?.skin ?? false,
    warn_sunny:   d.warningSign?.sunny ?? false,
    warn_vision:  d.warningSign?.vision ?? false,
    warn_thought: d.warningSign?.thought ?? false,
    warn_crisis:  d.warningSign?.crisisResponse ?? false,
    meltdown:     d.meltdown ?? false,
    si_flow_active: d.siFlowActive ?? false,
    flow_activity:  d.flowActivity ?? false,
    yellow_threshold:   d.yellowThreshold ?? 15,
    critical_threshold: d.criticalThreshold ?? 30,
  }
}

/**
 * Converts entryData events into energy_events rows (for bulk replace).
 */
function entryDataToEventRows(dateStr, entryData, userId) {
  return (entryData.events ?? []).map((ev, i) => ({
    user_id: userId,
    date: dateStr,
    bucket: ev.bucket ?? 'morning',
    summary: ev.summary ?? '',
    ef: ev.ef ?? 0,
    emotional: ev.emotional ?? 0,
    sensory: ev.sensory ?? 0,
    masking: ev.masking ?? 0,
    predictability: ev.predictability ?? 0,
    flow: ev.flow ?? false,
    si_flow: ev.siFlow ?? null,
    si_flow_credit: ev.siFlowCredit ?? null,
    delayed: ev.delayed ?? false,
    realized_on: ev.realizedOn ?? null,
    cancelled: ev.cancelled ?? false,
    sort_order: i,
  }))
}

// ── Core read functions ───────────────────────────────────────────────────

/**
 * Load one day from new tables.
 * Returns a fake "entry row" in the same shape that dbToInternal() expects,
 * so all the existing internal-state logic can be reused unchanged.
 */
export async function loadEntryV2(dateStr, userId) {
  const [{ data: daily }, { data: events }] = await Promise.all([
    supabase.from('energy_daily').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle(),
    supabase.from('energy_events').select('*').eq('user_id', userId).eq('date', dateStr).order('sort_order'),
  ])
  if (!daily) return null
  return {
    date: dateStr,
    user_id: userId,
    entry_data: buildEntryData(daily, events ?? []),
  }
}

/**
 * Load all days from new tables, newest first.
 * Returns an array of fake "entry rows" in the same shape as loadAllEntries().
 */
export async function loadAllEntriesV2(userId) {
  const { data: allDaily, error } = await supabase
    .from('energy_daily')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  if (!allDaily || allDaily.length === 0) return []

  // Load all events in one query, then group by date
  const dates = allDaily.map(d => d.date)
  const { data: allEvents } = await supabase
    .from('energy_events')
    .select('*')
    .eq('user_id', userId)
    .in('date', dates)
    .order('sort_order')

  const eventsByDate = {}
  for (const ev of (allEvents ?? [])) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = []
    eventsByDate[ev.date].push(ev)
  }

  return allDaily.map(daily => ({
    date: daily.date,
    user_id: userId,
    entry_data: buildEntryData(daily, eventsByDate[daily.date] ?? []),
  }))
}

// ── Core write functions ───────────────────────────────────────────────────

/**
 * Save a day to new tables.
 * Matches the saveEntry() signature from db.js.
 * Strategy: upsert energy_daily, then delete + reinsert energy_events for this date.
 */
export async function saveEntryV2({ dateStr, entryData, peakDebit: _ignored, userId }) {
  const dailyRow = entryDataToDailyRow(dateStr, entryData, userId)
  const eventRows = entryDataToEventRows(dateStr, entryData, userId)

  // Upsert daily row
  const { error: dailyErr } = await supabase
    .from('energy_daily')
    .upsert(dailyRow, { onConflict: 'user_id,date' })
  if (dailyErr) throw dailyErr

  // Replace all events for this date (delete + insert is safest for ordering)
  const { error: delErr } = await supabase
    .from('energy_events')
    .delete()
    .eq('user_id', userId)
    .eq('date', dateStr)
  if (delErr) throw delErr

  if (eventRows.length > 0) {
    const { error: insErr } = await supabase.from('energy_events').insert(eventRows)
    if (insErr) throw insErr
  }
}

// ── Cascade recalculation ─────────────────────────────────────────────────

function _recomputeFromEntryData(entryData, openingBalance) {
  let evPoints = 0
  let siFlowCost = 0
  for (const e of entryData.events ?? []) {
    const cost = (e.emotional || 0) + (e.sensory || 0) + (e.predictability || 0) +
                 (e.masking || 0) + (e.ef || 0)
    if (!e.cancelled) {
      evPoints += cost
      if (e.siFlow) siFlowCost += cost
    }
  }
  const autisticTax = entryData.autisticTax ?? 0
  const peakDebit = Math.round(openingBalance + evPoints + autisticTax)
  const activeRegulation =
    (entryData.regulation?.sensoryComfort || 0) +
    (entryData.regulation?.audioVisual || 0) +
    (entryData.regulation?.environment || 0) +
    (entryData.regulation?.bodyRest || 0)
  const siFlowBonus = Math.round(siFlowCost * 0.2)
  const closingBalance = Math.round(Math.max(0, peakDebit - activeRegulation))
  const livedExperience = Math.round(Math.max(0, peakDebit - activeRegulation - siFlowBonus))
  return { openingBalance: Math.round(openingBalance), peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience }
}

/**
 * Cascade: recalculate all entries after fromDateStr using the V2 tables.
 * fromDateStr's closing balance becomes the anchor for subsequent days.
 */
export async function recalculateFromDateV2(userId, fromDateStr) {
  const entries = await loadAllEntriesV2(userId)
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const anchor = sorted.find(e => e.date === fromDateStr)
  if (!anchor) return 0

  const subsequent = sorted.filter(e => e.date > fromDateStr)
  if (subsequent.length === 0) return 0

  let prevClosing = anchor.entry_data.closingBalance ?? 0

  for (const entry of subsequent) {
    const d = entry.entry_data
    const openingBalance = Math.max(0, prevClosing - 5)
    const { peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience } =
      _recomputeFromEntryData(d, openingBalance)

    const updatedEntryData = { ...d, openingBalance, peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience }
    await saveEntryV2({ dateStr: entry.date, entryData: updatedEntryData, userId })
    prevClosing = closingBalance
  }

  return subsequent.length
}

// Re-export the pure conversion utilities unchanged — no need to duplicate them
export { dbToInternal, internalToDb } from './db.js'
