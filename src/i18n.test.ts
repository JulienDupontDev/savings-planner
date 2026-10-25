import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('currency-aware translations', () => {
  it('uses the configured currency in the emergency-fund target label', () => {
    expect(translate('settings.emergencyFundTarget', { currency: 'EUR' }))
      .toBe('Objectif du fonds d’urgence (EUR)')
  })

  describe('generic retirement-savings terminology', () => {
    it('does not expose the Polish product acronym in user-facing copy', () => {
      const visibleLabels = [
        translate('app.plan.annualIkze'),
        translate('forecast.ikze'),
        translate('recommendation.actions.ikze.title'),
        translate('ikze.cashflow.deductContributions'),
        translate('schedule.ikzeAmount', { amount: '100 €' }),
      ]

      expect(visibleLabels.join(' ')).not.toMatch(/IKZE|złoty/i)
    })
  })

  it('interpolates currency-formatted thresholds in leak-analysis labels', () => {
    expect(translate('leakAnalysis.noMicroExpenses', { amount: '50,00 €' }))
      .toBe('Aucune petite dépense inférieure à 50,00 €.')
  })
})
