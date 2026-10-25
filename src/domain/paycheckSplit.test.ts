import { describe, expect, it } from 'vitest'
import { buildPaycheckSplit } from './paycheckSplit'
import type { SecurityBuffer, SecurityBuffersModel } from './securityBuffers'
import type { Goal, Settings } from './types'

const settings: Settings = {
  monthlyIncome: 10000,
  monthlyExpenses: 6000,
  startMonth: '2026-06',
  horizonMonths: 12,
  emergencyFundBuckets: ['safety_cushion'],
}

const buffer = (current: number, target: number): SecurityBuffer => ({
  id: 'emergency_fund',
  goalId: 'security:emergency_fund',
  title: 'Fundusz awaryjny',
  current,
  target,
  missing: Math.max(0, target - current),
  progressPct: 0,
  status: target > current ? 'missing' : 'met',
  priority: 1,
  latestMonth: '2026-06',
  detail: '',
  focusCopy: '',
})

const security = (current: number, target: number): SecurityBuffersModel => {
  const b = buffer(current, target)
  return {
    latestMonth: '2026-06',
    monthlyCostBasis: 6000,
    buffers: [b],
    missingBuffers: b.missing > 0 ? [b] : [],
    allMet: b.missing === 0,
  }
}

const trip: Goal = { id: 'trip', name: 'Trip', targetAmount: 3000, deadline: '2026-09-15', priority: 2 }
const house: Goal = { id: 'house', name: 'House', targetAmount: 100000, priority: 1 }

const amountOf = (lines: ReturnType<typeof buildPaycheckSplit>, id: string) =>
  lines.find(l => l.targetId === id)?.amount ?? 0

describe('buildPaycheckSplit', () => {
  it('puts everything into security until the starter buffer is covered', () => {
    const lines = buildPaycheckSplit({
      available: 4000, currentMonth: '2026-06', security: security(1000, 30000), settings, goals: [trip],
    })
    expect(amountOf(lines, 'security:emergency_fund')).toBe(4000)
    expect(amountOf(lines, 'trip')).toBe(0)
  })

  it('splits by the security share once the starter buffer exists, funding urgent deadline goals before the share', () => {
    const lines = buildPaycheckSplit({
      available: 4000, currentMonth: '2026-06', security: security(8000, 30000), settings, goals: [trip, house],
    })
    expect(amountOf(lines, 'security:emergency_fund')).toBe(1800)
    expect(amountOf(lines, 'trip')).toBe(1000)
    expect(amountOf(lines, 'house')).toBe(1200)
  })

  it('always funds IKZE first', () => {
    const lines = buildPaycheckSplit({
      available: 4000,
      currentMonth: '2026-06',
      security: security(1000, 30000),
      settings: {
        ...settings,
        ikzePlans: [{
          id: 'i', year: 2026, ownerName: 'J', role: 'entrepreneur',
          annualLimit: 12000, contributedAmount: 6000, payoutsLeft: 6,
        }],
      },
      goals: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'ikze', amount: 1000 })
    expect(amountOf(lines, 'security:emergency_fund')).toBe(3000)
  })

  it('returns cash goals cannot absorb back to security', () => {
    const lines = buildPaycheckSplit({
      available: 4000, currentMonth: '2026-06', security: security(8000, 30000), settings, goals: [],
    })
    expect(amountOf(lines, 'security:emergency_fund')).toBe(4000)
    expect(lines.some(l => l.kind === 'unallocated')).toBe(false)
  })

  it('reports unallocated when nothing needs funding', () => {
    const lines = buildPaycheckSplit({
      available: 500, currentMonth: '2026-06', security: security(30000, 30000), settings, goals: [],
    })
    expect(lines).toEqual([{ kind: 'unallocated', amount: 500, reason: 'nothing_to_fund' }])
  })

  it('funds an important goal before the security share but after the starter buffer', () => {
    const car: Goal = { id: 'car', name: 'Car', targetAmount: 12000, priority: 3, important: true }
    const lines = buildPaycheckSplit({ available: 4000, currentMonth: '2026-06', security: security(0, 36000), settings, goals: [car] })
    expect(lines[0]).toMatchObject({ targetId: 'security:emergency_fund', reason: 'security_starter', amount: 4000 })
    const roomy = buildPaycheckSplit({ available: 10000, currentMonth: '2026-06', security: security(6000, 36000), settings, goals: [car] })
    expect(roomy.find(l => l.targetId === 'car')?.reason).toBe('goal_important')
    expect(amountOf(roomy, 'security:emergency_fund')).toBe(5400)
  })
})
