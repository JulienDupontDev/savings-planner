import { useMemo, useState } from 'react'
import { Home, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import type { MortgageOneTimeOverpayment, MortgageOverpaymentMode, MortgagePlan } from '../../domain/types'
import { buildMortgageSchedule } from '../../domain/mortgage'
import { formatCurrency, formatYearMonth } from '../../domain/formatting'
import { createId } from '../../domain/id'
import { CurrencyInput } from '../ui/CurrencyInput'
import { translate as t } from '../../i18n'

const emptyPlan = (): Omit<MortgagePlan, 'id'> => ({
  name: '',
  principal: 0,
  annualInterestRate: 0,
  originalTermMonths: 0,
  termMonths: 0,
  monthlyOverpayment: 0,
  overpaymentMode: 'shortenTerm',
  oneTimeOverpayments: [],
  refinanceAnnualInterestRate: 0,
  refinanceCost: 0,
})

function normalizePlan(plan: MortgagePlan | undefined): Omit<MortgagePlan, 'id'> & { id?: string } {
  return plan
    ? {
        ...plan,
        originalTermMonths: plan.originalTermMonths ?? plan.termMonths,
        refinanceAnnualInterestRate: plan.refinanceAnnualInterestRate ?? 0,
        refinanceCost: plan.refinanceCost ?? 0,
      }
    : emptyPlan()
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full pr-10 pl-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right tabular-nums"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

export function MortgageSection() {
  const settings = useStore(s => s.settings)
  const currency = settings.defaultCurrency ?? 'PLN'
  const mortgagePlan = useStore(s => s.mortgagePlan)
  const saveMortgagePlan = useStore(s => s.saveMortgagePlan)
  const removeMortgagePlan = useStore(s => s.removeMortgagePlan)
  const [draftState, setDraftState] = useState(() => ({
    sourcePlan: mortgagePlan,
    draft: normalizePlan(mortgagePlan),
  }))
  if (draftState.sourcePlan !== mortgagePlan) {
    setDraftState({ sourcePlan: mortgagePlan, draft: normalizePlan(mortgagePlan) })
  }
  const draft = draftState.draft
  const [visibleEntryCount, setVisibleEntryCount] = useState(36)

  const { entries, summary } = useMemo(
    () => buildMortgageSchedule(mortgagePlan, settings.startMonth, settings.horizonMonths, true),
    [mortgagePlan, settings.startMonth, settings.horizonMonths],
  )

  const updateDraft = (patch: Partial<typeof draft>) =>
    setDraftState(current => ({ ...current, draft: { ...current.draft, ...patch } }))
  const visibleEntries = entries.slice(0, visibleEntryCount)
  const hasMoreEntries = visibleEntryCount < entries.length
  const save = () => {
    if (draft.principal <= 0 || draft.termMonths <= 0 || draft.originalTermMonths <= 0 || draft.annualInterestRate < 0) return
    saveMortgagePlan({
      ...draft,
      originalTermMonths: Math.max(draft.originalTermMonths, draft.termMonths),
    })
  }

  const addOneTimeOverpayment = () => {
    updateDraft({
      oneTimeOverpayments: [
        ...draft.oneTimeOverpayments,
        { id: createId(), yearMonth: settings.startMonth, amount: 0 },
      ],
    })
  }

  const updateOneTimeOverpayment = (id: string, patch: Partial<MortgageOneTimeOverpayment>) => {
    updateDraft({
      oneTimeOverpayments: draft.oneTimeOverpayments.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })
  }

  const removeOneTimeOverpayment = (id: string) => {
    updateDraft({
      oneTimeOverpayments: draft.oneTimeOverpayments.filter(item => item.id !== id),
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('common.labels.name')}
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={e => updateDraft({ name: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <CurrencyInput label={t('mortgage.fields.principal')} value={draft.principal} onChange={v => updateDraft({ principal: v })} />
            <NumberInput label={t('mortgage.fields.interestRate')} value={draft.annualInterestRate} min={0} max={30} step={0.01} suffix="%" onChange={v => updateDraft({ annualInterestRate: v })} />
            <NumberInput label={t('mortgage.fields.fullTerm')} value={draft.originalTermMonths} min={1} max={480} suffix="mois" onChange={v => updateDraft({ originalTermMonths: v })} />
            <NumberInput label={t('mortgage.fields.remainingTerm')} value={draft.termMonths} min={1} max={480} suffix="mois" onChange={v => updateDraft({ termMonths: v })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <NumberInput
              label={t('mortgage.fields.refinanceRate')}
              value={draft.refinanceAnnualInterestRate ?? 0}
              min={0}
              max={30}
              step={0.01}
              suffix="%"
              onChange={v => updateDraft({ refinanceAnnualInterestRate: v })}
            />
            <CurrencyInput
              label={t('mortgage.fields.refinanceCost')}
              value={draft.refinanceCost ?? 0}
              onChange={v => updateDraft({ refinanceCost: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
            <CurrencyInput
              label={t('mortgage.fields.monthlyOverpayment')}
              value={draft.monthlyOverpayment}
              onChange={v => updateDraft({ monthlyOverpayment: v })}
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('mortgage.overpayment.mode')}
              </span>
              <div className="grid grid-cols-2 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                {[
                  ['shortenTerm', t('mortgage.overpayment.shortenTerm')],
                  ['reducePayment', t('mortgage.overpayment.reducePayment')],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateDraft({ overpaymentMode: value as MortgageOverpaymentMode })}
                    className={`px-3 py-2 text-sm ${
                      draft.overpaymentMode === value
                        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('mortgage.overpayment.oneTimeTitle')}
              </p>
              <button
                type="button"
                onClick={addOneTimeOverpayment}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus size={12} /> {t('common.actions.add')}
              </button>
            </div>
            {draft.oneTimeOverpayments.length === 0 ? (
              <p className="text-xs text-gray-400">{t('mortgage.overpayment.empty')}</p>
            ) : (
              <div className="space-y-2">
                {draft.oneTimeOverpayments.map(item => (
                  <div key={item.id} className="grid grid-cols-[9rem_1fr_2rem] gap-2 items-end">
                    <input
                      type="month"
                      value={item.yearMonth}
                      onChange={e => updateOneTimeOverpayment(item.id, { yearMonth: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CurrencyInput value={item.amount} onChange={v => updateOneTimeOverpayment(item.id, { amount: v })} />
                    <button
                      type="button"
                      onClick={() => removeOneTimeOverpayment(item.id)}
                      className="h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label={t('mortgage.overpayment.remove')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {mortgagePlan && (
              <button
                type="button"
                onClick={removeMortgagePlan}
                className="px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t('mortgage.actions.remove')}
              </button>
            )}
            <button
              type="button"
              onClick={save}
              className="px-4 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
              disabled={draft.principal <= 0 || draft.termMonths <= 0 || draft.originalTermMonths <= 0 || !draft.name.trim()}
            >
              {t('mortgage.actions.save')}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <Home size={16} />
            <p className="text-sm font-semibold">{t('mortgage.summary.title')}</p>
          </div>
          {summary ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.basePayment')}</span><span className="font-semibold tabular-nums">{formatCurrency(summary.baseMonthlyPayment, currency)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.elapsedMonths')}</span><span className="font-semibold tabular-nums">{summary.elapsedMonths} mois</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.loanStart')}</span><span className="font-semibold tabular-nums">{summary.estimatedStartMonth}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.paymentAfterOverpayments')}</span><span className="font-semibold tabular-nums">{formatCurrency(summary.currentMonthlyPayment, currency)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.term')}</span><span className="font-semibold tabular-nums">{summary.remainingMonths}/{summary.originalTermMonths} mois</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.payoff')}</span><span className="font-semibold tabular-nums">{summary.payoffMonth ?? t('common.time.beyondHorizon')}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.termSaved')}</span><span className="font-semibold tabular-nums">{summary.monthsSaved} mois</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.interestSaved')}</span><span className="font-semibold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(summary.interestSaved, currency)}</span></div>
              {summary.refinance && (
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.refinancePayment')}</span><span className="font-semibold tabular-nums">{formatCurrency(summary.refinance.monthlyPayment, currency)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.monthlyDifference')}</span><span className={`font-semibold tabular-nums ${summary.refinance.monthlyPaymentDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(summary.refinance.monthlyPaymentDelta, currency)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">{t('mortgage.summary.netSavings')}</span><span className={`font-semibold tabular-nums ${summary.refinance.netSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(summary.refinance.netSavings, currency)}</span></div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('mortgage.summary.saveToShowSchedule')}</p>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-xs text-gray-400 mb-2">
            {t('mortgage.schedule.fullHorizon')}
          </p>
          <table className="w-max min-w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('common.labels.month')}</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('common.labels.payment')}</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('mortgage.schedule.interest')}</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('mortgage.schedule.principal')}</th>
                <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('mortgage.schedule.overpayment')}</th>
                <th className="text-right py-2 pl-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('mortgage.schedule.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map(entry => (
                <tr key={entry.yearMonth} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatYearMonth(entry.yearMonth)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">{formatCurrency(entry.payment, currency)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-orange-600 dark:text-orange-400">{formatCurrency(entry.interest, currency)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-blue-600 dark:text-blue-400">{formatCurrency(entry.principalPaid, currency)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-green-600 dark:text-green-400">{formatCurrency(entry.overpayment, currency)}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(entry.balanceAfter, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length > 36 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('mortgage.schedule.visibleMonths', { visible: visibleEntries.length, total: entries.length })}
              </p>
              <div className="flex gap-2">
                {hasMoreEntries && (
                  <button
                    type="button"
                    onClick={() => setVisibleEntryCount(count => Math.min(count + 36, entries.length))}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t('mortgage.schedule.showMore', { count: 36 })}
                  </button>
                )}
                {visibleEntries.length > 36 && (
                  <button
                    type="button"
                    onClick={() => setVisibleEntryCount(36)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t('mortgage.schedule.collapse', { count: 36 })}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
