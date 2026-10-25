import { allSnapshotMonths, balanceAsOf } from './accounts'
import type { Account, AccountSnapshot, Goal } from './types'

/**
 * Goals linked to an account take their saved amount from that account's latest balance.
 * When several goals share an account, the balance is filled by priority, each goal capped at its target.
 */
export function resolveGoalBalances(goals: Goal[], accounts: Account[], snapshots: AccountSnapshot[]): Goal[] {
  const latestMonth = allSnapshotMonths(snapshots).at(-1)
  if (!latestMonth) return goals

  const accountsById = new Map(accounts.map(account => [account.id, account]))
  const remainingByAccount = new Map<string, number>()
  const resolved = new Map<string, number>()

  const linked = goals
    .filter(goal => goal.accountId && accountsById.has(goal.accountId))
    .sort((a, b) => a.priority - b.priority)

  for (const goal of linked) {
    const accountId = goal.accountId!
    if (!remainingByAccount.has(accountId)) {
      remainingByAccount.set(accountId, Math.max(0, balanceAsOf(snapshots, accountsById.get(accountId)!, latestMonth)))
    }
    const available = remainingByAccount.get(accountId)!
    const share = Math.min(available, goal.targetAmount)
    remainingByAccount.set(accountId, available - share)
    resolved.set(goal.id, share)
  }

  return goals.map(goal => (resolved.has(goal.id) ? { ...goal, currentSaved: resolved.get(goal.id) } : goal))
}
