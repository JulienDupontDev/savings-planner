import { describe, expect, it } from 'vitest'
import { resolveGoalBalances } from './goalAccounts'
import type { Account, AccountSnapshot, Goal } from './types'

const accounts: Account[] = [{ id: 'a', name: 'Vacances', bucket: 'vacation', currency: 'PLN' }]
const snapshots: AccountSnapshot[] = [
  { accountId: 'a', yearMonth: '2026-05', balance: 500 },
  { accountId: 'a', yearMonth: '2026-06', balance: 1500 },
]
const goal = (id: string, priority: number, targetAmount: number, extra: Partial<Goal> = {}): Goal =>
  ({ id, name: id, targetAmount, priority, ...extra })

describe('resolveGoalBalances', () => {
  it('uses the latest balance of the linked account', () => {
    const [g] = resolveGoalBalances([goal('g', 1, 3000, { accountIds: ['a'], currentSaved: 10 })], accounts, snapshots)
    expect(g.currentSaved).toBe(1500)
  })

  it('fills goals sharing an account by priority, capped at target', () => {
    const result = resolveGoalBalances(
      [goal('b', 2, 1000, { accountIds: ['a'] }), goal('a', 1, 1000, { accountIds: ['a'] })], accounts, snapshots,
    )
    expect(result.find(g => g.id === 'a')?.currentSaved).toBe(1000)
    expect(result.find(g => g.id === 'b')?.currentSaved).toBe(500)
  })

  it('adds up the balances of several accounts, capped at the target', () => {
    const more: Account[] = [...accounts, { id: 'c', name: 'Company', bucket: 'accounts', currency: 'PLN' }]
    const snaps: AccountSnapshot[] = [...snapshots, { accountId: 'c', yearMonth: '2026-06', balance: 2000 }]
    const [g] = resolveGoalBalances([goal('g', 1, 3000, { accountIds: ['a', 'c'] })], more, snaps)
    expect(g.currentSaved).toBe(3000)
    const [h] = resolveGoalBalances([goal('h', 1, 9000, { accountIds: ['a', 'c'] })], more, snaps)
    expect(h.currentSaved).toBe(3500)
  })

  it('still reads the legacy single accountId', () => {
    const [g] = resolveGoalBalances([goal('g', 1, 3000, { accountId: 'a' })], accounts, snapshots)
    expect(g.currentSaved).toBe(1500)
  })

  it('derives the goal growth from the accounts expected return, weighted by balance', () => {
    const more: Account[] = [
      { id: 'a', name: 'ETF', bucket: 'investments', currency: 'PLN', annualReturnPct: 8 },
      { id: 'c', name: 'Cash', bucket: 'accounts', currency: 'PLN' },
    ]
    const snaps: AccountSnapshot[] = [
      { accountId: 'a', yearMonth: '2026-06', balance: 1000 },
      { accountId: 'c', yearMonth: '2026-06', balance: 1000 },
    ]
    const [g] = resolveGoalBalances([goal('g', 1, 5000, { accountIds: ['a', 'c'] })], more, snaps)
    expect(g.growthPct).toBe(4)
  })

  it('leaves unlinked goals and unknown accounts untouched', () => {
    const goals = [goal('x', 1, 100, { currentSaved: 40 }), goal('y', 2, 100, { accountIds: ['gone'], currentSaved: 5 })]
    expect(resolveGoalBalances(goals, accounts, snapshots)).toEqual(goals)
  })
})
