import { allSnapshotMonths, balanceAsOf, totalAssetsAsOf } from './accounts'
import { buildSchedule } from './allocation'
import { addMonths, formatCurrency, formatYearMonth } from './formatting'
import { translate as t } from '../i18n'
import { calculateIkzeEntry } from './ikze'
import { buildSecurityBuffers, type SecurityState } from './securityBuffers'
import type {
  Account,
  AccountBucket,
  AccountSnapshot,
  Goal,
  Loan,
  MortgagePlan,
  Overrides,
  Settings,
  Subscription,
  UpcomingExpense,
} from './types'

export interface WealthReportInput {
  settings: Settings
  goals: Goal[]
  loans: Loan[]
  accounts: Account[]
  snapshots: AccountSnapshot[]
  mortgagePlan?: MortgagePlan
  subscriptions: Subscription[]
  upcomingExpenses: UpcomingExpense[]
  overrides: Overrides
  securityState?: SecurityState
  bucketLabel: (bucket: AccountBucket) => string
  now?: Date
}

export type ReportStatus = 'good' | 'watch' | 'alert'

export interface ReportPoint { label: string; value: number }

export interface WealthReport {
  currency: string
  generatedAt: string
  latestMonth?: string
  netWorth: number
  assets: number
  debt: number
  deltaMonth?: number
  delta12Months?: number
  status: ReportStatus
  headline: string
  highlights: string[]
  history: ReportPoint[]
  allocation: { label: string; value: number; pct: number }[]
  accounts: { name: string; bucket: string; balance: number }[]
  cashflow: { income: number; lines: { label: string; amount: number }[]; freeCash: number; monthLabel: string }
  security: { title: string; current: number; target: number; progressPct: number; met: boolean }[]
  securityMonths?: number
  goals: {
    name: string
    target: number
    saved: number
    pct: number
    eta: string
    onTrack: boolean | undefined
    deadline?: string
    shortfallPerMonth?: number
  }[]
  loans: { name: string; remaining: number; monthly: number; payoff: string }[]
  mortgage?: {
    name: string
    balance: number
    monthly: number
    ratePct: number
    payoff: string
    remainingMonths: number
    totalInterest: number
    interestSaved: number
  }
  debtCurve: ReportPoint[]
  ikze: { owner: string; year: number; limit: number; contributed: number; remaining: number; perPayout: number }[]
  upcomingExpenses: { name: string; month: string; amount: number }[]
  assumptions: string[]
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const pctOf = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0)

export function buildWealthReport(input: WealthReportInput): WealthReport {
  const { settings, goals, loans, accounts, snapshots, mortgagePlan, upcomingExpenses } = input
  const currency = settings.defaultCurrency ?? 'PLN'
  const money = (n: number) => formatCurrency(n, currency)
  const now = input.now ?? new Date()

  const schedule = buildSchedule(
    settings, goals, loans, input.overrides, 0, 0, mortgagePlan,
    input.subscriptions, upcomingExpenses, input.securityState,
  )

  const months = allSnapshotMonths(snapshots)
  const latestMonth = months.at(-1)
  const assets = latestMonth ? totalAssetsAsOf(accounts, snapshots, latestMonth) : 0
  const debt = sum(loans.map(l => l.remainingBalance)) + (mortgagePlan?.principal ?? 0)
  const netWorth = assets - debt

  const previousMonth = months.at(-2)
  const deltaMonth = previousMonth ? assets - totalAssetsAsOf(accounts, snapshots, previousMonth) : undefined
  const yearAgo = latestMonth ? addMonths(latestMonth, -12) : undefined
  const yearAgoMonth = yearAgo ? months.find(m => m >= yearAgo) : undefined
  const delta12Months = latestMonth && yearAgoMonth && yearAgoMonth < latestMonth
    ? assets - totalAssetsAsOf(accounts, snapshots, yearAgoMonth)
    : undefined

  const history = months.slice(-24).map(m => ({ label: formatYearMonth(m), value: totalAssetsAsOf(accounts, snapshots, m) }))

  const activeAccounts = latestMonth
    ? accounts
      .map(a => ({ account: a, balance: balanceAsOf(snapshots, a, latestMonth) }))
      .filter(x => x.balance !== 0)
      .sort((a, b) => b.balance - a.balance)
    : []
  const byBucket = new Map<AccountBucket, number>()
  for (const { account, balance } of activeAccounts) {
    byBucket.set(account.bucket, (byBucket.get(account.bucket) ?? 0) + balance)
  }
  const allocation = [...byBucket.entries()]
    .map(([bucket, value]) => ({ label: input.bucketLabel(bucket), value, pct: pctOf(value, assets) }))
    .sort((a, b) => b.value - a.value)

  const first = schedule.rows[0]
  const income = first?.income ?? settings.monthlyIncome
  const lines = [
    { label: t('report.budget.living'), amount: first?.expenses ?? settings.monthlyExpenses },
    { label: t('report.budget.subscriptions'), amount: first?.subscriptionsTotal ?? 0 },
    { label: t('report.budget.oneTime'), amount: first?.oneTimeExpensesTotal ?? 0 },
    { label: t('report.budget.loans'), amount: first?.loanPaymentsTotal ?? 0 },
    { label: t('report.budget.mortgage'), amount: first?.mortgagePaymentTotal ?? 0 },
    { label: t('report.budget.retirement'), amount: first?.ikzeContributionTotal ?? 0 },
  ].filter(l => l.amount > 0)
  const freeCash = first?.freeCash ?? income - sum(lines.map(l => l.amount))

  const buffers = buildSecurityBuffers(settings, accounts, snapshots, schedule, upcomingExpenses)
  const securityCurrent = sum(buffers.buffers.map(b => b.current))
  const securityMonths = latestMonth && buffers.monthlyCostBasis > 0 ? securityCurrent / buffers.monthlyCostBasis : undefined

  const goalById = new Map(goals.map(g => [g.id, g]))
  const goalRows = schedule.goalProgress.map(p => {
    const goal = goalById.get(p.goalId)
    const eta = p.isComplete
      ? t('report.goals.reached')
      : p.completionMonth
        ? formatYearMonth(p.completionMonth)
        : p.projectedETA
          ? t('report.goals.outsideHorizon', { month: formatYearMonth(p.projectedETA) })
          : t('report.goals.notPlanned')
    return {
      name: p.name,
      target: p.targetAmount,
      saved: p.currentBalance,
      pct: Math.min(100, pctOf(p.currentBalance, p.targetAmount)),
      eta,
      onTrack: p.isComplete ? true : p.deadline ? p.deadlineOnTime : undefined,
      deadline: goal?.deadline ? formatYearMonth(goal.deadline.slice(0, 7)) : undefined,
      shortfallPerMonth: p.deadlineMissed ? p.shortfallPerMonth : undefined,
    }
  })

  const loanRows = schedule.loanProgress.map(p => {
    const loan = loans.find(l => l.id === p.loanId)
    const payoff = p.payoffMonth ?? p.projectedPayoffMonth
    return {
      name: p.name,
      remaining: loan?.remainingBalance ?? p.initialBalance,
      monthly: p.monthlyPayment,
      payoff: payoff ? formatYearMonth(payoff) : t('report.goals.notPlanned'),
    }
  })

  const ms = schedule.mortgageSummary
  const mortgage = mortgagePlan && ms
    ? {
      name: ms.name,
      balance: mortgagePlan.principal,
      monthly: ms.currentMonthlyPayment,
      ratePct: mortgagePlan.annualInterestRate,
      payoff: ms.payoffMonth ? formatYearMonth(ms.payoffMonth) : t('report.debts.beyondHorizon'),
      remainingMonths: ms.remainingMonths,
      totalInterest: ms.totalInterest,
      interestSaved: ms.interestSaved,
    }
    : undefined

  const debtCurve = schedule.rows.map(row => ({
    label: formatYearMonth(row.yearMonth),
    value: sum(row.loanEntries.map(e => e.balanceAfter)) + (row.mortgageEntry?.balanceAfter ?? 0),
  }))

  const ikze = (settings.ikzePlans ?? []).map(calculateIkzeEntry).map(e => ({
    owner: e.ownerName,
    year: e.year,
    limit: e.annualLimit,
    contributed: e.contributedAmount,
    remaining: e.remaining,
    perPayout: e.perPayout,
  }))

  const upcoming = upcomingExpenses
    .filter(e => !e.isPaid && !e.recurring)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
    .slice(0, 12)
    .map(e => ({ name: e.name, month: formatYearMonth(e.targetMonth), amount: e.amount }))

  const activeGoals = goalRows.filter(g => g.pct < 100)
  const lateGoals = goalRows.filter(g => g.onTrack === false)
  const status: ReportStatus = freeCash < 0
    ? 'alert'
    : lateGoals.length > 0 || !buffers.allMet ? 'watch' : 'good'
  const headline = t(`report.headline.${status}`)

  const highlights: string[] = []
  if (latestMonth) {
    let line = t('report.highlights.netWorth', { netWorth: money(netWorth), assets: money(assets), debt: money(debt) })
    const change = delta12Months ?? deltaMonth
    if (change !== undefined) {
      line += ` ${t(delta12Months !== undefined ? 'report.highlights.yearChange' : 'report.highlights.monthChange', {
        direction: t(change >= 0 ? 'report.highlights.increased' : 'report.highlights.decreased'),
        amount: money(Math.abs(change)),
      })}`
    }
    highlights.push(line)
  } else {
    highlights.push(t('report.highlights.noSnapshots'))
  }
  if (securityMonths !== undefined) {
    highlights.push(t(buffers.allMet ? 'report.highlights.securityMet' : 'report.highlights.securityMissing', { months: securityMonths.toFixed(1) }))
  }
  highlights.push(
    freeCash >= 0
      ? t('report.highlights.freeCashPositive', { amount: money(freeCash) })
      : t('report.highlights.freeCashNegative', { amount: money(Math.abs(freeCash)) }),
  )
  if (goalRows.length > 0) {
    const next = [...activeGoals].sort((a, b) => b.pct - a.pct)[0]
    const params = { done: goalRows.length - activeGoals.length, active: activeGoals.length, late: lateGoals.length }
    let line = t(lateGoals.length > 0 ? 'report.highlights.goalsLate' : 'report.highlights.goals', params)
    if (next) line += ` ${t('report.highlights.goalsNext', { name: next.name, pct: next.pct.toFixed(0) })}`
    highlights.push(line)
  }
  if (mortgage) {
    highlights.push(t('report.highlights.mortgage', { payoff: mortgage.payoff, balance: money(mortgage.balance) }))
  } else if (debt === 0) {
    highlights.push(t('report.highlights.noDebt'))
  }

  return {
    currency,
    generatedAt: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    latestMonth,
    netWorth,
    assets,
    debt,
    deltaMonth,
    delta12Months,
    status,
    headline,
    highlights,
    history,
    allocation,
    accounts: activeAccounts.map(({ account, balance }) => ({
      name: account.name,
      bucket: input.bucketLabel(account.bucket),
      balance,
    })),
    cashflow: {
      income,
      lines,
      freeCash,
      monthLabel: first ? formatYearMonth(first.yearMonth) : formatYearMonth(settings.startMonth),
    },
    security: buffers.buffers.map(b => ({
      title: b.title,
      current: b.current,
      target: b.target,
      progressPct: Math.min(100, b.progressPct),
      met: b.status === 'met',
    })),
    securityMonths,
    goals: goalRows,
    loans: loanRows,
    mortgage,
    debtCurve,
    ikze,
    upcomingExpenses: upcoming,
    assumptions: [
      t('report.help.horizon', { months: settings.horizonMonths, start: formatYearMonth(settings.startMonth) }),
      t('report.help.source'),
      t('report.help.estimate'),
    ],
  }
}
