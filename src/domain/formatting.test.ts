import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPLN } from './formatting'

describe('currency formatting', () => {
  it('formats amounts using the selected currency', () => {
    expect(formatCurrency(50, 'EUR')).toBe(
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(50),
    )
  })

  it('keeps PLN formatting as the legacy default', () => {
    expect(formatPLN(50)).toBe(formatCurrency(50, 'PLN'))
  })
})
