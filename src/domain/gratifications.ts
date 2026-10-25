import type { Gratification } from './types'

/** Amount of estimated gratifications received in the given "YYYY-MM" month. */
export function gratificationsForMonth(gratifications: Gratification[] | undefined, yearMonth: string): number {
  const month = parseInt(yearMonth.slice(5, 7), 10)
  return (gratifications ?? []).reduce((sum, g) => {
    const months = [...new Set(g.payoutMonths)]
    if (months.length === 0 || !months.includes(month)) return sum
    return sum + g.yearlyAmount / months.length
  }, 0)
}

export function gratificationsYearlyTotal(gratifications: Gratification[] | undefined): number {
  return (gratifications ?? []).reduce((sum, g) => sum + (g.payoutMonths.length > 0 ? g.yearlyAmount : 0), 0)
}
