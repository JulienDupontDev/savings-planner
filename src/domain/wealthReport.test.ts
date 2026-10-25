import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pdfSafe, renderWealthReport } from '../components/report/wealthReportPdf'
import { translateAccountBucket } from '../i18n'
import { buildWealthReport, type WealthReportInput } from './wealthReport'

const demo = JSON.parse(readFileSync('docs/demo-data.json', 'utf8'))

const input = (over: Partial<WealthReportInput> = {}): WealthReportInput => ({
  settings: demo.settings,
  goals: demo.goals,
  loans: demo.loans,
  accounts: demo.accounts,
  snapshots: demo.accountSnapshots,
  mortgagePlan: demo.mortgagePlan,
  subscriptions: demo.subscriptions,
  upcomingExpenses: demo.upcomingExpenses,
  overrides: demo.overrides ?? {},
  bucketLabel: translateAccountBucket,
  now: new Date('2026-10-25'),
  ...over,
})

describe('buildWealthReport', () => {
  it('summarises net worth, goals and debts in plain French', () => {
    const report = buildWealthReport(input())
    expect(report.netWorth).toBeCloseTo(report.assets - report.debt)
    expect(report.allocation.reduce((s, a) => s + a.pct, 0)).toBeCloseTo(100)
    expect(report.highlights[0]).toContain('patrimoine net')
    expect(report.goals.length).toBe(demo.goals.length)
    expect(report.assumptions.every(a => !a.startsWith('report.'))).toBe(true)
  })

  it('handles an empty household without throwing', () => {
    const report = buildWealthReport(input({ goals: [], loans: [], accounts: [], snapshots: [], mortgagePlan: undefined, subscriptions: [], upcomingExpenses: [] }))
    expect(report.assets).toBe(0)
    expect(report.highlights[0]).toMatch(/Aucun solde/)
    expect(() => renderWealthReport(report)).not.toThrow()
  })
})

describe('renderWealthReport', () => {
  it('produces a multi-page PDF with no raw translation keys', () => {
    const report = buildWealthReport(input())
    const doc = renderWealthReport(report)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
    expect(String(doc.output()).startsWith('%PDF')).toBe(true)
    if (process.env.REPORT_OUT) doc.save(process.env.REPORT_OUT)
  })

  it('strips characters the built-in PDF font cannot draw', () => {
    expect(pdfSafe('Prezent ślubny – 1\u202f000')).toBe('Prezent slubny - 1 000')
  })
})
