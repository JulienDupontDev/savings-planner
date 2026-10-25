import { useMemo } from 'react'
import { resolveGoalBalances } from '../domain/goalAccounts'
import { expandRecurringGoals } from '../domain/recurringGoals'
import { useStore } from '../store'

export function useResolvedGoals() {
  const goals = useStore(s => s.goals)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  const startMonth = useStore(s => s.settings.startMonth)
  const horizonMonths = useStore(s => s.settings.horizonMonths)
  return useMemo(
    () => resolveGoalBalances(expandRecurringGoals(goals, { startMonth, horizonMonths }), accounts, snapshots),
    [goals, accounts, snapshots, startMonth, horizonMonths],
  )
}
