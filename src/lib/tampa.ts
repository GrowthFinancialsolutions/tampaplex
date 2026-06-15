import type { Rating } from '../types'

export type MetricKey =
  | 'houseHackCoverage'
  | 'cashFlow'
  | 'capRate'
  | 'cashOnCash'
  | 'onePercent'

interface Band {
  good: number
  okay: number
}

export const TAMPA = {
  effectiveTaxRate: 0.011,
  insuranceFloor: 3000,
  insuranceRateOfPrice: 0.01,
  rentToPrice: { low: 0.006, typical: 0.007, strong: 0.009 },
  appreciationDefault: 0.03,
  bands: {
    houseHackCoverage: { good: 90, okay: 70 } as Band, // percent
    cashFlow: { good: 200, okay: 0 } as Band, // $/mo
    capRate: { good: 0.06, okay: 0.045 } as Band,
    cashOnCash: { good: 0.08, okay: 0.03 } as Band,
    onePercent: { good: 0.009, okay: 0.007 } as Band,
  },
} as const

/** Rate a metric value good/okay/concern using Tampa bands. Higher is better for all listed metrics. */
export function rateMetric(key: MetricKey, value: number): Rating {
  const b = TAMPA.bands[key]
  if (value >= b.good) return 'good'
  if (value >= b.okay) return 'okay'
  return 'concern'
}

export interface Neighborhood {
  name: string
  note: string
  coastalOrFlood?: boolean
}

export const NEIGHBORHOODS: Record<string, Neighborhood> = {
  '33602': {
    name: 'Downtown / Channel District',
    note: 'Urban core; condos and newer multis. Low-lying near the water.',
    coastalOrFlood: true,
  },
  '33603': {
    name: 'Seminole Heights / Tampa Heights',
    note: 'Popular, appreciating, lots of older multis — a house-hacker favorite.',
  },
  '33604': {
    name: 'Old Seminole Heights / Sulphur Springs',
    note: 'Mixed; pockets of value and pockets of flood risk near the river.',
    coastalOrFlood: true,
  },
  '33605': {
    name: 'Ybor City / East Tampa',
    note: 'Historic, walkable, mixed condition; verify rents block by block.',
  },
  '33606': {
    name: 'Hyde Park / Davis Islands',
    note: 'Pricey and desirable; much of it is coastal flood zone.',
    coastalOrFlood: true,
  },
  '33607': {
    name: 'West Tampa',
    note: 'Close to downtown and the stadium; redeveloping.',
  },
  '33609': {
    name: 'South Tampa (Palma Ceia area)',
    note: 'Strong rents, higher prices; low-lying in spots.',
    coastalOrFlood: true,
  },
  '33610': {
    name: 'East Tampa',
    note: 'Lower entry prices; do extra diligence on condition and area.',
  },
  '33611': {
    name: 'Ballast Point / South Tampa',
    note: 'Waterfront-adjacent; flood and windstorm insurance matter here.',
    coastalOrFlood: true,
  },
  '33612': {
    name: 'University / Forest Hills',
    note: 'Near USF; rental demand from students and staff.',
  },
  '33613': { name: 'University North', note: 'Affordable; USF rental demand.' },
  '33614': {
    name: 'Town N Country (east)',
    note: 'Lots of multis; some low-lying flood-prone streets.',
    coastalOrFlood: true,
  },
  '33616': {
    name: 'Port Tampa',
    note: 'Small, close to MacDill; coastal flood exposure.',
    coastalOrFlood: true,
  },
  '33629': {
    name: 'Sunset Park / South Tampa',
    note: 'High-end and waterfront; flood insurance is a real cost.',
    coastalOrFlood: true,
  },
}

export function neighborhoodForZip(zip: string): Neighborhood | undefined {
  return NEIGHBORHOODS[zip]
}

export function isFloodProneZip(zip: string): boolean {
  return NEIGHBORHOODS[zip]?.coastalOrFlood === true
}

/** Heads-up for pre-Florida-Building-Code (2002) homes: roof age + windstorm insurance. */
export function buildingAgeNote(yearBuilt?: number): string | undefined {
  if (!yearBuilt) return undefined
  if (yearBuilt < 2002) {
    return 'Built before Florida’s 2002 building code — check roof age and expect higher windstorm insurance. Verify with an inspector.'
  }
  return undefined
}
