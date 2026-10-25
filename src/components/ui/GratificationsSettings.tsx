import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../domain/formatting'
import { gratificationsYearlyTotal } from '../../domain/gratifications'
import type { Gratification } from '../../domain/types'
import { translate as t } from '../../i18n'
import { useStore } from '../../store'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const inputClass =
  'rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'

const monthLabel = (month: number) =>
  new Date(2000, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short' })

export function GratificationsSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const currency = settings.defaultCurrency ?? 'PLN'
  const items = settings.gratifications ?? []
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState<number[]>([])

  const save = (next: Gratification[]) => updateSettings({ gratifications: next })
  const toggleMonth = (month: number) =>
    setMonths(prev => (prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month].sort((a, b) => a - b)))

  const add = () => {
    const yearlyAmount = parseFloat(amount)
    if (!name.trim() || isNaN(yearlyAmount) || yearlyAmount <= 0 || months.length === 0) return
    save([...items, { id: crypto.randomUUID(), name: name.trim(), yearlyAmount, payoutMonths: months }])
    setName('')
    setAmount('')
    setMonths([])
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.gratifications.title')}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.gratifications.help')}</p>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
            >
              <span className="text-gray-900 dark:text-gray-100">
                {item.name}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.gratifications.summary', {
                    amount: formatCurrency(item.yearlyAmount, currency),
                    months: item.payoutMonths.map(monthLabel).join(', '),
                  })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t('settings.gratifications.remove')}
                onClick={() => save(items.filter(g => g.id !== item.id))}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('settings.gratifications.name')}
          className={`${inputClass} min-w-40 flex-1`}
        />
        <input
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={t('settings.gratifications.amount', { currency })}
          className={`${inputClass} w-40 text-right tabular-nums`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('settings.gratifications.payoutMonths')}</span>
        {MONTHS.map(month => (
          <button
            key={month}
            type="button"
            aria-pressed={months.includes(month)}
            onClick={() => toggleMonth(month)}
            className={`rounded-md border px-2 py-1 text-xs ${
              months.includes(month)
                ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            {monthLabel(month)}
          </button>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={!name.trim() || !(parseFloat(amount) > 0) || months.length === 0}
          className="ml-auto flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Plus size={14} />
          {t('settings.gratifications.add')}
        </button>
      </div>

      {items.length > 0 && (
        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.includeGratificationsInPlan === true}
            onChange={e => updateSettings({ includeGratificationsInPlan: e.target.checked })}
          />
          <span>
            {t('settings.gratifications.preview')}
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {t('settings.gratifications.previewHelp', {
                total: formatCurrency(gratificationsYearlyTotal(items), currency),
              })}
            </span>
          </span>
        </label>
      )}
    </div>
  )
}
