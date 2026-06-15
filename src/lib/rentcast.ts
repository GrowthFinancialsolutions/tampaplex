const BASE = 'https://api.rentcast.io/v1'

export interface RawSaleListing {
  id: string
  formattedAddress?: string
  addressLine1?: string
  city?: string
  state?: string
  zipCode?: string
  latitude?: number
  longitude?: number
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number
  yearBuilt?: number
  price?: number
  listedDate?: string
  daysOnMarket?: number
  status?: string
}

export interface RentCastClientOptions {
  apiKey: string
  fetchImpl?: typeof fetch
}

export class RentCastClient {
  private apiKey: string
  private f: typeof fetch
  public requestCount = 0

  constructor(opts: RentCastClientOptions) {
    this.apiKey = opts.apiKey
    this.f = opts.fetchImpl ?? fetch
  }

  private async get(path: string, params: Record<string, string | number>): Promise<any> {
    const url = new URL(BASE + path)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
    this.requestCount++
    const res = await this.f(url.toString(), {
      headers: { 'X-Api-Key': this.apiKey, accept: 'application/json' },
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`RentCast ${path} failed: ${res.status} ${detail}`)
    }
    return res.json()
  }

  async saleListings(params: {
    city: string
    state: string
    propertyType?: string
    limit?: number
    offset?: number
  }): Promise<RawSaleListing[]> {
    const data = await this.get('/listings/sale', {
      city: params.city,
      state: params.state,
      propertyType: params.propertyType ?? 'Multi-Family',
      status: 'Active',
      limit: params.limit ?? 500,
      offset: params.offset ?? 0,
    })
    return Array.isArray(data) ? data : (data.listings ?? [])
  }

  async rentEstimate(params: {
    address: string
    propertyType?: string
    bedrooms?: number
    bathrooms?: number
    squareFootage?: number
  }): Promise<number | null> {
    try {
      const q: Record<string, string | number> = { address: params.address }
      if (params.propertyType) q.propertyType = params.propertyType
      if (params.bedrooms) q.bedrooms = params.bedrooms
      if (params.bathrooms) q.bathrooms = params.bathrooms
      if (params.squareFootage) q.squareFootage = params.squareFootage
      const data = await this.get('/avm/rent/long-term', q)
      return typeof data.rent === 'number' ? data.rent : null
    } catch {
      return null
    }
  }
}
