export const REG_FULL_AT = 20

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

// Formula 5: Lived Experience / Closing Balance = Peak − Active Regulation − SI Flow Bonus
export function computeLivedExperience(peakDebit, activeRegulation, siFlowBonus) {
  return Math.max(0, peakDebit - activeRegulation - siFlowBonus)
}

// Is the autistic tax active? Cancelled by flow or SI Flow on any non-cancelled event.
export function taxActive(dateStr, taxStartDate, userEvents) {
  return dateStr >= taxStartDate && !anyFlowEvent(userEvents)
}
