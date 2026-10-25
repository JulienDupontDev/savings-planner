import { useStore } from '../store'

export function useDefaultCurrency() {
  return useStore(state => state.settings.defaultCurrency ?? 'PLN')
}
