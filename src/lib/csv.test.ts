import { describe, it, expect } from 'vitest'
import { favoritesToCsv } from './csv'
import type { Listing } from '../types'

const base = {
  zip: '33603',
  beds: 8,
  baths: 4,
  sqft: 3400,
  propertyType: 'Multi-Family',
  firstSeen: '2026-06-15T00:00:00Z',
  isNew: true,
  rentSource: 'rentcast',
  taxSource: 'estimated',
  hoaMonthly: 0,
} as const

function listing(id: string, address: string): Listing {
  return {
    ...base,
    id,
    address,
    price: 720000,
    units: 4,
    rentTotal: 7600,
    taxAnnual: 7920,
    insuranceAnnual: 7200,
    computed: {
      rentPerUnit: 1900,
      mortgageMonthly: 4000,
      mipMonthly: 300,
      houseHackOutOfPocket: 600,
      pctCostCovered: 88,
      fullRentalCashFlow: 240,
      capRate: 0.061,
      cashOnCash: 0.08,
      noiAnnual: 43000,
      onePercent: 0.0106,
      fhaSelfSufficient: true,
      cashInvested: 50000,
      dealScore: 78,
      scoreBreakdown: { houseHack: 80, cashOnCash: 70, capRate: 60, onePercent: 90 },
    },
  } as Listing
}

describe('favoritesToCsv', () => {
  it('produces a header row and one row per listing', () => {
    const csv = favoritesToCsv([listing('a', '1 Main St'), listing('b', '2 Oak Ave')])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toMatch(/address/i)
    expect(lines).toHaveLength(3)
  })
  it('quotes addresses containing commas', () => {
    const csv = favoritesToCsv([listing('a', '809 E Frierson Ave, Tampa, FL')])
    expect(csv).toContain('"809 E Frierson Ave, Tampa, FL"')
  })
})
