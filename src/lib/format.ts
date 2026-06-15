export const usd = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const usd2 = (n: number): string =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    signDisplay: 'always',
  })

export const pct = (frac: number, digits = 1): string => `${(frac * 100).toFixed(digits)}%`

export const num = (n: number): string => Math.round(n).toLocaleString('en-US')
