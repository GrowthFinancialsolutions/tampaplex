import type { Assumptions } from '../types'

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  downPct: 0.035,
  rateAnnual: 0.069,
  termYears: 30,
  useFhaMip: true,
  fhaUpfrontMipPct: 0.0175,
  fhaAnnualMipPct: 0.0055,
  vacancyPct: 0.05,
  maintenancePct: 0.05,
  capexPct: 0.05,
  mgmtPct: 0.08,
  utilitiesMonthly: 0,
  closingPct: 0.03,
  scoreWeights: { houseHack: 0.35, cashOnCash: 0.3, capRate: 0.2, onePercent: 0.15 },
  scoreAnchors: {
    houseHack: [0, 130],
    cashOnCash: [0, 0.12],
    capRate: [0.03, 0.08],
    onePercent: [0.005, 0.012],
  },
}

export const NEW_LISTING_DAYS = 7

export function scoreTier(score: number): 'strong' | 'okay' | 'weak' {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'okay'
  return 'weak'
}
