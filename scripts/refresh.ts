import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RentCastClient } from '../src/lib/rentcast'
import { mergeListings } from '../src/lib/refresh-core'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { Listing, ListingsFile } from '../src/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

async function main() {
  const apiKey = process.env.RENTCAST_API_KEY
  if (!apiKey) {
    console.error('Missing RENTCAST_API_KEY. Copy .env.example to .env and add your key.')
    process.exit(1)
  }
  const client = new RentCastClient({ apiKey })

  let prev: Listing[] = []
  if (existsSync(DATA)) {
    try {
      prev = (JSON.parse(readFileSync(DATA, 'utf8')) as ListingsFile).listings ?? []
    } catch {
      prev = []
    }
  }

  const raws = await client.saleListings({ city: 'Tampa', state: 'FL', propertyType: 'Multi-Family' })
  console.log(`Fetched ${raws.length} Tampa multi-family listings`)

  // Budget-aware rent AVM: only for NEW ids, capped to stay within the free tier.
  const prevIds = new Set(prev.map((l) => l.id))
  const budget = Number(process.env.RENT_AVM_BUDGET ?? 15)
  const rentByAddress: Record<string, number> = {}
  let spent = 0
  for (const r of raws) {
    if (spent >= budget) break
    if (prevIds.has(r.id)) continue
    const addr = r.formattedAddress ?? r.addressLine1
    if (!addr) continue
    const rent = await client.rentEstimate({
      address: addr,
      propertyType: 'Multi-Family',
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      squareFootage: r.squareFootage,
    })
    if (rent != null) {
      rentByAddress[addr] = rent
      spent++
    }
  }
  console.log(`Rent AVM fetched for ${spent} new listings. Total RentCast requests: ${client.requestCount}`)

  const now = new Date().toISOString()
  const listings = mergeListings(raws, prev, {
    assumptions: DEFAULT_ASSUMPTIONS,
    now,
    newListingDays: NEW_LISTING_DAYS,
    rentByAddress,
  })
  listings.sort((a, b) => b.computed.dealScore - a.computed.dealScore)

  const out: ListingsFile = {
    generatedAt: now,
    area: 'Tampa, FL (Hillsborough)',
    defaultAssumptions: DEFAULT_ASSUMPTIONS,
    listings,
  }
  mkdirSync(dirname(DATA), { recursive: true })
  writeFileSync(DATA, JSON.stringify(out, null, 2))
  console.log(`Wrote ${listings.length} listings → public/data/listings.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
