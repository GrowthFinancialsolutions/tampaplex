import type { Listing } from '../types'

const COLS: { header: string; get: (l: Listing) => string | number }[] = [
  { header: 'address', get: (l) => l.address },
  { header: 'zip', get: (l) => l.zip },
  { header: 'price', get: (l) => l.price },
  { header: 'units', get: (l) => l.units },
  { header: 'rent_total', get: (l) => l.rentTotal },
  { header: 'deal_score', get: (l) => Math.round(l.computed.dealScore) },
  { header: 'live_in_cost_mo', get: (l) => Math.round(l.computed.houseHackOutOfPocket) },
  { header: 'cap_rate_pct', get: (l) => (l.computed.capRate * 100).toFixed(1) },
  { header: 'cash_on_cash_pct', get: (l) => (l.computed.cashOnCash * 100).toFixed(1) },
  { header: 'flood_risk', get: (l) => l.floodZone?.risk ?? 'unknown' },
]

function cell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function favoritesToCsv(listings: Listing[]): string {
  const header = COLS.map((c) => c.header).join(',')
  const rows = listings.map((l) => COLS.map((c) => cell(c.get(l))).join(','))
  return [header, ...rows].join('\n') + '\n'
}
