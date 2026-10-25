import { useState } from 'react'
import type { Goal } from '../../domain/types'
import { CurrencyInput } from '../ui/CurrencyInput'
import { useStore } from '../../store'
import { goalAccountIds } from '../../domain/goalAccounts'
import { translate as t } from '../../i18n'

interface Props {
  initial?: Partial<Goal>
  onSave: (data: Omit<Goal, 'id' | 'priority'>) => void
  onCancel: () => void
}

export function GoalForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial?.targetAmount ?? 0)
  const [currentSaved, setCurrentSaved] = useState(initial?.currentSaved ?? 0)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [fixedAllocation, setFixedAllocation] = useState(initial?.fixedAllocation ?? 0)
  const initialAccountIds = initial ? goalAccountIds(initial as Goal) : []
  const accounts = useStore(s => s.accounts).filter(account => !account.closedAt || initialAccountIds.includes(account.id))
  const [accountIds, setAccountIds] = useState<string[]>(initialAccountIds)
  const [repeatsYearly, setRepeatsYearly] = useState(initial?.repeatsYearly ?? false)
  const [important, setImportant] = useState(initial?.important ?? false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || target <= 0) return
    onSave({
      name: name.trim(),
      targetAmount: target,
      currentSaved: accountIds.length === 0 && currentSaved > 0 ? currentSaved : undefined,
      accountIds: accountIds.length > 0 ? accountIds : undefined,
      deadline: deadline || undefined,
      fixedAllocation: fixedAllocation > 0 ? fixedAllocation : undefined,
      important: important || undefined,
      repeatsYearly: repeatsYearly && deadline ? true : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('goals.form.name')}</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('goals.form.namePlaceholder')}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CurrencyInput label={t('goals.form.targetAmount')} value={target} onChange={setTarget} />
        {accountIds.length === 0 && <CurrencyInput label={t('goals.form.alreadySaved')} value={currentSaved} onChange={setCurrentSaved} />}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('goals.form.linkedAccount')}</label>
        <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-2 dark:border-gray-600">
          {accounts.length === 0 && <span className="text-xs text-gray-400">{t('goals.form.noLinkedAccount')}</span>}
          {accounts.map(account => (
            <label key={account.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={accountIds.includes(account.id)}
                onChange={e => setAccountIds(current => e.target.checked ? [...current, account.id] : current.filter(id => id !== account.id))}
              />
              {account.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">{t('goals.form.linkedAccountHelp')}</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('goals.form.optionalDeadline')}
        </label>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400">{t('goals.form.deadlineHelp')}</p>
        <label className={`mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ${deadline ? '' : 'opacity-50'}`}>
          <input type="checkbox" disabled={!deadline} checked={repeatsYearly && !!deadline} onChange={e => setRepeatsYearly(e.target.checked)} />
          {t('goals.form.repeatsYearly')}
        </label>
        <p className="text-xs text-gray-400">{t('goals.form.repeatsYearlyHelp')}</p>
      </div>

      <div>
        <CurrencyInput
          label={t('goals.form.monthlyFixedAllocation')}
          value={fixedAllocation}
          onChange={setFixedAllocation}
        />
        <p className="text-xs text-gray-400 mt-1">{t('goals.form.monthlyFixedHelp')}</p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} />
          {t('goals.form.important')}
        </label>
        <p className="text-xs text-gray-400 mt-1">{t('goals.form.importantHelp')}</p>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-md transition-colors dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
        >
          {t('common.actions.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.actions.cancel')}
        </button>
      </div>
    </form>
  )
}
