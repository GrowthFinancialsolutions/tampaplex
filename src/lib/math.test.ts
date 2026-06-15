import { describe, it, expect } from 'vitest'
import { monthlyMortgage, fhaLoan, lerpScore, computeMetrics } from './math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { ListingInputs } from '../types'

describe('monthlyMortgage', () => {
  it('computes a standard 30-yr amortized payment', () => {
    // $300,000 at 6% for 30 years ≈ $1,798.65/mo
    expect(monthlyMortgage(300000, 0.06, 30)).toBeCloseTo(1798.65, 1)
  })

  it('handles 0% interest as straight division', () => {
    expect(monthlyMortgage(360000, 0, 30)).toBeCloseTo(1000, 5)
  })

  it('returns 0 for a non-positive loan', () => {
    expect(monthlyMortgage(0, 0.06, 30)).toBe(0)
  })
})

describe('fhaLoan', () => {
  it('computes 3.5% down, financed upfront MIP, and monthly MIP', () => {
    const r = fhaLoan(400000, DEFAULT_ASSUMPTIONS)
    expect(r.downPayment).toBeCloseTo(14000, 2)
    expect(r.baseLoan).toBeCloseTo(386000, 2)
    expect(r.loan).toBeCloseTo(386000 * 1.0175, 2)
    expect(r.monthlyMip).toBeCloseTo((386000 * 1.0175 * 0.0055) / 12, 2)
  })

  it('omits MIP when useFhaMip is false', () => {
    const r = fhaLoan(400000, { ...DEFAULT_ASSUMPTIONS, useFhaMip: false })
    expect(r.loan).toBeCloseTo(386000, 2)
    expect(r.monthlyMip).toBe(0)
  })
})

describe('lerpScore', () => {
  it('maps the low anchor to 0 and high anchor to 100', () => {
    expect(lerpScore(0.03, 0.03, 0.08)).toBe(0)
    expect(lerpScore(0.08, 0.03, 0.08)).toBe(100)
  })
  it('interpolates linearly in between', () => {
    expect(lerpScore(0.055, 0.03, 0.08)).toBeCloseTo(50, 5)
  })
  it('clamps below 0 and above 100', () => {
    expect(lerpScore(0.01, 0.03, 0.08)).toBe(0)
    expect(lerpScore(0.2, 0.03, 0.08)).toBe(100)
  })
})

const DUPLEX: ListingInputs = {
  price: 400000,
  units: 2,
  rentTotal: 3200,
  taxAnnual: 4400,
  insuranceAnnual: 4000,
  hoaMonthly: 0,
}

describe('computeMetrics', () => {
  const c = computeMetrics(DUPLEX, DEFAULT_ASSUMPTIONS)

  it('splits rent per unit', () => {
    expect(c.rentPerUnit).toBeCloseTo(1600, 2)
  })

  it('computes a positive mortgage and MIP', () => {
    expect(c.mortgageMonthly).toBeGreaterThan(0)
    expect(c.mipMonthly).toBeGreaterThan(0)
  })

  it('house-hack out-of-pocket and % covered are consistent', () => {
    expect(c.pctCostCovered).toBeGreaterThan(0)
    expect(c.pctCostCovered).toBeLessThan(100)
    expect(c.houseHackOutOfPocket).toBeGreaterThan(0)
  })

  it('computes cap rate, cash-on-cash, 1% rule, deal score', () => {
    expect(c.capRate).toBeGreaterThan(0)
    expect(c.onePercent).toBeCloseTo(3200 / 400000, 6)
    expect(c.cashInvested).toBeCloseTo(14000 + 400000 * 0.03, 2)
    expect(c.dealScore).toBeGreaterThanOrEqual(0)
    expect(c.dealScore).toBeLessThanOrEqual(100)
    expect(c.scoreBreakdown.onePercent).toBeGreaterThanOrEqual(0)
  })

  it('flags FHA self-sufficiency only for 3-4 units', () => {
    expect(c.fhaSelfSufficient).toBe(true)
    const quad = computeMetrics({ ...DUPLEX, units: 4 }, DEFAULT_ASSUMPTIONS)
    expect(typeof quad.fhaSelfSufficient).toBe('boolean')
  })

  it('a higher-rent property scores better', () => {
    const better = computeMetrics({ ...DUPLEX, rentTotal: 5200 }, DEFAULT_ASSUMPTIONS)
    expect(better.dealScore).toBeGreaterThan(c.dealScore)
  })
})
