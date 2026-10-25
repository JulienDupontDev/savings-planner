import { TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { allSnapshotMonths, balanceAsOf, totalAssetsAsOf } from '../../domain/accounts'
import { formatCurrency, formatYearMonth } from '../../domain/formatting'
import type { Account, AccountBucket, AccountSnapshot } from '../../domain/types'
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency'
import { translate as t, translateAccountBucket } from '../../i18n'

interface Props {
  accounts: Account[]
  snapshots: AccountSnapshot[]
  emergencyFundBuckets: AccountBucket[]
  safetyCushionTarget: number
  safetyCushionMonths: number
  emergencyFundTarget: number
  emergencyFundEnabled: boolean
}

export function AssetsKpi({ accounts, snapshots, emergencyFundBuckets, safetyCushionTarget, safetyCushionMonths, emergencyFundTarget, emergencyFundEnabled }: Props) {
  const currency = useDefaultCurrency()
  const months = allSnapshotMonths(snapshots)
  const latestMonth = months.at(-1)
  const previousMonth = months.at(-2)

  const gridClass = `grid gap-3 ${emergencyFundEnabled ? 'md:grid-cols-3' : 'md:grid-cols-2'}`

  if (!latestMonth) {
    return (
      <div className={gridClass}>
        <EmptyKpi title={t('accounts.kpi.totalAssets')} currency={currency} />
        <EmptyKpi title={t('accounts.kpi.safetyCushion')} currency={currency} />
        {emergencyFundEnabled && <EmptyKpi title={t('accounts.kpi.emergencyFund')} currency={currency} />}
      </div>
    )
  }

  const totalAssets = totalAssetsAsOf(accounts, snapshots, latestMonth)
  const previousAssets = previousMonth ? totalAssetsAsOf(accounts, snapshots, previousMonth) : undefined
  const totalDelta = previousAssets === undefined ? undefined : totalAssets - previousAssets
  // Poduszka bezpieczeństwa = konfigurowalny zestaw bucketów (docelowo ~6 mies. kosztów rodziny).
  const safetyCushion = sumBuckets(accounts, snapshots, latestMonth, emergencyFundBuckets)
  // Fundusz awaryjny = TYLKO konta przypisane do bucketu 'emergency_fund' (mała, szybko dostępna kwota).
  const emergencyFund = sumBuckets(accounts, snapshots, latestMonth, ['emergency_fund'])

  return (
    <div className={gridClass}>
      <KpiCard title={t('accounts.kpi.totalAssets')} value={formatCurrency(totalAssets, currency)} subtitle={formatYearMonth(latestMonth)} delta={totalDelta} currency={currency} />
      <KpiCard
        title={t('accounts.kpi.safetyCushion')}
        value={formatCurrency(safetyCushion, currency)}
        subtitle={`${formatBucketSubtitle(emergencyFundBuckets)} · ${t('accounts.kpi.targetMonths', { months: safetyCushionMonths })}`}
        current={safetyCushion}
        target={safetyCushionTarget}
        currency={currency}
      />
      {emergencyFundEnabled && <KpiCard
        title={t('accounts.kpi.emergencyFund')}
        value={formatCurrency(emergencyFund, currency)}
        subtitle={t('accounts.kpi.emergencyBucket')}
        current={emergencyFund}
        target={emergencyFundTarget}
        currency={currency}
      />}
    </div>
  )
}

function sumBuckets(accounts: Account[], snapshots: AccountSnapshot[], yearMonth: string, buckets: AccountBucket[]): number {
  return accounts
    .filter(account => buckets.includes(account.bucket))
    .reduce((total, account) => total + balanceAsOf(snapshots, account, yearMonth), 0)
}

function formatBucketSubtitle(buckets: AccountBucket[]): string {
  if (buckets.length === 0) return t('common.empty.noBuckets')
  return buckets.map(translateAccountBucket).join(' + ')
}

function EmptyKpi({ title, currency }: { title: string; currency: string }) {
  return <KpiCard title={title} value="-" subtitle={t('accounts.kpi.noSnapshots')} currency={currency} />
}

function KpiCard({ title, value, subtitle, delta, current, target, currency }: { title: string; value: string; subtitle: string; delta?: number; current?: number; target?: number; currency: string }) {
  const DeltaIcon = (delta ?? 0) >= 0 ? TrendingUp : TrendingDown
  const hasProgress = target !== undefined && target > 0 && current !== undefined
  const pct = hasProgress ? Math.min(100, Math.round((current / target) * 100)) : 0
  const reached = pct >= 100

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-gray-100">{value}</p>
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" title={subtitle}>{subtitle}</p>
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          <WalletCards size={17} />
        </div>
      </div>
      {delta !== undefined && (
        <p className={`mt-3 flex items-center gap-1 text-xs font-medium ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          <DeltaIcon size={13} />
          {delta >= 0 ? '+' : ''}{formatCurrency(delta, currency)} · {t('common.labels.monthOverMonth')}
        </p>
      )}
      {hasProgress && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full ${reached ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-teal-500 dark:bg-teal-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {reached ? t('accounts.kpi.targetReached') : t('accounts.kpi.targetProgress', { percent: pct })} · {formatCurrency(target, currency)}
          </p>
        </div>
      )}
    </div>
  )
}
