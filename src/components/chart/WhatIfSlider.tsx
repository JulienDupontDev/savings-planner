import { useStore } from '../../store'
import { formatCurrency } from '../../domain/formatting'
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency'
import { translate as t } from '../../i18n'

export function WhatIfSlider() {
  const currency = useDefaultCurrency()
  const whatIfDelta = useStore(s => s.whatIfDelta)
  const setWhatIfDelta = useStore(s => s.setWhatIfDelta)
  const loanOverpayment = useStore(s => s.loanOverpayment)
  const setLoanOverpayment = useStore(s => s.setLoanOverpayment)
  const loans = useStore(s => s.loans)

  return (
    <div className="space-y-4">
      {/* Income what-if */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{t('scenarios.incomeChangePrompt')}</span>
          <span className={`font-bold tabular-nums ${
            whatIfDelta > 0 ? 'text-green-600 dark:text-green-400' :
            whatIfDelta < 0 ? 'text-red-600 dark:text-red-400' :
            'text-gray-400'
          }`}>
            {whatIfDelta === 0 ? t('scenarios.unchanged') : (whatIfDelta > 0 ? '+' : '') + formatCurrency(whatIfDelta, currency) + t('scenarios.monthSuffix')}
          </span>
        </div>
        <input
          type="range"
          min={-5000}
          max={10000}
          step={100}
          value={whatIfDelta}
          onChange={e => setWhatIfDelta(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>−{formatCurrency(5000, currency)}</span>
          <button onClick={() => setWhatIfDelta(0)} className="text-blue-500 hover:text-blue-700 underline">{t('common.actions.reset')}</button>
          <span>+{formatCurrency(10000, currency)}</span>
        </div>
      </div>

      {/* Loan overpayment what-if — only when loans exist */}
      {loans.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('scenarios.loanOverpaymentPrompt')}</span>
            <span className={`font-bold tabular-nums ${loanOverpayment > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>
              {loanOverpayment === 0 ? t('scenarios.noOverpayment') : `+${formatCurrency(loanOverpayment, currency)}${t('scenarios.monthSuffix')}`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={100}
            value={loanOverpayment}
            onChange={e => setLoanOverpayment(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatCurrency(0, currency)}</span>
            <button onClick={() => setLoanOverpayment(0)} className="text-orange-500 hover:text-orange-700 underline">{t('common.actions.reset')}</button>
            <span>+{formatCurrency(10000, currency)}</span>
          </div>
        </div>
      )}

      {(whatIfDelta !== 0 || loanOverpayment > 0) && (
        <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
          {t('scenarios.unchangedDataNotice')}
        </p>
      )}
    </div>
  )
}
