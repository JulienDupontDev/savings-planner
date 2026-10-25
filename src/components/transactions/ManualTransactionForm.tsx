import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { IS_API_MODE } from '../../config'
import { useStore } from '../../store'
import { translate as t } from '../../i18n'

type TransactionDirection = 'expense' | 'income'

export function ManualTransactionForm() {
  const accounts = useStore(s => s.accounts)
  const categories = useStore(s => s.categories)
  const createTransaction = useStore(s => s.createTransaction)
  const [accountId, setAccountId] = useState('')
  const [bookedAt, setBookedAt] = useState(todayLocal())
  const [direction, setDirection] = useState<TransactionDirection>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>()
  const selectedAccountId = accounts.some(account => account.id === accountId)
    ? accountId
    : accounts[0]?.id ?? ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!selectedAccountId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    setIsSaving(true)
    setSuccess(false)
    setError(undefined)
    try {
      await createTransaction({
        accountId: selectedAccountId,
        bookedAt,
        amount: direction === 'income' ? parsedAmount : -parsedAmount,
        description: description.trim(),
        counterparty: counterparty.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      })
      setAmount('')
      setDescription('')
      setCounterparty('')
      setCategoryId('')
      setSuccess(true)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('store.syncErrorFallback')
      setError(t('manualTransaction.createError', { message }))
    } finally {
      setIsSaving(false)
    }
  }

  if (!IS_API_MODE) {
    return (
      <p className="rounded-md border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {t('manualTransaction.apiOnly')}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {accounts.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t('manualTransaction.addAccountFirst')}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.account')}</span>
              <select
                value={selectedAccountId}
                onChange={event => setAccountId(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              >
                {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.date')}</span>
              <input
                type="date"
                required
                value={bookedAt}
                onChange={event => setBookedAt(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.direction')}</span>
              <select
                value={direction}
                onChange={event => setDirection(event.target.value as TransactionDirection)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="expense">{t('manualTransaction.expense')}</option>
                <option value="income">{t('manualTransaction.income')}</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.amount')}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {accounts.find(account => account.id === selectedAccountId)?.currency}
                </span>
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.description')}</span>
              <input
                required
                maxLength={200}
                value={description}
                onChange={event => setDescription(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.counterparty')}</span>
              <input
                maxLength={200}
                value={counterparty}
                onChange={event => setCounterparty(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{t('manualTransaction.category')}</span>
              <select
                value={categoryId}
                onChange={event => setCategoryId(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="">{t('manualTransaction.autoCategory')}</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('manualTransaction.salaryHint')}</p>
          <button
            type="submit"
            disabled={!selectedAccountId || isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-gray-950 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
          >
            <Plus size={16} />
            {isSaving ? t('manualTransaction.saving') : t('manualTransaction.add')}
          </button>
        </>
      )}
      {success && <p role="status" className="text-sm text-teal-700 dark:text-teal-300">{t('manualTransaction.created')}</p>}
      {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  )
}

function todayLocal() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
