import type { Assumptions, Computed, FloodZone, Listing, ListingInputs } from '../types'
import type { RawSaleListing } from './rentcast'
import type { Overrides } from './favorites'
import { computeMetrics } from './math'

export function estimateUnits(raw: RawSaleListing): number {
  const beds = raw.bedrooms ?? 0
  if (beds >= 8) return 4
  if (beds >= 6) return 3
  return 2
}

export function estimateTaxAnnual(price: number, effRate = 0.011): number {
  return Math.round(price * effRate)
}

export function estimateInsuranceAnnual(price: number): number {
  return Math.max(3000, Math.round(price * 0.01))
}

// Rough Tampa gross rent per unit by bedrooms-per-unit (2026 ballpark, estimate only).
const TAMPA_RENT_BY_BEDS: Record<number, number> = { 0: 1300, 1: 1350, 2: 1650, 3: 2050, 4: 2400 }

/**
 * Estimate total monthly gross rent for a multi-family property.
 * Uses a per-unit, bedroom-based market estimate (more realistic for 2-4 unit
 * homes than a flat % of price). Falls back to a price-based guess when the
 * bedroom count is unknown. Always an ESTIMATE — refine with real rents.
 */
export function estimateRentTotal(price: number, beds = 0, units = 1): number {
  const u = units > 0 ? units : 1
  if (beds <= 0) return Math.round(price * 0.007)
  const bedsPerUnit = Math.max(1, Math.min(4, Math.round(beds / u)))
  return TAMPA_RENT_BY_BEDS[bedsPerUnit] * u
}

export interface BuildOptions {
  assumptions: Assumptions
  now: string
  newListingDays: number
  rentByAddress?: Record<string, number>
  floodById?: Record<string, FloodZone>
}

export function buildListing(
  raw: RawSaleListing,
  prev: Listing | undefined,
  opts: BuildOptions,
): Listing {
  const price = raw.price ?? 0
  const units = estimateUnits(raw)
  const address = raw.formattedAddress ?? raw.addressLine1 ?? 'Unknown address'

  let rentTotal: number
  let rentSource: Listing['rentSource']
  if (opts.rentByAddress && opts.rentByAddress[address] != null) {
    rentTotal = opts.rentByAddress[address]
    rentSource = 'rentcast'
  } else if (prev && prev.rentSource !== 'estimated') {
    rentTotal = prev.rentTotal
    rentSource = prev.rentSource
  } else {
    rentTotal = estimateRentTotal(price, raw.bedrooms ?? 0, units)
    rentSource = 'estimated'
  }

  const taxAnnual = estimateTaxAnnual(price)
  const insuranceAnnual = estimateInsuranceAnnual(price)
  const hoaMonthly = 0

  const inputs: ListingInputs = { price, units, rentTotal, taxAnnual, insuranceAnnual, hoaMonthly }
  const computed = computeMetrics(inputs, opts.assumptions)

  const firstSeen = prev?.firstSeen ?? opts.now
  const ageDays = (Date.parse(opts.now) - Date.parse(firstSeen)) / 86_400_000
  const isNew = ageDays <= opts.newListingDays

  const floodZone = opts.floodById?.[raw.id] ?? prev?.floodZone

  return {
    id: raw.id,
    address,
    zip: raw.zipCode ?? '',
    lat: raw.latitude,
    lng: raw.longitude,
    beds: raw.bedrooms ?? 0,
    baths: raw.bathrooms ?? 0,
    sqft: raw.squareFootage ?? 0,
    yearBuilt: raw.yearBuilt,
    propertyType: raw.propertyType ?? 'Multi-Family',
    listedDate: raw.listedDate,
    firstSeen,
    daysOnMarket: raw.daysOnMarket,
    isNew,
    rentSource,
    taxSource: 'estimated',
    floodZone,
    photoUrl: undefined,
    listingUrl: undefined,
    price,
    units,
    rentTotal,
    taxAnnual,
    insuranceAnnual,
    hoaMonthly,
    computed,
  }
}

export function mergeListings(
  raws: RawSaleListing[],
  prev: Listing[],
  opts: BuildOptions,
): Listing[] {
  const prevById = new Map(prev.map((l) => [l.id, l]))
  return raws.map((r) => buildListing(r, prevById.get(r.id), opts))
}

/** Recompute a listing's metrics with user overrides + current assumptions. */
export function recompute(
  listing: Listing,
  overrides: Overrides | undefined,
  assumptions: Assumptions,
): Computed {
  const inputs: ListingInputs = {
    price: listing.price,
    units: overrides?.units ?? listing.units,
    rentTotal: overrides?.rentTotal ?? listing.rentTotal,
    taxAnnual: overrides?.taxAnnual ?? listing.taxAnnual,
    insuranceAnnual: overrides?.insuranceAnnual ?? listing.insuranceAnnual,
    hoaMonthly: listing.hoaMonthly,
  }
  return computeMetrics(inputs, assumptions)
}
