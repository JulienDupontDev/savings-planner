import { useEffect } from 'react'
import { Activity, Gauge, Target } from 'lucide-react'
import { IS_API_MODE } from '../../config'
import { formatCurrency } from '../../domain/formatting'
import type { FreeCashCycle, GoalPace, GoalPaceStatus } from '../../domain/types'
import { useStore } from '../../store'
import { translate as t } from '../../i18n'
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency'

export function GoalInsightsSection() {
  const currency = useDefaultCurrency()
  const goals = useStore(s => s.goals)
  const goalInsights = useStore(s => s.goalInsights)
  const loadGoalInsights = useStore(s => s.loadGoalInsights)

  useEffect(() => {
    if (IS_API_MODE) void loadGoalInsights()
  }, [loadGoalInsights, goals.length])

  if (!IS_API_MODE) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {t('goals.insights.apiOnly')}
      </div>
    )
  }

  if (!goalInsights) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('goals.insights.loading')}</p>
  }

  if (!goalInsights.currentCycle && goalInsights.goals.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {t('goals.insights.noCycleData')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        {goalInsights.currentCycle ? (
          <FreeCashPanel cycle={goalInsights.currentCycle} />
        ) : (
          <EmptyPanel title={t('goals.insights.freeCash')} text={t('goals.insights.noBudgetCycles')} />
        )}

        <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <div className="mb-3 flex items-center gap-2">
            <Gauge size={16} className="text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('goals.insights.historyPace')}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Metric label={t('goals.insights.fullCycles')} value={String(goalInsights.cycleCount)} />
            <Metric label={t('goals.insights.averageNet')} value={formatCurrency(goalInsights.averageNetPerCycle, currency)} tone={goalInsights.averageNetPerCycle < 0 ? 'negative' : 'positive'} />
            <Metric label={t('goals.insights.averageFreeCash')} value={formatCurrency(goalInsights.averageFreeCashPerCycle, currency)} tone="positive" />
          </div>
        </div>
      </div>

      {goalInsights.goals.length > 0 && (
        <div className="rounded-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <Target size={16} className="text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('goals.insights.actualVsPlan')}</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-900">
            {goalInsights.goals.map(goal => <GoalPaceRow key={goal.goalId} goal={goal} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function FreeCashPanel({ cycle }: { cycle: FreeCashCycle }) {
  const currency = useDefaultCurrency()
  const savingsContribution = cycle.savingsContribution ?? 0
  const savingsWithdrawal = cycle.savingsWithdrawal ?? 0
  const total = Math.max(cycle.income, cycle.committedExpense + Math.max(0, cycle.freeCash), 1)
  const committedPct = clampPct(cycle.committedExpense / total)
  const freePct = clampPct(Math.max(0, cycle.freeCash) / total)
  const variableUsedPct = cycle.freeCash > 0 ? clampPct((cycle.variableExpense + cycle.uncategorizedExpense) / cycle.freeCash) : 0

  return (
    <div className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-gray-500 dark:text-gray-400" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('goals.insights.currentCycleFreeCash')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('goals.insights.cycleRange', { account: cycle.accountName, start: cycle.periodStart, end: cycle.periodEnd ?? t('common.time.now'), partial: cycle.isPartial ? t('goals.insights.partial') : '' })}
            </p>
          </div>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${cycle.net < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-teal-700 dark:text-teal-300'}`}>
          {t('goals.insights.netAmount', { amount: formatCurrency(cycle.net, currency) })}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800" aria-label={t('goals.insights.cycleIncomeSplit')}>
        <div className="flex h-full">
          <div className="bg-gray-400/70 dark:bg-gray-500/70" style={{ width: `${committedPct}%` }} />
          <div className="bg-teal-500/80" style={{ width: `${freePct}%` }} />
        </div>
      </div>
      <div className="mt-2 grid gap-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2 xl:grid-cols-4">
        <span>{t('goals.insights.fixedCosts', { amount: formatCurrency(cycle.committedExpense, currency) })}</span>
        <span>{t('goals.insights.freeCashAmount', { amount: formatCurrency(cycle.freeCash, currency) })}</span>
        <span>{t('goals.insights.savingsAmount', { amount: formatCurrency(savingsContribution, currency), withdrawal: savingsWithdrawal > 0 ? t('goals.insights.withdrawal', { amount: formatCurrency(savingsWithdrawal, currency) }) : '' })}</span>
        <span>{t('goals.insights.variableSpending', { amount: formatCurrency(cycle.variableExpense + cycle.uncategorizedExpense, currency), percent: Math.round(variableUsedPct) })}</span>
      </div>
    </div>
  )
}

function GoalPaceRow({ goal }: { goal: GoalPace }) {
  const currency = useDefaultCurrency()
  const progress = goal.targetAmount > 0 ? clampPct(goal.currentSaved / goal.targetAmount) : 0
  const status = statusCopy(goal.status)

  return (
    <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {goal.priority}
          </span>
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{goal.name}</p>
          <span className={`rounded-sm px-1.5 py-0.5 text-xs ${status.className}`}>{status.label}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-sm bg-teal-500/80" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('goals.insights.progressAmount', { saved: formatCurrency(goal.currentSaved, currency), target: formatCurrency(goal.targetAmount, currency), remaining: formatCurrency(goal.remainingAmount, currency) })}
        </p>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
        <Metric label={t('goals.insights.plannedPerCycle')} value={goal.plannedPerCycle ? formatCurrency(goal.plannedPerCycle, currency) : t('goals.insights.queued')} />
        <Metric label={t('goals.insights.actualPerCycle')} value={formatCurrency(goal.actualPerCycle, currency)} tone={goal.actualPerCycle > 0 ? 'positive' : 'negative'} />
        <Metric label={t('goals.insights.projection')} value={projectionLabel(goal)} />
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'negative' }) {
  const toneClass = tone === 'positive'
    ? 'text-teal-700 dark:text-teal-300'
    : tone === 'negative'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-gray-900 dark:text-gray-100'

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  )
}

function projectionLabel(goal: GoalPace) {
  if (goal.status === 'complete') return t('goals.insights.goalComplete')
  if (goal.status === 'no_history') return t('goals.insights.noHistory')
  if (!goal.projectedCycles) return t('goals.insights.unreachable')
  return t('goals.insights.cyclesUntilComplete', { cycles: goal.projectedCycles })
}

function statusCopy(status: GoalPaceStatus): { label: string; className: string } {
  switch (status) {
    case 'complete':
      return { label: t('goals.insights.complete'), className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' }
    case 'no_history':
      return { label: t('goals.insights.noHistory'), className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' }
    case 'unreachable':
      return { label: t('goals.insights.unreachable'), className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' }
    case 'behind_plan':
      return { label: t('goals.insights.behindPlan'), className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }
    case 'on_track':
      return { label: t('goals.insights.onTrack'), className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' }
  }
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, value * 100))
}
