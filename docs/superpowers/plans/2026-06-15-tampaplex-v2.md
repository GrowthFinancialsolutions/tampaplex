# TampaPlex v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TampaPlex usable by a real-estate beginner (plain-English verdicts, explained metrics, Tampa-specific guidance) without removing any advanced capability, and prepare a free daily auto-refresh + GitHub Pages deploy.

**Architecture:** Layer a presentation + guidance tier on top of the existing pure math. New pure, unit-tested modules (`tampa.ts`, `explain.ts`, `flood.ts`, plus `equityProjection` in `math.ts`) hold all logic; React components render Simple vs Pro modes from the same `recompute()` pipeline. All explanations are rule-based and run offline — no paid APIs, no runtime LLM. Flood data is fetched once at refresh time from FEMA's free map service and baked into `listings.json`.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind v4 + Vitest + React Testing Library. Node (tsx) refresh script. GitHub Actions + GitHub Pages.

**Conventions:**
- Run a single test file: `npx vitest run src/lib/<name>.test.ts`
- Run all tests: `npm test`
- Branch: `tampaplex-v2` (already created). Commit after each task.
- Keep the existing 27 tests green throughout.

---

## File structure

New files:
- `src/lib/tampa.ts` + `src/lib/tampa.test.ts` — Tampa reference data, benchmarks, neighborhood/age/flood-fallback helpers.
- `src/lib/explain.ts` + `src/lib/explain.test.ts` — verdict sentence, per-metric assessment, glossary.
- `src/lib/flood.ts` + `src/lib/flood.test.ts` — FEMA flood-zone lookup (refresh-time).
- `src/components/ExplainTip.tsx` — reusable `?` popover.
- `src/components/MetricTile.tsx` — labeled value + rating dot + ExplainTip.
- `src/components/Verdict.tsx` — plain-English callout.
- `src/components/TampaFlags.tsx` — flood/insurance/age flag stack.
- `src/components/SimpleListingCard.tsx` — the beginner card.
- `src/components/ModeToggle.tsx` — Simple/Pro switch.
- `src/components/Onboarding.tsx` — first-run intro.
- `src/components/Guide.tsx` — how-it-works + glossary.
- `src/components/NotesField.tsx` — per-listing notes textarea.
- `src/lib/csv.ts` + `src/lib/csv.test.ts` — favorites → CSV.
- `.github/workflows/refresh-and-deploy.yml` — daily refresh + Pages deploy.
- `src/components/SimpleListingCard.test.tsx`, `src/components/ModeToggle.test.tsx` — component smoke tests.

Modified files:
- `src/types.ts` — add `Listing.floodZone?`, `Store` fields, shared rating types.
- `src/lib/math.ts` — add `equityProjection`.
- `src/lib/favorites.ts` — add `mode`/`onboarded` to store + setters.
- `src/lib/refresh-core.ts` — thread `floodZone` through `buildListing`.
- `scripts/refresh.ts` — call flood lookup with a per-run budget.
- `scripts/make-sample.ts` — add `floodZone` + variety to samples.
- `src/components/FilterBar.tsx` — add flood/year/self-sufficiency filters.
- `src/components/ListingDetail.tsx` — beginner annotations, NotesField, 5-yr outlook.
- `src/App.tsx` — mode state, onboarding, Guide, Simple vs Pro routing, CSV export.
- `vite.config.ts` — `base` for GitHub Pages.
- `README.md` — go-live checklist.

---

# Phase A — Pure foundations (logic first, TDD)

## Task 1: Extend shared types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add flood + rating + store-related types to `src/types.ts`**

Add these exports (append near the top, after existing `RentSource`/`TaxSource`):

```typescript
export type FloodRisk = 'high' | 'moderate' | 'low' | 'unknown'

export interface FloodZone {
  zone: string        // raw FEMA FLD_ZONE, e.g. "AE", "X"
  risk: FloodRisk
}

export type Rating = 'good' | 'okay' | 'concern'
export type ViewMode = 'simple' | 'pro'
```

Add `floodZone?: FloodZone` to the `Listing` interface (after `taxSource`):

```typescript
  floodZone?: FloodZone
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS (no errors; field is optional so existing code compiles).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add FloodZone, Rating, ViewMode; Listing.floodZone"
```

---

## Task 2: Tampa reference data + helpers

**Files:**
- Create: `src/lib/tampa.ts`
- Test: `src/lib/tampa.test.ts`

- [ ] **Step 1: Write the failing test** (`src/lib/tampa.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import {
  TAMPA,
  rateMetric,
  neighborhoodForZip,
  isFloodProneZip,
  buildingAgeNote,
} from './tampa'

describe('rateMetric', () => {
  it('rates cap rate against Tampa bands', () => {
    expect(rateMetric('capRate', 0.07)).toBe('good')
    expect(rateMetric('capRate', 0.05)).toBe('okay')
    expect(rateMetric('capRate', 0.03)).toBe('concern')
  })
  it('rates house-hack coverage (higher is better)', () => {
    expect(rateMetric('houseHackCoverage', 95)).toBe('good')
    expect(rateMetric('houseHackCoverage', 80)).toBe('okay')
    expect(rateMetric('houseHackCoverage', 50)).toBe('concern')
  })
  it('rates cash flow with negative as concern', () => {
    expect(rateMetric('cashFlow', 300)).toBe('good')
    expect(rateMetric('cashFlow', 50)).toBe('okay')
    expect(rateMetric('cashFlow', -100)).toBe('concern')
  })
})

describe('neighborhoodForZip', () => {
  it('returns a known Tampa neighborhood', () => {
    expect(neighborhoodForZip('33603')?.name).toMatch(/Seminole Heights/i)
  })
  it('returns undefined for unknown zip', () => {
    expect(neighborhoodForZip('99999')).toBeUndefined()
  })
})

describe('isFloodProneZip', () => {
  it('flags a coastal Tampa zip', () => {
    expect(isFloodProneZip('33606')).toBe(true)
  })
  it('does not flag an inland zip', () => {
    expect(isFloodProneZip('33612')).toBe(false)
  })
})

describe('buildingAgeNote', () => {
  it('warns for pre-2002 buildings', () => {
    expect(buildingAgeNote(1985)).toMatch(/2002|building code|roof/i)
  })
  it('is undefined for newer builds and missing year', () => {
    expect(buildingAgeNote(2015)).toBeUndefined()
    expect(buildingAgeNote(undefined)).toBeUndefined()
  })
})

describe('TAMPA benchmarks', () => {
  it('exposes tunable bands as a single source of truth', () => {
    expect(TAMPA.appreciationDefault).toBeGreaterThan(0)
    expect(TAMPA.bands.capRate.good).toBeGreaterThan(TAMPA.bands.capRate.okay)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tampa.test.ts`
Expected: FAIL ("Cannot find module './tampa'").

- [ ] **Step 3: Write implementation** (`src/lib/tampa.ts`)

```typescript
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
    cashFlow: { good: 200, okay: 0 } as Band,          // $/mo
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
  '33602': { name: 'Downtown / Channel District', note: 'Urban core; condos and newer multis. Low-lying near the water.', coastalOrFlood: true },
  '33603': { name: 'Seminole Heights / Tampa Heights', note: 'Popular, appreciating, lots of older multis — a house-hacker favorite.' },
  '33604': { name: 'Old Seminole Heights / Sulphur Springs', note: 'Mixed; pockets of value and pockets of flood risk near the river.', coastalOrFlood: true },
  '33605': { name: 'Ybor City / East Tampa', note: 'Historic, walkable, mixed condition; verify rents block by block.' },
  '33606': { name: 'Hyde Park / Davis Islands', note: 'Pricey and desirable; much of it is coastal flood zone.', coastalOrFlood: true },
  '33607': { name: 'West Tampa', note: 'Close to downtown and the stadium; redeveloping.' },
  '33609': { name: 'South Tampa (Palma Ceia area)', note: 'Strong rents, higher prices; low-lying in spots.', coastalOrFlood: true },
  '33610': { name: 'East Tampa', note: 'Lower entry prices; do extra diligence on condition and area.' },
  '33611': { name: 'Ballast Point / South Tampa', note: 'Waterfront-adjacent; flood and windstorm insurance matter here.', coastalOrFlood: true },
  '33612': { name: 'University / Forest Hills', note: 'Near USF; rental demand from students and staff.' },
  '33613': { name: 'University North', note: 'Affordable; USF rental demand.' },
  '33614': { name: 'Town N Country (east)', note: 'Lots of multis; some low-lying flood-prone streets.', coastalOrFlood: true },
  '33616': { name: 'Port Tampa', note: 'Small, close to MacDill; coastal flood exposure.', coastalOrFlood: true },
  '33629': { name: 'Sunset Park / South Tampa', note: 'High-end and waterfront; flood insurance is a real cost.', coastalOrFlood: true },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tampa.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tampa.ts src/lib/tampa.test.ts
git commit -m "feat(tampa): benchmarks, metric ratings, neighborhoods, flood/age helpers"
```

---

## Task 3: Explanation engine

**Files:**
- Create: `src/lib/explain.ts`
- Test: `src/lib/explain.test.ts`

Depends on Task 2 (uses `TAMPA`/`rateMetric`).

- [ ] **Step 1: Write the failing test** (`src/lib/explain.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import { verdict, assessAll, GLOSSARY } from './explain'
import { computeMetrics } from './math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { ListingInputs } from '../types'

const inputs: ListingInputs = {
  price: 720000, units: 4, rentTotal: 7600,
  taxAnnual: 7920, insuranceAnnual: 7200, hoaMonthly: 0,
}
const computed = computeMetrics(inputs, DEFAULT_ASSUMPTIONS)

describe('verdict', () => {
  it('produces a plain-English sentence mentioning monthly cost and coverage', () => {
    const v = verdict({ units: 4, computed })
    expect(v.sentence).toMatch(/\$[\d,]+\/mo/)
    expect(v.sentence).toMatch(/cover/)
    expect(['strong', 'okay', 'weak']).toContain(v.tier)
  })
  it('phrases negative coverage as money out of your pocket', () => {
    const weak = computeMetrics({ ...inputs, rentTotal: 1500 }, DEFAULT_ASSUMPTIONS)
    const v = verdict({ units: 4, computed: weak })
    expect(v.sentence).toMatch(/out of your own pocket|you’d (still )?cover/i)
  })
})

describe('assessAll', () => {
  it('returns a rating + plain why for each headline metric', () => {
    const items = assessAll(computed)
    const keys = items.map((i) => i.key)
    expect(keys).toEqual(
      expect.arrayContaining(['houseHackCoverage', 'cashFlow', 'capRate', 'onePercent']),
    )
    for (const i of items) {
      expect(['good', 'okay', 'concern']).toContain(i.rating)
      expect(i.why.length).toBeGreaterThan(0)
      expect(i.label.length).toBeGreaterThan(0)
    }
  })
})

describe('GLOSSARY', () => {
  it('defines every headline metric and key FHA term in plain English', () => {
    for (const term of ['capRate', 'cashOnCash', 'onePercent', 'houseHackCoverage', 'fhaSelfSufficient', 'mip', 'piti', 'noi']) {
      expect(GLOSSARY[term]).toBeTruthy()
      expect(GLOSSARY[term].plain.length).toBeGreaterThan(10)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/explain.test.ts`
Expected: FAIL ("Cannot find module './explain'").

- [ ] **Step 3: Write implementation** (`src/lib/explain.ts`)

```typescript
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
    live = `You'd pay about ${money(liveCost)} to live here while your ${otherUnits === 1 ? 'tenant covers' : `${otherUnits} tenants cover`} ${coverage}% of all the costs`
  }

  const cf = Math.round(c.fullRentalCashFlow)
  const rentAll =
    cf >= 0
      ? `Rent out all ${units} units later and it makes about ${money(cf)}`
      : `If you rented all ${units} units it would still cost you about ${money(cf)} out of your own pocket`

  const tail =
    tier === 'strong' ? `Solid for a Tampa ${unitWord(units)}.`
      : tier === 'okay' ? `Decent, but check the numbers.`
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
  capRate: { term: 'Cap rate', plain: 'Yearly net income divided by price, ignoring your loan. A way to compare properties apples-to-apples.', tampaExample: 'A $700k Tampa quad netting $42k/yr ≈ a 6% cap rate.' },
  cashOnCash: { term: 'Cash-on-cash return', plain: 'Your yearly cash profit divided by the cash you put in (down payment + closing). Shows how hard your money works.', tampaExample: 'Put in $50k, clear $5k/yr → 10% cash-on-cash.' },
  onePercent: { term: 'The 1% rule', plain: 'A quick gut-check: monthly rent should be near 1% of the price. Rarely hit in Tampa today, so treat it as a screen, not a law.' },
  houseHackCoverage: { term: 'House-hack coverage', plain: 'The share of your monthly costs the other units’ rent covers while you live in one. 100% means you live for free.' },
  fhaSelfSufficient: { term: 'FHA self-sufficiency', plain: 'An FHA rule for 3–4 unit homes: 75% of the total rent must cover the mortgage, taxes, and insurance — or FHA won’t approve the loan.' },
  mip: { term: 'MIP (mortgage insurance)', plain: 'A monthly fee FHA charges because you put little down. It’s built into the payment and lasts the life of most FHA loans.' },
  piti: { term: 'PITI', plain: 'Principal, Interest, Taxes, Insurance — the four pieces of your real monthly housing payment.' },
  noi: { term: 'NOI (net operating income)', plain: 'Yearly rent minus operating costs (not the loan). Cap rate is built from this.' },
  vacancy: { term: 'Vacancy', plain: 'A reserve for months a unit sits empty between tenants. We assume some every year so the numbers stay honest.' },
  downPayment: { term: 'Down payment', plain: 'Cash you put down up front. FHA allows as little as 3.5% if you live in the property.' },
  closingCosts: { term: 'Closing costs', plain: 'One-time fees to finalize the purchase (title, lender, etc.), usually a few percent of price.' },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/explain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/explain.ts src/lib/explain.test.ts
git commit -m "feat(explain): verdict sentences, per-metric assessments, glossary"
```

---

## Task 4: 5-year equity projection in math.ts

**Files:**
- Modify: `src/lib/math.ts`
- Test: `src/lib/math.test.ts` (append)

- [ ] **Step 1: Append the failing test to `src/lib/math.test.ts`**

```typescript
import { equityProjection } from './math'

describe('equityProjection', () => {
  it('grows equity from appreciation + principal paydown over N years', () => {
    const r = equityProjection({
      price: 700000, loan: 660000, annualRate: 0.069, termYears: 30,
      appreciationAnnual: 0.03, years: 5,
    })
    expect(r.years).toBe(5)
    expect(r.futureValue).toBeGreaterThan(700000)       // appreciated
    expect(r.loanBalance).toBeLessThan(660000)          // paid down
    expect(r.estimatedEquity).toBeGreaterThan(700000 - 660000) // > starting equity
  })
  it('handles a zero-interest loan without NaN', () => {
    const r = equityProjection({
      price: 100000, loan: 100000, annualRate: 0, termYears: 30,
      appreciationAnnual: 0, years: 5,
    })
    expect(Number.isFinite(r.estimatedEquity)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/math.test.ts`
Expected: FAIL ("equityProjection is not a function").

- [ ] **Step 3: Append implementation to `src/lib/math.ts`**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/math.test.ts`
Expected: PASS (existing 14 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.ts src/lib/math.test.ts
git commit -m "feat(math): equityProjection (appreciation + principal paydown)"
```

---

## Task 5: FEMA flood-zone lookup

**Files:**
- Create: `src/lib/flood.ts`
- Test: `src/lib/flood.test.ts`

- [ ] **Step 1: Write the failing test** (`src/lib/flood.test.ts`)

```typescript
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
    (async () =>
      ({ ok: true, json: async () => ({ features: [{ attributes: { FLD_ZONE: zone, ZONE_SUBTY: '' } }] }) })) as unknown as typeof fetch

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flood.test.ts`
Expected: FAIL ("Cannot find module './flood'").

- [ ] **Step 3: Write implementation** (`src/lib/flood.ts`)

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/flood.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flood.ts src/lib/flood.test.ts
git commit -m "feat(flood): FEMA NFHL flood-zone lookup with graceful fallback"
```

---

## Task 6: CSV export of favorites

**Files:**
- Create: `src/lib/csv.ts`
- Test: `src/lib/csv.test.ts`

- [ ] **Step 1: Write the failing test** (`src/lib/csv.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import { favoritesToCsv } from './csv'
import type { Listing } from '../types'

const base = {
  zip: '33603', beds: 8, baths: 4, sqft: 3400, propertyType: 'Multi-Family',
  firstSeen: '2026-06-15T00:00:00Z', isNew: true, rentSource: 'rentcast',
  taxSource: 'estimated', hoaMonthly: 0,
} as const

function listing(id: string, address: string): Listing {
  return {
    ...base, id, address, price: 720000, units: 4, rentTotal: 7600,
    taxAnnual: 7920, insuranceAnnual: 7200,
    computed: { rentPerUnit: 1900, mortgageMonthly: 4000, mipMonthly: 300,
      houseHackOutOfPocket: 600, pctCostCovered: 88, fullRentalCashFlow: 240,
      capRate: 0.061, cashOnCash: 0.08, noiAnnual: 43000, onePercent: 0.0106,
      fhaSelfSufficient: true, cashInvested: 50000, dealScore: 78,
      scoreBreakdown: { houseHack: 80, cashOnCash: 70, capRate: 60, onePercent: 90 } },
  } as Listing
}

describe('favoritesToCsv', () => {
  it('produces a header row and one row per listing', () => {
    const csv = favoritesToCsv([listing('a', '1 Main St'), listing('b', '2 Oak Ave')])
    const lines = csv.trim().split('\n')
    expect(lines[0]).toMatch(/address/i)
    expect(lines).toHaveLength(3)
  })
  it('quotes addresses containing commas', () => {
    const csv = favoritesToCsv([listing('a', '809 E Frierson Ave, Tampa, FL')])
    expect(csv).toContain('"809 E Frierson Ave, Tampa, FL"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: FAIL ("Cannot find module './csv'").

- [ ] **Step 3: Write implementation** (`src/lib/csv.ts`)

```typescript
import type { Listing } from '../types'

const COLS: { header: string; get: (l: Listing) => string | number }[] = [
  { header: 'address', get: (l) => l.address },
  { header: 'zip', get: (l) => l.zip },
  { header: 'price', get: (l) => l.price },
  { header: 'units', get: (l) => l.units },
  { header: 'rent_total', get: (l) => l.rentTotal },
  { header: 'deal_score', get: (l) => Math.round(l.computed.dealScore) },
  { header: 'live_in_cost_mo', get: (l) => Math.round(l.computed.houseHackOutOfPocket) },
  { header: 'cap_rate_pct', get: (l) => (l.computed.capRate * 100).toFixed(1) },
  { header: 'cash_on_cash_pct', get: (l) => (l.computed.cashOnCash * 100).toFixed(1) },
  { header: 'flood_risk', get: (l) => l.floodZone?.risk ?? 'unknown' },
]

function cell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function favoritesToCsv(listings: Listing[]): string {
  const header = COLS.map((c) => c.header).join(',')
  const rows = listings.map((l) => COLS.map((c) => cell(c.get(l))).join(','))
  return [header, ...rows].join('\n') + '\n'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat(csv): export favorites to CSV"
```

---

## Task 7: Store gains mode + onboarded flags

**Files:**
- Modify: `src/lib/favorites.ts`
- Test: `src/lib/favorites.test.ts` (append)

- [ ] **Step 1: Append the failing test to `src/lib/favorites.test.ts`**

```typescript
import { emptyStore, setMode, setOnboarded } from './favorites'

describe('mode + onboarding', () => {
  it('defaults to simple mode and not onboarded', () => {
    const s = emptyStore()
    expect(s.mode).toBe('simple')
    expect(s.onboarded).toBe(false)
  })
  it('updates mode and onboarded immutably', () => {
    const s = emptyStore()
    expect(setMode(s, 'pro').mode).toBe('pro')
    expect(setOnboarded(s, true).onboarded).toBe(true)
    expect(s.mode).toBe('simple') // original unchanged
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: FAIL (`setMode` undefined; `mode` missing).

- [ ] **Step 3: Modify `src/lib/favorites.ts`**

Add `import type { ViewMode } from '../types'` at top. Extend the `Store` interface and `emptyStore`, and add setters:

```typescript
export interface Store {
  favorites: string[]
  notes: Record<string, string>
  overrides: Record<string, Overrides>
  mode: ViewMode
  onboarded: boolean
}

export function emptyStore(): Store {
  return { favorites: [], notes: {}, overrides: {}, mode: 'simple', onboarded: false }
}

export function setMode(s: Store, mode: ViewMode): Store {
  return { ...s, mode }
}

export function setOnboarded(s: Store, onboarded: boolean): Store {
  return { ...s, onboarded }
}
```

(The existing `loadStore` already spreads `emptyStore()` first, so older saved stores get the new defaults automatically.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: PASS (existing 3 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/favorites.ts src/lib/favorites.test.ts
git commit -m "feat(store): persist view mode + onboarding flag"
```

---

# Phase B — Data/refresh integration

## Task 8: Thread floodZone through refresh-core

**Files:**
- Modify: `src/lib/refresh-core.ts`
- Test: `src/lib/refresh-core.test.ts` (append)

- [ ] **Step 1: Append the failing test to `src/lib/refresh-core.test.ts`**

Flood zones are keyed by the raw listing `id` (stable across refresh runs). The test supplies a `floodById` map and a `prev` listing to confirm the carry-forward fallback.

```typescript
import type { FloodZone, Listing } from '../types'

describe('buildListing flood zone', () => {
  const raw = { id: 'x1', price: 600000, bedrooms: 6, zipCode: '33606', latitude: 27.9, longitude: -82.5 }

  it('attaches a provided flood zone', () => {
    const fz: FloodZone = { zone: 'AE', risk: 'high' }
    const built = buildListing(raw as any, undefined, {
      assumptions: DEFAULT_ASSUMPTIONS, now: '2026-06-15T00:00:00Z',
      newListingDays: 7, floodById: { x1: fz },
    })
    expect(built.floodZone).toEqual(fz)
  })

  it('carries the previous flood zone when none is provided', () => {
    const prev = { floodZone: { zone: 'X', risk: 'low' } } as Listing
    const built = buildListing(raw as any, prev, {
      assumptions: DEFAULT_ASSUMPTIONS, now: '2026-06-15T00:00:00Z', newListingDays: 7,
    })
    expect(built.floodZone).toEqual({ zone: 'X', risk: 'low' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/refresh-core.test.ts`
Expected: FAIL (`floodZone` undefined on result).

- [ ] **Step 3: Modify `src/lib/refresh-core.ts`**

Add `FloodZone` to the type import. Extend `BuildOptions`:

```typescript
import type { Assumptions, Computed, FloodZone, Listing, ListingInputs } from '../types'
```

```typescript
export interface BuildOptions {
  assumptions: Assumptions
  now: string
  newListingDays: number
  rentByAddress?: Record<string, number>
  floodById?: Record<string, FloodZone>
}
```

Inside `buildListing`, after computing `firstSeen`, resolve flood:

```typescript
  const floodZone = opts.floodById?.[raw.id] ?? prev?.floodZone
```

Add `floodZone,` to the returned object (next to `taxSource`). Key flood by `raw.id` for simplicity (stable across runs).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/refresh-core.test.ts`
Expected: PASS (existing 6 + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/refresh-core.ts src/lib/refresh-core.test.ts
git commit -m "feat(refresh-core): carry flood zone through build/merge"
```

---

## Task 9: Wire flood lookup into the refresh script

**Files:**
- Modify: `scripts/refresh.ts`

- [ ] **Step 1: Modify `scripts/refresh.ts`**

Import the lookup:

```typescript
import { lookupFloodZone } from '../src/lib/flood'
import type { FloodZone } from '../src/types'
```

After the rent-AVM block and before `mergeListings`, add a budgeted flood pass for listings with coordinates that don't already have a flood zone in `prev`:

```typescript
  const prevById = new Map(prev.map((l) => [l.id, l]))
  const floodById: Record<string, FloodZone> = {}
  const floodBudget = Number(process.env.FLOOD_BUDGET ?? 40)
  let floodSpent = 0
  for (const r of raws) {
    if (floodSpent >= floodBudget) break
    if (prevById.get(r.id)?.floodZone) continue
    if (r.latitude == null || r.longitude == null) continue
    floodById[r.id] = await lookupFloodZone(r.latitude, r.longitude)
    floodSpent++
  }
  console.log(`Flood zones looked up for ${floodSpent} listings (FEMA, free).`)
```

Pass `floodById` into `mergeListings`:

```typescript
  const listings = mergeListings(raws, prev, {
    assumptions: DEFAULT_ASSUMPTIONS,
    now,
    newListingDays: NEW_LISTING_DAYS,
    rentByAddress,
    floodById,
  })
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/refresh.ts
git commit -m "feat(refresh): budgeted FEMA flood-zone enrichment"
```

---

## Task 10: Sample data with flood + variety

**Files:**
- Modify: `scripts/make-sample.ts`

- [ ] **Step 1: Read the current file**

Run: `cat scripts/make-sample.ts` to see the existing sample shape.

- [ ] **Step 2: Modify `scripts/make-sample.ts`**

For each sample listing object, add a `floodZone` field so Simple mode shows the flags out of the box. Give variety: at least one `{ zone: 'AE', risk: 'high' }`, one `{ zone: 'X', risk: 'low' }`, one `{ zone: 'X', risk: 'moderate' }`. If the script builds listings via `buildListing`/`mergeListings`, pass a `floodById` map keyed by each sample id; if it constructs objects literally, add `floodZone` directly. Keep at least 4 samples; ensure a mix of 2/3/4 units and a mix of deal tiers (one strong, one weak) so the UI states are all visible.

- [ ] **Step 3: Regenerate and verify**

Run: `npm run sample`
Then: `node -e "const d=require('./public/data/listings.json'); console.log(d.listings.map(l=>[l.units,l.floodZone?.risk,Math.round(l.computed.dealScore)]))"`
Expected: prints rows showing varied units, flood risks, and scores.

- [ ] **Step 4: Commit**

```bash
git add scripts/make-sample.ts public/data/listings.json
git commit -m "feat(sample): flood zones + tier/unit variety for demoing Simple mode"
```

---

# Phase C — UI components

> All components use Tailwind v4 classes consistent with existing components (`src/components/*`). Read `ScoreBadge.tsx` and `ListingCard.tsx` first for the established class vocabulary (slate/rose/emerald palette, rounded cards). Rating → color: `good`=emerald, `okay`=amber, `concern`=rose.

## Task 11: ExplainTip (reusable `?` popover)

**Files:**
- Create: `src/components/ExplainTip.tsx`
- Test: `src/components/ExplainTip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExplainTip } from './ExplainTip'

describe('ExplainTip', () => {
  it('hides content until toggled', () => {
    render(<ExplainTip title="Cap rate" body="Yearly income as a % of price." />)
    expect(screen.queryByText(/yearly income/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /explain cap rate/i }))
    expect(screen.getByText(/yearly income/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ExplainTip.test.tsx`
Expected: FAIL ("Cannot find module './ExplainTip'").

- [ ] **Step 3: Write implementation**

```tsx
import { useState } from 'react'

export function ExplainTip({ title, body, example }: { title: string; body: string; example?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label={`Explain ${title}`}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-500 hover:bg-slate-100"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-10 mt-1 block w-60 -translate-x-1/2 left-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 shadow-lg">
          <span className="mb-1 block font-semibold text-slate-800">{title}</span>
          {body}
          {example && <span className="mt-1 block italic text-slate-500">{example}</span>}
        </span>
      )}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ExplainTip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExplainTip.tsx src/components/ExplainTip.test.tsx
git commit -m "feat(ui): ExplainTip popover"
```

---

## Task 12: MetricTile

**Files:**
- Create: `src/components/MetricTile.tsx`

- [ ] **Step 1: Write implementation**

```tsx
import type { Rating } from '../types'
import { ExplainTip } from './ExplainTip'

const DOT: Record<Rating, string> = {
  good: 'text-emerald-600',
  okay: 'text-amber-500',
  concern: 'text-rose-600',
}
const WORD: Record<Rating, string> = { good: 'Good', okay: 'Okay', concern: 'Concern' }

export function MetricTile(props: {
  label: string
  value: string
  rating: Rating
  tipTitle: string
  tipBody: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="mb-1 flex items-center text-xs text-slate-500">
        {props.label}
        <ExplainTip title={props.tipTitle} body={props.tipBody} />
      </p>
      <p className="text-lg font-semibold text-slate-900">{props.value}</p>
      <span className={`text-[11px] ${DOT[props.rating]}`}>● {WORD[props.rating]}</span>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/MetricTile.tsx
git commit -m "feat(ui): MetricTile with rating dot + explain tip"
```

---

## Task 13: Verdict

**Files:**
- Create: `src/components/Verdict.tsx`

- [ ] **Step 1: Write implementation**

```tsx
import type { Computed } from '../types'
import { verdict } from '../lib/explain'

export function Verdict({ units, computed }: { units: number; computed: Computed }) {
  const v = verdict({ units, computed })
  return (
    <div className="flex gap-2 rounded-lg bg-sky-50 p-3">
      <span aria-hidden className="mt-0.5 text-sky-600">💡</span>
      <p className="text-sm leading-relaxed text-sky-900">{v.sentence}</p>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Verdict.tsx
git commit -m "feat(ui): Verdict callout"
```

---

## Task 14: TampaFlags

**Files:**
- Create: `src/components/TampaFlags.tsx`

- [ ] **Step 1: Write implementation**

```tsx
import type { Listing } from '../types'
import { neighborhoodForZip, isFloodProneZip, buildingAgeNote } from '../lib/tampa'

function Flag({ tone, children }: { tone: 'warn' | 'info'; children: React.ReactNode }) {
  const cls = tone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
  return <div className={`rounded-md px-3 py-2 text-xs leading-snug ${cls}`}>{children}</div>
}

export function TampaFlags({ listing }: { listing: Listing }) {
  const flags: React.ReactNode[] = []
  const risk = listing.floodZone?.risk
  const floodProne = risk === 'high' || (risk == null && isFloodProneZip(listing.zip))
  if (floodProne) {
    flags.push(
      <Flag key="flood" tone="warn">
        Possible flood zone{listing.floodZone?.zone ? ` (${listing.floodZone.zone})` : ''} — get a
        flood-insurance quote before you make an offer. Verify with the city.
      </Flag>,
    )
  }
  flags.push(
    <Flag key="ins" tone="warn">
      Insurance estimated high at ${listing.insuranceAnnual.toLocaleString()}/yr — Florida’s #1 cost
      surprise. We’d rather warn you than flatter the deal.
    </Flag>,
  )
  const ageNote = buildingAgeNote(listing.yearBuilt)
  if (ageNote) flags.push(<Flag key="age" tone="warn">{ageNote}</Flag>)
  const hood = neighborhoodForZip(listing.zip)
  if (hood) flags.push(<Flag key="hood" tone="info">{hood.name} — {hood.note}</Flag>)

  return <div className="flex flex-col gap-2">{flags}</div>
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/TampaFlags.tsx
git commit -m "feat(ui): TampaFlags (flood/insurance/age/neighborhood)"
```

---

## Task 15: SimpleListingCard

**Files:**
- Create: `src/components/SimpleListingCard.tsx`
- Test: `src/components/SimpleListingCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleListingCard } from './SimpleListingCard'
import { computeMetrics } from '../lib/math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { Listing } from '../types'

function makeListing(): Listing {
  const inputs = { price: 720000, units: 4, rentTotal: 7600, taxAnnual: 7920, insuranceAnnual: 7200, hoaMonthly: 0 }
  return {
    id: 's3', address: '809 E Frierson Ave, Tampa, FL', zip: '33603', beds: 8, baths: 4,
    sqft: 3400, propertyType: 'Multi-Family', firstSeen: '2026-06-15T00:00:00Z', isNew: true,
    rentSource: 'rentcast', taxSource: 'estimated', floodZone: { zone: 'AE', risk: 'high' },
    ...inputs, computed: computeMetrics(inputs, DEFAULT_ASSUMPTIONS),
  } as Listing
}

describe('SimpleListingCard', () => {
  it('shows address, a verdict sentence, and the flood flag', () => {
    render(
      <SimpleListingCard listing={makeListing()} computed={makeListing().computed}
        isFavorite={false} onToggleFavorite={() => {}} onOpen={() => {}} />,
    )
    expect(screen.getByText(/Frierson/)).toBeInTheDocument()
    expect(screen.getByText(/cover/i)).toBeInTheDocument()
    expect(screen.getByText(/flood zone/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SimpleListingCard.test.tsx`
Expected: FAIL ("Cannot find module './SimpleListingCard'").

- [ ] **Step 3: Write implementation**

```tsx
import type { Computed, Listing } from '../types'
import { scoreTier } from '../config/assumptions'
import { assessAll } from '../lib/explain'
import { Verdict } from './Verdict'
import { MetricTile } from './MetricTile'
import { TampaFlags } from './TampaFlags'

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const TIER_BADGE: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-800',
  okay: 'bg-amber-100 text-amber-800',
  weak: 'bg-rose-100 text-rose-800',
}
const TIER_WORD: Record<string, string> = { strong: 'Strong deal', okay: 'Worth a look', weak: 'Probably skip' }

export function SimpleListingCard(props: {
  listing: Listing
  computed: Computed
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}) {
  const { listing: l, computed: c } = props
  const tier = scoreTier(c.dealScore)
  const a = Object.fromEntries(assessAll(c).map((x) => [x.key, x]))

  const tileValues: Record<string, string> = {
    houseHackCoverage: c.houseHackOutOfPocket <= 0 ? 'Free' : money(c.houseHackOutOfPocket) + '/mo',
    cashFlow: (c.fullRentalCashFlow >= 0 ? '+' : '') + money(c.fullRentalCashFlow) + '/mo',
    capRate: (c.capRate * 100).toFixed(1) + '%',
    onePercent: (c.onePercent * 100).toFixed(2) + '%',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{l.address}</p>
          <p className="text-xs text-slate-500">
            {l.units}-unit · {money(l.price)} · {l.zip}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${TIER_BADGE[tier]}`}>
            {Math.round(c.dealScore)} · {TIER_WORD[tier]}
          </span>
          <button
            aria-label={props.isFavorite ? 'Remove favorite' : 'Save favorite'}
            onClick={() => props.onToggleFavorite(l.id)}
            className={props.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'}
          >
            ★
          </button>
        </div>
      </div>

      <div className="mb-4"><Verdict units={l.units} computed={c} /></div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['houseHackCoverage', 'cashFlow', 'capRate', 'onePercent'] as const).map((k) => (
          <MetricTile key={k} label={a[k].label} value={tileValues[k]} rating={a[k].rating}
            tipTitle={a[k].label} tipBody={a[k].why} />
        ))}
      </div>

      <div className="mb-4"><TampaFlags listing={l} /></div>

      <button onClick={() => props.onOpen(l.id)} className="text-sm text-sky-700 hover:underline">
        See the full math &amp; adjust assumptions →
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SimpleListingCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SimpleListingCard.tsx src/components/SimpleListingCard.test.tsx
git commit -m "feat(ui): SimpleListingCard (verdict + tiles + Tampa flags)"
```

---

## Task 16: ModeToggle

**Files:**
- Create: `src/components/ModeToggle.tsx`
- Test: `src/components/ModeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from './ModeToggle'

describe('ModeToggle', () => {
  it('calls onChange with the other mode when clicked', () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="simple" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /pro/i }))
    expect(onChange).toHaveBeenCalledWith('pro')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ModeToggle.test.tsx`
Expected: FAIL ("Cannot find module './ModeToggle'").

- [ ] **Step 3: Write implementation**

```tsx
import type { ViewMode } from '../types'

export function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
      {(['simple', 'pro'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={`rounded-md px-3 py-1 capitalize ${mode === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ModeToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModeToggle.tsx src/components/ModeToggle.test.tsx
git commit -m "feat(ui): ModeToggle (Simple/Pro)"
```

---

## Task 17: Onboarding (first-run intro)

**Files:**
- Create: `src/components/Onboarding.tsx`

- [ ] **Step 1: Write implementation**

```tsx
export function Onboarding({ onClose }: { onClose: () => void }) {
  const cards = [
    { t: 'House-hacking', b: 'Buy a 2–4 unit home, live in one unit, rent the others. Their rent helps pay your mortgage — sometimes all of it.' },
    { t: 'FHA 3.5% down', b: 'If you live there, an FHA loan lets you buy with as little as 3.5% down. A monthly fee called MIP comes with it.' },
    { t: 'The Deal Score', b: 'A 0–100 starting point blending how cheaply you’d live, future cash flow, cap rate, and the 1% rule. A high score is a “look closer,” not a “buy.”' },
    { t: 'We keep it honest', b: 'Numbers are estimates. Tampa insurance and flood risk are modeled high on purpose. Always verify with a lender, inspector, and the city.' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6">
        <h2 className="mb-1 text-xl font-bold text-slate-900">Welcome to TampaPlex 🏠</h2>
        <p className="mb-4 text-sm text-slate-500">A 30-second primer before you dive in.</p>
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.t} className="rounded-lg bg-slate-50 p-3">
              <p className="font-semibold text-slate-800">{c.t}</p>
              <p className="text-sm text-slate-600">{c.b}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-white">
          Got it — show me the deals
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Onboarding.tsx
git commit -m "feat(ui): first-run Onboarding primer"
```

---

## Task 18: Guide page (how-it-works + glossary)

**Files:**
- Create: `src/components/Guide.tsx`

- [ ] **Step 1: Write implementation**

```tsx
import { GLOSSARY } from '../lib/explain'
import { TAMPA } from '../lib/tampa'

export function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-4">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Guide: investing in Tampa plexes</h2>
          <button onClick={onClose} aria-label="Close guide" className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold text-slate-800">What a good Tampa plex looks like</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li>The other units cover most of your monthly cost — ideally {TAMPA.bands.houseHackCoverage.good}%+.</li>
            <li>Cap rate around {(TAMPA.bands.capRate.good * 100).toFixed(0)}% or better for Tampa.</li>
            <li>It would still cash-flow if you moved out and rented every unit.</li>
            <li>Insurance and (if applicable) flood costs are confirmed with real quotes, not estimates.</li>
            <li>For 3–4 units, it passes the FHA self-sufficiency rule.</li>
          </ul>
        </section>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold text-slate-800">The Tampa reality on costs</h3>
          <p className="text-sm text-slate-600">
            Florida insurance is the biggest surprise for new investors — we model it high on purpose
            (at least ${TAMPA.insuranceFloor.toLocaleString()}/yr). Much of Tampa sits in or near flood
            zones; a flood quote can change a deal entirely. Older homes (pre-2002 code) often cost more
            to insure. None of these should scare you off — they should be verified, not ignored.
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-slate-800">Plain-English glossary</h3>
          <dl className="space-y-2">
            {Object.values(GLOSSARY).map((g) => (
              <div key={g.term} className="rounded-lg bg-slate-50 p-3">
                <dt className="font-medium text-slate-800">{g.term}</dt>
                <dd className="text-sm text-slate-600">{g.plain}{g.tampaExample ? ` ${g.tampaExample}` : ''}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Guide.tsx
git commit -m "feat(ui): Guide page (Tampa rules of thumb + glossary)"
```

---

## Task 19: NotesField

**Files:**
- Create: `src/components/NotesField.tsx`

- [ ] **Step 1: Write implementation**

```tsx
export function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Your notes</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Showing booked? Questions for the agent? Jot it here — saved on this device."
        className="w-full rounded-lg border border-slate-300 p-2 text-sm"
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesField.tsx
git commit -m "feat(ui): NotesField"
```

---

# Phase D — Wire-up (detail, filters, App)

## Task 20: Beginner annotations + notes + 5-yr outlook in ListingDetail

**Files:**
- Modify: `src/components/ListingDetail.tsx`
- Modify: `src/App.tsx` (pass notes props — see Task 22)

- [ ] **Step 1: Read the current detail component**

Run: `cat src/components/ListingDetail.tsx` and note its current props and layout.

- [ ] **Step 2: Add to `ListingDetail`**

Add three things, following the file's existing layout/section pattern:

1. A `Verdict` at the top: `import { Verdict } from './Verdict'` and render `<Verdict units={listing.units} computed={computed} />` near the header.
2. The notes field. Extend props with `note: string` and `onNote: (id: string, v: string) => void`, then render:

```tsx
<NotesField value={note} onChange={(v) => onNote(listing.id, v)} />
```

3. A 5-year outlook block. Compute with the existing `fhaLoan` + new `equityProjection`:

```tsx
import { equityProjection, fhaLoan } from '../lib/math'
import { TAMPA } from '../lib/tampa'
// ...
const { loan } = fhaLoan(listing.price, assumptions)
const proj = equityProjection({
  price: listing.price, loan, annualRate: assumptions.rateAnnual,
  termYears: assumptions.termYears, appreciationAnnual: TAMPA.appreciationDefault, years: 5,
})
```

Render it in a clearly-labeled section:

```tsx
<section className="rounded-lg bg-slate-50 p-3">
  <p className="text-sm font-medium text-slate-700">Where you’d likely stand in 5 years</p>
  <p className="text-xs text-slate-500">
    Estimate only — assumes {(TAMPA.appreciationDefault * 100).toFixed(0)}%/yr appreciation and on-time payments. Not a promise.
  </p>
  <p className="mt-1 text-lg font-semibold text-slate-900">
    ~${Math.round(proj.estimatedEquity).toLocaleString()} in equity
  </p>
</section>
```

(Ensure `ListingDetail` already receives `computed` and `assumptions` — it receives `computed`; add an `assumptions: Assumptions` prop if not present, and pass it from `App`.)

- [ ] **Step 3: Typecheck + existing detail test (if any)**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ListingDetail.tsx
git commit -m "feat(detail): verdict, notes, 5-year equity outlook"
```

---

## Task 21: Filters — flood risk, year built, FHA self-sufficiency

**Files:**
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/App.tsx` (apply new filter fields — see Task 22)

- [ ] **Step 1: Read the current FilterBar**

Run: `cat src/components/FilterBar.tsx` and note `Filters`, `DEFAULT_FILTERS`, and control style.

- [ ] **Step 2: Extend `Filters` + `DEFAULT_FILTERS`**

```typescript
export interface Filters {
  // ...existing fields...
  hideHighFlood: boolean
  minYearBuilt: number       // 0 = any
  fhaPassOnly: boolean
}
```

```typescript
export const DEFAULT_FILTERS: Filters = {
  // ...existing defaults...
  hideHighFlood: false,
  minYearBuilt: 0,
  fhaPassOnly: false,
}
```

Add three controls matching the existing control markup: a "Hide high flood risk" checkbox, a "Built after" number input (0 means any), and a "Passes FHA 3–4 unit rule" checkbox.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS (App filtering wired in Task 22).

- [ ] **Step 4: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat(filters): flood risk, year built, FHA self-sufficiency"
```

---

## Task 22: App wiring — modes, onboarding, guide, filters, notes, CSV

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add state + handlers**

In `App`, add:

```tsx
import { ModeToggle } from './components/ModeToggle'
import { Onboarding } from './components/Onboarding'
import { Guide } from './components/Guide'
import { SimpleListingCard } from './components/SimpleListingCard'
import { setMode, setOnboarded, setNote } from './lib/favorites'
import { favoritesToCsv } from './lib/csv'
```

```tsx
const [showGuide, setShowGuide] = useState(false)
const mode = store.mode
const setStoreMode = (m: ViewMode) => setStore((s) => setMode(s, m))
```

- [ ] **Step 2: Extend the `visible` filter**

Add to the `.filter(...)` predicate in `visible`:

```tsx
&& (!filters.hideHighFlood || listing.floodZone?.risk !== 'high')
&& (filters.minYearBuilt === 0 || (listing.yearBuilt ?? 0) >= filters.minYearBuilt)
&& (!filters.fhaPassOnly || computed.fhaSelfSufficient)
```

- [ ] **Step 3: Header — add toggle, Guide link, CSV export**

In the `Shell` header area, render `<ModeToggle mode={mode} onChange={setStoreMode} />`, a "Guide" button that sets `showGuide(true)`, and an "Export favorites (CSV)" button:

```tsx
function downloadCsv() {
  const favs = (data?.listings ?? []).filter((l) => store.favorites.includes(l.id))
  const blob = new Blob([favoritesToCsv(favs)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'tampaplex-favorites.csv'; a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Render Simple vs Pro list**

Where `ListingList` renders, branch on mode:

```tsx
{mode === 'simple' ? (
  <div className="space-y-3">
    {visible.map(({ listing, computed }) => (
      <SimpleListingCard key={listing.id} listing={listing} computed={computed}
        isFavorite={store.favorites.includes(listing.id)}
        onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
        onOpen={setOpenId} />
    ))}
    {visible.length === 0 && <p className="text-slate-400">No listings match your filters.</p>}
  </div>
) : (
  <ListingList items={visible} favorites={store.favorites}
    onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))} onOpen={setOpenId} />
)}
```

In Pro mode show the `AssumptionsPanel`; in Simple mode hide it behind a collapsible (or only show in Pro). Keep it simple: render the right column (AssumptionsPanel) only when `mode === 'pro'`; in Simple mode the detail view still exposes assumptions.

- [ ] **Step 5: Onboarding + Guide overlays**

```tsx
{!store.onboarded && <Onboarding onClose={() => setStore((s) => setOnboarded(s, true))} />}
{showGuide && <Guide onClose={() => setShowGuide(false)} />}
```

- [ ] **Step 6: Pass notes + assumptions to ListingDetail**

```tsx
<ListingDetail
  listing={open as Listing}
  computed={computedById.get(open.id)!}
  assumptions={assumptions}
  override={store.overrides[open.id]}
  onOverride={(id, patch) => setStore((s) => setOverride(s, id, patch))}
  note={store.notes[open.id] ?? ''}
  onNote={(id, v) => setStore((s) => setNote(s, id, v))}
  onClose={() => setOpenId(null)}
/>
```

- [ ] **Step 7: Typecheck + full test run**

Run: `npx tsc -b --noEmit && npm test`
Expected: PASS; all tests green.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): Simple/Pro modes, onboarding, guide, new filters, notes, CSV export"
```

---

## Task 23: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and verify Simple mode**

Use the preview tools (preview_start, preview_snapshot/screenshot). Confirm:
- First load shows the Onboarding primer; closing it sets onboarded.
- Simple mode shows beginner cards with verdict, 4 tiles, Tampa flags.
- `?` tips open/close. Mode toggle switches to the full Pro dashboard.
- Guide opens and renders glossary. Filters (flood/year/FHA) change the list.
- Opening a listing shows verdict, notes (persist on reload), and the 5-yr outlook.
- Export favorites downloads a CSV.

- [ ] **Step 2: Fix any issues found, re-run `npm test`, commit if changes were needed.**

---

# Phase E — Go-live (GitHub Pages)

## Task 24: Vite base path for Pages

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Set `base`**

GitHub project sites serve from `/<repo>/`. Make it configurable via env so local dev (`/`) and Pages both work:

```typescript
// in defineConfig:
base: process.env.GITHUB_PAGES_BASE ?? '/',
```

The workflow (Task 25) sets `GITHUB_PAGES_BASE` to `/<repo>/` at build time. `useListings` already uses `import.meta.env.BASE_URL`, so data loads correctly under the base.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS; `dist/` produced.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build: configurable base path for GitHub Pages"
```

---

## Task 25: GitHub Actions — daily refresh + deploy

**Files:**
- Create: `.github/workflows/refresh-and-deploy.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Refresh data & deploy
on:
  schedule:
    - cron: '0 9 * * *'   # daily 09:00 UTC (~5am ET)
  workflow_dispatch: {}

permissions:
  contents: write
  pages: write
  id-token: write

concurrency:
  group: refresh-and-deploy
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Refresh listings from RentCast
        env:
          RENTCAST_API_KEY: ${{ secrets.RENTCAST_API_KEY }}
        run: npm run refresh
      - name: Commit refreshed data
        run: |
          git config user.name "tampaplex-bot"
          git config user.email "bot@users.noreply.github.com"
          git add public/data/listings.json
          git commit -m "chore: daily data refresh" || echo "no changes"
          git push || echo "nothing to push"
      - name: Build site
        env:
          GITHUB_PAGES_BASE: /${{ github.event.repository.name }}/
        run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Lint YAML mentally**

Confirm indentation and that `RENTCAST_API_KEY` is referenced from `secrets`. If the refresh step fails because no secret is set, the user will set it during go-live (Task 26); the workflow is correct as written.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/refresh-and-deploy.yml
git commit -m "ci: daily RentCast refresh + GitHub Pages deploy"
```

---

## Task 26: README go-live checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the "Next (Phase 2)" section** with a concrete checklist:

```markdown
## Go live (free, ~10 minutes)

The app can run as a free public website that refreshes itself daily.

1. Create a new GitHub repository (e.g. `tampaplex`).
2. Push this project:
   ```bash
   git remote add origin https://github.com/<you>/tampaplex.git
   git push -u origin main
   ```
3. In the repo: Settings → Secrets and variables → Actions → New repository secret.
   Name it `RENTCAST_API_KEY`, paste your RentCast key.
4. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
5. Actions tab → "Refresh data & deploy" → "Run workflow" (first run).
   After it finishes, your site is live at `https://<you>.github.io/tampaplex/`.

It will then refresh and redeploy automatically every day. No servers, no cost.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: go-live checklist (GitHub Pages + daily refresh)"
```

---

## Task 27: Final verification + finish the branch

**Files:** none

- [ ] **Step 1: Full green build**

Run: `npm test && npx tsc -b --noEmit && npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 2: Update project memory**

Update `tampaplex-project.md` memory: Phase 2 (beginner experience + Tampa intelligence + go-live pipeline) implemented on branch `tampaplex-v2`; remaining manual steps = user's GitHub/Pages/secret setup (README checklist).

- [ ] **Step 3: Finish the development branch**

Use the `superpowers:finishing-a-development-branch` skill to merge `tampaplex-v2` into `master` (or open a PR if a remote exists by then).

---

## Self-review notes (author)

- **Spec coverage:** modes/shell → Tasks 7,16,22; explanation engine → Task 3; beginner card → Tasks 11–15; Tampa data → Task 2; flood → Tasks 5,8,9; guide → Task 18; advanced (notes/filters/CSV/5-yr) → Tasks 6,19,20,21,22; go-live → Tasks 24–26; honesty principle → baked into copy (Tasks 3,14,17,20). All spec sections map to tasks.
- **Type consistency:** `Rating`, `ViewMode`, `FloodZone` defined in Task 1 and used consistently; `assessAll` keys (`houseHackCoverage`/`cashFlow`/`capRate`/`onePercent`/`fhaSelfSufficient`) match `MetricTile` usage and `rateMetric` `MetricKey`s (note: `assessAll` uses `cashFlow`/`houseHackCoverage` as both metric keys and rating inputs — consistent with `TAMPA.bands`).
- **No paid services / no runtime LLM:** confirmed — only FEMA's free service, at refresh time.
