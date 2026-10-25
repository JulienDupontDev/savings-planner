import { useResolvedGoals } from '../../hooks/useResolvedGoals'
import { useMemo, useState } from 'react'
import { CalendarPlus, Eye, EyeOff, FileUp, Lock, Pencil, Plus, Trash2, Unlock } from 'lucide-react'
import { ACCOUNT_BUCKETS, allSnapshotMonths, balanceAsOf } from '../../domain/accounts'
import { addMonths, currentYearMonth, formatCurrency } from '../../domain/formatting'
import { buildSchedule } from '../../domain/allocation'
import { committedMonthlyCostBasis } from '../../domain/securityBuffers'
import { useStore } from '../../store'
import type { Account, AccountBucket, AccountSnapshot } from '../../domain/types'
import { AccountForm } from './AccountForm'
import { AccountsTable } from './AccountsTable'
import { AssetsKpi } from './AssetsKpi'
import { AssetsPie } from './AssetsPie'
import { ImportCsvDialog } from './ImportCsvDialog'
import { NetWorthChart } from './NetWorthChart'
import { translate as t, translateAccountBucket } from '../../i18n'
import { HideableBlock } from '../ui/Layout'

export function AccountsSection() {
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  const emergencyFundBuckets = useStore(s => s.settings.emergencyFundBuckets ?? ['safety_cushion'])
  const defaultCurrency = useStore(s => s.settings.defaultCurrency ?? 'PLN')
  const loans = useStore(s => s.loans)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const addAccount = useStore(s => s.addAccount)
  const updateAccount = useStore(s => s.updateAccount)
  const updateSettings = useStore(s => s.updateSettings)
  const removeAccount = useStore(s => s.removeAccount)
  const closeAccount = useStore(s => s.closeAccount)
  const reopenAccount = useStore(s => s.reopenAccount)
  const setSnapshot = useStore(s => s.setSnapshot)
  const removeSnapshot = useStore(s => s.removeSnapshot)
  const settings = useStore(s => s.settings)
  const goals = useResolvedGoals()
  const overrides = useStore(s => s.overrides)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)

  // Cele KPI: poduszka = N miesięcy realnych kosztów (jak na Przeglądzie), fundusz = stała kwota.
  const { safetyCushionTarget, emergencyFundTarget, safetyCushionMonths } = useMemo(() => {
    const schedule = buildSchedule(settings, goals, loans, overrides, 0, 0, mortgagePlan, subscriptions, upcomingExpenses)
    const monthlyCosts = committedMonthlyCostBasis(settings, schedule)
    const months = settings.safetyCushionMonths ?? 6
    return {
      safetyCushionMonths: months,
      safetyCushionTarget: monthlyCosts * months,
      emergencyFundTarget: settings.emergencyFundTarget ?? 10000,
    }
  }, [settings, goals, loans, overrides, mortgagePlan, subscriptions, upcomingExpenses])

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const [importCsvOpen, setImportCsvOpen] = useState(false)
  const [draftMonths, setDraftMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth())

  const months = useMemo(() => {
    const combined = [...allSnapshotMonths(snapshots), ...draftMonths]
    return [...new Set(combined)].sort().reverse()
  }, [draftMonths, snapshots])

  const visibleAccounts = useMemo(
    () => accounts.filter(account => showClosed || !account.closedAt),
    [accounts, showClosed],
  )

  const addDraftMonth = (yearMonth: string) => {
    setDraftMonths(current => current.includes(yearMonth) ? current : [...current, yearMonth])
    setSelectedMonth(yearMonth)
  }

  const addNextMonth = () => {
    const latest = months[0] ?? currentYearMonth()
    addDraftMonth(addMonths(latest, 1))
  }

  const handleSetSnapshot = (accountId: string, yearMonth: string, balance: number) => {
    setSnapshot(accountId, yearMonth, balance)
    setDraftMonths(current => current.filter(month => month !== yearMonth))
  }

  return (
    <div className="space-y-5">
      <HideableBlock blockId="assets.kpi"><AssetsKpi
        accounts={accounts}
        snapshots={snapshots}
        emergencyFundBuckets={emergencyFundBuckets}
        safetyCushionTarget={safetyCushionTarget}
        safetyCushionMonths={safetyCushionMonths}
        emergencyFundTarget={emergencyFundTarget}
        emergencyFundEnabled={settings.emergencyFundEnabled !== false}
      /></HideableBlock>

      <HideableBlock blockId="assets.buckets"><EmergencyFundBucketsPanel
        accounts={accounts}
        snapshots={snapshots}
        selectedBuckets={emergencyFundBuckets}
        defaultCurrency={defaultCurrency}
        onChange={buckets => updateSettings({ emergencyFundBuckets: buckets })}
      /></HideableBlock>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
        <HideableBlock blockId="assets.history"><div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('app.assets.accountHistory')}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('app.assets.accountHistoryDescription')}</p>
          </div>
          <NetWorthChart accounts={accounts} snapshots={snapshots} loans={loans} mortgagePlan={mortgagePlan} />
        </div></HideableBlock>
        <HideableBlock blockId="assets.pie"><AssetsPie accounts={accounts} snapshots={snapshots} /></HideableBlock>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {adding ? (
          <div className="w-full rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">{t('accounts.section.newAccount')}</p>
            <AccountForm
              defaultCurrency={defaultCurrency}
              onSave={data => { addAccount(data); setAdding(false) }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          >
            <Plus size={15} />
            {t('accounts.section.addAccount')}
          </button>
        )}

        <button
          onClick={() => setShowClosed(value => !value)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {showClosed ? <EyeOff size={15} /> : <Eye size={15} />}
          {showClosed ? t('accounts.section.hideClosed') : t('accounts.section.showClosed')}
        </button>

        <button
          onClick={() => setImportCsvOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <FileUp size={15} />
          {t('accounts.section.importCsv')}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => addDraftMonth(selectedMonth)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <CalendarPlus size={15} />
            {t('accounts.section.addMonth')}
          </button>
          <button
            onClick={addNextMonth}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('accounts.section.nextMonth')}
          </button>
        </div>
      </div>

      {visibleAccounts.length > 0 && (
        <div className="space-y-2">
          {visibleAccounts.map(account => (
            editingId === account.id ? (
              <div key={account.id} className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <p className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">{t('accounts.section.editAccount')}</p>
                <AccountForm
                  initial={account}
                  onSave={data => { updateAccount(account.id, data); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <AccountRow
                key={account.id}
                account={account}
                latestMonth={months[0] ?? currentYearMonth()}
                onEdit={() => setEditingId(account.id)}
                onRemove={() => {
                  if (window.confirm(t('accounts.section.deleteConfirmation', { name: account.name }))) {
                    removeAccount(account.id)
                  }
                }}
                onClose={yearMonth => closeAccount(account.id, yearMonth)}
                onReopen={() => reopenAccount(account.id)}
              />
            )
          ))}
        </div>
      )}

      <HideableBlock blockId="assets.table"><div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('accounts.section.snapshotsTitle')}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('app.assets.tableDescription')}</p>
        </div>
        <AccountsTable
          accounts={visibleAccounts}
          snapshots={snapshots}
          months={months}
          onSetSnapshot={handleSetSnapshot}
          onRemoveSnapshot={removeSnapshot}
        />
      </div></HideableBlock>

      {importCsvOpen && <ImportCsvDialog onClose={() => setImportCsvOpen(false)} />}
    </div>
  )
}

function EmergencyFundBucketsPanel({
  accounts,
  snapshots,
  selectedBuckets,
  defaultCurrency,
  onChange,
}: {
  accounts: Account[]
  snapshots: AccountSnapshot[]
  selectedBuckets: AccountBucket[]
  defaultCurrency: string
  onChange: (buckets: AccountBucket[]) => void
}) {
  const latestMonth = allSnapshotMonths(snapshots).at(-1)
  const toggleBucket = (bucket: AccountBucket) => {
    if (selectedBuckets.includes(bucket)) {
      if (selectedBuckets.length === 1) return
      onChange(selectedBuckets.filter(item => item !== bucket))
      return
    }
    onChange([...selectedBuckets, bucket])
  }

  const total = latestMonth
    ? accounts
        .filter(account => selectedBuckets.includes(account.bucket))
        .reduce((sum, account) => sum + balanceAsOf(snapshots, account, latestMonth), 0)
    : 0

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('accounts.section.safetyCushionTitle')}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t('accounts.section.safetyCushionDescription')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">{latestMonth ?? t('accounts.section.noSnapshots')}</p>
          <p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(total, defaultCurrency)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {ACCOUNT_BUCKETS.map(bucket => {
          const selected = selectedBuckets.includes(bucket)
          const bucketTotal = latestMonth
            ? accounts
                .filter(account => account.bucket === bucket)
                .reduce((sum, account) => sum + balanceAsOf(snapshots, account, latestMonth), 0)
            : 0

          return (
            <label
              key={bucket}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                selected
                  ? 'border-gray-400 bg-gray-100 text-gray-950 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleBucket(bucket)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              />
              <span className="min-w-0">
                <span className="block font-medium">{translateAccountBucket(bucket)}</span>
                <span className="block text-xs tabular-nums text-gray-500 dark:text-gray-400">{formatCurrency(bucketTotal, defaultCurrency)}</span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function AccountRow({
  account,
  latestMonth,
  onEdit,
  onRemove,
  onClose,
  onReopen,
}: {
  account: Account
  latestMonth: string
  onEdit: () => void
  onRemove: () => void
  onClose: (yearMonth: string) => void
  onReopen: () => void
}) {
  const [closeMonth, setCloseMonth] = useState(account.closedAt ?? latestMonth)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-56 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{account.name}</p>
          {account.closedAt && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">{t('accounts.section.closed')}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {translateAccountBucket(account.bucket)} · {account.currency}
          {account.openedAt ? ` ${t('accounts.section.openedAt', { date: account.openedAt })}` : ''}
          {account.closedAt ? ` ${t('accounts.section.closedAt', { date: account.closedAt })}` : ''}
        </p>
      </div>

      {!account.closedAt && (
        <input
          type="month"
          value={closeMonth}
          onChange={e => setCloseMonth(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          aria-label={t('accounts.section.closeMonth')}
        />
      )}

      <div className="flex items-center gap-1">
        {account.closedAt ? (
          <button
            onClick={onReopen}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30"
            aria-label={t('accounts.section.reopen')}
            title={t('accounts.section.reopen')}
          >
            <Unlock size={14} />
          </button>
        ) : (
          <button
            onClick={() => onClose(closeMonth)}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
            aria-label={t('accounts.section.close')}
            title={t('accounts.section.close')}
          >
            <Lock size={14} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          aria-label={t('accounts.section.editAccount')}
          title={t('accounts.section.editAccount')}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onRemove}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          aria-label={t('accounts.section.delete')}
          title={t('accounts.section.delete')}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
