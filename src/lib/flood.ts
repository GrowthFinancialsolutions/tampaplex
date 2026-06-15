import type { FloodRisk, FloodZone } from '../types'

const NFHL_LAYER =
  'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query'

export function mapZoneToRisk(zone?: string, subtype?: string): FloodRisk {
  const z = (zone ?? '').toUpperCase().trim()
  if (!z) return 'unknown'
  if (z.startsWith('A') || z.startsWith('V')) return 'high'
  if (z === 'X' && (subtype ?? '').includes('0.2 PCT')) return 'moderate'
  if (z === 'X' || z === 'D' || z === 'B' || z === 'C') return 'low'
  return 'unknown'
}

/** Query FEMA's free National Flood Hazard Layer for a point. Never throws — errors → unknown. */
export async function lookupFloodZone(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
): Promise<FloodZone> {
  try {
    const url = new URL(NFHL_LAYER)
    url.searchParams.set('geometry', `${lng},${lat}`)
    url.searchParams.set('geometryType', 'esriGeometryPoint')
    url.searchParams.set('inSR', '4326')
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects')
    url.searchParams.set('outFields', 'FLD_ZONE,ZONE_SUBTY')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('f', 'json')
    const res = await fetchImpl(url.toString())
    if (!res.ok) return { zone: '', risk: 'unknown' }
    const data: any = await res.json()
    const attrs = data?.features?.[0]?.attributes
    const zone = attrs?.FLD_ZONE ?? ''
    return { zone, risk: mapZoneToRisk(zone, attrs?.ZONE_SUBTY) }
  } catch {
    return { zone: '', risk: 'unknown' }
  }
}
