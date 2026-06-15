export interface Assumptions {
  downPct: number
  rateAnnual: number
  termYears: number
  useFhaMip: boolean
  fhaUpfrontMipPct: number
  fhaAnnualMipPct: number
  vacancyPct: number
  maintenancePct: number
  capexPct: number
  mgmtPct: number
  utilitiesMonthly: number
  closingPct: number
  scoreWeights: { houseHack: number; cashOnCash: number; capRate: number; onePercent: number }
  scoreAnchors: {
    houseHack: [number, number]
    cashOnCash: [number, number]
    capRate: [number, number]
    onePercent: [number, number]
  }
}

export interface ListingInputs {
  price: number
  units: number
  rentTotal: number
  taxAnnual: number
  insuranceAnnual: number
  hoaMonthly: number
}

export interface ScoreBreakdown {
  houseHack: number
  cashOnCash: number
  capRate: number
  onePercent: number
}

export interface Computed {
  rentPerUnit: number
  mortgageMonthly: number
  mipMonthly: number
  houseHackOutOfPocket: number
  pctCostCovered: number
  fullRentalCashFlow: number
  capRate: number
  cashOnCash: number
  noiAnnual: number
  onePercent: number
  fhaSelfSufficient: boolean
  cashInvested: number
  dealScore: number
  scoreBreakdown: ScoreBreakdown
}

export type RentSource = 'rentcast' | 'estimated' | 'manual'
export type TaxSource = 'rentcast' | 'estimated'

export type FloodRisk = 'high' | 'moderate' | 'low' | 'unknown'

export interface FloodZone {
  zone: string // raw FEMA FLD_ZONE, e.g. "AE", "X"
  risk: FloodRisk
}

export type Rating = 'good' | 'okay' | 'concern'
export type ViewMode = 'simple' | 'pro'

// 'multi' = existing 2-4 unit property; 'conversion' = single-family that could
// gain a unit (ADU or duplex conversion) — a candidate to investigate, not a scored deal.
export type ListingKind = 'multi' | 'conversion'

export interface Listing extends ListingInputs {
  id: string
  address: string
  zip: string
  lat?: number
  lng?: number
  beds: number
  baths: number
  sqft: number
  yearBuilt?: number
  propertyType: string
  listedDate?: string
  firstSeen: string
  daysOnMarket?: number
  isNew: boolean
  rentSource: RentSource
  taxSource: TaxSource
  floodZone?: FloodZone
  kind?: ListingKind // undefined treated as 'multi'
  zoning?: string
  lotSqft?: number
  conversionNote?: string
  photoUrl?: string
  listingUrl?: string
  computed: Computed
}

export interface ListingsFile {
  generatedAt: string
  area: string
  defaultAssumptions: Assumptions
  listings: Listing[]
}
