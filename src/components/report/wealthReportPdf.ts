import { jsPDF } from 'jspdf'
import { formatCurrency } from '../../domain/formatting'
import type { ReportPoint, ReportStatus, WealthReport } from '../../domain/wealthReport'
import { translate as t } from '../../i18n'

type RGB = [number, number, number]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2
const BOTTOM = PAGE_H - 18

const INK: RGB = [31, 41, 55]
const MUTED: RGB = [107, 114, 128]
const LINE: RGB = [229, 231, 235]
const ACCENT: RGB = [37, 99, 235]
const GOOD: RGB = [22, 163, 74]
const WARN: RGB = [217, 119, 6]
const BAD: RGB = [220, 38, 38]
const PALETTE: RGB[] = [[37, 99, 235], [22, 163, 74], [217, 119, 6], [147, 51, 234], [219, 39, 119], [8, 145, 178], [101, 163, 13]]

const STATUS_COLOR: Record<ReportStatus, RGB> = { good: GOOD, watch: WARN, alert: BAD }

const POLISH: Record<string, string> = { ł: 'l', Ł: 'L', ą: 'a', ć: 'c', ę: 'e', ń: 'n', ś: 's', ź: 'z', ż: 'z', Ą: 'A', Ć: 'C', Ę: 'E', Ń: 'N', Ś: 'S', Ź: 'Z', Ż: 'Z' }

// Built-in PDF fonts only support Latin-1: swap the rest for safe equivalents.
export function pdfSafe(text: string): string {
  return text
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[łŁąćęńśźżĄĆĘŃŚŹŻ]/g, c => POLISH[c] ?? c)
    .split('')
    .filter(c => c.charCodeAt(0) <= 0xff)
    .join('')
}

class Pdf {
  doc = new jsPDF({ unit: 'mm', format: 'a4' })
  y = MARGIN

  report: WealthReport

  constructor(report: WealthReport) {
    this.report = report
  }

  money = (n: number) => pdfSafe(formatCurrency(n, this.report.currency))
  moneyShort = (n: number) => pdfSafe(formatCurrency(Math.round(n), this.report.currency).replace(/[,.]00(?=\D*$)/, ''))

  ensure(height: number) {
    if (this.y + height > BOTTOM) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  text(value: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right' | 'center' } = {}) {
    const { doc } = this
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    doc.setTextColor(...(opts.color ?? INK))
    doc.text(pdfSafe(value), x, y, { align: opts.align ?? 'left' })
  }

  paragraph(value: string, x: number, width: number, opts: { size?: number; color?: RGB; bold?: boolean; lineHeight?: number } = {}) {
    const size = opts.size ?? 10
    const lh = opts.lineHeight ?? size * 0.45
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    const lines: string[] = this.doc.splitTextToSize(pdfSafe(value), width)
    for (const line of lines) {
      this.ensure(lh)
      this.text(line, x, this.y, { size, color: opts.color, bold: opts.bold })
      this.y += lh
    }
  }

  section(title: string, subtitle?: string) {
    this.ensure(45)
    this.y += 4
    this.doc.setFillColor(...ACCENT)
    this.doc.rect(MARGIN, this.y - 4.5, 1.2, 6, 'F')
    this.text(title, MARGIN + 3.5, this.y, { size: 13, bold: true })
    this.y += 5
    if (subtitle) this.paragraph(subtitle, MARGIN, CONTENT_W, { size: 9, color: MUTED })
    this.y += 2
  }

  kpiCards(cards: { label: string; value: string; detail?: string; color?: RGB }[]) {
    const gap = 4
    const w = (CONTENT_W - gap * (cards.length - 1)) / cards.length
    const h = 22
    this.ensure(h + 2)
    cards.forEach((card, i) => {
      const x = MARGIN + i * (w + gap)
      this.doc.setDrawColor(...LINE)
      this.doc.setFillColor(249, 250, 251)
      this.doc.roundedRect(x, this.y, w, h, 2, 2, 'FD')
      this.text(card.label, x + 3, this.y + 5.5, { size: 8, color: MUTED })
      this.text(card.value, x + 3, this.y + 12.5, { size: 11, bold: true, color: card.color })
      if (card.detail) this.text(card.detail, x + 3, this.y + 18, { size: 7, color: MUTED })
    })
    this.y += h + 4
  }

  progressBar(x: number, y: number, w: number, pct: number, color: RGB) {
    this.doc.setFillColor(...LINE)
    this.doc.roundedRect(x, y, w, 2.6, 1.3, 1.3, 'F')
    if (pct > 0) {
      this.doc.setFillColor(...color)
      this.doc.roundedRect(x, y, Math.max(2.6, (w * Math.min(100, pct)) / 100), 2.6, 1.3, 1.3, 'F')
    }
  }

  table(columns: { header: string; width: number; align?: 'left' | 'right' }[], rows: string[][]) {
    const rowH = 6.5
    const drawHeader = () => {
      this.doc.setFillColor(243, 244, 246)
      this.doc.rect(MARGIN, this.y - 4.5, CONTENT_W, rowH, 'F')
      let x = MARGIN
      for (const col of columns) {
        const tx = col.align === 'right' ? x + col.width - 2 : x + 2
        this.text(col.header, tx, this.y, { size: 8, bold: true, color: MUTED, align: col.align })
        x += col.width
      }
      this.y += rowH
    }
    this.ensure(rowH * 2 + 4)
    drawHeader()
    for (const row of rows) {
      if (this.y + rowH > BOTTOM) {
        this.doc.addPage()
        this.y = MARGIN + 4
        drawHeader()
      }
      let x = MARGIN
      row.forEach((cell, i) => {
        const col = columns[i]
        const maxChars = Math.floor((col.width - 3) / 1.75)
        const safe = pdfSafe(cell)
        const shown = safe.length > maxChars ? `${safe.slice(0, maxChars - 1)}...` : safe
        const tx = col.align === 'right' ? x + col.width - 2 : x + 2
        this.text(shown, tx, this.y, { size: 9, align: col.align })
        x += col.width
      })
      this.doc.setDrawColor(...LINE)
      this.doc.line(MARGIN, this.y + 1.8, MARGIN + CONTENT_W, this.y + 1.8)
      this.y += rowH
    }
    this.y += 2
  }

  lineChart(points: ReportPoint[], color: RGB, height = 55) {
    this.ensure(height + 12)
    const left = MARGIN + 24
    const right = MARGIN + CONTENT_W - 3
    const top = this.y + 2
    const bottom = this.y + height - 8
    if (points.length < 2) {
      this.text(t('report.history.notEnoughData'), MARGIN, this.y + 8, { size: 9, color: MUTED })
      this.y += 14
      return
    }
    const values = points.map(p => p.value)
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (min === max) { min -= 1; max += 1 }
    const pad = (max - min) * 0.08
    min -= pad
    max += pad
    const xAt = (i: number) => left + ((right - left) * i) / (points.length - 1)
    const yAt = (v: number) => bottom - ((bottom - top) * (v - min)) / (max - min)

    this.doc.setDrawColor(...LINE)
    this.doc.setLineWidth(0.2)
    for (let g = 0; g <= 4; g++) {
      const value = min + ((max - min) * g) / 4
      const gy = yAt(value)
      this.doc.line(left, gy, right, gy)
      this.text(this.moneyShort(value), left - 2, gy + 1, { size: 7, color: MUTED, align: 'right' })
    }
    const ticks = Math.min(5, points.length)
    for (let k = 0; k < ticks; k++) {
      const i = Math.round(((points.length - 1) * k) / (ticks - 1))
      this.text(points[i].label, xAt(i), bottom + 5, { size: 7, color: MUTED, align: k === 0 ? 'left' : k === ticks - 1 ? 'right' : 'center' })
    }
    this.doc.setDrawColor(...color)
    this.doc.setLineWidth(0.7)
    for (let i = 1; i < points.length; i++) {
      this.doc.line(xAt(i - 1), yAt(points[i - 1].value), xAt(i), yAt(points[i].value))
    }
    this.doc.setLineWidth(0.2)
    this.y += height + 3
  }

  allocationBars(items: WealthReport['allocation']) {
    items.forEach((item, i) => {
      this.ensure(8)
      this.text(item.label, MARGIN, this.y, { size: 9 })
      this.progressBar(MARGIN + 55, this.y - 2.4, 65, item.pct, PALETTE[i % PALETTE.length])
      this.text(`${item.pct.toFixed(0)} %`, MARGIN + 124, this.y, { size: 9, bold: true })
      this.text(this.money(item.value), MARGIN + CONTENT_W, this.y, { size: 9, align: 'right' })
      this.y += 7
    })
  }

  footer() {
    const total = this.doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p)
      this.doc.setDrawColor(...LINE)
      this.doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12)
      this.text(t('report.footer', { date: this.report.generatedAt }), MARGIN, PAGE_H - 7, { size: 7.5, color: MUTED })
      this.text(t('report.page', { page: p, total }), PAGE_W - MARGIN, PAGE_H - 7, { size: 7.5, color: MUTED, align: 'right' })
    }
  }
}

function signed(pdf: Pdf, n: number | undefined) {
  if (n === undefined) return '-'
  return `${n >= 0 ? '+' : '-'}${pdf.money(Math.abs(n))}`
}

export function renderWealthReport(report: WealthReport): jsPDF {
  const pdf = new Pdf(report)
  const { doc } = pdf
  const lastMonth = report.history.at(-1)?.label

  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, PAGE_W, 30, 'F')
  pdf.text(t('report.title'), MARGIN, 14, { size: 20, bold: true, color: [255, 255, 255] })
  pdf.text(
    lastMonth
      ? t('report.subtitleWithMonth', { date: report.generatedAt, month: lastMonth })
      : t('report.subtitle', { date: report.generatedAt }),
    MARGIN, 22, { size: 9.5, color: [219, 234, 254] },
  )
  pdf.y = 40

  doc.setFillColor(...STATUS_COLOR[report.status])
  doc.circle(MARGIN + 2.5, pdf.y - 1.2, 2.5, 'F')
  pdf.text(report.headline, MARGIN + 8, pdf.y, { size: 12.5, bold: true })
  pdf.y += 8
  for (const line of report.highlights) {
    doc.setFillColor(...MUTED)
    doc.circle(MARGIN + 1.5, pdf.y - 1.2, 0.7, 'F')
    pdf.paragraph(line, MARGIN + 5, CONTENT_W - 5, { size: 10, lineHeight: 5 })
    pdf.y += 1.5
  }
  pdf.y += 3

  pdf.kpiCards([
    { label: t('report.kpi.netWorth'), value: pdf.money(report.netWorth), detail: t('report.kpi.netWorthDetail'), color: report.netWorth < 0 ? BAD : ACCENT },
    { label: t('report.kpi.assets'), value: pdf.money(report.assets), detail: t('report.kpi.assetsDetail', { delta: signed(pdf, report.deltaMonth) }) },
    { label: t('report.kpi.debt'), value: pdf.money(report.debt), detail: report.debt > 0 ? t('report.kpi.debtDetail') : t('report.kpi.noDebt') },
    { label: t('report.kpi.freeCash'), value: pdf.money(report.cashflow.freeCash), detail: t('report.kpi.freeCashDetail', { month: report.cashflow.monthLabel }), color: report.cashflow.freeCash < 0 ? BAD : GOOD },
  ])

  pdf.section(t('report.history.title'), t('report.history.description'))
  pdf.lineChart(report.history, ACCENT)
  if (report.delta12Months !== undefined) {
    pdf.paragraph(t('report.history.change12', { amount: signed(pdf, report.delta12Months) }), MARGIN, CONTENT_W, { size: 9, color: MUTED })
  }

  pdf.section(t('report.allocation.title'), t('report.allocation.description'))
  if (report.allocation.length === 0) {
    pdf.paragraph(t('report.allocation.empty'), MARGIN, CONTENT_W, { color: MUTED })
  } else {
    pdf.allocationBars(report.allocation)
    pdf.y += 2
    pdf.table(
      [{ header: t('report.allocation.account'), width: 80 }, { header: t('report.allocation.category'), width: 55 }, { header: t('report.allocation.balance'), width: 45, align: 'right' }],
      report.accounts.map(a => [a.name, a.bucket, pdf.money(a.balance)]),
    )
  }

  pdf.section(
    t('report.security.title'),
    report.securityMonths !== undefined
      ? t('report.security.descriptionMonths', { months: report.securityMonths.toFixed(1) })
      : t('report.security.description'),
  )
  for (const b of report.security) {
    pdf.ensure(11)
    pdf.text(b.title, MARGIN, pdf.y, { size: 9.5, bold: true })
    pdf.text(`${pdf.money(b.current)} / ${pdf.money(b.target)}`, MARGIN + CONTENT_W, pdf.y, { size: 9, align: 'right' })
    pdf.y += 3
    pdf.progressBar(MARGIN, pdf.y, CONTENT_W, b.progressPct, b.met ? GOOD : WARN)
    pdf.y += 8
  }

  pdf.section(t('report.budget.title'), t('report.budget.description', { month: report.cashflow.monthLabel }))
  pdf.table(
    [{ header: t('report.budget.item'), width: 120 }, { header: t('report.budget.amount'), width: 60, align: 'right' }],
    [
      [t('report.budget.income'), pdf.money(report.cashflow.income)],
      ...report.cashflow.lines.map(l => [l.label, `- ${pdf.money(l.amount)}`]),
      [t('report.budget.freeCash'), pdf.money(report.cashflow.freeCash)],
    ],
  )

  pdf.section(t('report.goals.title'), t('report.goals.description'))
  if (report.goals.length === 0) pdf.paragraph(t('report.goals.empty'), MARGIN, CONTENT_W, { color: MUTED })
  for (const g of report.goals) {
    pdf.ensure(17)
    const color = g.onTrack === false ? BAD : g.pct >= 100 ? GOOD : ACCENT
    pdf.text(g.name, MARGIN, pdf.y, { size: 10, bold: true })
    pdf.text(`${pdf.money(g.saved)} / ${pdf.money(g.target)}  (${g.pct.toFixed(0)} %)`, MARGIN + CONTENT_W, pdf.y, { size: 9, align: 'right' })
    pdf.y += 3
    pdf.progressBar(MARGIN, pdf.y, CONTENT_W, g.pct, color)
    pdf.y += 6
    const parts = [t('report.goals.expected', { eta: g.eta })]
    if (g.deadline) parts.push(t('report.goals.deadline', { deadline: g.deadline }))
    if (g.onTrack === false) {
      parts.push(g.shortfallPerMonth ? t('report.goals.lateShortfall', { amount: pdf.money(g.shortfallPerMonth) }) : t('report.goals.late'))
    } else if (g.onTrack === true && g.pct < 100) {
      parts.push(t('report.goals.onTrack'))
    }
    pdf.paragraph(parts.join(' - '), MARGIN, CONTENT_W, { size: 8.5, color: MUTED })
    pdf.y += 2.5
  }

  if (report.mortgage || report.loans.length > 0) {
    pdf.section(t('report.debts.title'), t('report.debts.description'))
    if (report.mortgage) {
      const m = report.mortgage
      pdf.table(
        [{ header: m.name, width: 110 }, { header: t('report.debts.value'), width: 70, align: 'right' }],
        [
          [t('report.debts.balance'), pdf.money(m.balance)],
          [t('report.debts.monthly'), pdf.money(m.monthly)],
          [t('report.debts.rate'), `${m.ratePct.toFixed(2)} %`],
          [t('report.debts.payoff'), m.payoff],
          [t('report.debts.remainingMonths'), String(m.remainingMonths)],
          [t('report.debts.interestLeft'), pdf.money(m.totalInterest)],
          ...(m.interestSaved > 0 ? [[t('report.debts.interestSaved'), pdf.money(m.interestSaved)]] : []),
        ],
      )
    }
    if (report.loans.length > 0) {
      pdf.table(
        [{ header: t('report.debts.loan'), width: 70 }, { header: t('report.debts.remaining'), width: 45, align: 'right' }, { header: t('report.debts.monthly'), width: 35, align: 'right' }, { header: t('report.debts.end'), width: 30, align: 'right' }],
        report.loans.map(l => [l.name, pdf.money(l.remaining), pdf.money(l.monthly), l.payoff]),
      )
    }
    pdf.paragraph(t('report.debts.curve'), MARGIN, CONTENT_W, { size: 9, color: MUTED })
    pdf.lineChart(report.debtCurve, BAD, 50)
  }

  if (report.ikze.length > 0) {
    pdf.section(t('report.retirement.title'), t('report.retirement.description'))
    pdf.table(
      [
        { header: t('report.retirement.owner'), width: 45 },
        { header: t('report.retirement.year'), width: 20 },
        { header: t('report.retirement.limit'), width: 36, align: 'right' },
        { header: t('report.retirement.contributed'), width: 36, align: 'right' },
        { header: t('report.retirement.remaining'), width: 43, align: 'right' },
      ],
      report.ikze.map(e => [e.owner, String(e.year), pdf.money(e.limit), pdf.money(e.contributed), pdf.money(e.remaining)]),
    )
  }

  if (report.upcomingExpenses.length > 0) {
    pdf.section(t('report.upcoming.title'))
    pdf.table(
      [{ header: t('report.upcoming.name'), width: 100 }, { header: t('report.upcoming.month'), width: 40 }, { header: t('report.upcoming.amount'), width: 40, align: 'right' }],
      report.upcomingExpenses.map(e => [e.name, e.month, pdf.money(e.amount)]),
    )
  }

  pdf.section(t('report.help.title'))
  for (const line of report.assumptions) {
    pdf.paragraph(`- ${line}`, MARGIN, CONTENT_W, { size: 9, color: MUTED, lineHeight: 4.5 })
  }

  pdf.footer()
  return doc
}

export function downloadWealthReport(report: WealthReport) {
  const doc = renderWealthReport(report)
  doc.save(t('report.fileName', { date: new Date().toISOString().slice(0, 10) }))
}
