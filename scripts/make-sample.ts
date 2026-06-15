import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeListings } from '../src/lib/refresh-core'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { RawSaleListing } from '../src/lib/rentcast'
import type { FloodZone, ListingsFile } from '../src/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

const sample: RawSaleListing[] = [
  { id: 's1', formattedAddress: '1204 E 12th Ave, Tampa, FL 33605', zipCode: '33605', bedrooms: 4, bathrooms: 2, squareFootage: 1800, price: 389000, yearBuilt: 1996, propertyType: 'Multi-Family', daysOnMarket: 3, listedDate: '2026-06-12' },
  { id: 's2', formattedAddress: '3010 W Cherry St, Tampa, FL 33607', zipCode: '33607', bedrooms: 6, bathrooms: 3, squareFootage: 2600, price: 575000, yearBuilt: 2008, propertyType: 'Multi-Family', daysOnMarket: 21, listedDate: '2026-05-25' },
  { id: 's3', formattedAddress: '809 E Frierson Ave, Tampa, FL 33603', zipCode: '33603', bedrooms: 8, bathrooms: 4, squareFootage: 3400, price: 720000, yearBuilt: 1968, propertyType: 'Multi-Family', daysOnMarket: 40, listedDate: '2026-05-06' },
  { id: 's4', formattedAddress: '2515 N Albany Ave, Tampa, FL 33607', zipCode: '33607', bedrooms: 4, bathrooms: 2, squareFootage: 1650, price: 349000, yearBuilt: 2019, propertyType: 'Multi-Family', daysOnMarket: 1, listedDate: '2026-06-14' },
]

// Give the sample realistic rents (≈0.8–1.0% of price) so scores vary.
const rentByAddress: Record<string, number> = {
  '1204 E 12th Ave, Tampa, FL 33605': 4200,
  '3010 W Cherry St, Tampa, FL 33607': 6700,
  '809 E Frierson Ave, Tampa, FL 33603': 10200,
  '2515 N Albany Ave, Tampa, FL 33607': 2400,
}

// Varied flood zones so Simple mode shows the flags out of the box.
const floodById: Record<string, FloodZone> = {
  s1: { zone: 'X', risk: 'low' },
  s2: { zone: 'X', risk: 'moderate' },
  s3: { zone: 'AE', risk: 'high' },
  s4: { zone: 'X', risk: 'low' },
}

const now = new Date().toISOString()
const listings = mergeListings(sample, [], {
  assumptions: DEFAULT_ASSUMPTIONS,
  now,
  newListingDays: NEW_LISTING_DAYS,
  rentByAddress,
  floodById,
})
listings.sort((a, b) => b.computed.dealScore - a.computed.dealScore)

const out: ListingsFile = {
  generatedAt: now,
  area: 'Tampa, FL (SAMPLE DATA)',
  defaultAssumptions: DEFAULT_ASSUMPTIONS,
  listings,
}
mkdirSync(dirname(DATA), { recursive: true })
writeFileSync(DATA, JSON.stringify(out, null, 2))
console.log(`Wrote ${listings.length} sample listings → public/data/listings.json`)
