import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeListings } from '../src/lib/refresh-core'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { RawSaleListing } from '../src/lib/rentcast'
import type { ListingsFile } from '../src/types'

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
  { id: 'z-esperanza-3012', formattedAddress: '3012 S Esperanza Ave, Tampa, FL 33629', zipCode: '33629', bedrooms: 4, bathrooms: 4, squareFootage: 2600, price: 1180000, propertyType: 'Multi-Family' },
]

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

const now = new Date().toISOString()
const listings = mergeListings(listingsRaw, [], {
  assumptions: DEFAULT_ASSUMPTIONS,
  now,
  newListingDays: NEW_LISTING_DAYS,
})
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
