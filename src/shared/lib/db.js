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

function _addOneDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

// Fills any calendar gaps before targetDateStr with system-generated zero-event entries.
// When includeTarget is true, also fills targetDateStr itself if missing (for past-day views).
// Returns the array of dates that were newly created (missed days).
export async function fillGapsBefore(targetDateStr, userId, _settings, { includeTarget = false } = {}) {
  const { data: anchor, error: e1 } = await supabase
    .from('energy_entries')
    .select('*')
    .eq('user_id', userId)
    .lt('date', targetDateStr)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (e1) throw e1
  if (!anchor) return []

  const gapDates = []
  let cursor = _addOneDay(anchor.date)
  while (cursor < targetDateStr) { gapDates.push(cursor); cursor = _addOneDay(cursor) }
  if (includeTarget) gapDates.push(targetDateStr)
  if (gapDates.length === 0) return []

  const { data: existing, error: e2 } = await supabase
    .from('energy_entries')
    .select('date')
    .eq('user_id', userId)
    .gte('date', gapDates[0])
    .lte('date', gapDates[gapDates.length - 1])
  if (e2) throw e2
  const existingDates = new Set((existing ?? []).map(r => r.date))

  const missingDates = gapDates.filter(d => !existingDates.has(d))
  if (missingDates.length === 0) return []

  // Formula 1: each missed day opening = previous closing − 5 (sleep always automatic)
  let prevClosing = anchor.entry_data.closingBalance ?? 0

  for (const ds of gapDates) {
    const opening = Math.max(0, prevClosing - 5)
    // Zero events, zero regulation — sleep deduction already applied in opening
    const peak = opening
    const closing = opening

    if (!existingDates.has(ds)) {
      await saveEntry({
        dateStr: ds,
        entryData: {
          date: ds,
          openingBalance: opening,
          peakDebit: peak,
          closingBalance: closing,
          livedExperience: closing,
          activeRegulation: 0,
          siFlowBonus: 0,
          autisticTax: 0,
          events: [],
          regulation: { sensoryComfort: 0, audioVisual: 0, environment: 0, bodyRest: 0, recoverySleep: false },
          warningSign: { skin: false, vision: false, thought: false, sunny: false, crisisResponse: false },
          meltdown: false,
          flowActivity: false,
          isSystemGenerated: true,
        },
        peakDebit: peak,
        userId,
      })
    }

    prevClosing = closing
  }

  return missingDates
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
    evPoints += (e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)
  }
  const taxPoints = taxApplies ? taxValue : 0

  // Formula 2: Peak
  const peakDebit = Math.round(openingBalance + evPoints + taxPoints)

  // Formula 3: Active Regulation (no sleep — sleep is always automatic)
  const activeRegulation = (regulation.sensory || 0) + (regulation.av || 0) +
                           (regulation.env || 0) + (regulation.body || 0)

  const events = userEvents.map(e => {
    const cost = (e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)
    const siFlowCredit = (e.siFlow && !e.cancelled) ? Math.round(cost * 0.2) : null
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

  // Formula 4: SI Flow Bonus = SI Flow event cost × 20%, rounded
  const siFlowBonus = Math.round(
    events.reduce((sum, e) => {
      if (!e.siFlow) return sum
      return sum + (e.emotional || 0) + (e.sensory || 0) + (e.veracity || 0) + (e.ef || 0)
    }, 0) * 0.2
  )

  // Formula 5: Lived Experience / Closing Balance
  const closingBalance = Math.round(Math.max(0, peakDebit - activeRegulation - siFlowBonus))
  const livedExperience = closingBalance
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

function _recomputeEntry(d, openingBalance) {
  let evPoints = 0
  let siFlowCost = 0
  for (const e of d.events ?? []) {
    const cost = (e.emotional || 0) + (e.sensory || 0) + (e.veracity || 0) + (e.ef || 0)
    evPoints += cost
    if (e.siFlow) siFlowCost += cost
  }
  const autisticTax = d.autisticTax ?? 0
  const peakDebit = Math.round(openingBalance + evPoints + autisticTax)
  const activeRegulation = (d.regulation?.sensoryComfort || 0) + (d.regulation?.audioVisual || 0) +
                           (d.regulation?.environment || 0) + (d.regulation?.bodyRest || 0)
  const siFlowBonus = Math.round(siFlowCost * 0.2)
  const closingBalance = Math.round(Math.max(0, peakDebit - activeRegulation - siFlowBonus))
  return { openingBalance: Math.round(openingBalance), peakDebit, activeRegulation, siFlowBonus, closingBalance }
}

// Recalculate all entries in chronological order, cascading closing→opening chain.
export async function recalculateAllEntries(userId) {
  const entries = await loadAllEntries(userId)
  const sorted = [...entries].sort((a, b) =>
    a.entry_data.date.localeCompare(b.entry_data.date)
  )

  let prevClosing = null

  for (const entry of sorted) {
    const d = entry.entry_data
    // Formula 1: opening = previous closing − 5; first entry preserves its stored opening
    const openingBalance = prevClosing !== null
      ? Math.max(0, prevClosing - 5)
      : Math.round(d.openingBalance ?? 0)

    const { peakDebit, activeRegulation, siFlowBonus, closingBalance } = _recomputeEntry(d, openingBalance)

    await saveEntry({
      dateStr: d.date,
      entryData: { ...d, openingBalance, peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience: closingBalance },
      peakDebit,
      userId,
    })

    prevClosing = closingBalance
  }

  return sorted.length
}

// Recalculate all entries after fromDateStr (exclusive), using fromDateStr's saved closing as anchor.
// Only called for historical edits — today's saves never cascade.
export async function recalculateFromDate(userId, fromDateStr) {
  const entries = await loadAllEntries(userId)
  const sorted = [...entries].sort((a, b) =>
    a.entry_data.date.localeCompare(b.entry_data.date)
  )

  const anchor = sorted.find(e => e.entry_data.date === fromDateStr)
  if (!anchor) return 0

  const subsequent = sorted.filter(e => e.entry_data.date > fromDateStr)
  if (subsequent.length === 0) return 0

  // Formula 1: each subsequent day opening = previous closing − 5
  let prevClosing = anchor.entry_data.closingBalance ?? 0

  for (const entry of subsequent) {
    const d = entry.entry_data
    const openingBalance = Math.max(0, prevClosing - 5)

    const { peakDebit, activeRegulation, siFlowBonus, closingBalance } = _recomputeEntry(d, openingBalance)

    await saveEntry({
      dateStr: d.date,
      entryData: { ...d, openingBalance, peakDebit, activeRegulation, siFlowBonus, closingBalance, livedExperience: closingBalance },
      peakDebit,
      userId,
    })

    prevClosing = closingBalance
  }

  return subsequent.length
}
