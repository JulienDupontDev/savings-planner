import { useMemo } from 'react'
import { resolveGoalBalances } from '../domain/goalAccounts'
import { useStore } from '../store'

export function useResolvedGoals() {
  const goals = useStore(s => s.goals)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  return useMemo(() => resolveGoalBalances(goals, accounts, snapshots), [goals, accounts, snapshots])
}
