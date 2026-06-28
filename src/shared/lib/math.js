import { addDaysStr } from './dates.js'

export const REG_FULL_AT = 20

// The autistic tax always comes from the user's settings (almanac_settings).
// This constant is the ONE place the bare number lives — a last-resort default
// used only if the setting is somehow entirely absent. Never sprinkle a literal
// 3 elsewhere; reference this so there's a single, named source of truth.
export const DEFAULT_AUTISTIC_TAX = 3

/**
 * THE single source of truth for peak, regulation, and lived experience.
 * Called by the tooltip, the calendar arc, and the week strip — every display
 * that reads stored data goes through here, so there is only one formula to fix.
 *
 * entryData  — the shape built by buildEntryData / internalToDb.
 *              Events use stored field names: emotional, sensory, predictability, masking, ef, siFlow.
 * settings   — optional { taxValue, taxStartDate } from almanac_settings.
 *              When provided, autistic tax is applied exactly as the editor does,
 *              so the tooltip and the editor always agree.
 *
 * Returns: { peakDebit, activeRegulation, siFlowBonus, livedExperience }
 */
export function computeDisplayValues(entryData, settings = null) {
  const reg = entryData.regulation ?? {}
  // Regulation source: the daily grid log when the day has log rows, else the old
  // four pip channels (so historical days keep their numbers). `regulationLogTotal`
  // is null/undefined when the day has no log rows → fall back to the pips.
  // Rule of thumb: log rows exist → use the log; none → use the pips.
  const pipRegulation =
    (reg.sensoryComfort || 0) + (reg.audioVisual || 0) +
    (reg.environment    || 0) + (reg.bodyRest    || 0)
  const activeRegulation = entryData.regulationLogTotal != null
    ? entryData.regulationLogTotal
    : pipRegulation

  const events = entryData.events ?? []
  let evPoints = 0, siFlowCost = 0
  for (const e of events) {
    if (!e.cancelled) {
      const cost = (e.emotional || 0) + (e.sensory || 0) + (e.predictability || 0) +
                   (e.masking   || 0) + (e.ef      || 0)
      evPoints    += cost
      if (e.siFlow) siFlowCost += cost
    }
  }
  const siFlowBonus = Math.round(siFlowCost * 0.2)

  // Autistic tax — same logic as the editor (calcSkyNums / internalToDb)
  let taxPoints = 0
  if (settings?.taxValue != null) {
    const anyFlow = events.some(e => !e.cancelled && (e.flow || e.siFlow != null)) ||
                   (entryData.flowActivity ?? false)
    const taxApplies = (entryData.date ?? '') >= (settings.taxStartDate ?? '2000-01-01') && !anyFlow
    taxPoints = taxApplies ? settings.taxValue : 0
  }

  const peakDebit       = Math.round((entryData.openingBalance ?? 0) + evPoints + taxPoints)
  const livedExperience = Math.max(0, peakDebit - activeRegulation - siFlowBonus)

  return { peakDebit, activeRegulation, siFlowBonus, livedExperience }
}

// Phase boundaries scale with thresholds — derived to match current values (yellow=15, critical=30)
export function weatherOf(peak, yellow = 15, critical = 30) {
  if (peak <= Math.round(yellow / 3))        return { word: 'clear', intensity: 0 }
  if (peak <= Math.round(yellow * 0.73))     return { word: 'light clouds', intensity: 1 }
  if (peak <= Math.round(yellow * 1.13))     return { word: 'overcast', intensity: 2 }
  if (peak <= Math.round(critical * 0.8))    return { word: 'storm-edge', intensity: 3 }
  if (peak <= Math.round(critical * 1.3))    return { word: 'stormy', intensity: 4 }
  return { word: 'eclipse', intensity: 5 }
}

export function regWordOf(pct) {
  if (pct < 0.30) return 'low'
  if (pct < 0.60) return 'steady'
  if (pct < 0.85) return 'well-tended'
  return 'full'
}

// Sum of active regulation channels — sleep excluded (always automatic, never manually entered)
export function nonSleepRegTotal(reg) {
  return (reg.sensory || 0) + (reg.av || 0) + (reg.env || 0) + (reg.body || 0)
}

// Points from all non-cancelled user events
export function eventPoints(userEvents) {
  let total = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    total += (e.E || 0) + (e.S || 0) + (e.P || 0) + (e.M || 0) + (e.X || 0)
  }
  return total
}

// True if any non-cancelled event has flow or SI Flow set — either cancels autistic tax
export function anyFlowEvent(userEvents) {
  return userEvents.some(e => !e.cancelled && (e.flow || e.siFlow != null))
}

// Formula 1: Opening Balance = previous day's closing − 5 (sleep is always automatic)
export function computeOpeningBalance(prevClosing) {
  return Math.max(0, prevClosing - 5)
}

/**
 * The correct opening balance for `dateStr`, derived purely from the chain —
 * NEVER trusted from the day's own stored value. This is the heart of both
 * carry-forward fixes: it walks back to the most recent real entry and steps
 * forward across every missed (gap) day in between, applying the missed-day
 * rule (sleep −5, autistic tax ON unless flow) for each gap.
 *
 *   allEntries: array of { date, entry_data } in any order
 *   settings:   { taxValue, taxStartDate } — used for gap (never-logged) days
 *
 * If there is no entry before dateStr at all, the chain starts here → opening 0.
 */
export function resolveOpeningBalance(dateStr, allEntries, settings = {}) {
  const taxValue = settings.taxValue ?? DEFAULT_AUTISTIC_TAX
  const taxStartDate = settings.taxStartDate ?? '2000-01-01'

  // Most recent real entry strictly before dateStr
  let anchor = null
  for (const e of allEntries) {
    if (e.date < dateStr && (!anchor || e.date > anchor.date)) anchor = e
  }
  if (!anchor) return 0

  // Every calendar day between the anchor and dateStr is a gap (the anchor is the
  // closest prior entry), so each one is a missed day.
  let prevClosing = anchor.entry_data.closingBalance ?? 0
  let cursor = addDaysStr(anchor.date, 1)
  while (cursor < dateStr) {
    const opening = computeOpeningBalance(prevClosing)
    const taxApplies = cursor >= taxStartDate          // missed day → no flow → tax on
    prevClosing = computeMissedDayClosing(opening, taxApplies, taxValue)
    cursor = addDaysStr(cursor, 1)
  }
  return computeOpeningBalance(prevClosing)
}

// A missed day (no entry logged) = zero events, zero regulation. Its only movements
// are the automatic sleep deduction (already baked into `opening`) and the autistic
// tax, which is assumed ON by default — a missed day has no flow to cancel it.
// Decision 29 May 2026: missed days carry the tax until/unless an edit records flow.
export function computeMissedDayClosing(opening, taxApplies, taxValue) {
  const tax = taxApplies ? (taxValue || 0) : 0
  return Math.max(0, Math.round(opening + tax))
}

// Formula 2: Peak = Opening + event points + autistic tax (if applicable)
export function computePeakDebit({ openingBalance, userEvents, taxValue, taxApplies }) {
  return openingBalance + eventPoints(userEvents) + (taxApplies ? taxValue : 0)
}

// Formula 4: SI Flow Bonus = SI Flow event cost × 20%, rounded to nearest whole number
export function computeSIFlowBonus(userEvents) {
  let cost = 0
  for (const e of userEvents) {
    if (e.cancelled || !e.siFlow) continue
    cost += (e.E || 0) + (e.S || 0) + (e.P || 0) + (e.M || 0) + (e.X || 0)
  }
  return Math.round(cost * 0.2)
}

// Formula 3: Closing Balance = Peak − Active Regulation (carries forward to next day)
export function computeClosingBalance(peakDebit, activeRegulation) {
  return Math.round(Math.max(0, peakDebit - activeRegulation))
}

// Formula 5: Lived Experience = Peak − Active Regulation − SI Flow Bonus (display only, not carried forward)
export function computeLivedExperience(peakDebit, activeRegulation, siFlowBonus) {
  return Math.max(0, peakDebit - activeRegulation - siFlowBonus)
}

// Is the autistic tax active? Cancelled by flow or SI Flow on any non-cancelled event.
export function taxActive(dateStr, taxStartDate, userEvents) {
  return dateStr >= taxStartDate && !anyFlowEvent(userEvents)
}

// ── Band helpers ──────────────────────────────────────────────────────────────

export function bandOf(leVal, thresholds) {
  const thr = thresholds ?? {}
  if (leVal >= (thr.critical ?? 30)) return 'red'
  if (leVal >= (thr.orange   ?? 25)) return 'orange'
  if (leVal >= (thr.yellow   ?? 15)) return 'yellow'
  return 'green'
}

export function bandColor(leVal, thresholds, isPurple = false) {
  if (isPurple) return '#A673E4'
  const band = bandOf(leVal, thresholds)
  if (band === 'red')    return '#D8283A'  // vivid ruby-red
  if (band === 'orange') return '#FF8419'  // vivid bright orange
  if (band === 'yellow') return '#D6A520'  // deep gold
  return '#2FBE86'                         // jade
}

export function bandGlowClass(leVal, thresholds, isPurple = false) {
  if (isPurple) return 'arc-glow--purple'
  const band = bandOf(leVal, thresholds)
  if (band === 'red')    return 'arc-glow--red'
  if (band === 'orange') return 'arc-glow--orange'
  if (band === 'yellow') return 'arc-glow--amber'
  return 'arc-glow--green'
}

/**
 * THE WATERLINE — split a purple day's regulation into capacity vs recovery.
 *
 * On a purple day the floor is a waterline in the capacity bucket. Regulation
 * points pour in and push the level DOWN toward the line: points earned while
 * still ABOVE the line are CAPACITY (they move the real number down to the
 * floor); once the line is reached the bucket can't go lower, so every further
 * point OVERFLOWS into RECOVERY. The split lives in the DAY (the floor is the
 * line), never inside a single point — so there are never fractional points.
 *
 *   weights — each row's full point weight, in log order (routines then actions)
 *   peak    — the day's peak (opening + events + tax); the bucket's starting level
 *   floor   — the purple floor for the day, or null/undefined on a non-purple day
 *
 * gap = max(0, peak − floor) is the total capacity-reducing room today. Walking
 * the rows in order, each takes capacity up to the remaining gap, the rest
 * overflows. Whole points only — a whole weight lands wholly on one side, except
 * a bigger unit (a routine) straddling the line: the gap fills with capacity, the
 * remainder overflows, still whole numbers (id=143 "the WATERLINE").
 *
 * Returns [{ capacity, recovery }] aligned to the input weights. On a non-purple
 * day (floor == null) the full weight is capacity and recovery is null.
 */
export function waterlineSplit(weights, peak, floor) {
  if (floor == null) return weights.map(w => ({ capacity: w, recovery: null }))
  const gap = Math.max(0, Math.round(peak) - floor)
  let used = 0
  return weights.map(w => {
    const capacity = Math.min(w, Math.max(0, gap - used))
    used += capacity
    return { capacity, recovery: w - capacity }
  })
}

// Returns { isPurple, floor } for the given day.
// override: null | 'cancel' | 'extend'  (energy_daily.purple_override)
// allEntries: array of { date, entry_data: { meltdown } }
export function getPurpleState(dateStr, allEntries, purpleFloors, override) {
  if (override === 'cancel') return { isPurple: false, floor: null }
  if (override === 'extend') return { isPurple: true, floor: purpleFloors?.floor_day2 ?? 15 }

  const byDate = {}
  for (const e of allEntries) byDate[e.date] = e

  const d1 = addDaysStr(dateStr, -1)
  const d2 = addDaysStr(dateStr, -2)
  const melt1 = byDate[d1]?.entry_data?.meltdown ?? false
  const melt2 = byDate[d2]?.entry_data?.meltdown ?? false

  if (!melt1 && !melt2) return { isPurple: false, floor: null }
  const floor = melt1 ? (purpleFloors?.floor_day1 ?? 25) : (purpleFloors?.floor_day2 ?? 15)
  return { isPurple: true, floor }
}
