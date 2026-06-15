import type { Assumptions, ListingInputs, Computed, ScoreBreakdown } from '../types'

/** Monthly mortgage payment (principal + interest) via standard amortization. */
export function monthlyMortgage(loan: number, annualRate: number, termYears: number): number {
  if (loan <= 0) return 0
  const i = annualRate / 12
  const n = termYears * 12
  if (i === 0) return loan / n
  const factor = Math.pow(1 + i, n)
  return (loan * (i * factor)) / (factor - 1)
}

export interface FhaLoanResult {
  downPayment: number
  baseLoan: number
  loan: number
  monthlyMip: number
}

/** FHA financing: down payment, base loan, financed upfront MIP, and monthly MIP. */
export function fhaLoan(price: number, a: Assumptions): FhaLoanResult {
  const downPayment = price * a.downPct
  const baseLoan = price - downPayment
  const loan = a.useFhaMip ? baseLoan * (1 + a.fhaUpfrontMipPct) : baseLoan
  const monthlyMip = a.useFhaMip ? (loan * a.fhaAnnualMipPct) / 12 : 0
  return { downPayment, baseLoan, loan, monthlyMip }
}

/** Map a value from [atZero..atHundred] onto [0..100], clamped. */
export function lerpScore(value: number, atZero: number, atHundred: number): number {
  if (atHundred === atZero) return 0
  const t = (value - atZero) / (atHundred - atZero)
  return Math.max(0, Math.min(100, t * 100))
}

/** Compute all investment metrics for a listing under both scenarios. */
export function computeMetrics(inp: ListingInputs, a: Assumptions): Computed {
  const units = inp.units > 0 ? inp.units : 1
  const rentTotal = inp.rentTotal
  const rentPerUnit = rentTotal / units

  const { downPayment, loan, monthlyMip } = fhaLoan(inp.price, a)
  const mortgageMonthly = monthlyMortgage(loan, a.rateAnnual, a.termYears)

  const taxMonthly = inp.taxAnnual / 12
  const insMonthly = inp.insuranceAnnual / 12
  const hoaMonthly = inp.hoaMonthly

  // --- Scenario A: live in one unit, rent the others ---
  const rentedRentA = (rentTotal * (units - 1)) / units
  const opexA =
    a.vacancyPct * rentedRentA +
    a.maintenancePct * rentTotal +
    a.capexPct * rentTotal +
    hoaMonthly +
    a.utilitiesMonthly
  const totalCostA = mortgageMonthly + monthlyMip + taxMonthly + insMonthly + opexA
  const houseHackOutOfPocket = totalCostA - rentedRentA
  const pctCostCovered = totalCostA > 0 ? (rentedRentA / totalCostA) * 100 : 0

  // --- Scenario B: rent all units ---
  const opexB =
    a.vacancyPct * rentTotal +
    a.maintenancePct * rentTotal +
    a.capexPct * rentTotal +
    a.mgmtPct * rentTotal +
    hoaMonthly +
    a.utilitiesMonthly
  const noiAnnual = (rentTotal - opexB) * 12 - inp.taxAnnual - inp.insuranceAnnual
  const capRate = inp.price > 0 ? noiAnnual / inp.price : 0
  const fullRentalCashFlow =
    rentTotal - opexB - taxMonthly - insMonthly - mortgageMonthly - monthlyMip
  const cashInvested = downPayment + inp.price * a.closingPct
  const cashOnCash = cashInvested > 0 ? (fullRentalCashFlow * 12) / cashInvested : 0

  // --- 1% rule ---
  const onePercent = inp.price > 0 ? rentTotal / inp.price : 0

  // --- FHA self-sufficiency (3-4 units only): 75% of rent must cover PITI ---
  const piti = mortgageMonthly + monthlyMip + taxMonthly + insMonthly
  const fhaSelfSufficient = units >= 3 ? 0.75 * rentTotal >= piti : true

  // --- Deal score ---
  const scoreBreakdown: ScoreBreakdown = {
    houseHack: lerpScore(pctCostCovered, a.scoreAnchors.houseHack[0], a.scoreAnchors.houseHack[1]),
    cashOnCash: lerpScore(cashOnCash, a.scoreAnchors.cashOnCash[0], a.scoreAnchors.cashOnCash[1]),
    capRate: lerpScore(capRate, a.scoreAnchors.capRate[0], a.scoreAnchors.capRate[1]),
    onePercent: lerpScore(onePercent, a.scoreAnchors.onePercent[0], a.scoreAnchors.onePercent[1]),
  }
  const dealScore =
    scoreBreakdown.houseHack * a.scoreWeights.houseHack +
    scoreBreakdown.cashOnCash * a.scoreWeights.cashOnCash +
    scoreBreakdown.capRate * a.scoreWeights.capRate +
    scoreBreakdown.onePercent * a.scoreWeights.onePercent

  return {
    rentPerUnit,
    mortgageMonthly,
    mipMonthly: monthlyMip,
    houseHackOutOfPocket,
    pctCostCovered,
    fullRentalCashFlow,
    capRate,
    cashOnCash,
    noiAnnual,
    onePercent,
    fhaSelfSufficient,
    cashInvested,
    dealScore: Math.max(0, Math.min(100, dealScore)),
    scoreBreakdown,
  }
}

export interface EquityProjectionInput {
  price: number
  loan: number
  annualRate: number
  termYears: number
  appreciationAnnual: number
  years: number
}

export interface EquityProjection {
  years: number
  futureValue: number
  loanBalance: number
  estimatedEquity: number
}

/** Estimated equity after N years: appreciation on value + principal paid down. */
export function equityProjection(p: EquityProjectionInput): EquityProjection {
  const futureValue = p.price * Math.pow(1 + p.appreciationAnnual, p.years)
  const payment = monthlyMortgage(p.loan, p.annualRate, p.termYears)
  const i = p.annualRate / 12
  const months = p.years * 12
  let balance = p.loan
  for (let m = 0; m < months; m++) {
    const interest = balance * i
    balance = balance - (payment - interest)
  }
  balance = Math.max(0, balance)
  return {
    years: p.years,
    futureValue,
    loanBalance: balance,
    estimatedEquity: futureValue - balance,
  }
}
