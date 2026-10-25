import { describe, expect, it } from 'vitest'
import { buildSecurityBuffers, committedMonthlyCostBasis } from './securityBuffers'
import type { Account, AccountSnapshot, Schedule, Settings } from './types'

const settings: Settings = {
  monthlyIncome: 10000,
  monthlyExpenses: 5000,
  startMonth: '2026-01',
  horizonMonths: 12,
  emergencyFundBuckets: ['safety_cushion', 'accounts'],
  safetyCushionMonths: 6,
  emergencyFundTarget: 10000,
}

const accounts: Account[] = [
  { id: 'main', name: 'Main', bucket: 'accounts', currency: 'PLN' },
  { id: 'safe', name: 'Safe', bucket: 'safety_cushion', currency: 'PLN' },
  { id: 'emergency', name: 'Emergency', bucket: 'emergency_fund', currency: 'PLN' },
]

const snapshots: AccountSnapshot[] = [
  { accountId: 'main', yearMonth: '2026-01', balance: 2000 },
  { accountId: 'safe', yearMonth: '2026-01', balance: 18000 },
  { accountId: 'emergency', yearMonth: '2026-01', balance: 7000 },
]

describe('security buffers', () => {
  it('includes recurring expenses in the cost basis, even when they start after the first month', () => {
    const schedule = {
      rows: [{ yearMonth: '2026-01', expenses: 3000, subscriptionsTotal: 100, loanPaymentsTotal: 0, mortgagePaymentTotal: 0 }],
    } as unknown as Schedule
    const expenses = [
      { id: 'a', name: 'Assurance', amount: 200, targetMonth: '2026-03', isPaid: false, recurring: true },
      { id: 'b', name: 'Ponctuel', amount: 900, targetMonth: '2026-03', isPaid: false },
    ]
    expect(committedMonthlyCostBasis(settings, schedule, expenses)).toBe(3300)
  })

  it('omits the emergency fund buffer when disabled in settings', () => {
    const model = buildSecurityBuffers({ ...settings, emergencyFundEnabled: false }, accounts, snapshots)
    expect(model.buffers.map(buffer => buffer.id)).toEqual(['safety_cushion'])
    expect(model.missingBuffers.some(buffer => buffer.id === 'emergency_fund')).toBe(false)
  })

  it('uses the same committed monthly cost basis as assets KPIs', () => {
    const schedule = {
      rows: [
        {
          expenses: 6000,
          subscriptionsTotal: 500,
          loanPaymentsTotal: 800,
          mortgagePaymentTotal: 2500,
        },
      ],
    } as Schedule

    expect(committedMonthlyCostBasis(settings, schedule)).toBe(9800)
  })

  it('builds safety cushion and emergency fund targets from snapshots and settings', () => {
    const model = buildSecurityBuffers(settings, accounts, snapshots)

    expect(model.latestMonth).toBe('2026-01')
    expect(model.buffers.find(buffer => buffer.id === 'emergency_fund')).toMatchObject({
      current: 7000,
      target: 10000,
      missing: 3000,
      status: 'missing',
      priority: 1,
    })
    expect(model.buffers.find(buffer => buffer.id === 'safety_cushion')).toMatchObject({
      current: 20000,
      target: 30000,
      missing: 10000,
      status: 'missing',
      priority: 1,
    })
  })

  it('translates the configured safety cushion month count', () => {
    const model = buildSecurityBuffers({ ...settings, safetyCushionMonths: 4 }, accounts, snapshots)

    expect(model.buffers.find(buffer => buffer.id === 'safety_cushion')?.detail).toContain('objectif : 4 mois')
  })
})
