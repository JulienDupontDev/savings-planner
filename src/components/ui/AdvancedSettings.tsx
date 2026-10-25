import { useRef, useState } from 'react'
import { Database, Download, FileUp, RotateCcw, Upload } from 'lucide-react'
import { IS_API_MODE } from '../../config'
import { SUPPORTED_CURRENCIES } from '../../domain/currency'
import { currentYearMonth } from '../../domain/formatting'
import { useStore } from '../../store'
import { ImportCsvDialog } from '../accounts/ImportCsvDialog'
import { GratificationsSettings } from './GratificationsSettings'
import { translate as t } from '../../i18n'

export function AdvancedSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const exportData = useStore(s => s.exportData)
  const importData = useStore(s => s.importData)
  const resetAll = useStore(s => s.resetAll)
  const bootstrapBackendFromLocal = useStore(s => s.bootstrapBackendFromLocal)
  const isHydrating = useStore(s => s.isHydrating)
  const syncError = useStore(s => s.syncError)
  const lastSyncedAt = useStore(s => s.lastSyncedAt)
  const clearSyncError = useStore(s => s.clearSyncError)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importCsvOpen, setImportCsvOpen] = useState(false)
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null)

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `savings-planner-${currentYearMonth()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        importData(ev.target?.result as string)
      } catch {
        alert(t('settings.invalidImport'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (confirm(t('settings.confirmReset'))) {
      resetAll()
    }
  }

  const handleBootstrap = async () => {
    if (!confirm(t('settings.confirmBootstrap'))) {
      return
    }

    const result = await bootstrapBackendFromLocal()
    setBootstrapMessage(result.message)
  }

  return (
    <div className="space-y-5">
      {IS_API_MODE && (
        <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.status.apiMode')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings.backendAuthority')}
              </p>
              {lastSyncedAt && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.lastSync', { date: new Date(lastSyncedAt).toLocaleString('fr-FR') })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleBootstrap}
                disabled={isHydrating}
                className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white dark:disabled:bg-gray-800"
              >
                <Database size={15} />
                {t('settings.sendToDatabase')}
              </button>
              <button
                type="button"
                onClick={() => setImportCsvOpen(true)}
                disabled={isHydrating}
                className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FileUp size={15} />
                {t('accounts.section.importCsv')}
              </button>
            </div>
          </div>

          {bootstrapMessage && <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{bootstrapMessage}</p>}
          {syncError && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm text-red-700 dark:text-red-300">{syncError}</p>
              <button
                type="button"
                onClick={clearSyncError}
                className="text-xs font-medium text-red-700 hover:underline dark:text-red-300"
              >
                {t('settings.hideSyncError')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.defaultCurrency')}</label>
          <select
            value={settings.defaultCurrency ?? 'PLN'}
            onChange={e => updateSettings({ defaultCurrency: e.target.value })}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            {SUPPORTED_CURRENCIES.map(item => (
              <option key={item.code} value={item.code}>{item.code}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.defaultCurrencyHelp')}</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.startMonth')}</label>
          <input
            type="month"
            value={settings.startMonth}
            onChange={e => updateSettings({ startMonth: e.target.value })}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.planHorizon')}</label>
          <input
            type="number"
            min={6}
            max={120}
            value={settings.horizonMonths}
            onChange={e => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value >= 6 && value <= 120) updateSettings({ horizonMonths: value })
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.safetyCushionMonths')}</label>
          <input
            type="number"
            min={1}
            max={24}
            value={settings.safetyCushionMonths ?? 6}
            onChange={e => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value >= 1 && value <= 24) updateSettings({ safetyCushionMonths: value })
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.securityStarterMonths')}</label>
          <input
            type="number"
            min={0}
            max={12}
            value={settings.securityStarterMonths ?? 1}
            onChange={e => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value >= 0 && value <= 12) updateSettings({ securityStarterMonths: value })
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.securityMaxSharePct')}</label>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.securityMaxSharePct ?? 60}
            onChange={e => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value >= 0 && value <= 100) updateSettings({ securityMaxSharePct: value })
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.emergencyFundEnabled !== false}
            onChange={e => updateSettings({ emergencyFundEnabled: e.target.checked })}
          />
          {t('settings.emergencyFundEnabled')}
        </label>
        {settings.emergencyFundEnabled !== false && <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('settings.emergencyFundTarget', { currency: settings.defaultCurrency ?? 'PLN' })}
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={settings.emergencyFundTarget ?? 10000}
            onChange={e => {
              const value = parseFloat(e.target.value)
              if (!isNaN(value) && value >= 0) updateSettings({ emergencyFundTarget: value })
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
                </div>}
      </div>

      <GratificationsSettings />

      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Download size={14} />
          {t('settings.exportJson')}
        </button>
        {!IS_API_MODE && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Upload size={14} />
            {t('settings.importJson')}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <RotateCcw size={14} />
          {t('settings.resetAll')}
        </button>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('settings.resetDescription')}</p>
      </div>

      {importCsvOpen && <ImportCsvDialog onClose={() => setImportCsvOpen(false)} />}
    </div>
  )
}
