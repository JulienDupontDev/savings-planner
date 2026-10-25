import { useState } from 'react'
import { CreditCard as CreditCardIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { creditCardStatus, type CreditCardLevel } from '../../domain/creditCard'
import { formatCurrency } from '../../domain/formatting'
import type { CreditCard } from '../../domain/types'
import { useStore } from '../../store'
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency'
import { CurrencyInput } from '../ui/CurrencyInput'
import { translate as t } from '../../i18n'

const DEFAULT_CARD: CreditCard = { name: 'Carte de crédit', limit: 10000, availableLimit: 10000 }

const LEVEL_BAR: Record<CreditCardLevel, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  high: 'bg-red-500',
}

const LEVEL_BADGE: Record<CreditCardLevel, string> = {
  ok: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export function CreditCardSection() {
  const currency = useDefaultCurrency()
  const card = useStore(s => s.settings.creditCard)
  const updateSettings = useStore(s => s.updateSettings)
  const [editing, setEditing] = useState(false)

  if (!card) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('creditCard.emptyDescription')}
        </p>
        <button
          onClick={() => { updateSettings({ creditCard: DEFAULT_CARD }); setEditing(true) }}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <Plus size={14} /> {t('creditCard.add')}
        </button>
      </div>
    )
  }

  const status = creditCardStatus(card)
  const setAvailable = (availableLimit: number) => updateSettings({ creditCard: { ...card, availableLimit } })

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCardIcon size={15} className="text-gray-400 shrink-0" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{card.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${LEVEL_BADGE[status.level]}`}>
              {t('creditCard.utilization', { percent: status.utilizationPct })}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(v => !v)}
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
            title={t('creditCard.edit')}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { updateSettings({ creditCard: undefined }); setEditing(false) }}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title={t('creditCard.delete')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Gauge wykorzystania */}
      <div>
        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${LEVEL_BAR[status.level]}`}
            style={{ width: `${Math.min(100, status.utilizationPct)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          <span>{t('creditCard.used')} <strong className="text-gray-900 dark:text-gray-100">{formatCurrency(status.used, currency)}</strong></span>
          <span>{t('creditCard.limit', { amount: formatCurrency(status.limit, currency) })}</span>
        </div>
      </div>

      {/* Okienko: pozostały limit na dany moment */}
      <CurrencyInput
        label={t('common.labels.outstandingLimit')}
        value={card.availableLimit}
        onChange={setAvailable}
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('creditCard.nextPayment', { amount: formatCurrency(status.used, currency), day: card.repaymentDayOfMonth ? t('creditCard.approxPaymentDay', { day: card.repaymentDayOfMonth }) : '' })}
      </p>

      {editing && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('creditCard.name')}
            </label>
            <input
              type="text"
              value={card.name}
              onChange={e => updateSettings({ creditCard: { ...card, name: e.target.value } })}
              placeholder={t('creditCard.namePlaceholder')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <CurrencyInput
              label={t('creditCard.grantedLimit')}
              value={card.limit}
              onChange={limit => updateSettings({ creditCard: { ...card, limit } })}
            />
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('creditCard.repaymentDay')}
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={card.repaymentDayOfMonth ?? ''}
                onChange={e => {
                  const raw = Number(e.target.value)
                  const day = e.target.value === '' || Number.isNaN(raw)
                    ? undefined
                    : Math.min(28, Math.max(1, raw))
                  updateSettings({ creditCard: { ...card, repaymentDayOfMonth: day } })
                }}
                placeholder={t('creditCard.dayPlaceholder')}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
            >
              {t('creditCard.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
