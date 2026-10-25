import { describe, expect, it } from 'vitest'
import { buildSchedule } from './allocation'
import { gratificationsForMonth, gratificationsYearlyTotal } from './gratifications'
import type { Gratification, Settings } from './types'

const bonus: Gratification[] = [{ id: 'b', name: 'Prime', yearlyAmount: 6000, payoutMonths: [1, 3] }]

const settings = (extra: Partial<Settings> = {}): Settings => ({
  monthlyIncome: 3000,
  monthlyExpenses: 2000,
  startMonth: '2026-01',
  horizonMonths: 4,
  emergencyFundBuckets: [],
  gratifications: bonus,
  ...extra,
})

describe('gratifications', () => {
  it('splits the yearly amount over the payout months', () => {
    expect(gratificationsForMonth(bonus, '2027-01')).toBe(3000)
    expect(gratificationsForMonth(bonus, '2026-03')).toBe(3000)
    expect(gratificationsForMonth(bonus, '2026-02')).toBe(0)
    expect(gratificationsYearlyTotal(bonus)).toBe(6000)
  })

  it('is ignored by the plan unless preview mode is on', () => {
    const off = buildSchedule(settings(), [], [], {})
    expect(off.rows[0].income).toBe(3000)
    const on = buildSchedule(settings({ includeGratificationsInPlan: true }), [], [], {})
    expect(on.rows[0].income).toBe(6000)
    expect(on.rows[1].income).toBe(3000)
    expect(on.rows[2].income).toBe(6000)
    expect(on.rows[0].freeCash).toBe(off.rows[0].freeCash + 3000)
  })
})
