import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeListings, estimateRentTotal } from '../src/lib/refresh-core'
import { computeMetrics } from '../src/lib/math'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { RawSaleListing } from '../src/lib/rentcast'
import type { ListingsFile, ListingKind, RentSource } from '../src/types'

// Real Tampa listings, factual data points gathered by browsing Zillow (no photos
// or marketing copy). City of Tampa only. Rents are ESTIMATED unless a listing
// stated its rent roll. Re-run with `npm run tampa`.
const listingsRaw: RawSaleListing[] = [
  // --- Existing 2–4 unit (multi-family) ---
  { id: 'z-alaska-8405', formattedAddress: '8405 N Alaska St, Tampa, FL 33604', zipCode: '33604', bedrooms: 4, bathrooms: 2, squareFootage: 1624, price: 289900, propertyType: 'Multi-Family' },
  { id: 'z-brooks-8103', formattedAddress: '8103 N Brooks St, Tampa, FL 33604', zipCode: '33604', bedrooms: 4, bathrooms: 2, squareFootage: 1366, price: 295000, propertyType: 'Multi-Family' },
  { id: 'z-13th-8304', formattedAddress: '8304 N 13th St, Tampa, FL 33604', zipCode: '33604', bedrooms: 4, bathrooms: 2, squareFootage: 1484, price: 340000, propertyType: 'Multi-Family' },
  { id: 'z-harper-2405', formattedAddress: '2405 Harper St, Tampa, FL 33605', zipCode: '33605', bedrooms: 5, bathrooms: 3, squareFootage: 1140, price: 349000, propertyType: 'Multi-Family' },
  { id: 'z-floribraska-415', formattedAddress: '415 E Floribraska Ave, Tampa, FL 33603', zipCode: '33603', bedrooms: 4, bathrooms: 2, squareFootage: 1736, price: 365000, propertyType: 'Multi-Family' },
  { id: 'z-howard-4103', formattedAddress: '4103 N Howard Ave, Tampa, FL 33607', zipCode: '33607', bedrooms: 6, bathrooms: 2, squareFootage: 1864, price: 464900, propertyType: 'Multi-Family' },
  { id: 'z-columbus-2313', formattedAddress: '2313 E Columbus Dr, Tampa, FL 33605', zipCode: '33605', bedrooms: 6, bathrooms: 4, squareFootage: 2360, price: 699999, yearBuilt: 2024, propertyType: 'Multi-Family' },
  { id: 'z-wcolumbus-316', formattedAddress: '316 W Columbus Dr, Tampa, FL 33602', zipCode: '33602', bedrooms: 8, bathrooms: 6, squareFootage: 2606, price: 999999, propertyType: 'Multi-Family' },
  // (Dropped 6713 S Kissimmee St 33616 — Port Tampa, excluded per request to stay in
  // central Tampa; and 3012 S Esperanza — a single townhome, not multi-unit.)

  // --- Single-family conversion / add-a-unit candidates ---
  { id: 'z-chelsea-805', formattedAddress: '805 E Chelsea St, Tampa, FL 33603', zipCode: '33603', bedrooms: 3, bathrooms: 2, squareFootage: 1428, price: 444900, yearBuilt: 1913, propertyType: 'Single Family' },
  { id: 'z-cayuga-1404', formattedAddress: '1404 E Cayuga St, Tampa, FL 33603', zipCode: '33603', bedrooms: 4, bathrooms: 2, squareFootage: 1610, price: 459900, propertyType: 'Single Family' },
]

interface Override {
  units?: number
  rent?: number
  rentSource?: RentSource
  kind?: ListingKind
  zoning?: string
  lotSqft?: number
  conversionNote?: string
  listingUrl?: string
}

// Real data read from each listing's description (rent rolls, unit counts, zoning, lot).
const OVERRIDES: Record<string, Override> = {
  'z-alaska-8405': { rent: 2700, rentSource: 'manual' }, // both units rented: $1,400 + $1,300
  'z-harper-2405': { rent: 2650, rentSource: 'manual' }, // $1,500 + $1,150 gross
  'z-floribraska-415': { rent: 3200, rentSource: 'manual' }, // 1 unit leased $1,600; vacant unit comparable
  'z-columbus-2313': { units: 2, rent: 5000, rentSource: 'manual' }, // duplex, ~$2,500/unit (new construction, projected)
  'z-howard-4103': { units: 2 }, // "two 3-bedroom units" = duplex, not triplex (rent re-estimated)
  'z-wcolumbus-316': { units: 4 }, // large multi
  'z-chelsea-805': {
    kind: 'conversion',
    units: 1,
    rent: 0,
    rentSource: 'estimated',
    zoning: 'SH-RS',
    lotSqft: 10150,
    conversionNote:
      'Single-family home on an oversized 10,150 sqft lot in Seminole Heights. Florida’s 2025 ADU law and Tampa’s ADU rules may allow adding a backyard accessory unit — live in the house, rent the ADU. It is NOT a by-right duplex; confirm ADU eligibility with the City of Tampa and budget for the build.',
    listingUrl: 'https://www.zillow.com/homedetails/805-E-Chelsea-St-Tampa-FL-33603/45094106_zpid/',
  },
  'z-cayuga-1404': {
    kind: 'conversion',
    units: 1,
    rent: 0,
    rentSource: 'estimated',
    zoning: 'SH-RS',
    lotSqft: 11326,
    conversionNote:
      'Single-family home on a large 0.26-acre lot in Seminole Heights — room for a detached accessory dwelling unit (ADU) to rent under Florida’s 2025 ADU law / Tampa rules. Not a by-right duplex; verify ADU eligibility with the City of Tampa and budget for construction.',
    listingUrl: 'https://www.zillow.com/homes/1404-E-Cayuga-St-Tampa-FL-33603_rb/',
  },
  // z-brooks-8103, z-13th-8304: no stated rent, keep estimate + heuristic units.
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

const now = new Date().toISOString()
const listings = mergeListings(listingsRaw, [], {
  assumptions: DEFAULT_ASSUMPTIONS,
  now,
  newListingDays: NEW_LISTING_DAYS,
})

// Apply real rent rolls, corrected unit counts, and conversion metadata; recompute.
for (const l of listings) {
  const o = OVERRIDES[l.id]
  if (!o) continue
  if (o.kind) l.kind = o.kind
  if (o.zoning) l.zoning = o.zoning
  if (o.lotSqft != null) l.lotSqft = o.lotSqft
  if (o.conversionNote) l.conversionNote = o.conversionNote
  if (o.listingUrl) l.listingUrl = o.listingUrl
  if (o.units != null) l.units = o.units
  if (o.rent != null) {
    l.rentTotal = o.rent
    l.rentSource = o.rentSource ?? 'manual'
  } else if (o.units != null) {
    l.rentTotal = estimateRentTotal(l.price, l.beds, l.units) // re-estimate after unit fix
  }
  l.computed = computeMetrics(
    {
      price: l.price,
      units: l.units,
      rentTotal: l.rentTotal,
      taxAnnual: l.taxAnnual,
      insuranceAnnual: l.insuranceAnnual,
      hoaMonthly: l.hoaMonthly,
    },
    DEFAULT_ASSUMPTIONS,
  )
}

listings.sort((a, b) => b.computed.dealScore - a.computed.dealScore)

const out: ListingsFile = {
  generatedAt: now,
  area: 'Tampa, FL (current listings, manually compiled)',
  defaultAssumptions: DEFAULT_ASSUMPTIONS,
  listings,
}
mkdirSync(dirname(DATA), { recursive: true })
writeFileSync(DATA, JSON.stringify(out, null, 2))
console.log(`Wrote ${listings.length} Tampa listings -> public/data/listings.json`)
