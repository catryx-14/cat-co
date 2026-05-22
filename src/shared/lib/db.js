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

export async function loadSettings() {
  const { data, error } = await supabase.from('almanac_settings').select('key, value')
  if (error) throw error
  const s = {}
  for (const row of data) s[row.key] = row.value
  const stored = s.thresholds ?? {}
  return {
    taxValue: s.autistic_tax?.value ?? 3,
    thresholds: { yellow: stored.yellow ?? 15, critical: stored.critical ?? 30 },
    livedExperienceThresholds: { yellow: stored.leYellow ?? 15, critical: stored.leCritical ?? 30 },
    taxStartDate: s.tax_start_date?.date ?? '2000-01-01',
  }
}

export async function saveThresholds(thresholds) {
  const { error } = await supabase
    .from('almanac_settings')
    .upsert({ key: 'thresholds', value: thresholds }, { onConflict: 'key' })
  if (error) throw error
}

// DB row → internal UI state shape
export function dbToInternal(row) {
  const d = row.entry_data
  return {
    openingBalance: d.openingBalance ?? 0,
    userEvents: (d.events ?? []).map((e, i) => ({
      id: `e${i}_${d.date}_${Date.now()}`,
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
                                warning, goodSigns, settings, yesterdayClosing, meltdown }) {
  const { taxValue, thresholds, taxStartDate } = settings
  // Autistic tax cancelled by any flow or SI Flow event
  const anyFlow = userEvents.some(e => !e.cancelled && (e.flow || e.siFlow != null)) || goodSigns.flow
  const taxApplies = dateStr >= taxStartDate && !anyFlow

  let evPoints = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    evPoints += (e.E || 0) + (e.S || 0) + (e.P || 0) + (e.M || 0) + (e.X || 0)
  }
  const taxPoints = taxApplies ? taxValue : 0

  // Formula: Peak
  const peakDebit = Math.round(openingBalance + evPoints + taxPoints)

  // Formula: Active Regulation (sleep is always automatic, not counted here)
  const activeRegulation = (regulation.sensory || 0) + (regulation.av || 0) +
                           (regulation.env || 0) + (regulation.body || 0)

  const events = userEvents.map(e => {
    const cost = (e.E || 0) + (e.S || 0) + (e.P || 0) + (e.M || 0) + (e.X || 0)
    const siFlowCredit = (e.siFlow && !e.cancelled) ? Math.round(cost * 0.2) : null
    return {
      summary: e.text,
      emotional: e.E || 0,
      sensory: e.S || 0,
      predictability: e.P || 0,
      masking: e.M || 0,
      ef: e.X || 0,
      delayed: e.delayed || false,
      flow: e.flow || false,
      realizedOn: '',
      bucket: e.bucket || 'morning',
      siFlow: e.siFlow || null,
      siFlowCredit,
    }
  })

  // SI Flow Bonus = SI Flow event cost × 20%, rounded
  const siFlowBonus = Math.round(
    events.reduce((sum, e) => {
      if (!e.siFlow) return sum
      return sum + (e.emotional || 0) + (e.sensory || 0) + (e.predictability ?? 0) + (e.masking || 0) + (e.ef || 0)
    }, 0) * 0.2
  )

  // Closing Balance carries forward — SI Flow bonus does NOT reduce the chain
  const closingBalance = Math.round(Math.max(0, peakDebit - activeRegulation))
  // Lived Experience is display-only — SI Flow bonus visible here but not in the carry-forward
  const livedExperience = Math.round(Math.max(0, peakDebit - activeRegulation - siFlowBonus))
  const siFlowActive = userEvents.some(e => !e.cancelled && e.siFlow != null)

  const entryData = {
    date: dateStr,
    openingBalance: Math.round(openingBalance),
    closingBalance,
    peakDebit,
    activeRegulation,
    siFlowBonus,
    autisticTax: taxPoints,
    flowActivity: goodSigns.flow,
    yellowThreshold: thresholds.yellow,
    criticalThreshold: thresholds.critical,
    yesterdayClosing: yesterdayClosing ?? 0,
    delayedReactionSource: false,
    delayedReactionRealized: false,
    livedExperience,
    events,
    regulation: {
      sensoryComfort: regulation.sensory || 0,
      audioVisual: regulation.av || 0,
      environment: regulation.env || 0,
      bodyRest: regulation.body || 0,
      recoverySleep: recovery || false,
    },
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
