import { describe, it, expect } from 'vitest'
import { verdict, assessAll, GLOSSARY } from './explain'
import { computeMetrics } from './math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { ListingInputs } from '../types'

const inputs: ListingInputs = {
  price: 720000,
  units: 4,
  rentTotal: 7600,
  taxAnnual: 7920,
  insuranceAnnual: 7200,
  hoaMonthly: 0,
}
const computed = computeMetrics(inputs, DEFAULT_ASSUMPTIONS)

describe('verdict', () => {
  it('produces a plain-English sentence mentioning monthly cost and coverage', () => {
    const v = verdict({ units: 4, computed })
    expect(v.sentence).toMatch(/\$[\d,]+\/mo/)
    expect(v.sentence).toMatch(/cover/)
    expect(['strong', 'okay', 'weak']).toContain(v.tier)
  })
  it('phrases negative coverage as money out of your pocket', () => {
    const weak = computeMetrics({ ...inputs, rentTotal: 1500 }, DEFAULT_ASSUMPTIONS)
    const v = verdict({ units: 4, computed: weak })
    expect(v.sentence).toMatch(/out of your own pocket|you’d (still )?cover/i)
  })
})

describe('assessAll', () => {
  it('returns a rating + plain why for each headline metric', () => {
    const items = assessAll(computed)
    const keys = items.map((i) => i.key)
    expect(keys).toEqual(
      expect.arrayContaining(['houseHackCoverage', 'cashFlow', 'capRate', 'onePercent']),
    )
    for (const i of items) {
      expect(['good', 'okay', 'concern']).toContain(i.rating)
      expect(i.why.length).toBeGreaterThan(0)
      expect(i.label.length).toBeGreaterThan(0)
    }
  })
})

describe('GLOSSARY', () => {
  it('defines every headline metric and key FHA term in plain English', () => {
    for (const term of [
      'capRate',
      'cashOnCash',
      'onePercent',
      'houseHackCoverage',
      'fhaSelfSufficient',
      'mip',
      'piti',
      'noi',
    ]) {
      expect(GLOSSARY[term]).toBeTruthy()
      expect(GLOSSARY[term].plain.length).toBeGreaterThan(10)
    }
  })
})
