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
import { addDaysStr } from './dates.js'
import {
  computeDisplayValues,
  computeClosingBalance,
  computeMissedDayClosing,
  resolveOpeningBalance,
  DEFAULT_AUTISTIC_TAX,
} from './math.js'
import { loadRegLogTotalsByDate } from './regulationLog.js'

// ── Conversion helpers ─────────────────────────────────────────────────────

/**
 * Assembles energy_daily + energy_events rows into the same "entry_data" shape
 * that dbToInternal() already knows how to read.  This lets TrackerV2Room reuse
 * all the existing internal-state logic without duplication.
 */
function buildEntryData(daily, events, regLogTotal = null) {
  const closingBalance = daily.closing_balance ?? 0

  // Build the regulation and events shape first so computeDisplayValues can use them
  const regulation = {
    sensoryComfort: daily.reg_sensory        ?? 0,
    audioVisual:    daily.reg_audio_visual   ?? 0,
    environment:    daily.reg_environment    ?? 0,
    bodyRest:       daily.reg_body           ?? 0,
    recoverySleep:  daily.reg_recovery_sleep ?? false,
  }

  const mappedEvents = (events ?? []).map(ev => ({
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
    _v2id: ev.id,
  }))

  // Single shared function — same numbers everywhere (tooltip, week strip, history)
  // Pass the stamped per-day tax so cascade recalculation applies it correctly
  const taxSettings = daily.autistic_tax != null
    ? { taxValue: daily.autistic_tax, taxStartDate: '2000-01-01' }
    : null
  const { peakDebit, activeRegulation, siFlowBonus, livedExperience } =
    computeDisplayValues(
      { date: daily.date, openingBalance: daily.opening_balance ?? 0, regulation, events: mappedEvents, flowActivity: daily.flow_activity ?? false, regulationLogTotal: regLogTotal },
      taxSettings
    )

  return {
    date: daily.date,
    openingBalance: daily.opening_balance ?? 0,
    closingBalance,
    peakDebit,
    activeRegulation,
    // Kept on the entry so the cascade recompute reuses the same regulation source
    // (null = no grid rows → the pip fallback in computeDisplayValues applies).
    regulationLogTotal: regLogTotal,
    autisticTax: 0,
    autisticTaxRate: daily.autistic_tax,          // column is NOT NULL (defaults to the tax setting)
    siFlowBonus,
    livedExperience,
    flowActivity: daily.flow_activity ?? false,
    siFlowActive: daily.si_flow_active ?? false,
    autoFilled: daily.auto_filled ?? false,
    meltdown: daily.meltdown ?? false,
    yellowThreshold: daily.yellow_threshold ?? 15,
    orangeThreshold: daily.orange_threshold ?? 25,
    criticalThreshold: daily.critical_threshold ?? 30,
    purpleOverride: daily.purple_override ?? null,
    events: mappedEvents,
    regulation,
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
    auto_filled:    d.autoFilled ?? false,   // a real user edit always lands here as false → clears the flag
    autistic_tax:   d.autisticTaxRate ?? DEFAULT_AUTISTIC_TAX,
    yellow_threshold:   d.yellowThreshold   ?? 15,
    orange_threshold:   d.orangeThreshold   ?? 25,
    critical_threshold: d.criticalThreshold ?? 30,
    purple_override:    d.purpleOverride    ?? null,
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
  const [{ data: daily, error: dailyErr }, { data: events, error: eventsErr }, regTotals] = await Promise.all([
    supabase.from('energy_daily').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle(),
    supabase.from('energy_events').select('*').eq('user_id', userId).eq('date', dateStr).order('sort_order'),
    loadRegLogTotalsByDate(userId),
  ])
  if (dailyErr) throw dailyErr
  if (eventsErr) throw eventsErr
  if (!daily) return null
  return {
    date: dateStr,
    user_id: userId,
    entry_data: buildEntryData(daily, events ?? [], regTotals[dateStr] ?? null),
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

  // Per-day regulation grid totals — the regulation source for any day with rows.
  const regTotals = await loadRegLogTotalsByDate(userId)

  // Load all events in one query, then group by date
  const dates = allDaily.map(d => d.date)
  const { data: allEvents, error: eventsErr } = await supabase
    .from('energy_events')
    .select('*')
    .eq('user_id', userId)
    .in('date', dates)
    .order('sort_order')
  if (eventsErr) throw eventsErr

  const eventsByDate = {}
  for (const ev of (allEvents ?? [])) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = []
    eventsByDate[ev.date].push(ev)
  }

  return allDaily.map(daily => ({
    date: daily.date,
    user_id: userId,
    entry_data: buildEntryData(daily, eventsByDate[daily.date] ?? [], regTotals[daily.date] ?? null),
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
  // Hand the day's own stamped tax into computeDisplayValues — mirrors exactly
  // what buildEntryData does for display, so the stored closing and the
  // displayed peak can never disagree. (Previously settings were omitted here,
  // which silently dropped the autistic tax on every cascaded day.)
  const dayTax = {
    taxValue: entryData.autisticTaxRate ?? DEFAULT_AUTISTIC_TAX,
    taxStartDate: '2000-01-01',
  }
  const { peakDebit, activeRegulation, siFlowBonus, livedExperience } =
    computeDisplayValues({ ...entryData, openingBalance: Math.round(openingBalance) }, dayTax)
  const closingBalance = computeClosingBalance(peakDebit, activeRegulation)
  return { openingBalance: Math.round(openingBalance), peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience }
}

/**
 * Cascade: recalculate every stored entry AFTER fromDateStr.
 * Each day's opening balance is re-derived from the chain (gap-aware) using the
 * freshly-corrected closing of the days before it, so missed days between stored
 * entries are accounted for and the autistic tax is reapplied correctly.
 */
export async function recalculateFromDateV2(userId, fromDateStr, settings = {}) {
  const entries = await loadAllEntriesV2(userId)
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const subsequent = sorted.filter(e => e.date > fromDateStr)
  if (subsequent.length === 0) return 0

  for (const entry of subsequent) {
    try {
      const d = entry.entry_data
      // resolveOpeningBalance reads `sorted`, which we mutate in place below, so
      // each day sees the corrected closing of the day(s) before it.
      const openingBalance = resolveOpeningBalance(entry.date, sorted, settings)
      const { peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience } =
        _recomputeFromEntryData(d, openingBalance)

      const updatedEntryData = { ...d, openingBalance, peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience }
      entry.entry_data = updatedEntryData            // update in-memory for the next day's resolve
      await saveEntryV2({ dateStr: entry.date, entryData: updatedEntryData, userId })
    } catch (err) {
      console.error(`[recalculate] failed on ${entry.date}:`, err)
      throw err
    }
  }

  return subsequent.length
}

// ── Missed-day backfill ────────────────────────────────────────────────────

/**
 * Fills the trailing gap — every calendar day AFTER the user's most recent
 * entry, up to (but not including) today — with quiet zero-event placeholder
 * rows, each flagged auto_filled so the room can show a banner. Today stays
 * unlogged until it's logged for real.
 *
 * Scope is deliberately the trailing gap only (the "I logged a few days late"
 * case), not old internal gaps — those are handled virtually by
 * resolveOpeningBalance and don't need rows written. Idempotent and
 * non-destructive: it only creates days that have no row. Returns created dates.
 *
 * A placeholder is just a zero-event, no-flow day run through the standard rule,
 * so it naturally carries the sleep deduction (via opening) and the autistic tax.
 */
export async function backfillMissedDays(userId, settings = {}, todayStr) {
  const entries = await loadAllEntriesV2(userId)
  if (entries.length === 0) return []

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const lastEntryDate = sorted[sorted.length - 1].date
  const lastNeeded = addDaysStr(todayStr, -1)        // fill up to yesterday
  if (lastNeeded <= lastEntryDate) return []         // no trailing gap

  const taxValue = settings.taxValue ?? DEFAULT_AUTISTIC_TAX
  const taxStartDate = settings.taxStartDate ?? '2000-01-01'
  const created = []

  let cursor = addDaysStr(lastEntryDate, 1)
  while (cursor <= lastNeeded) {
    const opening = resolveOpeningBalance(cursor, sorted, settings)
    const taxApplies = cursor >= taxStartDate
    const closing = computeMissedDayClosing(opening, taxApplies, taxValue)
    const entryData = {
      date: cursor,
      openingBalance: opening,
      closingBalance: closing,
      peakDebit: closing,
      activeRegulation: 0,
      siFlowBonus: 0,
      livedExperience: closing,
      regulation: { sensoryComfort: 0, audioVisual: 0, environment: 0, bodyRest: 0, recoverySleep: false },
      events: [],
      autisticTaxRate: taxValue,
      autoFilled: true,
      flowActivity: false,
      siFlowActive: false,
      meltdown: false,
      warningSign: { skin: false, vision: false, thought: false, sunny: false, crisisResponse: false },
      yellowThreshold:   settings.thresholds?.yellow   ?? 15,
      orangeThreshold:   settings.thresholds?.orange   ?? 25,
      criticalThreshold: settings.thresholds?.critical ?? 30,
      purpleOverride: null,
    }
    await saveEntryV2({ dateStr: cursor, entryData, userId })
    // append in date order (cursor only moves forward) so the next gap day chains off this one
    sorted.push({ date: cursor, user_id: userId, entry_data: entryData })
    created.push(cursor)
    cursor = addDaysStr(cursor, 1)
  }
  return created
}

// Re-export the pure conversion utilities unchanged — no need to duplicate them
export { dbToInternal, internalToDb } from './db.js'
