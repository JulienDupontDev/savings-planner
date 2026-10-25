import { useMemo } from 'react'
import { buildSecurityState } from '../domain/securityBuffers'
import { useStore } from '../store'

export function useSecurityState() {
  const settings = useStore(s => s.settings)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  return useMemo(() => buildSecurityState(settings, accounts, snapshots), [settings, accounts, snapshots])
}
