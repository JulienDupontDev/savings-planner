import { describe, expect, it } from 'vitest'
import { expandRecurringGoals } from './recurringGoals'
import type { Goal } from './types'

const settings = { startMonth: '2026-01', horizonMonths: 36 }
const trip: Goal = {
  id: 'trip', name: 'Vacances', targetAmount: 3000, deadline: '2026-07-15', priority: 2,
  repeatsYearly: true, currentSaved: 500, accountIds: ['a'],
}

describe('expandRecurringGoals', () => {
  it('creates one goal per year up to the end of the horizon', () => {
    const result = expandRecurringGoals([trip], settings)
    expect(result.map(g => g.deadline)).toEqual(['2026-07-15', '2027-07-15', '2028-07-15'])
    expect(result.map(g => g.name)).toEqual(['Vacances', 'Vacances 2027', 'Vacances 2028'])
    expect(new Set(result.map(g => g.id)).size).toBe(3)
  })

  it('keeps saved amount and accounts on the first occurrence only', () => {
    const [first, second] = expandRecurringGoals([trip], settings)
    expect(first.currentSaved).toBe(500)
    expect(second.currentSaved).toBeUndefined()
    expect(second.accountIds).toBeUndefined()
  })

  it('leaves non-repeating goals and goals without deadline untouched', () => {
    const plain: Goal = { id: 'p', name: 'P', targetAmount: 1, priority: 1 }
    const noDeadline: Goal = { ...plain, id: 'n', repeatsYearly: true }
    expect(expandRecurringGoals([plain, noDeadline], settings)).toEqual([plain, noDeadline])
  })
})
