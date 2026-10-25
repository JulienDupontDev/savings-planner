import { addMonths, dateToYearMonth } from './formatting'
import type { Goal, Settings } from './types'

export const RECURRING_ID_SEPARATOR = '#'

function shiftYears(isoDate: string, years: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const lastDay = new Date(year + years, month, 0).getDate()
  return `${year + years}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

/**
 * A goal that repeats every year yields one goal per year until the end of the budget horizon.
 * Only the first occurrence keeps the saved amount / linked accounts; later ones start from zero.
 */
export function expandRecurringGoals(goals: Goal[], settings: Pick<Settings, 'startMonth' | 'horizonMonths'>): Goal[] {
  const lastMonth = addMonths(settings.startMonth, Math.max(0, settings.horizonMonths - 1))
  return goals.flatMap(goal => {
    if (!goal.repeatsYearly || !goal.deadline) return [goal]
    const occurrences: Goal[] = [goal]
    for (let n = 1; ; n++) {
      const deadline = shiftYears(goal.deadline, n)
      if (dateToYearMonth(deadline) > lastMonth) break
      occurrences.push({
        ...goal,
        id: `${goal.id}${RECURRING_ID_SEPARATOR}${n}`,
        name: `${goal.name} ${deadline.slice(0, 4)}`,
        deadline,
        currentSaved: undefined,
        accountId: undefined,
        accountIds: undefined,
      })
    }
    return occurrences
  })
}
