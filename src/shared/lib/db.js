/**
 * db.js — Shared database utilities
 *
 * Contains only the functions still in active use:
 *   loadSettings   — reads almanac_settings (used by App.jsx on startup)
 *   saveThresholds — writes almanac_settings (used by TrackerV2Room)
 *   dbToInternal   — converts a stored entry row into the app's internal state shape
 *   internalToDb   — converts internal state back into the stored entry shape
 *
 * Date utilities (todayDateStr, yesterdayDateStr) live in dates.js.
 * The V2 data layer (energy_daily + energy_events) lives in db-v2.js.
 */

import { supabase } from './supabase.js'
import { computeDisplayValues, computeClosingBalance, DEFAULT_AUTISTIC_TAX } from './math.js'

export async function loadSettings() {
  const { data, error } = await supabase.from('almanac_settings').select('key, value')
  if (error) throw error
  const s = {}
  for (const row of data) s[row.key] = row.value
  const stored = s.thresholds ?? {}
  const thr = {
    yellow:   stored.yellow   ?? stored.leYellow   ?? 15,
    orange:   stored.orange   ?? stored.leOrange   ?? 25,
    critical: stored.critical ?? stored.leCritical ?? 30,
  }
  return {
    taxValue: s.autistic_tax?.value ?? DEFAULT_AUTISTIC_TAX,
    thresholds: { ...thr },
    livedExperienceThresholds: { ...thr },
    purpleFloors: s.purple ?? { floor_day1: 25, floor_day2: 15 },
    taxStartDate: s.tax_start_date?.date ?? '2000-01-01',
  }
}

export async function saveThresholds(thresholds) {
  const { error } = await supabase
    .from('almanac_settings')
    .upsert({ key: 'thresholds', value: thresholds }, { onConflict: 'key' })
  if (error) throw error
}

export async function savePurpleFloors(purple) {
  const { error } = await supabase
    .from('almanac_settings')
    .upsert({ key: 'purple', value: purple }, { onConflict: 'key' })
  if (error) throw error
}

export async function saveTaxValue(value) {
  const { error } = await supabase
    .from('almanac_settings')
    .upsert({ key: 'autistic_tax', value: { value } }, { onConflict: 'key' })
  if (error) throw error
}

// DB row → internal UI state shape
export function dbToInternal(row) {
  const d = row.entry_data
  return {
    openingBalance: d.openingBalance ?? 0,
    userEvents: (d.events ?? []).map((e, i) => ({
      id: `e${i}_${d.date}_${Date.now()}`,
      _v2id: e._v2id ?? null,
      bucket: e.bucket || 'morning',
      text: e.summary ?? '',
      E: e.emotional ?? 0,
      S: e.sensory ?? 0,
      P: e.predictability ?? e.veracity ?? 0,
      M: e.masking ?? 0,
      X: e.ef ?? 0,
      delayed: e.delayed ?? false,
      flow: e.flow ?? false,
      cancelled: false,
      siFlow: e.siFlow ?? null,
    })),
    regulation: {
      sensory: d.regulation?.sensoryComfort ?? 0,
      av: d.regulation?.audioVisual ?? 0,
      env: d.regulation?.environment ?? 0,
      body: d.regulation?.bodyRest ?? 0,
    },
    recovery: d.regulation?.recoverySleep ?? false,
    warning: {
      skin: d.warningSign?.skin ?? false,
      vision: d.warningSign?.vision ?? false,
      thought: d.warningSign?.thought ?? false,
      other: d.warningSign?.sunny ?? false,
    },
    goodSigns: {
      flow: d.flowActivity ?? false,
      crisis: d.warningSign?.crisisResponse ?? false,
    },
    meltdown: d.meltdown ?? false,
    closingBalance: d.closingBalance ?? 0,
    peakDebit: d.peakDebit ?? 0,
  }
}

// Internal UI state → DB entry_data blob + computed peak
export function internalToDb({ dateStr, openingBalance, userEvents, regulation, recovery,
                                warning, goodSigns, settings, yesterdayClosing, meltdown,
                                purpleOverride = null }) {
  const { thresholds } = settings

  // Map events from UI shape (E/S/P/M/X) to stored shape (emotional/sensory/…)
  const events = userEvents.map(e => {
    const cost = (e.E || 0) + (e.S || 0) + (e.P || 0) + (e.M || 0) + (e.X || 0)
    const siFlowCredit = (e.siFlow && !e.cancelled) ? Math.round(cost * 0.2) : null
    return {
      summary:        e.text,
      emotional:      e.E || 0,
      sensory:        e.S || 0,
      predictability: e.P || 0,
      masking:        e.M || 0,
      ef:             e.X || 0,
      delayed:        e.delayed  || false,
      flow:           e.flow     || false,
      cancelled:      e.cancelled || false,
      realizedOn:     '',
      bucket:         e.bucket || 'morning',
      siFlow:         e.siFlow || null,
      siFlowCredit,
    }
  })

  // Map regulation from UI shape (sensory/av/env/body) to stored shape
  const storedRegulation = {
    sensoryComfort: regulation.sensory || 0,
    audioVisual:    regulation.av      || 0,
    environment:    regulation.env     || 0,
    bodyRest:       regulation.body    || 0,
    recoverySleep:  recovery           || false,
  }

  // Single canonical formula — same as the tooltip and calendar
  const { peakDebit, activeRegulation, siFlowBonus, livedExperience } = computeDisplayValues(
    { date: dateStr, openingBalance, regulation: storedRegulation, events, flowActivity: goodSigns.flow },
    settings
  )
  const closingBalance = computeClosingBalance(peakDebit, activeRegulation)

  // Autistic tax stored for display purposes — mirrors what computeDisplayValues computes internally
  const anyFlow = events.some(e => !e.cancelled && (e.flow || e.siFlow != null)) || (goodSigns.flow ?? false)
  const taxApplies = dateStr >= (settings.taxStartDate ?? '2000-01-01') && !anyFlow
  const taxPoints  = taxApplies ? (settings.taxValue ?? 0) : 0

  const siFlowActive = userEvents.some(e => !e.cancelled && e.siFlow != null)

  const entryData = {
    date: dateStr,
    openingBalance: Math.round(openingBalance),
    closingBalance,
    peakDebit,
    activeRegulation,
    siFlowBonus,
    autisticTax: taxPoints,
    autisticTaxRate: settings.taxValue ?? DEFAULT_AUTISTIC_TAX,
    flowActivity: goodSigns.flow,
    yellowThreshold: thresholds.yellow,
    orangeThreshold: thresholds.orange ?? 25,
    criticalThreshold: thresholds.critical,
    purpleOverride: purpleOverride ?? null,
    yesterdayClosing: yesterdayClosing ?? 0,
    delayedReactionSource: false,
    delayedReactionRealized: false,
    livedExperience,
    events,
    regulation: storedRegulation,
    warningSign: {
      skin: warning.skin || false,
      vision: warning.vision || false,
      thought: warning.thought || false,
      sunny: warning.other || false,
      crisisResponse: goodSigns.crisis || false,
    },
    meltdown: meltdown || false,
    siFlowActive,
  }

  return { entryData, peakDebit }
}
