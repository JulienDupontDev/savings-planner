import { describe, expect, it } from 'vitest'
import { canonicalHash, hashForTab, tabFromHash } from './routes'

describe('frontend routes', () => {
  it('uses English URLs for every app tab', () => {
    expect(hashForTab('overview')).toBe('#/overview')
    expect(hashForTab('assets')).toBe('#/assets')
    expect(hashForTab('plan')).toBe('#/plan')
    expect(hashForTab('transactions')).toBe('#/transactions')
    expect(hashForTab('settings')).toBe('#/settings')
  })

  it('redirects old Polish URLs to their English routes', () => {
    expect(canonicalHash('#/przeglad')).toBe('#/overview')
    expect(canonicalHash('#/majatek')).toBe('#/assets')
    expect(canonicalHash('#/transakcje')).toBe('#/transactions')
    expect(canonicalHash('#/ustawienia')).toBe('#/settings')
  })

  it('defaults unknown and root hashes to the overview route', () => {
    expect(tabFromHash('#/')).toBe('overview')
    expect(canonicalHash('#/unknown')).toBe('#/overview')
  })
})
