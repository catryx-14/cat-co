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
    livedExperienceThresholds: { yellow: stored.leYellow ?? 12, critical: stored.leCritical ?? 22 },
    taxStartDate: s.tax_start_date?.date ?? '2000-01-01',
  }
}

export async function loadEntry(dateStr, userId) {
  const { data, error } = await supabase
    .from('energy_entries')
    .select('*')
    .eq('date', dateStr)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function loadAllEntries(userId) {
  const { data, error } = await supabase
    .from('energy_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveEntry({ dateStr, entryData, peakDebit, userId }) {
  const { error } = await supabase
    .from('energy_entries')
    .upsert(
      { date: dateStr, entry_data: entryData, peak_debit: peakDebit, user_id: userId },
      { onConflict: 'user_id,date' }
    )
  if (error) throw error
}

export async function deleteEntry(dateStr, userId) {
  const { error } = await supabase
    .from('energy_entries')
    .delete()
    .eq('date', dateStr)
    .eq('user_id', userId)
  if (error) throw error
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
      V: e.veracity ?? 0,
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
      sleep: d.sleepReset ?? 0,
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
  const anyFlow = userEvents.some(e => e.flow) || goodSigns.flow
  const taxApplies = dateStr >= taxStartDate && !anyFlow

  let evPoints = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    evPoints += (e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)
  }
  const taxPoints = taxApplies ? taxValue : 0
  const peakDebit = openingBalance + evPoints + taxPoints
  const nonSleepReg = (regulation.sensory || 0) + (regulation.av || 0) +
                      (regulation.env || 0) + (regulation.body || 0)
  const events = userEvents.map(e => {
    const cost = (e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)
    const siFlowCredit = (e.siFlow && !e.cancelled) ? Math.round(cost * 0.3 * 100) / 100 : null
    return {
      summary: e.text,
      emotional: e.E || 0,
      sensory: e.S || 0,
      veracity: e.V || 0,
      ef: e.X || 0,
      delayed: e.delayed || false,
      flow: e.flow || false,
      realizedOn: '',
      bucket: e.bucket || 'morning',
      siFlow: e.siFlow || null,
      siFlowCredit,
    }
  })

  const totalSICredit = events.reduce((sum, e) => sum + (e.siFlowCredit ?? 0), 0)
  const closingBalance = Math.max(0, peakDebit - nonSleepReg - totalSICredit)
  const livedExperience = closingBalance
  const siFlowCarryoverBonus = Math.round(totalSICredit * 0.5)
  const siFlowActive = userEvents.some(e => !e.cancelled && e.siFlow != null)

  const entryData = {
    date: dateStr,
    openingBalance,
    closingBalance,
    peakDebit,
    autisticTax: taxPoints,
    sleepReset: regulation.sleep || 0,
    flowActivity: goodSigns.flow,
    yellowThreshold: thresholds.yellow,
    criticalThreshold: thresholds.critical,
    yesterdayClosing: yesterdayClosing ?? 0,
    delayedReactionSource: false,
    delayedReactionRealized: false,
    totalSICredit,
    livedExperience,
    siFlowCarryoverBonus,
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

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDateStr() {
  return localDateStr(new Date())
}

export function yesterdayDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}

// Recalculate all entries in chronological order, cascading closing→opening chain.
export async function recalculateAllEntries(userId) {
  const entries = await loadAllEntries(userId)
  const sorted = [...entries].sort((a, b) =>
    a.entry_data.date.localeCompare(b.entry_data.date)
  )

  let prevClosing = null
  let prevSleepReset = 0
  let prevCarryoverBonus = 0

  for (const entry of sorted) {
    const d = entry.entry_data

    const openingBalance = prevClosing !== null
      ? Math.max(0, prevClosing - prevSleepReset + prevCarryoverBonus)
      : (d.openingBalance ?? 0)

    let evPoints = 0
    let totalSICredit = 0
    for (const e of d.events ?? []) {
      evPoints += (e.emotional || 0) + (e.sensory || 0) + (e.veracity || 0) + (e.ef || 0)
      totalSICredit += e.siFlowCredit ?? 0
    }

    const autisticTax = d.autisticTax ?? 0
    const peakDebit = openingBalance + evPoints + autisticTax
    const nonSleepReg = (d.regulation?.sensoryComfort || 0) + (d.regulation?.audioVisual || 0) +
                        (d.regulation?.environment || 0) + (d.regulation?.bodyRest || 0)
    const closingBalance = Math.max(0, peakDebit - nonSleepReg - totalSICredit)
    const siFlowCarryoverBonus = Math.round(totalSICredit * 0.5)

    const updated = {
      ...d,
      openingBalance,
      peakDebit,
      closingBalance,
      livedExperience: closingBalance,
      totalSICredit,
      siFlowCarryoverBonus,
    }

    await saveEntry({ dateStr: d.date, entryData: updated, peakDebit, userId })

    prevClosing = closingBalance
    prevSleepReset = d.sleepReset ?? 0
    prevCarryoverBonus = siFlowCarryoverBonus
  }

  return sorted.length
}
