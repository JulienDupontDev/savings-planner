import { allSnapshotMonths, balanceAsOf } from './accounts'
import type { Account, AccountBucket, AccountSnapshot, Schedule, Settings } from './types'
import { translate as t, translateAccountBucket } from '../i18n'

export type SecurityBufferId = 'emergency_fund' | 'safety_cushion'
export type SecurityBufferStatus = 'no_snapshots' | 'missing' | 'met'

export interface SecurityBuffer {
  id: SecurityBufferId
  goalId: string
  title: string
  current: number
  target: number
  missing: number
  progressPct: number
  status: SecurityBufferStatus
  priority: 1
  latestMonth?: string
  detail: string
  focusCopy: string
}

export interface SecurityBuffersModel {
  latestMonth?: string
  monthlyCostBasis: number
  buffers: SecurityBuffer[]
  missingBuffers: SecurityBuffer[]
  allMet: boolean
}

export function committedMonthlyCostBasis(settings: Settings, schedule?: Schedule): number {
  const first = schedule?.rows[0]
  return first
    ? first.expenses + first.subscriptionsTotal + first.loanPaymentsTotal + first.mortgagePaymentTotal
    : settings.monthlyExpenses
}

export function buildSecurityBuffers(
  settings: Settings,
  accounts: Account[],
  snapshots: AccountSnapshot[],
  schedule?: Schedule,
): SecurityBuffersModel {
  const latestMonth = allSnapshotMonths(snapshots).at(-1)
  const monthlyCostBasis = committedMonthlyCostBasis(settings, schedule)
  const safetyCushionMonths = settings.safetyCushionMonths ?? 6
  const safetyBuckets = settings.emergencyFundBuckets ?? ['safety_cushion']
  const safetyCurrent = latestMonth ? sumBuckets(accounts, snapshots, latestMonth, safetyBuckets) : 0
  const emergencyCurrent = latestMonth ? sumBuckets(accounts, snapshots, latestMonth, ['emergency_fund']) : 0
  const emergencyEnabled = settings.emergencyFundEnabled !== false
  const allBuffers: SecurityBuffer[] = [
    makeBuffer({
      id: 'emergency_fund',
      title: t('common.labels.emergencyFund'),
      current: emergencyCurrent,
      target: settings.emergencyFundTarget ?? 10000,
      latestMonth,
      detail: t('accounts.kpi.emergencyBucket'),
      focusCopy: t('security.fundFirst'),
    }),
    makeBuffer({
      id: 'safety_cushion',
      title: t('common.labels.securityCushion'),
      current: safetyCurrent,
      target: monthlyCostBasis * safetyCushionMonths,
      latestMonth,
      detail: `${formatBucketSubtitle(safetyBuckets)} · cel ${safetyCushionMonths} mies.`,
      focusCopy: t('security.safetyCushionCopy'),
    }),
  ]
  const buffers = emergencyEnabled ? allBuffers : allBuffers.filter(buffer => buffer.id !== 'emergency_fund')
  const missingBuffers = buffers.filter(buffer => buffer.status === 'missing')

  return {
    latestMonth,
    monthlyCostBasis,
    buffers,
    missingBuffers,
    allMet: latestMonth !== undefined && missingBuffers.length === 0,
  }
}

function makeBuffer({
  id,
  title,
  current,
  target,
  latestMonth,
  detail,
  focusCopy,
}: {
  id: SecurityBufferId
  title: string
  current: number
  target: number
  latestMonth?: string
  detail: string
  focusCopy: string
}): SecurityBuffer {
  const normalizedTarget = Math.max(0, target)
  const missing = Math.max(0, normalizedTarget - current)
  const progressPct = normalizedTarget > 0 ? Math.min(100, Math.round((current / normalizedTarget) * 100)) : 100
  const status: SecurityBufferStatus = !latestMonth ? 'no_snapshots' : missing > 0 ? 'missing' : 'met'

  return {
    id,
    goalId: `security:${id}`,
    title,
    current,
    target: normalizedTarget,
    missing,
    progressPct,
    status,
    priority: 1,
    latestMonth,
    detail,
    focusCopy,
  }
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
