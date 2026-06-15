import { describe, it, expect } from 'vitest'
import {
  TAMPA,
  rateMetric,
  neighborhoodForZip,
  isFloodProneZip,
  buildingAgeNote,
} from './tampa'

describe('rateMetric', () => {
  it('rates cap rate against Tampa bands', () => {
    expect(rateMetric('capRate', 0.07)).toBe('good')
    expect(rateMetric('capRate', 0.05)).toBe('okay')
    expect(rateMetric('capRate', 0.03)).toBe('concern')
  })
  it('rates house-hack coverage (higher is better)', () => {
    expect(rateMetric('houseHackCoverage', 95)).toBe('good')
    expect(rateMetric('houseHackCoverage', 80)).toBe('okay')
    expect(rateMetric('houseHackCoverage', 50)).toBe('concern')
  })
  it('rates cash flow with negative as concern', () => {
    expect(rateMetric('cashFlow', 300)).toBe('good')
    expect(rateMetric('cashFlow', 50)).toBe('okay')
    expect(rateMetric('cashFlow', -100)).toBe('concern')
  })
})

describe('neighborhoodForZip', () => {
  it('returns a known Tampa neighborhood', () => {
    expect(neighborhoodForZip('33603')?.name).toMatch(/Seminole Heights/i)
  })
  it('returns undefined for unknown zip', () => {
    expect(neighborhoodForZip('99999')).toBeUndefined()
  })
})

describe('isFloodProneZip', () => {
  it('flags a coastal Tampa zip', () => {
    expect(isFloodProneZip('33606')).toBe(true)
  })
  it('does not flag an inland zip', () => {
    expect(isFloodProneZip('33612')).toBe(false)
  })
})

describe('buildingAgeNote', () => {
  it('warns for pre-2002 buildings', () => {
    expect(buildingAgeNote(1985)).toMatch(/2002|building code|roof/i)
  })
  it('is undefined for newer builds and missing year', () => {
    expect(buildingAgeNote(2015)).toBeUndefined()
    expect(buildingAgeNote(undefined)).toBeUndefined()
  })
})

describe('TAMPA benchmarks', () => {
  it('exposes tunable bands as a single source of truth', () => {
    expect(TAMPA.appreciationDefault).toBeGreaterThan(0)
    expect(TAMPA.bands.capRate.good).toBeGreaterThan(TAMPA.bands.capRate.okay)
  })
})
