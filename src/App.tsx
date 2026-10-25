import { useEffect, useMemo, useState } from 'react'
import { usePlanHiddenBlocks } from './hooks/usePlanBlocks'
import {
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Database,
  FileUp,
  Home,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  ReceiptText,
  Settings,
  ShieldCheck,
  Tags,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { AccountsSection } from './components/accounts/AccountsSection'
import { AssetsPie } from './components/accounts/AssetsPie'
import { NetWorthChart } from './components/accounts/NetWorthChart'
import { SavingsChart } from './components/chart/SavingsChart'
import { CategorizationSection } from './components/categorization/CategorizationSection'
import { CreditCardSection } from './components/creditcard/CreditCardSection'
import { WhatIfSlider } from './components/chart/WhatIfSlider'
import { UpcomingExpenseList } from './components/expenses/UpcomingExpenseList'
import { NextCycleForecast } from './components/forecast/NextCycleForecast'
import { GoalInsightsSection } from './components/goals/GoalInsightsSection'
import { GoalList } from './components/goals/GoalList'
import { Hero } from './components/hero/Hero'
import { IkzePlanner } from './components/ikze/IkzePlanner'
import { IngestSection } from './components/ingest/IngestSection'
import { LeakAnalysisSection } from './components/leakanalysis/LeakAnalysisSection'
import { LoanList } from './components/loans/LoanList'
import { ManualTransactionForm } from './components/transactions/ManualTransactionForm'
import { MortgageSection } from './components/mortgage/MortgageSection'
import { NextBestActionPanel } from './components/plan/NextBestActionPanel'
import { SecurityBufferFocus } from './components/plan/SecurityBufferFocus'
import { PayPeriodsSection } from './components/payperiods/PayPeriodsSection'
import { ScheduleTable } from './components/schedule/ScheduleTable'
import { SubscriptionList, SubscriptionTotal } from './components/subscriptions/SubscriptionList'
import { AdvancedSettings } from './components/ui/AdvancedSettings'
import { PageHeader, SectionCard, StatCard, surface } from './components/ui/Layout'
import { allSnapshotMonths, balanceAsOf, totalAssetsAsOf } from './domain/accounts'
import { buildSchedule } from './domain/allocation'
import { formatCurrency, formatYearMonth } from './domain/formatting'
import { periodKey } from './domain/payPeriods'
import type { Account, AccountBucket, AccountSnapshot } from './domain/types'
import { BACKEND_MODE, IS_API_MODE } from './config'
import { translateAccountBucket, useT } from './i18n'
import { useStore } from './store'

type AppTab = 'overview' | 'assets' | 'plan' | 'transactions' | 'settings'
type AppIcon = typeof LayoutDashboard

const TABS: Array<{ id: AppTab; label: string; icon: AppIcon }> = [
  { id: 'overview', label: 'app.navigation.overview', icon: LayoutDashboard },
  { id: 'assets', label: 'app.navigation.assets', icon: WalletCards },
  { id: 'plan', label: 'app.navigation.plan', icon: BarChart3 },
  { id: 'transactions', label: 'app.navigation.transactions', icon: Tags },
  { id: 'settings', label: 'app.navigation.settings', icon: Settings },
]

const TAB_HASH: Record<AppTab, string> = {
  overview: '#/przeglad',
  assets: '#/majatek',
  plan: '#/plan',
  transactions: '#/transakcje',
  settings: '#/ustawienia',
}

const HASH_TAB: Record<string, AppTab> = {
  '#/przeglad': 'overview',
  '#/': 'overview',
  '#/majatek': 'assets',
  '#/plan': 'plan',
  '#/transakcje': 'transactions',
  '#/ustawienia': 'settings',
}

function tabFromHash() {
  if (typeof window === 'undefined') return 'overview'
  return HASH_TAB[window.location.hash] ?? 'overview'
}

function tabNeedsAccountSnapshots(tab: AppTab) {
  return tab === 'overview' || tab === 'assets' || tab === 'plan'
}

export default function App() {
  const t = useT()
  const hydrateFromBackend = useStore(s => s.hydrateFromBackend)
  const isHydrating = useStore(s => s.isHydrating)
  const hasHydratedFromBackend = useStore(s => s.hasHydratedFromBackend)
  const syncError = useStore(s => s.syncError)
  const lastSyncedAt = useStore(s => s.lastSyncedAt)
  const [activeTab, setActiveTab] = useState<AppTab>(tabFromHash)

  useEffect(() => {
    if (IS_API_MODE && !hasHydratedFromBackend && !isHydrating) {
      void hydrateFromBackend({ includeAccountSnapshots: tabNeedsAccountSnapshots(activeTab) })
    }
  }, [activeTab, hasHydratedFromBackend, hydrateFromBackend, isHydrating])

  useEffect(() => {
    const handleHashChange = () => setActiveTab(tabFromHash())
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)
    if (!window.location.hash) window.history.replaceState(null, '', TAB_HASH.overview)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  const navigate = (tab: AppTab) => {
    window.history.pushState(null, '', TAB_HASH[tab])
    setActiveTab(tab)
  }

  const syncLabel = IS_API_MODE
    ? syncError
      ? t('common.status.syncNeedsAttention')
      : lastSyncedAt
        ? t('common.status.syncedAt', { time: new Date(lastSyncedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })
        : isHydrating
          ? t('common.status.loadingData')
          : t('common.status.apiMode')
    : t('common.status.localMode')

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-gray-950 dark:bg-[#101113] dark:text-gray-50">
      {IS_API_MODE && isHydrating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 dark:bg-gray-950/80">
          <div className="rounded-md border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('common.status.loadingBackend')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.status.zustandCache')}</p>
          </div>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden min-h-screen w-64 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 lg:sticky lg:top-0 lg:block">
          <div className="flex h-screen flex-col px-3 py-4">
            <div className="mb-5 flex items-center gap-2 px-2">
              <TrendingUp size={18} className="text-gray-700 dark:text-gray-200" />
              <div>
                <p className="font-display text-[0.95rem] font-semibold tracking-tight text-gray-950 dark:text-gray-50">Savings Planner</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('app.brand.subtitle')}</p>
              </div>
            </div>

            <AppNav activeTab={activeTab} onNavigate={navigate} />

            <div className={`mt-auto rounded-md border px-2.5 py-2 text-xs ${
              syncError
                ? 'border-red-200 text-red-700 dark:border-red-900 dark:text-red-300'
                : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400'
            }`}>
              <p className="font-medium">{syncLabel}</p>
              <p className="mt-1 text-gray-400 dark:text-gray-600">
                {BACKEND_MODE === 'api' ? '/api backend' : 'localStorage'}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-[#f6f6f4] dark:border-gray-800 dark:bg-[#101113] lg:hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex min-w-52 items-center gap-2">
                <TrendingUp size={18} className="text-gray-700 dark:text-gray-200" />
                <div>
                  <p className="font-display text-[0.95rem] font-semibold tracking-tight text-gray-950 dark:text-gray-50">Savings Planner</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('app.brand.subtitle')}</p>
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <AppNav activeTab={activeTab} onNavigate={navigate} compact />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
            {activeTab === 'overview' && <OverviewPage onNavigate={navigate} />}
            {activeTab === 'assets' && <AssetsPage />}
            {activeTab === 'plan' && <PlanPage />}
            {activeTab === 'transactions' && <TransactionsPage />}
            {activeTab === 'settings' && <SettingsPage />}
          </main>

          <footer className="mx-auto max-w-[1680px] px-4 pb-6 text-center text-xs text-gray-400 dark:text-gray-600 sm:px-6 lg:px-8">
            {BACKEND_MODE === 'api'
              ? `${t('app.footer.apiSynced')}${syncError ? ` · ${t('app.footer.attention')}` : ''}`
              : t('app.footer.localOnly')}
          </footer>
        </div>
      </div>
    </div>
  )
}

function AppNav({ activeTab, onNavigate, compact = false }: { activeTab: AppTab; onNavigate: (tab: AppTab) => void; compact?: boolean }) {
  const t = useT()
  return (
    <nav className={compact ? 'flex items-center gap-1' : 'space-y-1'} aria-label={t('app.navigation.main')}>
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`${compact ? 'inline-flex' : 'flex w-full'} items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${
              active
                ? 'bg-white text-gray-950 shadow-sm ring-1 ring-black/[0.05] dark:bg-gray-800 dark:text-gray-50 dark:ring-white/[0.06]'
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={16} />
            {t(tab.label)}
          </button>
        )
      })}
    </nav>
  )
}

function OverviewPage({ onNavigate }: { onNavigate: (tab: AppTab) => void }) {
  const t = useT()
  const currency = useStore(s => s.settings.defaultCurrency ?? 'PLN')
  useAccountSnapshotsOnDemand()
  const overview = useOverviewModel()

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('app.overview.title')}
        description={t('app.overview.description')}
        icon={LayoutDashboard}
        accent="overview"
      />

      <NetWorthHero overview={overview} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('app.overview.monthlyIncome')} value={overview.monthlyIncome} detail={overview.cashflowMonthLabel} tone="positive" />
        <StatCard label={t('app.overview.monthlyCosts')} value={overview.monthlyCosts} detail={overview.costsDetail} tone="negative" />
        <StatCard label={t('app.overview.monthlyFreeCash')} value={overview.freeCash} detail={overview.freeCashDetail} tone={overview.freeCashTone} />
        <StatCard label={t('common.labels.securityCushion')} value={overview.emergencyFund} detail={overview.emergencyFundLabel} tone="asset" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <SectionCard title={t('app.overview.netWorthHistory')} description={t('app.overview.netWorthHistoryDescription')} icon={TrendingUp} accent="assets">
          <NetWorthChart
            accounts={overview.accounts}
            snapshots={overview.snapshots}
            loans={overview.loans}
            mortgagePlan={overview.mortgagePlan}
          />
        </SectionCard>
        <AssetsPie accounts={overview.accounts} snapshots={overview.snapshots} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t('app.overview.nearbyGoals')} icon={ListChecks} accent="plan">
          {overview.nextGoals.length === 0 ? (
            <EmptyLine text={t('app.overview.noActiveGoals')} />
          ) : (
            <div className="space-y-2">
              {overview.nextGoals.map(goal => (
                <div key={goal.goalId} className="flex items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{goal.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {goal.completionMonth ? `Prévu ${formatYearMonth(goal.completionMonth)}` : goal.projectedETA ? t('common.time.outsideHorizon', { month: formatYearMonth(goal.projectedETA) }) : t('common.empty.noAllocation')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">{formatCurrency(goal.currentBalance, currency)}</span>
                </div>
              ))}
            </div>
          )}
          <DomainButton onClick={() => onNavigate('plan')} label={t('app.overview.openPlan')} />
        </SectionCard>

        <SectionCard title={t('app.overview.upcomingExpenses')} icon={CalendarClock} accent="plan">
          {overview.nextExpenses.length === 0 ? (
            <EmptyLine text={t('app.overview.noUpcomingExpenses')} />
          ) : (
            <div className="space-y-2">
              {overview.nextExpenses.map(expense => (
                <div key={expense.id} className="flex items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{expense.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatYearMonth(expense.targetMonth)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">{formatCurrency(expense.amount, currency)}</span>
                </div>
              ))}
            </div>
          )}
          <DomainButton onClick={() => onNavigate('plan')} label={t('app.overview.openCashflow')} />
        </SectionCard>
      </div>
    </div>
  )
}

function AssetsPage() {
  const t = useT()
  useAccountSnapshotsOnDemand()
  return (
    <div className="space-y-5">
      <PageHeader title={t('app.assets.title')} description={t('app.assets.description')} icon={WalletCards} accent="assets" />
      <AccountsSection />
    </div>
  )
}

function useAccountSnapshotsOnDemand() {
  const hasHydratedFromBackend = useStore(s => s.hasHydratedFromBackend)
  const hasLoadedAccountSnapshots = useStore(s => s.hasLoadedAccountSnapshots)
  const loadAccountSnapshots = useStore(s => s.loadAccountSnapshots)

  useEffect(() => {
    if (IS_API_MODE && hasHydratedFromBackend && !hasLoadedAccountSnapshots) {
      void loadAccountSnapshots()
    }
  }, [hasHydratedFromBackend, hasLoadedAccountSnapshots, loadAccountSnapshots])
}

const PLAN_BLOCKS: { id: string; label: string }[] = [
  { id: 'cashflow', label: 'app.plan.monthlyCashflow' },
  { id: 'nextBestAction', label: 'app.plan.nextBestAction' },
  { id: 'security', label: 'app.plan.securityPriority' },
  { id: 'forecast', label: 'app.plan.nextCycleForecast' },
  { id: 'ikze', label: 'app.plan.annualIkze' },
  { id: 'chart', label: 'app.plan.goalDebtForecast' },
  { id: 'whatIf', label: 'app.plan.whatIfSimulation' },
  { id: 'goals', label: 'common.labels.goals' },
  { id: 'loans', label: 'app.plan.creditLoans' },
  { id: 'mortgage', label: 'app.plan.mortgage' },
  { id: 'creditCard', label: 'app.plan.creditCard' },
  { id: 'upcoming', label: 'app.overview.upcomingExpenses' },
  { id: 'subscriptions', label: 'common.labels.subscription' },
  { id: 'schedule', label: 'app.plan.monthlySchedule' },
]

function PlanBlocksMenu() {
  const t = useT()
  const { hidden, toggle, reset } = usePlanHiddenBlocks()
  return (
    <details className="relative">
      <summary className="cursor-pointer select-none rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
        {t('app.plan.blocks.title')}
        {hidden.length > 0 && ` (${PLAN_BLOCKS.length - hidden.length}/${PLAN_BLOCKS.length})`}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        {PLAN_BLOCKS.map(block => (
          <label key={block.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
            <input type="checkbox" checked={!hidden.includes(block.id)} onChange={() => toggle(block.id)} />
            {t(block.label)}
          </label>
        ))}
        <button type="button" onClick={reset} className="mt-2 text-xs text-indigo-600 hover:underline dark:text-indigo-300">
          {t('app.plan.blocks.showAll')}
        </button>
      </div>
    </details>
  )
}

function PlanPage() {
  const t = useT()
  useAccountSnapshotsOnDemand()
  const settings = useStore(s => s.settings)
  const currency = settings.defaultCurrency ?? 'PLN'
  const goals = useStore(s => s.goals)
  const loans = useStore(s => s.loans)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)
  const overrides = useStore(s => s.overrides)
  const schedule = useMemo(
    () => buildSchedule(settings, goals, loans, overrides, 0, 0, mortgagePlan, subscriptions, upcomingExpenses),
    [settings, goals, loans, overrides, mortgagePlan, subscriptions, upcomingExpenses],
  )
  const mortgageSummary = schedule.mortgageSummary

  return (
    <div className="space-y-5">
      <PageHeader title={t('app.plan.title')} description={t('app.plan.description')} icon={BarChart3} accent="plan" action={<PlanBlocksMenu />} />

      <SectionCard blockId="cashflow" title={t('app.plan.monthlyCashflow')} description={t('app.plan.monthlyCashflowDescription')} icon={CircleDollarSign} accent="plan">
        <Hero />
      </SectionCard>

      <SectionCard blockId="nextBestAction" title={t('app.plan.nextBestAction')} description={t('app.plan.nextBestActionDescription')} icon={ListChecks} accent="plan">
        <NextBestActionPanel schedule={schedule} />
      </SectionCard>

      <SectionCard blockId="security" title={t('app.plan.securityPriority')} description={t('app.plan.securityPriorityDescription')} icon={ShieldCheck} accent="plan">
        <SecurityBufferFocus schedule={schedule} />
      </SectionCard>

      <SectionCard blockId="forecast" title={t('app.plan.nextCycleForecast')} description={t('app.plan.nextCycleForecastDescription')} icon={CalendarClock} accent="plan">
        <NextCycleForecast />
      </SectionCard>

      <SectionCard blockId="ikze" title={t('app.plan.annualIkze')} description={t('app.plan.annualIkzeDescription')} icon={PiggyBank} accent="plan">
        <IkzePlanner />
      </SectionCard>

      <SectionCard blockId="chart" title={t('app.plan.goalDebtForecast')} icon={TrendingUp} accent="plan">
        <SavingsChart />
      </SectionCard>

      <SectionCard blockId="whatIf" title={t('app.plan.whatIfSimulation')} icon={ReceiptText} accent="plan">
        <WhatIfSlider />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard blockId="goals" title={t('common.labels.goals')} icon={ListChecks} accent="plan">
          <GoalInsightsSection />
          <div className="my-4 border-t border-gray-200 dark:border-gray-800" />
          <GoalList />
        </SectionCard>
        <SectionCard blockId="loans" title={t('app.plan.creditLoans')} icon={ReceiptText} accent="plan">
          <LoanList />
        </SectionCard>
      </div>

      <SectionCard blockId="mortgage"
        title={t('app.plan.mortgage')}
        icon={Home}
        accent="plan"
        collapsible
        defaultOpen={false}
        collapsedSummary={
          mortgagePlan
            ? (
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <span>{t('app.plan.mortgageBalance')} <strong className="tabular-nums">{formatCurrency(mortgagePlan.principal, currency)}</strong></span>
                  <span>{t('app.plan.mortgagePayment')} <strong className="tabular-nums">{formatCurrency(mortgageSummary?.currentMonthlyPayment ?? 0, currency)}</strong></span>
                  <span>{t('app.plan.mortgagePayoff')} <strong>{mortgageSummary?.payoffMonth ?? t('common.time.beyondHorizon')}</strong></span>
                </div>
              )
            : t('app.plan.mortgageMissing')
        }
      >
        <MortgageSection />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard blockId="creditCard"
          title={t('app.plan.creditCard')}
          description={t('app.plan.creditCardDescription')}
          icon={CreditCard}
          accent="plan"
        >
          <CreditCardSection />
        </SectionCard>
        <SectionCard blockId="upcoming" title={t('app.overview.upcomingExpenses')} icon={CalendarClock} accent="plan">
          <UpcomingExpenseList />
        </SectionCard>
      </div>

      <SectionCard blockId="subscriptions" title={t('common.labels.subscription')} icon={Database} accent="plan" action={<SubscriptionTotal />}>
        <SubscriptionList />
      </SectionCard>

      <SectionCard blockId="schedule"
        title={t('app.plan.monthlySchedule')}
        description={t('app.plan.monthlyScheduleDescription')}
        icon={BarChart3}
        accent="plan"
        collapsible
        defaultOpen={false}
        collapsedSummary={
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>{t('app.plan.horizon')} <strong>{schedule.rows.length} {t('common.time.months')}</strong></span>
            <span>{t('common.labels.goals')} <strong>{goals.length}</strong></span>
            <span>{t('app.plan.firstMonth')} <strong>{schedule.rows[0]?.label ?? t('common.empty.none')}</strong></span>
          </div>
        }
      >
        <ScheduleTable />
      </SectionCard>
    </div>
  )
}

function TransactionsPage() {
  const t = useT()
  const payPeriods = useStore(s => s.payPeriods)
  const [selectedPayPeriodKey, setSelectedPayPeriodKey] = useState('')
  const selectedPeriod = useMemo(
    () => payPeriods.find(period => periodKey(period) === selectedPayPeriodKey) ?? payPeriods[0],
    [payPeriods, selectedPayPeriodKey],
  )

  return (
    <div className="space-y-5">
      <PageHeader title={t('app.transactions.title')} description={t('app.transactions.description')} icon={Tags} accent="assets" />
      <SectionCard title={t('manualTransaction.title')} description={t('manualTransaction.description')} icon={ReceiptText} accent="assets">
        <ManualTransactionForm />
      </SectionCard>
      <SectionCard title={t('app.transactions.payPeriods')} description={t('app.transactions.payPeriodsDescription')} icon={CalendarClock} accent="assets">
        <PayPeriodsSection selectedKey={selectedPayPeriodKey} onSelectedKeyChange={setSelectedPayPeriodKey} />
      </SectionCard>
      <SectionCard title={t('app.transactions.leakAnalysis')} description={t('app.transactions.leakAnalysisDescription')} icon={TrendingUp} accent="assets">
        <LeakAnalysisSection selectedPeriod={selectedPeriod} />
      </SectionCard>
      <SectionCard title={t('app.transactions.categorization')} icon={Tags} accent="assets">
        <CategorizationSection />
      </SectionCard>
      <SectionCard title={t('app.transactions.statementImport')} description={t('app.transactions.statementImportDescription')} icon={FileUp} accent="assets">
        <IngestSection />
      </SectionCard>
    </div>
  )
}

function SettingsPage() {
  const t = useT()
  return (
    <div className="space-y-5">
      <PageHeader title={t('app.settings.title')} description={t('app.settings.description')} icon={Settings} accent="settings" />
      <SectionCard title={t('app.settings.configuration')} icon={ShieldCheck} accent="settings">
        <AdvancedSettings />
      </SectionCard>
    </div>
  )
}

function DomainButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {label}
    </button>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{text}</p>
}

function NetWorthHero({ overview }: { overview: ReturnType<typeof useOverviewModel> }) {
  const t = useT()
  const negative = overview.netWorthTone === 'negative'
  return (
    <div className={`${surface} overflow-hidden`}>
      <div className="grid gap-6 p-6 sm:grid-cols-[1.25fr_1fr] sm:p-7">
        <div>
             <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500 dark:text-gray-400">{t('common.labels.netWorth')}</p>
          <p className={`mt-2 font-display text-4xl font-semibold leading-none tnum sm:text-5xl ${negative ? 'text-rose-600 dark:text-rose-400' : 'text-gray-950 dark:text-gray-50'}`}>
            {overview.netWorth}
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {overview.netWorthDetail} · {overview.latestMonthLabel}
          </p>
          {negative && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                 {t('app.overview.netWorthNegativeExplanation')}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2.5 sm:border-l sm:border-gray-200/70 sm:pl-6 sm:dark:border-gray-800">
             <BreakdownRow label={t('common.labels.assets')} value={overview.assetsValue} tone="asset" />
             <BreakdownRow label={t('common.labels.debt')} value={`−${overview.debtValue}`} tone="negative" />
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, tone }: { label: string; value: string; tone: 'asset' | 'negative' }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-display text-lg font-semibold tnum ${tone === 'asset' ? 'text-teal-700 dark:text-teal-300' : 'text-rose-600 dark:text-rose-400'}`}>
        {value}
      </span>
    </div>
  )
}

function useOverviewModel() {
  const t = useT()
  const settings = useStore(s => s.settings)
  const currency = settings.defaultCurrency ?? 'PLN'
  const goals = useStore(s => s.goals)
  const loans = useStore(s => s.loans)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)
  const overrides = useStore(s => s.overrides)

  const schedule = useMemo(
    () => buildSchedule(settings, goals, loans, overrides, 0, 0, mortgagePlan, subscriptions, upcomingExpenses),
    [settings, goals, loans, overrides, mortgagePlan, subscriptions, upcomingExpenses],
  )

  const months = allSnapshotMonths(snapshots)
  const latestMonth = months.at(-1)
  const previousMonth = months.at(-2)
  const totalAssets = latestMonth ? totalAssetsAsOf(accounts, snapshots, latestMonth) : 0
  const previousAssets = previousMonth ? totalAssetsAsOf(accounts, snapshots, previousMonth) : undefined
  const debt = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0) + (mortgagePlan?.principal ?? 0)
  const netWorth = totalAssets - debt
  const netWorthDelta = previousAssets === undefined ? undefined : totalAssets - previousAssets
  const emergencyBuckets = settings.emergencyFundBuckets ?? []
  const emergencyFund = latestMonth ? sumBuckets(emergencyBuckets, latestMonth, accounts, snapshots) : 0
  const firstMonth = schedule.rows[0]
  const freeCash = firstMonth?.freeCash ?? settings.monthlyIncome - settings.monthlyExpenses
  const monthlyIncome = firstMonth?.income ?? settings.monthlyIncome
  const livingCosts = firstMonth?.expenses ?? settings.monthlyExpenses
  const subscriptionsCost = firstMonth?.subscriptionsTotal ?? 0
  const oneTimeCost = firstMonth?.oneTimeExpensesTotal ?? 0
  const ikzeCost = firstMonth?.ikzeContributionTotal ?? 0
  const debtCost = (firstMonth?.loanPaymentsTotal ?? 0) + (firstMonth?.mortgagePaymentTotal ?? 0)
  const monthlyCosts = livingCosts + subscriptionsCost + oneTimeCost + debtCost + ikzeCost
  const activeGoalIds = new Set(goals.filter(goal => (goal.currentSaved ?? 0) < goal.targetAmount).map(goal => goal.id))
  const nextGoals = schedule.goalProgress.filter(goal => activeGoalIds.has(goal.goalId)).slice(0, 4)
  const nextExpenses = upcomingExpenses
    .filter(expense => !expense.isPaid)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
    .slice(0, 4)
  const bucketLabel = emergencyBuckets.length > 0
    ? emergencyBuckets.map(translateAccountBucket).join(' + ')
    : t('common.empty.noBuckets')

  return {
    accounts,
    snapshots,
    loans,
    mortgagePlan,
    assets: formatCurrency(totalAssets, currency),
    netWorth: formatCurrency(netWorth, currency),
    netWorthDetail: netWorthDelta === undefined
      ? t('common.empty.noPreviousSnapshot')
      : t('app.overview.monthOverMonthDelta', { sign: netWorthDelta >= 0 ? '+' : '', amount: formatCurrency(netWorthDelta, currency) }),
    latestMonthLabel: latestMonth ? formatYearMonth(latestMonth) : t('common.empty.noAccountSnapshots'),
    netWorthTone: netWorth < 0 ? 'negative' as const : 'asset' as const,
    assetsValue: formatCurrency(totalAssets, currency),
    debtValue: formatCurrency(debt, currency),
    monthlyIncome: `${formatCurrency(monthlyIncome, currency)}/mois`,
    monthlyCosts: `${formatCurrency(monthlyCosts, currency)}/mois`,
    costsDetail: t('app.overview.costBreakdown', {
      living: formatCurrency(livingCosts, currency),
      subscriptions: formatCurrency(subscriptionsCost, currency),
      oneTime: formatCurrency(oneTimeCost, currency),
      debt: formatCurrency(debtCost, currency),
      ikze: formatCurrency(ikzeCost, currency),
    }),
    cashflowMonthLabel: firstMonth ? formatYearMonth(firstMonth.yearMonth) : t('common.time.firstMonth'),
    emergencyFund: formatCurrency(emergencyFund, currency),
    emergencyFundLabel: bucketLabel,
    freeCash: `${formatCurrency(freeCash, currency)}/mois`,
    freeCashDetail: firstMonth ? formatYearMonth(firstMonth.yearMonth) : t('common.time.firstPlanMonth'),
    freeCashTone: freeCash < 0 ? 'negative' as const : 'positive' as const,
    nextGoals,
    nextExpenses,
  }
}

function sumBuckets(bucketIds: AccountBucket[], yearMonth: string, accounts: Account[], snapshots: AccountSnapshot[]) {
  return accounts
    .filter(account => bucketIds.includes(account.bucket))
    .reduce((total, account) => total + balanceAsOf(snapshots, account, yearMonth), 0)
}
