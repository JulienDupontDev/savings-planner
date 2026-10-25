import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { IS_API_MODE } from '../../config'
import { buildWealthReport } from '../../domain/wealthReport'
import { useResolvedGoals } from '../../hooks/useResolvedGoals'
import { useSecurityState } from '../../hooks/useSecurityState'
import { translate as t, translateAccountBucket } from '../../i18n'
import { useStore } from '../../store'

export function WealthReportExport() {
  const settings = useStore(s => s.settings)
  const loans = useStore(s => s.loans)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)
  const overrides = useStore(s => s.overrides)
  const hasHydratedFromBackend = useStore(s => s.hasHydratedFromBackend)
  const hasLoadedAccountSnapshots = useStore(s => s.hasLoadedAccountSnapshots)
  const loadAccountSnapshots = useStore(s => s.loadAccountSnapshots)
  const goals = useResolvedGoals()
  const securityState = useSecurityState()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (IS_API_MODE && hasHydratedFromBackend && !hasLoadedAccountSnapshots) void loadAccountSnapshots()
  }, [hasHydratedFromBackend, hasLoadedAccountSnapshots, loadAccountSnapshots])

  const snapshotsPending = IS_API_MODE && !hasLoadedAccountSnapshots

  const handleDownload = async () => {
    setBusy(true)
    setError(false)
    try {
      const report = buildWealthReport({
        settings, goals, loans, accounts, snapshots, mortgagePlan, subscriptions,
        upcomingExpenses, overrides, securityState, bucketLabel: translateAccountBucket,
      })
      const { downloadWealthReport } = await import('./wealthReportPdf')
      downloadWealthReport(report)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">{t('report.settingsDescription')}</p>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy || snapshotsPending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60"
      >
        <FileText size={16} />
        {busy ? t('report.generating') : t('report.download')}
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{t('report.error')}</p>}
    </div>
  )
}
