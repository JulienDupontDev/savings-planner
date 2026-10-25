import { summarizeIkzePlans } from './ikze'
import { dateToYearMonth, monthDiff } from './formatting'
import type { SecurityBuffersModel } from './securityBuffers'
import type { Goal, Settings } from './types'

export type PaycheckSplitKind = 'ikze' | 'security' | 'goal' | 'unallocated'
export type PaycheckSplitReason =
  | 'ikze_first'
  | 'security_starter'
  | 'security_share'
  | 'goal_important'
  | 'goal_urgent'
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
// A deadline closer than this makes a goal urgent: its monthly need is funded before the capped security share.
export const URGENT_DEADLINE_MONTHS = 6
// Monthly pace assumed for an important goal that has neither a deadline nor a fixed allocation.
export const IMPORTANT_DEFAULT_MONTHS = 12

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Splits one paycheck: IKZE first, then the security starter buffer in full, then the monthly need of
 * important or urgent (deadline within 6 months) goals, then a capped security share, then the other
 * goals (deadline goals on track first, then priority order).
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

  const activeGoals = goals
    .map(goal => ({ goal, remaining: Math.max(0, goal.targetAmount - (goal.currentSaved ?? 0)) }))
    .filter(entry => entry.remaining > 0)
    .sort((a, b) =>
      Number(!!b.goal.important) - Number(!!a.goal.important)
      || a.goal.priority - b.goal.priority
      || (a.goal.deadline ?? '9999-99-99').localeCompare(b.goal.deadline ?? '9999-99-99')
      || a.goal.name.localeCompare(b.goal.name),
    )

  const guaranteed = new Set<string>()
  const fundGuaranteedGoals = () => {
    for (const entry of activeGoals) {
      const { goal } = entry
      const monthsLeft = goal.deadline ? Math.max(1, monthDiff(currentMonth, dateToYearMonth(goal.deadline))) : undefined
      const urgent = monthsLeft !== undefined && monthsLeft <= URGENT_DEADLINE_MONTHS
      if (!goal.important && !urgent) continue
      guaranteed.add(goal.id)
      const need = goal.fixedAllocation || entry.remaining / (monthsLeft ?? IMPORTANT_DEFAULT_MONTHS)
      entry.remaining -= push(
        { kind: 'goal', targetId: goal.id, targetName: goal.name, reason: goal.important ? 'goal_important' : 'goal_urgent' },
        Math.min(entry.remaining, need),
      )
    }
  }

  if (security.latestMonth && buffers.length > 0) {
    const starterMonths = settings.securityStarterMonths ?? DEFAULT_SECURITY_STARTER_MONTHS
    const sharePct = Math.min(100, Math.max(0, settings.securityMaxSharePct ?? DEFAULT_SECURITY_MAX_SHARE_PCT))
    const securityCurrent = security.buffers.reduce((sum, buffer) => sum + buffer.current, 0)
    const starterGap = Math.max(0, security.monthlyCostBasis * starterMonths - securityCurrent)

    const starter = Math.min(starterGap, pool)
    fundSecurity(starter, 'security_starter')
    fundGuaranteedGoals()
    fundSecurity(pool * (sharePct / 100), 'security_share')
  } else {
    fundGuaranteedGoals()
  }

  for (const entry of activeGoals) {
    if (!entry.goal.deadline || guaranteed.has(entry.goal.id)) continue
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
