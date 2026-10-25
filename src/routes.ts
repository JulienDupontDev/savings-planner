export type AppTab = 'overview' | 'assets' | 'plan' | 'transactions' | 'settings'

const TAB_HASH: Record<AppTab, string> = {
  overview: '#/overview',
  assets: '#/assets',
  plan: '#/plan',
  transactions: '#/transactions',
  settings: '#/settings',
}

const HASH_TAB: Record<string, AppTab> = {
  '#/overview': 'overview',
  '#/': 'overview',
  '#/przeglad': 'overview',
  '#/assets': 'assets',
  '#/majatek': 'assets',
  '#/plan': 'plan',
  '#/transactions': 'transactions',
  '#/transakcje': 'transactions',
  '#/settings': 'settings',
  '#/ustawienia': 'settings',
}

export function tabFromHash(hash: string): AppTab {
  return HASH_TAB[hash] ?? 'overview'
}

export function hashForTab(tab: AppTab): string {
  return TAB_HASH[tab]
}

export function canonicalHash(hash: string): string {
  return hashForTab(tabFromHash(hash))
}
