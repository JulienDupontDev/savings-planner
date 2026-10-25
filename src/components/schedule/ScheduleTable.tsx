import { useSecurityState } from '../../hooks/useSecurityState'
import { useResolvedGoals } from '../../hooks/useResolvedGoals'
import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { buildSchedule } from '../../domain/allocation'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '../../domain/currency'
import { formatCurrency } from '../../domain/formatting'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { translate as t } from '../../i18n'

function InlineNumberEdit({
  value,
  onCommit,
  className = '',
}: {
  value: number
  onCommit: (v: number) => void
  className?: string
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      defaultValue={formatCurrencyInput(value)}
      key={value}
      onFocus={e => e.target.select()}
      onChange={e => {
        e.target.value = sanitizeCurrencyInput(e.target.value)
      }}
      onBlur={e => {
        const v = parseCurrencyInput(e.target.value) ?? value
        onCommit(v)
        e.target.value = formatCurrencyInput(v)
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className={`w-20 text-right px-1 py-0.5 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
    />
  )
}

export function ScheduleTable() {
  const settings = useStore(s => s.settings)
  const currency = settings.defaultCurrency ?? 'PLN'
  const goals = useResolvedGoals()
  const securityState = useSecurityState()
  const loans = useStore(s => s.loans)
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const subscriptions = useStore(s => s.subscriptions)
  const upcomingExpenses = useStore(s => s.upcomingExpenses)
  const overrides = useStore(s => s.overrides)
  const setOverride = useStore(s => s.setOverride)
  const setGoalAllocationOverride = useStore(s => s.setGoalAllocationOverride)
  const clearOverride = useStore(s => s.clearOverride)
  const [visibleRowsCount, setVisibleRowsCount] = useState(24)

  const schedule = useMemo(
    () => buildSchedule(settings, goals, loans, overrides, 0, 0, mortgagePlan, subscriptions, upcomingExpenses, securityState),
    [settings, goals, loans, overrides, mortgagePlan, subscriptions, upcomingExpenses, securityState],
  )
  const sortedGoals = [...goals].sort((a, b) => a.priority - b.priority)
  const visibleRows = schedule.rows.slice(0, visibleRowsCount)
  const hasMoreRows = visibleRowsCount < schedule.rows.length

  if (goals.length === 0 && !mortgagePlan) {
    return <p className="text-sm text-gray-400 text-center py-4">{t('schedule.empty')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-max min-w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-900 z-10">
              {t('common.labels.month')}
            </th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('schedule.income')}</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('schedule.expenses')}</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('schedule.freeCash')}</th>

            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('schedule.security')}</th>

            {/* Per-goal: two columns each */}
            {sortedGoals.map(g => (
              <th
                key={g.id}
                colSpan={2}
                className="text-center py-2 px-2 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap border-l border-gray-100 dark:border-gray-800"
              >
                <span className="block max-w-32 truncate" title={g.name}>{g.name}</span>
                <span className="flex gap-4 text-[10px] font-normal text-gray-400 justify-center mt-0.5">
                  <span>{t('schedule.allocation')}</span>
                  <span>{t('schedule.balance')}</span>
                </span>
              </th>
            ))}

            <th className="py-2 pl-2 w-6" />
          </tr>
        </thead>
        <tbody>
          {visibleRows.map(row => {
            const override = overrides[row.yearMonth]
            const hasOverride = !!(override && (
              override.income !== undefined ||
              override.expenses !== undefined ||
              (override.perGoalAllocation && Object.keys(override.perGoalAllocation).length > 0)
            ))

            return (
              <tr
                key={row.yearMonth}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  row.isDeficit ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                }`}
              >
                {/* Month label — sticky */}
                <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-900">
                  {row.label}
                  {hasOverride && (
                    <span className="ml-1 text-orange-400" title={t('schedule.customValues')}>*</span>
                  )}
                </td>

                {/* Income */}
                <td className="py-1.5 px-2 text-right">
                  <InlineNumberEdit
                    value={row.income}
                    onCommit={v => setOverride(row.yearMonth, { income: v })}
                  />
                </td>

                {/* Expenses */}
                <td className="py-1.5 px-2 text-right">
                  <InlineNumberEdit
                    value={row.expenses}
                    onCommit={v => setOverride(row.yearMonth, { expenses: v })}
                  />
                  {(row.subscriptionsTotal > 0 || row.oneTimeExpensesTotal > 0 || row.ikzeContributionTotal > 0) && (
                    <div className="mt-1 text-[10px] leading-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      <span title={t('schedule.livingExpenses')}>{t('schedule.livingAmount', { amount: formatCurrency(row.expenses, currency) })}</span>
                      {row.subscriptionsTotal > 0 && (
                        <span className="block text-sky-600 dark:text-sky-400">
                          {t('schedule.subscriptionAmount', { amount: formatCurrency(row.subscriptionsTotal, currency) })}
                        </span>
                      )}
                      {row.oneTimeExpensesTotal > 0 && (
                        <span className="block text-purple-600 dark:text-purple-400">
                          {t('schedule.oneTimeAmount', { amount: formatCurrency(row.oneTimeExpensesTotal, currency) })}
                        </span>
                      )}
                      {row.ikzeContributionTotal > 0 && (
                        <span className="block text-indigo-600 dark:text-indigo-400">
                          {t('schedule.ikzeAmount', { amount: formatCurrency(row.ikzeContributionTotal, currency) })}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Free cash */}
                <td className={`py-1.5 px-2 text-right tabular-nums font-semibold whitespace-nowrap ${
                  row.isDeficit
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>
                  {row.isDeficit && <AlertTriangle size={10} className="inline mr-0.5" />}
                  {formatCurrency(row.freeCash, currency)}
                </td>

                <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-teal-700 dark:text-teal-400">
                  {formatCurrency(row.securityAllocated ?? 0, currency)}
                </td>

                {/* Per-goal: allocation (editable) + saldo */}
                {sortedGoals.map(goal => {
                  const alloc = row.goalAllocations.find(a => a.goalId === goal.id)
                  const isOverridden = !!(override?.perGoalAllocation?.[goal.id] !== undefined)

                  return [
                    // Allocation cell — editable
                    <td
                      key={`alloc-${goal.id}`}
                      className="py-1.5 px-2 text-right border-l border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {isOverridden && (
                          <button
                            onClick={() => setGoalAllocationOverride(row.yearMonth, goal.id, null)}
                            className="text-gray-300 dark:text-gray-600 hover:text-orange-400 transition-colors"
                            title={t('schedule.clearAllocation')}
                          >
                            <RefreshCw size={10} />
                          </button>
                        )}
                        <InlineNumberEdit
                          value={alloc?.allocated ?? 0}
                          onCommit={v => setGoalAllocationOverride(row.yearMonth, goal.id, v)}
                          className={isOverridden ? 'border-orange-300 dark:border-orange-700' : ''}
                        />
                      </div>
                    </td>,

                    // Saldo cell — read-only
                    <td
                      key={`saldo-${goal.id}`}
                      className={`py-1.5 px-3 text-right tabular-nums whitespace-nowrap ${
                        alloc?.isComplete
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {alloc !== undefined ? formatCurrency(alloc.balanceAfter, currency) : '—'}
                    </td>,
                  ]
                })}

                {/* Reset row override */}
                <td className="py-1.5 pl-2">
                  {hasOverride && (
                    <button
                      onClick={() => clearOverride(row.yearMonth)}
                      className="text-gray-300 dark:text-gray-600 hover:text-orange-400 transition-colors"
                      title={t('schedule.resetMonth')}
                    >
                      <RefreshCw size={12} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {schedule.rows.length > 24 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('schedule.visibleRows', { visible: visibleRows.length, total: schedule.rows.length })}
          </p>
          <div className="flex gap-2">
            {hasMoreRows && (
              <button
                type="button"
                onClick={() => setVisibleRowsCount(count => Math.min(count + 24, schedule.rows.length))}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t('schedule.showMore')}
              </button>
            )}
            {visibleRows.length > 24 && (
              <button
                type="button"
                onClick={() => setVisibleRowsCount(24)}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t('schedule.collapse')}
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 space-y-0.5">
        <span className="block">
          {t('schedule.overrideHelp')}
        </span>
        <span className="block text-gray-300 dark:text-gray-600">
          {t('schedule.allocationHelp')}
        </span>
      </p>
    </div>
  )
}
