import { useState } from 'react'
import type { BillingPeriod, Subscription } from '../../domain/types'
import { effectiveMonthlyAmount } from '../../domain/subscription'
import { formatCurrency } from '../../domain/formatting'
import { CurrencyInput } from '../ui/CurrencyInput'
import { translate as t } from '../../i18n'
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency'

interface Props {
  initial?: Subscription
  onSave: (data: Omit<Subscription, 'id'>) => void
  onCancel: () => void
}

export function SubscriptionForm({ initial, onSave, onCancel }: Props) {
  const currency = useDefaultCurrency()
  const [name, setName] = useState(initial?.name ?? '')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initial?.billingPeriod ?? 'monthly')
  // legacy: brak billingAmount => kwota = dotychczasowy monthlyAmount (traktowany jako miesięczny)
  const [billingAmount, setBillingAmount] = useState(initial?.billingAmount ?? initial?.monthlyAmount ?? 0)
  const [shared, setShared] = useState(initial?.shared ?? false)
  const [shareCount, setShareCount] = useState(initial?.shareCount ?? 2)
  const [category, setCategory] = useState(initial?.category ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const [nextCharge, setNextCharge] = useState(initial?.nextCharge ?? '')

  const effectiveShareCount = shared ? Math.max(1, shareCount) : 1
  const monthlyAmount = effectiveMonthlyAmount(billingAmount, billingPeriod, effectiveShareCount)
  const valid = name.trim() && billingAmount > 0

  const handleSave = () => {
    if (!valid) return
    onSave({
      name: name.trim(),
      monthlyAmount,
      active,
      category: category.trim() || undefined,
      nextCharge: nextCharge || undefined,
      billingPeriod,
      billingAmount,
      shared: shared || undefined,
      shareCount: shared ? effectiveShareCount : undefined,
    })
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('subscriptions.form.name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('subscriptions.form.namePlaceholder')}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('subscriptions.form.billingPeriod')}
        </span>
        <div className="mt-1 inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {(['monthly', 'yearly'] as const).map(period => (
            <button
              key={period}
              type="button"
              onClick={() => setBillingPeriod(period)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                billingPeriod === period
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {period === 'monthly' ? t('subscriptions.form.monthly') : t('subscriptions.form.yearly')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CurrencyInput
          label={billingPeriod === 'yearly' ? t('subscriptions.form.amountPerYear') : t('subscriptions.form.amountPerMonth')}
          value={billingAmount}
          onChange={setBillingAmount}
        />
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('subscriptions.form.category')}
          </label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder={t('subscriptions.form.optional')}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={shared}
            onChange={e => setShared(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t('subscriptions.form.shared')}
        </label>
        {shared && (
          <div className="flex items-center gap-2 pl-6">
            <label className="text-xs text-gray-500 dark:text-gray-400">{t('subscriptions.form.peopleCount')}</label>
            <input
              type="number"
              min={1}
              value={shareCount}
              onChange={e => setShareCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('subscriptions.form.nextPayment')}
          </label>
          <input
            type="date"
            value={nextCharge}
            onChange={e => setNextCharge(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t('subscriptions.form.active')}
        </label>
      </div>

      {billingAmount > 0 && (billingPeriod === 'yearly' || shared) && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('subscriptions.form.effectiveCashflow')}{' '}
          <span className="font-medium text-sky-600 dark:text-sky-400 tabular-nums">{formatCurrency(monthlyAmount, currency)}{t('subscriptions.form.monthSuffix')}</span>
          {billingPeriod === 'yearly' && ` ${t('subscriptions.form.yearBreakdown', { amount: formatCurrency(billingAmount, currency) })}`}
          {shared && ` ${t('subscriptions.form.sharedBreakdown', { count: effectiveShareCount })}`}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {t('common.actions.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!valid}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
        >
          {initial ? t('common.actions.save') : t('subscriptions.list.add')}
        </button>
      </div>
    </div>
  )
}
