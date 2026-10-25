import { summarizeIkzePlans } from './ikze'
import type { NextCycleForecast } from './nextCycleForecast'
import type { SecurityBuffersModel } from './securityBuffers'
import type { Goal, Settings } from './types'
import { translate as t } from '../i18n'
import { formatCurrency } from './formatting'

export type NextBestActionKind =
  | 'cover_deficit'
  | 'top_up_security_buffer'
  | 'fund_ikze'
  | 'fund_goal'
  | 'hold_surplus'

export type NextBestActionConfidence = 'high' | 'medium' | 'low'

export interface NextBestAction {
  kind: NextBestActionKind
  title: string
  amount: number
  targetId?: string
  targetName?: string
  confidence: NextBestActionConfidence
  reasons: string[]
  effects: string[]
  source: 'algorithm'
}

export interface NextBestActionInput {
  forecast: NextCycleForecast
  security: SecurityBuffersModel
  settings: Settings
  goals: Goal[]
}

export interface RecommendationNarratorInput {
  action: NextBestAction
}

export type RecommendationNarrator = (input: RecommendationNarratorInput) => string | Promise<string>

export function buildNextBestAction({
  forecast,
  security,
  settings,
  goals,
}: NextBestActionInput): NextBestAction {
  const available = roundMoney(forecast.freeCashAfterCreditCard)
  const formatAmount = (value: number) => formatCurrency(value, settings.defaultCurrency ?? 'PLN')

  if (available < 0) {
    const deficit = Math.abs(available)
    return {
      kind: 'cover_deficit',
        title: t('recommendation.actions.coverDeficit.title'),
      amount: deficit,
      confidence: 'high',
      reasons: [
          t('recommendation.actions.coverDeficit.reasonAfterCosts'),
          t('recommendation.actions.coverDeficit.reasonCashflowRisk'),
      ],
      effects: [
          t('recommendation.actions.coverDeficit.missingAmount', { amount: formatAmount(deficit) }),
          t('recommendation.actions.coverDeficit.waitForPositiveCash'),
      ],
      source: 'algorithm',
    }
  }

  const ikze = summarizeIkzePlans(settings.ikzePlans ?? [])
  if (available > 0 && ikze.remaining > 0 && ikze.perPayout > 0) {
    const amount = Math.min(available, ikze.perPayout, ikze.remaining)
    return {
      kind: 'fund_ikze',
      title: t('recommendation.actions.ikze.title'),
      amount,
      targetId: 'ikze',
      targetName: t('recommendation.actions.ikze.title'),
      confidence: 'medium',
      reasons: [
          t('recommendation.actions.ikze.remainingLimit', { amount: formatAmount(ikze.remaining) }),
          t('recommendation.actions.ikze.recommendedPayment', { amount: formatAmount(ikze.perPayout) }),
      ],
      effects: [
        amount >= ikze.remaining
          ? t('recommendation.actions.ikze.limitReached')
          : t('recommendation.actions.ikze.limitRemaining', { amount: formatAmount(ikze.remaining - amount) }),
        t('recommendation.actions.cashRemaining', { amount: formatAmount(Math.max(available - amount, 0)) }),
      ],
      source: 'algorithm',
    }
  }

  if (!security.latestMonth) {
    return {
      kind: 'hold_surplus',
      title: t('recommendation.actions.missingSnapshots.title'),
      amount: Math.max(available, 0),
      confidence: 'low',
      reasons: [
          t('recommendation.actions.missingSnapshots.reason'),
      ],
      effects: [
        available > 0
          ? t('recommendation.actions.missingSnapshots.manualSurplus', { amount: formatAmount(available) })
          : t('common.empty.noCashToAllocate'),
      ],
      source: 'algorithm',
    }
  }

  const missingSecurity = security.missingBuffers[0]
  if (missingSecurity && available > 0) {
    const amount = Math.min(available, missingSecurity.missing)
    return {
      kind: 'top_up_security_buffer',
      title: t('recommendation.actions.securityBuffer.title', { name: missingSecurity.title.toLowerCase() }),
      amount,
      targetId: missingSecurity.goalId,
      targetName: missingSecurity.title,
      confidence: security.latestMonth ? 'high' : 'medium',
      reasons: [
          t('recommendation.actions.securityBuffer.belowTarget', { name: missingSecurity.title, amount: formatAmount(missingSecurity.missing) }),
          t('recommendation.actions.securityBuffer.priority'),
      ],
      effects: [
        amount >= missingSecurity.missing
          ? t('recommendation.actions.securityBuffer.completed', { name: missingSecurity.title })
          : t('recommendation.actions.securityBuffer.remainingGap', { name: missingSecurity.title, amount: formatAmount(missingSecurity.missing - amount) }),
        t('recommendation.actions.cashRemaining', { amount: formatAmount(Math.max(available - amount, 0)) }),
      ],
      source: 'algorithm',
    }
  }

  const goal = nextManualGoal(goals)
  if (goal && available > 0) {
    const remaining = Math.max(goal.targetAmount - (goal.currentSaved ?? 0), 0)
    const amount = Math.min(available, remaining)
    return {
      kind: 'fund_goal',
      title: t('recommendation.actions.goal.title', { name: goal.name }),
      amount,
      targetId: goal.id,
      targetName: goal.name,
      confidence: 'medium',
      reasons: [
          t('recommendation.actions.goal.noUrgentNeed'),
          t('recommendation.actions.goal.nextPriority', { name: goal.name }),
      ],
      effects: [
        amount >= remaining
          ? t('recommendation.actions.securityBuffer.completed', { name: goal.name })
          : t('recommendation.actions.securityBuffer.remainingGap', { name: goal.name, amount: formatAmount(remaining - amount) }),
        t('recommendation.actions.cashRemaining', { amount: formatAmount(Math.max(available - amount, 0)) }),
      ],
      source: 'algorithm',
    }
  }

  return {
    kind: 'hold_surplus',
    title: t('recommendation.actions.surplus.title'),
    amount: Math.max(available, 0),
    confidence: 'low',
    reasons: [
        t('recommendation.actions.surplus.reason'),
    ],
    effects: [
      available > 0
        ? t('recommendation.actions.surplus.manualDecision', { amount: formatAmount(available) })
        : t('common.empty.noCashToAllocate'),
    ],
    source: 'algorithm',
  }
}

function nextManualGoal(goals: Goal[]): Goal | undefined {
  return goals
    .filter(goal => (goal.currentSaved ?? 0) < goal.targetAmount)
    .sort((a, b) =>
      a.priority - b.priority
      || (a.deadline ?? '9999-99-99').localeCompare(b.deadline ?? '9999-99-99')
      || a.name.localeCompare(b.name)
    )[0]
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
