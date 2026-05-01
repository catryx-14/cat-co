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

// Sum of non-sleep regulation channels
export function nonSleepRegTotal(reg) {
  return (reg.sensory || 0) + (reg.av || 0) + (reg.env || 0) + (reg.body || 0)
}

// Total including sleep (for display)
export function fullRegTotal(reg) {
  return nonSleepRegTotal(reg) + (reg.sleep || 0)
}

// Points from all non-cancelled user events
export function eventPoints(userEvents) {
  let total = 0
  for (const e of userEvents) {
    if (e.cancelled) continue
    total += (e.E || 0) + (e.S || 0) + (e.V || 0) + (e.X || 0)
  }
  return total
}

// True if any event has flow:true → autistic tax cancels
export function anyFlowEvent(userEvents) {
  return userEvents.some(e => e.flow)
}

export function computePeakDebit({ openingBalance, userEvents, taxValue, taxApplies }) {
  return openingBalance + eventPoints(userEvents) + (taxApplies ? taxValue : 0)
}

export function computeClosingBalance(peakDebit, reg) {
  return Math.max(0, peakDebit - nonSleepRegTotal(reg))
}

export function computeTomorrowOpening(closingBalance, sleepReset) {
  return Math.max(0, closingBalance - (sleepReset || 0))
}

// Is the autistic tax active for this date?
export function taxActive(dateStr, taxStartDate, userEvents) {
  return dateStr >= taxStartDate && !anyFlowEvent(userEvents)
}

// SI flow credit for a single event (30% of event cost if siFlow is set)
export function computeEventSICredit(event) {
  if (!event.siFlow || event.cancelled) return 0
  return ((event.E || 0) + (event.S || 0) + (event.V || 0) + (event.X || 0)) * 0.3
}

// Total SI credit across all events
export function computeTotalSICredit(userEvents) {
  return userEvents.reduce((sum, e) => sum + computeEventSICredit(e), 0)
}

// Lived experience = peakDebit − nonSleepReg − totalSICredit
export function computeLivedExperience(peakDebit, nonSleepReg, totalSICredit) {
  return Math.max(0, peakDebit - nonSleepReg - totalSICredit)
}

// Carryover bonus added to tomorrow's opening balance
export function computeCarryoverBonus(totalSICredit) {
  return totalSICredit * 0.5
}
