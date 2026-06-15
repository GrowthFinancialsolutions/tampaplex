import { describe, it, expect } from 'vitest'
import { mapZoneToRisk, lookupFloodZone } from './flood'

describe('mapZoneToRisk', () => {
  it('maps A/V zones to high', () => {
    expect(mapZoneToRisk('AE')).toBe('high')
    expect(mapZoneToRisk('A')).toBe('high')
    expect(mapZoneToRisk('VE')).toBe('high')
  })
  it('maps shaded X (0.2% chance) to moderate and plain X to low', () => {
    expect(mapZoneToRisk('X', '0.2 PCT ANNUAL CHANCE FLOOD HAZARD')).toBe('moderate')
    expect(mapZoneToRisk('X')).toBe('low')
  })
  it('maps empty/unknown to unknown', () => {
    expect(mapZoneToRisk('')).toBe('unknown')
    expect(mapZoneToRisk(undefined)).toBe('unknown')
  })
})

describe('lookupFloodZone', () => {
  const fakeFetch = (zone: string) =>
    (async () => ({
      ok: true,
      json: async () => ({ features: [{ attributes: { FLD_ZONE: zone, ZONE_SUBTY: '' } }] }),
    })) as unknown as typeof fetch

  it('returns zone + risk from a FEMA-shaped response', async () => {
    const r = await lookupFloodZone(27.95, -82.46, fakeFetch('AE'))
    expect(r).toEqual({ zone: 'AE', risk: 'high' })
  })
  it('returns unknown when no features', async () => {
    const empty = (async () => ({ ok: true, json: async () => ({ features: [] }) })) as unknown as typeof fetch
    const r = await lookupFloodZone(27.95, -82.46, empty)
    expect(r.risk).toBe('unknown')
  })
  it('returns unknown on network/HTTP error instead of throwing', async () => {
    const bad = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch
    const r = await lookupFloodZone(27.95, -82.46, bad)
    expect(r.risk).toBe('unknown')
  })
})
