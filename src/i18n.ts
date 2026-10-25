import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import type { AccountBucket } from './domain/types'
import fr from './locales/fr/translation.json'

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr } },
  lng: 'fr',
  fallbackLng: 'fr',
  supportedLngs: ['fr'],
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') document.documentElement.lang = 'fr'

export function useT() {
  return useTranslation().t
}

export const translate = i18n.t.bind(i18n)

const accountBucketKeys: Record<AccountBucket, string> = {
  accounts: 'accounts.buckets.cash',
  safety_cushion: 'accounts.buckets.safetyCushion',
  retirement: 'accounts.buckets.retirement',
  renovation: 'accounts.buckets.renovation',
  investments: 'accounts.buckets.investments',
  vacation: 'accounts.buckets.vacation',
  emergency_fund: 'accounts.buckets.emergencyFund',
}

export function translateAccountBucket(bucket: AccountBucket) {
  return i18n.t(accountBucketKeys[bucket])
}
