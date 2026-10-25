import { summarizeIkzePlans } from './ikze'
import { dateToYearMonth, monthDiff } from './formatting'
import type { SecurityBuffersModel } from './securityBuffers'
import type { Goal, Settings } from './types'

export type PaycheckSplitKind = 'ikze' | 'security' | 'goal' | 'unallocated'
export type PaycheckSplitReason =
  | 'ikze_first'
  | 'security_starter'
  | 'security_share'
  | 'goal_on_track'
  | 'goal_by_priority'
  | 'security_overflow'
  | 'nothing_to_fund'

export interface PaycheckSplitLine {
  kind: PaycheckSplitKind
  targetId?: string
  targetName?: string
  amount: number
  reason: PaycheckSplitReason
}

export interface PaycheckSplitInput {
  available: number
  currentMonth: string // "YYYY-MM"
  security: SecurityBuffersModel
  settings: Settings
  goals: Goal[]
}

export const DEFAULT_SECURITY_STARTER_MONTHS = 1
export const DEFAULT_SECURITY_MAX_SHARE_PCT = 60

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Splits one paycheck: IKZE first, then security (starter buffer in full, then a capped share),
 * then goals (deadline goals get their on-track amount first, then priority order).
 * Cash that goals cannot absorb flows back to security instead of staying idle.
 */
export function buildPaycheckSplit({
  available,
  currentMonth,
  security,
  settings,
  goals,
}: PaycheckSplitInput): PaycheckSplitLine[] {
  const lines: PaycheckSplitLine[] = []
  let pool = round(Math.max(0, available))

  const push = (line: Omit<PaycheckSplitLine, 'amount'>, amount: number) => {
    const value = round(Math.min(amount, pool))
    if (value <= 0) return 0
    pool = round(pool - value)
    lines.push({ ...line, amount: value })
    return value
  }

  const ikze = summarizeIkzePlans(settings.ikzePlans ?? [])
  if (ikze.remaining > 0 && ikze.perPayout > 0) {
    push(
      { kind: 'ikze', targetId: 'ikze', reason: 'ikze_first' },
      Math.min(ikze.perPayout, ikze.remaining),
    )
  }

  const buffers = security.missingBuffers.map(buffer => ({ buffer, left: buffer.missing }))
  const fundSecurity = (budget: number, reason: PaycheckSplitReason) => {
    let budgetLeft = Math.min(budget, pool)
    for (const entry of buffers) {
      if (budgetLeft <= 0) break
      const paid = push(
        { kind: 'security', targetId: entry.buffer.goalId, targetName: entry.buffer.title, reason },
        Math.min(entry.left, budgetLeft),
      )
      entry.left -= paid
      budgetLeft -= paid
    }
  }

  if (security.latestMonth && buffers.length > 0) {
    const starterMonths = settings.securityStarterMonths ?? DEFAULT_SECURITY_STARTER_MONTHS
    const sharePct = Math.min(100, Math.max(0, settings.securityMaxSharePct ?? DEFAULT_SECURITY_MAX_SHARE_PCT))
    const securityCurrent = security.buffers.reduce((sum, buffer) => sum + buffer.current, 0)
    const starterGap = Math.max(0, security.monthlyCostBasis * starterMonths - securityCurrent)

    const starter = Math.min(starterGap, pool)
    fundSecurity(starter, 'security_starter')
    fundSecurity(pool * (sharePct / 100), 'security_share')
  }

  const activeGoals = goals
    .map(goal => ({ goal, remaining: Math.max(0, goal.targetAmount - (goal.currentSaved ?? 0)) }))
    .filter(entry => entry.remaining > 0)
    .sort((a, b) =>
      a.goal.priority - b.goal.priority
      || (a.goal.deadline ?? '9999-99-99').localeCompare(b.goal.deadline ?? '9999-99-99')
      || a.goal.name.localeCompare(b.goal.name),
    )

  for (const entry of activeGoals) {
    if (!entry.goal.deadline) continue
    const monthsLeft = Math.max(1, monthDiff(currentMonth, dateToYearMonth(entry.goal.deadline)))
    const onTrack = Math.min(entry.remaining, entry.goal.fixedAllocation || entry.remaining / monthsLeft)
    entry.remaining -= push(
      { kind: 'goal', targetId: entry.goal.id, targetName: entry.goal.name, reason: 'goal_on_track' },
      onTrack,
    )
  }
  for (const entry of activeGoals) {
    push(
      { kind: 'goal', targetId: entry.goal.id, targetName: entry.goal.name, reason: 'goal_by_priority' },
      entry.remaining,
    )
  }

  fundSecurity(pool, 'security_overflow')

  if (pool > 0 || lines.length === 0) {
    lines.push({ kind: 'unallocated', amount: pool, reason: 'nothing_to_fund' })
  }
  return mergeLines(lines)
}

function mergeLines(lines: PaycheckSplitLine[]): PaycheckSplitLine[] {
  const merged: PaycheckSplitLine[] = []
  for (const line of lines) {
    const existing = merged.find(m => m.kind === line.kind && m.targetId === line.targetId)
    if (existing) existing.amount = round(existing.amount + line.amount)
    else merged.push({ ...line })
  }
  return merged
}
