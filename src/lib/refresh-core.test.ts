import { describe, it, expect } from 'vitest'
import {
  mergeListings,
  estimateUnits,
  estimateInsuranceAnnual,
  recompute,
  buildListing,
} from './refresh-core'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { FloodZone, Listing } from '../types'
import type { RawSaleListing } from './rentcast'

const NOW = '2026-06-15T12:00:00.000Z'
const raw: RawSaleListing = {
  id: 'x1',
  formattedAddress: '100 Bay St, Tampa, FL 33602',
  zipCode: '33602',
  bedrooms: 4,
  bathrooms: 2,
  squareFootage: 2000,
  price: 450000,
  propertyType: 'Multi-Family',
}

describe('estimate helpers', () => {
  it('floors Florida insurance at $3,000 or 1% of price', () => {
    expect(estimateInsuranceAnnual(200000)).toBe(3000)
    expect(estimateInsuranceAnnual(500000)).toBe(5000)
  })
  it('estimates 2 units by default', () => {
    expect(estimateUnits({ id: 'a', bedrooms: 4 })).toBe(2)
  })
})

describe('mergeListings', () => {
  it('marks a brand-new listing as new with firstSeen = now', () => {
    const out = mergeListings([raw], [], {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
    })
    expect(out).toHaveLength(1)
    expect(out[0].firstSeen).toBe(NOW)
    expect(out[0].isNew).toBe(true)
    expect(out[0].computed.dealScore).toBeGreaterThanOrEqual(0)
  })

  it('preserves firstSeen from a previous run and un-flags old listings', () => {
    const prev: Listing[] = [
      {
        id: 'x1',
        address: '100 Bay St',
        zip: '33602',
        beds: 4,
        baths: 2,
        sqft: 2000,
        propertyType: 'Multi-Family',
        firstSeen: '2026-05-01T00:00:00.000Z',
        isNew: true,
        rentSource: 'rentcast',
        taxSource: 'estimated',
        price: 450000,
        units: 2,
        rentTotal: 3600,
        taxAnnual: 4950,
        insuranceAnnual: 4500,
        hoaMonthly: 0,
        computed: {} as Listing['computed'],
      },
    ]
    const out = mergeListings([raw], prev, {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
    })
    expect(out[0].firstSeen).toBe('2026-05-01T00:00:00.000Z')
    expect(out[0].isNew).toBe(false)
    expect(out[0].rentTotal).toBe(3600)
    expect(out[0].rentSource).toBe('rentcast')
  })

  it('uses a fetched AVM rent when provided', () => {
    const out = mergeListings([raw], [], {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
      rentByAddress: { '100 Bay St, Tampa, FL 33602': 4200 },
    })
    expect(out[0].rentTotal).toBe(4200)
    expect(out[0].rentSource).toBe('rentcast')
  })
})

describe('recompute', () => {
  it('applies a rent override and changes the deal score', () => {
    const base = mergeListings([raw], [], {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
    })[0]
    const bumped = recompute(base, { rentTotal: base.rentTotal + 2000 }, DEFAULT_ASSUMPTIONS)
    expect(bumped.dealScore).toBeGreaterThan(base.computed.dealScore)
  })
})

describe('buildListing flood zone', () => {
  const floodRaw = {
    id: 'x1',
    price: 600000,
    bedrooms: 6,
    zipCode: '33606',
    latitude: 27.9,
    longitude: -82.5,
  }

  it('attaches a provided flood zone', () => {
    const fz: FloodZone = { zone: 'AE', risk: 'high' }
    const built = buildListing(floodRaw as RawSaleListing, undefined, {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
      floodById: { x1: fz },
    })
    expect(built.floodZone).toEqual(fz)
  })

  it('carries the previous flood zone when none is provided', () => {
    const prev = { floodZone: { zone: 'X', risk: 'low' } } as Listing
    const built = buildListing(floodRaw as RawSaleListing, prev, {
      assumptions: DEFAULT_ASSUMPTIONS,
      now: NOW,
      newListingDays: 7,
    })
    expect(built.floodZone).toEqual({ zone: 'X', risk: 'low' })
  })
})
