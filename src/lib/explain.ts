import type { Computed, Rating } from '../types'
import { rateMetric } from './tampa'
import { scoreTier } from '../config/assumptions'

const money = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US') + '/mo'

export interface Verdict {
  headline: string
  sentence: string
  tier: 'strong' | 'okay' | 'weak'
}

export function verdict(args: { units: number; computed: Computed }): Verdict {
  const { units, computed: c } = args
  const tier = scoreTier(c.dealScore)
  const headline =
    tier === 'strong' ? 'Strong deal' : tier === 'okay' ? 'Worth a look' : 'Probably skip'

  const coverage = Math.round(c.pctCostCovered)
  const liveCost = Math.round(c.houseHackOutOfPocket)
  const otherUnits = Math.max(units - 1, 0)

  let live: string
  if (liveCost <= 0) {
    live = `You'd live here for free — tenants cover all of it, leaving about ${money(-liveCost)} in your pocket`
  } else {
    live = `You'd pay about ${money(liveCost)} to live here while your ${
      otherUnits === 1 ? 'tenant covers' : `${otherUnits} tenants cover`
    } ${coverage}% of all the costs`
  }

  const cf = Math.round(c.fullRentalCashFlow)
  const rentAll =
    cf >= 0
      ? `Rent out all ${units} units later and it makes about ${money(cf)}`
      : `If you rented all ${units} units it would still cost you about ${money(cf)} out of your own pocket`

  const tail =
    tier === 'strong'
      ? `Solid for a Tampa ${unitWord(units)}.`
      : tier === 'okay'
        ? `Decent, but check the numbers.`
        : `The math is tight — be careful.`

  return { headline, tier, sentence: `${live}. ${rentAll}. ${tail}` }
}

function unitWord(units: number): string {
  return units === 2 ? 'duplex' : units === 3 ? 'triplex' : units === 4 ? 'fourplex' : 'multi'
}

export interface MetricAssessment {
  key: string
  label: string
  rating: Rating
  why: string
}

export function assessAll(c: Computed): MetricAssessment[] {
  const fhaRating: Rating = c.fhaSelfSufficient ? 'good' : 'concern'
  return [
    {
      key: 'houseHackCoverage',
      label: 'Cost to live here',
      rating: rateMetric('houseHackCoverage', c.pctCostCovered),
      why: 'How much of your total monthly cost the other units’ rent pays for. Closer to (or above) 100% means you live cheaply or free.',
    },
    {
      key: 'cashFlow',
      label: 'Rent all units',
      rating: rateMetric('cashFlow', c.fullRentalCashFlow),
      why: 'Money left over each month if you move out and rent every unit. Positive is the goal.',
    },
    {
      key: 'capRate',
      label: 'Cap rate',
      rating: rateMetric('capRate', c.capRate),
      why: 'The property’s yearly income as a % of price, ignoring the loan. In Tampa, 6%+ is good.',
    },
    {
      key: 'onePercent',
      label: '1% rule',
      rating: rateMetric('onePercent', c.onePercent),
      why: 'Monthly rent ÷ price. A quick screen — near 1% is strong; Tampa deals often land below it.',
    },
    {
      key: 'fhaSelfSufficient',
      label: 'FHA 3–4 unit rule',
      rating: fhaRating,
      why: 'For 3–4 units, FHA requires 75% of the rent to cover the mortgage+taxes+insurance. Failing it can block FHA financing.',
    },
  ]
}

export interface GlossaryEntry {
  term: string
  plain: string
  tampaExample?: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  capRate: {
    term: 'Cap rate',
    plain: 'Yearly net income divided by price, ignoring your loan. A way to compare properties apples-to-apples.',
    tampaExample: 'A $700k Tampa quad netting $42k/yr ≈ a 6% cap rate.',
  },
  cashOnCash: {
    term: 'Cash-on-cash return',
    plain: 'Your yearly cash profit divided by the cash you put in (down payment + closing). Shows how hard your money works.',
    tampaExample: 'Put in $50k, clear $5k/yr → 10% cash-on-cash.',
  },
  onePercent: {
    term: 'The 1% rule',
    plain: 'A quick gut-check: monthly rent should be near 1% of the price. Rarely hit in Tampa today, so treat it as a screen, not a law.',
  },
  houseHackCoverage: {
    term: 'House-hack coverage',
    plain: 'The share of your monthly costs the other units’ rent covers while you live in one. 100% means you live for free.',
  },
  fhaSelfSufficient: {
    term: 'FHA self-sufficiency',
    plain: 'An FHA rule for 3–4 unit homes: 75% of the total rent must cover the mortgage, taxes, and insurance — or FHA won’t approve the loan.',
  },
  mip: {
    term: 'MIP (mortgage insurance)',
    plain: 'A monthly fee FHA charges because you put little down. It’s built into the payment and lasts the life of most FHA loans.',
  },
  piti: {
    term: 'PITI',
    plain: 'Principal, Interest, Taxes, Insurance — the four pieces of your real monthly housing payment.',
  },
  noi: {
    term: 'NOI (net operating income)',
    plain: 'Yearly rent minus operating costs (not the loan). Cap rate is built from this.',
  },
  vacancy: {
    term: 'Vacancy',
    plain: 'A reserve for months a unit sits empty between tenants. We assume some every year so the numbers stay honest.',
  },
  downPayment: {
    term: 'Down payment',
    plain: 'Cash you put down up front. FHA allows as little as 3.5% if you live in the property.',
  },
  closingCosts: {
    term: 'Closing costs',
    plain: 'One-time fees to finalize the purchase (title, lender, etc.), usually a few percent of price.',
  },
}
