import { useResolvedGoals } from '../../hooks/useResolvedGoals'
import { ArrowRight, CheckCircle2, ListChecks } from 'lucide-react'
import { useMemo } from 'react'
import { formatCurrency, formatYearMonth } from '../../domain/formatting'
import { buildNextBestAction, type NextBestActionConfidence } from '../../domain/nextBestAction'
import { buildPaycheckSplit } from '../../domain/paycheckSplit'
import { buildNextCycleForecast } from '../../domain/nextCycleForecast'
import { buildSecurityBuffers } from '../../domain/securityBuffers'
import type { Schedule } from '../../domain/types'
import { useStore } from '../../store'
import { translate as t } from '../../i18n'

export function NextBestActionPanel({ schedule }: { schedule: Schedule }) {
  const settings = useStore(s => s.settings)
  const goals = useResolvedGoals()
  const loans = useStore(s => s.loans)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)
  const overrides = useStore(s => s.overrides)
  const accounts = useStore(s => s.accounts)
  const snapshots = useStore(s => s.accountSnapshots)

  const { action, split } = useMemo(() => {
    const forecast = buildNextCycleForecast(settings, goals, loans, overrides, mortgagePlan, subscriptions, upcomingExpenses)
    const security = buildSecurityBuffers(settings, accounts, snapshots, schedule)
    return {
      action: buildNextBestAction({ forecast, security, settings, goals }),
      split: buildPaycheckSplit({
        available: forecast.freeCashAfterCreditCard,
        currentMonth: forecast.targetMonth,
        security,
        settings,
        goals,
      }),
    }
  }, [accounts, goals, loans, mortgagePlan, overrides, schedule, settings, snapshots, subscriptions, upcomingExpenses])

  return (
    <div className="rounded-md border border-gray-200 px-4 py-4 dark:border-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ListChecks size={18} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">{action.title}</h3>
              <span className="rounded-sm border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('recommendation.algorithm')}
              </span>
              <ConfidenceBadge confidence={action.confidence} />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('recommendation.cycle', { month: formatYearMonth(schedule.rows[1]?.yearMonth ?? schedule.rows[0]?.yearMonth ?? settings.startMonth) })}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('recommendation.amount')}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-950 dark:text-gray-50">{formatCurrency(action.amount, settings.defaultCurrency ?? 'PLN')}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ActionList title={t('recommendation.why')} items={action.reasons} icon="arrow" />
        <ActionList title={t('recommendation.effect')} items={action.effects} icon="check" />
      </div>

      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('recommendation.split.title')}</p>
        <div className="mt-2 space-y-2">
          {split.map(line => (
            <div key={`${line.kind}:${line.targetId ?? ''}`} className="flex items-start justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-gray-900 dark:text-gray-100">
                  {line.kind === 'ikze'
                    ? t('recommendation.split.ikze')
                    : line.kind === 'unallocated'
                      ? t('recommendation.split.unallocated')
                      : line.targetName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(`recommendation.split.reason.${line.reason}`)}</p>
              </div>
              <span className="font-semibold tabular-nums text-gray-950 dark:text-gray-50">
                {formatCurrency(line.amount, settings.defaultCurrency ?? 'PLN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: NextBestActionConfidence }) {
  const label = confidence === 'high' ? t('recommendation.confidenceHigh') : confidence === 'medium' ? t('recommendation.confidenceMedium') : t('recommendation.confidenceLow')
  const className = confidence === 'high'
    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/80 dark:text-emerald-300'
    : confidence === 'medium'
      ? 'border-amber-200 text-amber-700 dark:border-amber-900/80 dark:text-amber-300'
      : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'

  return (
    <span className={`rounded-sm border px-1.5 py-0.5 text-xs ${className}`}>
      {label}
    </span>
  )
}

function ActionList({ title, items, icon }: { title: string; items: string[]; icon: 'arrow' | 'check' }) {
  const Icon = icon === 'arrow' ? ArrowRight : CheckCircle2

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map(item => (
          <div key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Icon size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
