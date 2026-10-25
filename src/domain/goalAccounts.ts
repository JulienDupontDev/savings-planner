import { allSnapshotMonths, balanceAsOf } from './accounts'
import { RECURRING_ID_SEPARATOR } from './recurringGoals'
import type { Account, AccountSnapshot, Goal } from './types'

export function goalAccountIds(goal: Goal): string[] {
  return goal.accountIds?.length ? goal.accountIds : goal.accountId ? [goal.accountId] : []
}

/**
 * Goals linked to accounts take their saved amount from those accounts' latest balances.
 * Balances are shared out by priority: each goal draws from its accounts until its target is reached,
 * so an account linked to several goals is never counted twice.
 */
export function resolveGoalBalances(goals: Goal[], accounts: Account[], snapshots: AccountSnapshot[]): Goal[] {
  const latestMonth = allSnapshotMonths(snapshots).at(-1)
  if (!latestMonth) return goals

  const accountsById = new Map(accounts.map(account => [account.id, account]))
  const remainingByAccount = new Map<string, number>()
  const resolved = new Map<string, { saved: number; growthPct: number }>()

  const linked = goals
    .filter(goal => goalAccountIds(goal).some(id => accountsById.has(id)))
    .sort((a, b) => a.priority - b.priority)

  for (const goal of linked) {
    let saved = 0
    let weightedReturn = 0
    const rates: number[] = []
    for (const accountId of goalAccountIds(goal)) {
      const account = accountsById.get(accountId)
      if (!account) continue
      if (!remainingByAccount.has(accountId)) {
        remainingByAccount.set(accountId, Math.max(0, balanceAsOf(snapshots, account, latestMonth)))
      }
      const take = Math.min(remainingByAccount.get(accountId)!, Math.max(0, goal.targetAmount - saved))
      remainingByAccount.set(accountId, remainingByAccount.get(accountId)! - take)
      saved += take
      weightedReturn += take * (account.annualReturnPct ?? 0)
      rates.push(account.annualReturnPct ?? 0)
    }
    // Weighted by what each account holds for the goal; with nothing saved yet, fall back to the average rate.
    const growthPct = saved > 0 ? weightedReturn / saved : rates.reduce((a, b) => a + b, 0) / Math.max(1, rates.length)
    resolved.set(goal.id, { saved, growthPct })
  }

  return goals.map(goal => {
    const own = resolved.get(goal.id)
    if (own) return { ...goal, currentSaved: own.saved, growthPct: own.growthPct }
    // Yearly copies of a repeating goal (id "base#n") feed the same accounts, so they grow at the same rate.
    const base = resolved.get(goal.id.split(RECURRING_ID_SEPARATOR)[0])
    return base && goal.id.includes(RECURRING_ID_SEPARATOR) ? { ...goal, growthPct: base.growthPct } : goal
  })
}
