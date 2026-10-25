const currencyFormatters = new Map<string, Intl.NumberFormat>()

export const formatCurrency = (amount: unknown, currency = 'PLN'): string => {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(Number(amount ?? 0))
}

export const formatPLN = (amount: unknown): string => formatCurrency(amount, 'PLN')

export const formatYearMonth = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1))
  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(date)
  return `${monthName} ${year}`
}

export const addMonths = (yearMonth: string, n: number): string => {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + n, 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const monthDiff = (from: string, to: string): number => {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export const currentYearMonth = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const dateToYearMonth = (isoDate: string): string => isoDate.slice(0, 7)
