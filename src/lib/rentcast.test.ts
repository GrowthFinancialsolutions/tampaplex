import { describe, it, expect, vi } from 'vitest'
import { RentCastClient } from './rentcast'

function mockFetch(jsonBody: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => jsonBody,
    text: async () => JSON.stringify(jsonBody),
  } as Response)
}

describe('RentCastClient.saleListings', () => {
  it('sends the API key header and returns the listings array', async () => {
    const body = [{ id: 'a', formattedAddress: '1 Main St, Tampa, FL', price: 400000 }]
    const f = mockFetch(body)
    const client = new RentCastClient({ apiKey: 'KEY', fetchImpl: f })
    const res = await client.saleListings({ city: 'Tampa', state: 'FL' })

    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('a')
    const [url, init] = f.mock.calls[0]
    expect(String(url)).toContain('/listings/sale')
    expect(String(url)).toContain('city=Tampa')
    expect(String(url)).toContain('propertyType=Multi-Family')
    expect((init as RequestInit).headers).toMatchObject({ 'X-Api-Key': 'KEY' })
  })

  it('throws on a non-OK response', async () => {
    const f = mockFetch({ error: 'nope' }, false, 401)
    const client = new RentCastClient({ apiKey: 'KEY', fetchImpl: f })
    await expect(client.saleListings({ city: 'Tampa', state: 'FL' })).rejects.toThrow()
  })
})

describe('RentCastClient.rentEstimate', () => {
  it('returns the rent number', async () => {
    const f = mockFetch({ rent: 2500 })
    const client = new RentCastClient({ apiKey: 'KEY', fetchImpl: f })
    expect(await client.rentEstimate({ address: '1 Main St' })).toBe(2500)
  })

  it('returns null when the request errors', async () => {
    const f = mockFetch({}, false, 500)
    const client = new RentCastClient({ apiKey: 'KEY', fetchImpl: f })
    expect(await client.rentEstimate({ address: '1 Main St' })).toBeNull()
  })
})
