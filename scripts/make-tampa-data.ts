import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeListings, estimateRentTotal } from '../src/lib/refresh-core'
import { computeMetrics } from '../src/lib/math'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { RawSaleListing } from '../src/lib/rentcast'
import type { ListingsFile, RentSource } from '../src/types'

// Real Tampa 2–4 unit for-sale listings, factual data points (address, price,
// beds/baths/sqft) gathered by browsing Zillow. No photos or marketing copy.
// Rents are ESTIMATED by the app (labeled as such) until refined. Re-run this
// builder whenever you want to refresh the set: `npm run tampa`.
const listingsRaw: RawSaleListing[] = [
  { id: 'z-alaska-8405', formattedAddress: '8405 N Alaska St, Tampa, FL 33604', zipCode: '33604', bedrooms: 4, bathrooms: 2, squareFootage: 1624, price: 289900, propertyType: 'Multi-Family' },
  { id: 'z-brooks-8103', formattedAddress: '8103 N Brooks St, Tampa, FL 33604', zipCode: '33604', bedrooms: 4, bathrooms: 2, squareFootage: 1366, price: 295000, propertyType: 'Multi-Family' },
  { id: 'z-harper-2405', formattedAddress: '2405 Harper St, Tampa, FL 33605', zipCode: '33605', bedrooms: 5, bathrooms: 3, squareFootage: 1140, price: 349000, propertyType: 'Multi-Family' },
  { id: 'z-floribraska-415', formattedAddress: '415 E Floribraska Ave, Tampa, FL 33603', zipCode: '33603', bedrooms: 4, bathrooms: 2, squareFootage: 1736, price: 365000, propertyType: 'Multi-Family' },
  { id: 'z-howard-4103', formattedAddress: '4103 N Howard Ave, Tampa, FL 33607', zipCode: '33607', bedrooms: 6, bathrooms: 2, squareFootage: 1864, price: 464900, propertyType: 'Multi-Family' },
  { id: 'z-kissimmee-6713', formattedAddress: '6713 S Kissimmee St, Tampa, FL 33616', zipCode: '33616', bedrooms: 8, bathrooms: 4, squareFootage: 2268, price: 585000, propertyType: 'Multi-Family' },
  { id: 'z-columbus-2313', formattedAddress: '2313 E Columbus Dr, Tampa, FL 33605', zipCode: '33605', bedrooms: 6, bathrooms: 4, squareFootage: 2360, price: 699999, yearBuilt: 2024, propertyType: 'Multi-Family' },
  // (3012 S Esperanza Ave dropped: it's a single 4-bed townhome — one side of a duplex,
  // not a 2–4 unit property you can house-hack.)
]

// Real data read from each listing's description (rent rolls / unit counts).
// `rent` is total monthly gross; `units` corrects the bedroom-based heuristic.
const OVERRIDES: Record<string, { units?: number; rent?: number; rentSource?: RentSource }> = {
  'z-alaska-8405': { rent: 2700, rentSource: 'manual' }, // both units rented: $1,400 + $1,300
  'z-harper-2405': { rent: 2650, rentSource: 'manual' }, // $1,500 + $1,150 gross
  'z-floribraska-415': { rent: 3200, rentSource: 'manual' }, // 1 unit leased $1,600; vacant unit comparable
  'z-columbus-2313': { units: 2, rent: 5000, rentSource: 'manual' }, // duplex, ~$2,500/unit (new construction, projected)
  'z-howard-4103': { units: 2 }, // "two 3-bedroom units" = duplex, not triplex (rent re-estimated)
  // z-brooks-8103 (3bd+1bd duplex) and z-kissimmee-6713 (four 2bd units, vacant): no stated rent, keep estimate
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

const now = new Date().toISOString()
const listings = mergeListings(listingsRaw, [], {
  assumptions: DEFAULT_ASSUMPTIONS,
  now,
  newListingDays: NEW_LISTING_DAYS,
})

// Apply real rent rolls + corrected unit counts, then recompute metrics.
for (const l of listings) {
  const o = OVERRIDES[l.id]
  if (!o) continue
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
