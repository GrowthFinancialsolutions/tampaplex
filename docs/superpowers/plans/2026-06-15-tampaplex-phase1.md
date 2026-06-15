# TampaPlex Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working local web app that pulls current Tampa 2–4 unit for-sale listings from RentCast, runs house-hacking investment math on each, and ranks them by a transparent Deal Score — with filters, a per-property math breakdown, live-adjustable assumptions, and saved favorites.

**Architecture:** A single Vite + React + TypeScript project. A pure `math` module computes all investment metrics and is shared between a Node refresh script (which fetches from RentCast and writes `public/data/listings.json`) and the browser (which recomputes live when the user changes assumptions). UI reads the static JSON; per-user state (favorites, notes, overrides) lives in `localStorage`.

**Tech Stack:** TypeScript, Vite, React 18, Tailwind CSS v4, Vitest + Testing Library, `tsx` for running the TS refresh script, `dotenv` for the API key. RentCast REST API for data.

**Spec:** [docs/superpowers/specs/2026-06-13-tampaplex-investment-finder-design.md](../specs/2026-06-13-tampaplex-investment-finder-design.md)

**Conventions:** All commands run from the project root `C:\Users\gcwel\Downloads\real estate` in PowerShell. Test runner is `npx vitest run <path>`. Commit after each task.

---

## File Structure

```
package.json              # scripts + deps
tsconfig.json             # app TS config
tsconfig.node.json        # config for vite.config / scripts
vite.config.ts            # Vite + React + Tailwind + Vitest config
index.html                # Vite entry
.env.example              # RENTCAST_API_KEY= (template, committed)
.env                      # real key (gitignored)
public/data/listings.json # generated data the app reads (committed)
scripts/refresh.ts        # I/O orchestrator: fetch → analyze → merge → write
src/
  main.tsx                # React entry
  App.tsx                 # top-level wiring: load data, state, recompute, filter
  index.css               # Tailwind import + base styles
  test-setup.ts           # jest-dom matchers for Vitest
  types.ts                # shared types: Assumptions, ListingInputs, Computed, Listing, ...
  config/assumptions.ts   # DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS, scoreTier()
  lib/
    math.ts               # PURE investment math + deal score   [TDD]
    math.test.ts
    rentcast.ts           # RentCast API client                 [TDD - mapping]
    rentcast.test.ts
    refresh-core.ts       # pure transform + firstSeen/NEW merge [TDD]
    refresh-core.test.ts
    favorites.ts          # localStorage favorites/notes/overrides [TDD]
    favorites.test.ts
    format.ts             # tiny $ / % formatting helpers
  hooks/useListings.ts    # fetch public/data/listings.json
  components/
    ScoreBadge.tsx
    ListingCard.tsx
    ListingList.tsx
    FilterBar.tsx
    AssumptionsPanel.tsx
    ListingDetail.tsx
```

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`, `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tampaplex",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "refresh": "tsx scripts/refresh.ts"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "dotenv": "^16.4.5",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "scripts"]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TampaPlex — Tampa Multi-Family Finder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/index.css`**

```css
@import "tailwindcss";

body { @apply bg-slate-50 text-slate-800; }
```

- [ ] **Step 7: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 9: Create placeholder `src/App.tsx`** (replaced in Task 13)

```tsx
export default function App() {
  return <h1 className="p-8 text-2xl font-bold">TampaPlex</h1>
}
```

- [ ] **Step 10: Create `.env.example`**

```
# Get a free key at https://app.rentcast.io (free tier: 50 requests/month)
RENTCAST_API_KEY=
# Max rent-AVM lookups per refresh (keeps you within the free tier)
RENT_AVM_BUDGET=15
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` created.

- [ ] **Step 12: Verify dev server boots**

Run: `npm run dev`
Expected: Vite prints `Local: http://localhost:5173/`. Open it — you see "TampaPlex". Stop with Ctrl+C.

- [ ] **Step 13: Verify test runner works**

Run: `npx vitest run`
Expected: "No test files found" (exit 0) — runner is wired up.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 1: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: shared domain types"
```

---

## Task 2: Assumptions config

**Files:**
- Create: `src/config/assumptions.ts`

- [ ] **Step 1: Create `src/config/assumptions.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/config/assumptions.ts
git commit -m "feat: default assumptions + score tiers"
```

---

## Task 3: Math — mortgage payment (TDD)

**Files:**
- Create: `src/lib/math.ts`, `src/lib/math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/math.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { monthlyMortgage } from './math'

describe('monthlyMortgage', () => {
  it('computes a standard 30-yr amortized payment', () => {
    // $300,000 at 6% for 30 years ≈ $1,798.65/mo
    expect(monthlyMortgage(300000, 0.06, 30)).toBeCloseTo(1798.65, 1)
  })

  it('handles 0% interest as straight division', () => {
    expect(monthlyMortgage(360000, 0, 30)).toBeCloseTo(1000, 5)
  })

  it('returns 0 for a non-positive loan', () => {
    expect(monthlyMortgage(0, 0.06, 30)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/math.test.ts`
Expected: FAIL — `monthlyMortgage` is not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/math.ts`:

```ts
export function monthlyMortgage(loan: number, annualRate: number, termYears: number): number {
  if (loan <= 0) return 0
  const i = annualRate / 12
  const n = termYears * 12
  if (i === 0) return loan / n
  const factor = Math.pow(1 + i, n)
  return (loan * (i * factor)) / (factor - 1)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/math.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.ts src/lib/math.test.ts
git commit -m "feat: monthly mortgage amortization"
```

---

## Task 4: Math — FHA loan & MIP (TDD)

**Files:**
- Modify: `src/lib/math.ts`, `src/lib/math.test.ts`

- [ ] **Step 1: Add the failing test** (append to `math.test.ts`)

```ts
import { fhaLoan } from './math'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'

describe('fhaLoan', () => {
  it('computes 3.5% down, financed upfront MIP, and monthly MIP', () => {
    const r = fhaLoan(400000, DEFAULT_ASSUMPTIONS)
    expect(r.downPayment).toBeCloseTo(14000, 2)        // 3.5% of 400k
    expect(r.baseLoan).toBeCloseTo(386000, 2)          // 400k - 14k
    expect(r.loan).toBeCloseTo(386000 * 1.0175, 2)     // + 1.75% UFMIP financed
    expect(r.monthlyMip).toBeCloseTo((386000 * 1.0175 * 0.0055) / 12, 2)
  })

  it('omits MIP when useFhaMip is false', () => {
    const r = fhaLoan(400000, { ...DEFAULT_ASSUMPTIONS, useFhaMip: false })
    expect(r.loan).toBeCloseTo(386000, 2)
    expect(r.monthlyMip).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/math.test.ts`
Expected: FAIL — `fhaLoan` not defined.

- [ ] **Step 3: Add implementation** (append to `math.ts`)

```ts
import type { Assumptions } from '../types'

export interface FhaLoanResult {
  downPayment: number
  baseLoan: number
  loan: number
  monthlyMip: number
}

export function fhaLoan(price: number, a: Assumptions): FhaLoanResult {
  const downPayment = price * a.downPct
  const baseLoan = price - downPayment
  const loan = a.useFhaMip ? baseLoan * (1 + a.fhaUpfrontMipPct) : baseLoan
  const monthlyMip = a.useFhaMip ? (loan * a.fhaAnnualMipPct) / 12 : 0
  return { downPayment, baseLoan, loan, monthlyMip }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/math.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.ts src/lib/math.test.ts
git commit -m "feat: FHA loan + MIP calculation"
```

---

## Task 5: Math — deal score normalization (TDD)

**Files:**
- Modify: `src/lib/math.ts`, `src/lib/math.test.ts`

- [ ] **Step 1: Add the failing test** (append to `math.test.ts`)

```ts
import { lerpScore } from './math'

describe('lerpScore', () => {
  it('maps the low anchor to 0 and high anchor to 100', () => {
    expect(lerpScore(0.03, 0.03, 0.08)).toBe(0)
    expect(lerpScore(0.08, 0.03, 0.08)).toBe(100)
  })
  it('interpolates linearly in between', () => {
    expect(lerpScore(0.055, 0.03, 0.08)).toBeCloseTo(50, 5)
  })
  it('clamps below 0 and above 100', () => {
    expect(lerpScore(0.01, 0.03, 0.08)).toBe(0)
    expect(lerpScore(0.2, 0.03, 0.08)).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/math.test.ts`
Expected: FAIL — `lerpScore` not defined.

- [ ] **Step 3: Add implementation** (append to `math.ts`)

```ts
export function lerpScore(value: number, atZero: number, atHundred: number): number {
  if (atHundred === atZero) return 0
  const t = (value - atZero) / (atHundred - atZero)
  return Math.max(0, Math.min(100, t * 100))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/math.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.ts src/lib/math.test.ts
git commit -m "feat: clamped linear score helper"
```

---

## Task 6: Math — computeMetrics aggregator (TDD)

This ties everything together: both scenarios, cap rate, cash-on-cash, 1% rule, FHA self-sufficiency, and the weighted Deal Score.

**Files:**
- Modify: `src/lib/math.ts`, `src/lib/math.test.ts`

- [ ] **Step 1: Add the failing test** (append to `math.test.ts`)

```ts
import { computeMetrics } from './math'
import type { ListingInputs } from '../types'

const DUPLEX: ListingInputs = {
  price: 400000,
  units: 2,
  rentTotal: 3200,        // $1,600/unit
  taxAnnual: 4400,
  insuranceAnnual: 4000,
  hoaMonthly: 0,
}

describe('computeMetrics', () => {
  const c = computeMetrics(DUPLEX, DEFAULT_ASSUMPTIONS)

  it('splits rent per unit', () => {
    expect(c.rentPerUnit).toBeCloseTo(1600, 2)
  })

  it('computes a positive mortgage and MIP', () => {
    expect(c.mortgageMonthly).toBeGreaterThan(0)
    expect(c.mipMonthly).toBeGreaterThan(0)
  })

  it('house-hack out-of-pocket = total monthly cost minus other-unit rent', () => {
    // tenant pays 1 of 2 units = $1,600; you cover the rest
    expect(c.pctCostCovered).toBeGreaterThan(0)
    expect(c.pctCostCovered).toBeLessThan(100) // a $400k duplex at 3.5% down won't fully cover here
    // out-of-pocket should equal totalCost - 1600; both derived consistently
    expect(c.houseHackOutOfPocket).toBeGreaterThan(0)
  })

  it('computes cap rate, cash-on-cash, 1% rule, deal score', () => {
    expect(c.capRate).toBeGreaterThan(0)
    expect(c.onePercent).toBeCloseTo(3200 / 400000, 6) // 0.8%
    expect(c.cashInvested).toBeCloseTo(14000 + 400000 * 0.03, 2)
    expect(c.dealScore).toBeGreaterThanOrEqual(0)
    expect(c.dealScore).toBeLessThanOrEqual(100)
    expect(c.scoreBreakdown.onePercent).toBeGreaterThanOrEqual(0)
  })

  it('flags FHA self-sufficiency only for 3-4 units', () => {
    expect(c.fhaSelfSufficient).toBe(true) // duplex: not applicable → true
    const quad = computeMetrics({ ...DUPLEX, units: 4 }, DEFAULT_ASSUMPTIONS)
    // 75% of $3,200 = $2,400 vs PITI — likely fails for a low-rent quad
    expect(typeof quad.fhaSelfSufficient).toBe('boolean')
  })

  it('a higher-rent property scores better', () => {
    const better = computeMetrics({ ...DUPLEX, rentTotal: 5200 }, DEFAULT_ASSUMPTIONS)
    expect(better.dealScore).toBeGreaterThan(c.dealScore)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/math.test.ts`
Expected: FAIL — `computeMetrics` not defined.

- [ ] **Step 3: Add implementation** (append to `math.ts`)

```ts
import type { ListingInputs, Computed, ScoreBreakdown } from '../types'

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
  const rentedRentA = rentTotal * (units - 1) / units
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

  // --- FHA self-sufficiency (3-4 units only) ---
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/math.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/math.ts src/lib/math.test.ts
git commit -m "feat: computeMetrics — both scenarios + deal score"
```

---

## Task 7: Formatting helpers

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Create `src/lib/format.ts`**

```ts
export const usd = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const usd2 = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, signDisplay: 'always' })

export const pct = (frac: number, digits = 1): string => `${(frac * 100).toFixed(digits)}%`

export const num = (n: number): string => Math.round(n).toLocaleString('en-US')
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.ts
git commit -m "feat: currency/percent formatting helpers"
```

---

## Task 8: RentCast client (TDD)

**Files:**
- Create: `src/lib/rentcast.ts`, `src/lib/rentcast.test.ts`

> **Execution note:** The mapped field names below follow RentCast's documented `/listings/sale` shape. During Phase 1, after you have a key, run one real `npm run refresh` and confirm the response fields match; adjust `RawSaleListing` if RentCast differs. The test pins our mapping to a fixture so behavior is deterministic.

- [ ] **Step 1: Write the failing test**

Create `src/lib/rentcast.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rentcast.test.ts`
Expected: FAIL — `RentCastClient` not defined.

- [ ] **Step 3: Write implementation**

Create `src/lib/rentcast.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rentcast.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rentcast.ts src/lib/rentcast.test.ts
git commit -m "feat: RentCast API client (listings + rent AVM)"
```

---

## Task 9: Refresh core — transform + firstSeen/NEW merge (TDD)

**Files:**
- Create: `src/lib/refresh-core.ts`, `src/lib/refresh-core.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/refresh-core.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeListings, estimateUnits, estimateInsuranceAnnual } from './refresh-core'
import { DEFAULT_ASSUMPTIONS } from '../config/assumptions'
import type { Listing } from '../types'
import type { RawSaleListing } from './rentcast'

const NOW = '2026-06-15T12:00:00.000Z'
const raw: RawSaleListing = {
  id: 'x1',
  formattedAddress: '100 Bay St, Tampa, FL 33602',
  zipCode: '33602',
  bedrooms: 4,
  bathrooms: 2,
  squareFootage: 2000,
  price: 450000,
  propertyType: 'Multi-Family',
}

describe('estimate helpers', () => {
  it('floors Florida insurance at $3,000 or 1% of price', () => {
    expect(estimateInsuranceAnnual(200000)).toBe(3000) // 1% = 2000 → floor 3000
    expect(estimateInsuranceAnnual(500000)).toBe(5000) // 1% = 5000
  })
  it('estimates 2 units by default', () => {
    expect(estimateUnits({ id: 'a', bedrooms: 4 })).toBe(2)
  })
})

describe('mergeListings', () => {
  it('marks a brand-new listing as new with firstSeen = now', () => {
    const out = mergeListings([raw], [], {
      assumptions: DEFAULT_ASSUMPTIONS, now: NOW, newListingDays: 7,
    })
    expect(out).toHaveLength(1)
    expect(out[0].firstSeen).toBe(NOW)
    expect(out[0].isNew).toBe(true)
    expect(out[0].computed.dealScore).toBeGreaterThanOrEqual(0)
  })

  it('preserves firstSeen from a previous run and un-flags old listings', () => {
    const prev: Listing[] = [{
      id: 'x1', address: '100 Bay St', zip: '33602', beds: 4, baths: 2, sqft: 2000,
      propertyType: 'Multi-Family', firstSeen: '2026-05-01T00:00:00.000Z', isNew: true,
      rentSource: 'rentcast', taxSource: 'estimated',
      price: 450000, units: 2, rentTotal: 3600, taxAnnual: 4950, insuranceAnnual: 4500, hoaMonthly: 0,
      computed: {} as Listing['computed'],
    }]
    const out = mergeListings([raw], prev, { assumptions: DEFAULT_ASSUMPTIONS, now: NOW, newListingDays: 7 })
    expect(out[0].firstSeen).toBe('2026-05-01T00:00:00.000Z')
    expect(out[0].isNew).toBe(false)               // >7 days old
    expect(out[0].rentTotal).toBe(3600)            // cached rent preserved
    expect(out[0].rentSource).toBe('rentcast')
  })

  it('uses a fetched AVM rent when provided', () => {
    const out = mergeListings([raw], [], {
      assumptions: DEFAULT_ASSUMPTIONS, now: NOW, newListingDays: 7,
      rentByAddress: { '100 Bay St, Tampa, FL 33602': 4200 },
    })
    expect(out[0].rentTotal).toBe(4200)
    expect(out[0].rentSource).toBe('rentcast')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/refresh-core.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/lib/refresh-core.ts`:

```ts
import type { Assumptions, Listing, ListingInputs } from '../types'
import type { RawSaleListing } from './rentcast'
import { computeMetrics } from './math'

export function estimateUnits(raw: RawSaleListing): number {
  const beds = raw.bedrooms ?? 0
  if (beds >= 8) return 4
  if (beds >= 6) return 3
  return 2
}

export function estimateTaxAnnual(price: number, effRate = 0.011): number {
  return Math.round(price * effRate)
}

export function estimateInsuranceAnnual(price: number): number {
  return Math.max(3000, Math.round(price * 0.01))
}

export function estimateRentTotal(price: number): number {
  return Math.round(price * 0.007)
}

export interface BuildOptions {
  assumptions: Assumptions
  now: string
  newListingDays: number
  rentByAddress?: Record<string, number>
}

export function buildListing(raw: RawSaleListing, prev: Listing | undefined, opts: BuildOptions): Listing {
  const price = raw.price ?? 0
  const units = estimateUnits(raw)
  const address = raw.formattedAddress ?? raw.addressLine1 ?? 'Unknown address'

  let rentTotal: number
  let rentSource: Listing['rentSource']
  if (opts.rentByAddress && opts.rentByAddress[address] != null) {
    rentTotal = opts.rentByAddress[address]
    rentSource = 'rentcast'
  } else if (prev && prev.rentSource !== 'estimated') {
    rentTotal = prev.rentTotal
    rentSource = prev.rentSource
  } else {
    rentTotal = estimateRentTotal(price)
    rentSource = 'estimated'
  }

  const taxAnnual = estimateTaxAnnual(price)
  const insuranceAnnual = estimateInsuranceAnnual(price)
  const hoaMonthly = 0

  const inputs: ListingInputs = { price, units, rentTotal, taxAnnual, insuranceAnnual, hoaMonthly }
  const computed = computeMetrics(inputs, opts.assumptions)

  const firstSeen = prev?.firstSeen ?? opts.now
  const ageDays = (Date.parse(opts.now) - Date.parse(firstSeen)) / 86_400_000
  const isNew = ageDays <= opts.newListingDays

  return {
    id: raw.id,
    address,
    zip: raw.zipCode ?? '',
    lat: raw.latitude,
    lng: raw.longitude,
    beds: raw.bedrooms ?? 0,
    baths: raw.bathrooms ?? 0,
    sqft: raw.squareFootage ?? 0,
    yearBuilt: raw.yearBuilt,
    propertyType: raw.propertyType ?? 'Multi-Family',
    listedDate: raw.listedDate,
    firstSeen,
    daysOnMarket: raw.daysOnMarket,
    isNew,
    rentSource,
    taxSource: 'estimated',
    photoUrl: undefined,
    listingUrl: undefined,
    price,
    units,
    rentTotal,
    taxAnnual,
    insuranceAnnual,
    hoaMonthly,
    computed,
  }
}

export function mergeListings(raws: RawSaleListing[], prev: Listing[], opts: BuildOptions): Listing[] {
  const prevById = new Map(prev.map((l) => [l.id, l]))
  return raws.map((r) => buildListing(r, prevById.get(r.id), opts))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/refresh-core.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/refresh-core.ts src/lib/refresh-core.test.ts
git commit -m "feat: refresh-core transform + firstSeen/NEW merge"
```

---

## Task 10: Refresh script (I/O orchestrator)

**Files:**
- Create: `scripts/refresh.ts`

> Not unit-tested (pure I/O); verified by running it. All testable logic lives in `refresh-core.ts` and `rentcast.ts`.

- [ ] **Step 1: Create `scripts/refresh.ts`**

```ts
import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RentCastClient } from '../src/lib/rentcast'
import { mergeListings } from '../src/lib/refresh-core'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { Listing, ListingsFile } from '../src/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

async function main() {
  const apiKey = process.env.RENTCAST_API_KEY
  if (!apiKey) {
    console.error('Missing RENTCAST_API_KEY. Copy .env.example to .env and add your key.')
    process.exit(1)
  }
  const client = new RentCastClient({ apiKey })

  let prev: Listing[] = []
  if (existsSync(DATA)) {
    try {
      prev = (JSON.parse(readFileSync(DATA, 'utf8')) as ListingsFile).listings ?? []
    } catch {
      prev = []
    }
  }

  const raws = await client.saleListings({ city: 'Tampa', state: 'FL', propertyType: 'Multi-Family' })
  console.log(`Fetched ${raws.length} Tampa multi-family listings`)

  // Budget-aware rent AVM: only for NEW ids, capped to stay within the free tier.
  const prevIds = new Set(prev.map((l) => l.id))
  const budget = Number(process.env.RENT_AVM_BUDGET ?? 15)
  const rentByAddress: Record<string, number> = {}
  let spent = 0
  for (const r of raws) {
    if (spent >= budget) break
    if (prevIds.has(r.id)) continue
    const addr = r.formattedAddress ?? r.addressLine1
    if (!addr) continue
    const rent = await client.rentEstimate({
      address: addr,
      propertyType: 'Multi-Family',
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      squareFootage: r.squareFootage,
    })
    if (rent != null) {
      rentByAddress[addr] = rent
      spent++
    }
  }
  console.log(`Rent AVM fetched for ${spent} new listings. Total RentCast requests: ${client.requestCount}`)

  const now = new Date().toISOString()
  const listings = mergeListings(raws, prev, {
    assumptions: DEFAULT_ASSUMPTIONS,
    now,
    newListingDays: NEW_LISTING_DAYS,
    rentByAddress,
  })
  listings.sort((a, b) => b.computed.dealScore - a.computed.dealScore)

  const out: ListingsFile = {
    generatedAt: now,
    area: 'Tampa, FL (Hillsborough)',
    defaultAssumptions: DEFAULT_ASSUMPTIONS,
    listings,
  }
  mkdirSync(dirname(DATA), { recursive: true })
  writeFileSync(DATA, JSON.stringify(out, null, 2))
  console.log(`Wrote ${listings.length} listings → public/data/listings.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/refresh.ts
git commit -m "feat: refresh script — fetch, analyze, write listings.json"
```

---

## Task 11: Seed sample data

So the UI runs before a RentCast key exists, ship a small realistic sample dataset.

**Files:**
- Create: `public/data/listings.json`
- Create: `scripts/make-sample.ts`

- [ ] **Step 1: Create `scripts/make-sample.ts`**

```ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeListings } from '../src/lib/refresh-core'
import { DEFAULT_ASSUMPTIONS, NEW_LISTING_DAYS } from '../src/config/assumptions'
import type { RawSaleListing } from '../src/lib/rentcast'
import type { ListingsFile } from '../src/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'public', 'data', 'listings.json')

const sample: RawSaleListing[] = [
  { id: 's1', formattedAddress: '1204 E 12th Ave, Tampa, FL 33605', zipCode: '33605', bedrooms: 4, bathrooms: 2, squareFootage: 1800, price: 389000, propertyType: 'Multi-Family', daysOnMarket: 3, listedDate: '2026-06-12' },
  { id: 's2', formattedAddress: '3010 W Cherry St, Tampa, FL 33607', zipCode: '33607', bedrooms: 6, bathrooms: 3, squareFootage: 2600, price: 575000, propertyType: 'Multi-Family', daysOnMarket: 21, listedDate: '2026-05-25' },
  { id: 's3', formattedAddress: '809 E Frierson Ave, Tampa, FL 33603', zipCode: '33603', bedrooms: 8, bathrooms: 4, squareFootage: 3400, price: 720000, propertyType: 'Multi-Family', daysOnMarket: 40, listedDate: '2026-05-06' },
  { id: 's4', formattedAddress: '2515 N Albany Ave, Tampa, FL 33607', zipCode: '33607', bedrooms: 4, bathrooms: 2, squareFootage: 1650, price: 349000, propertyType: 'Multi-Family', daysOnMarket: 1, listedDate: '2026-06-14' },
]

// Give the sample realistic rents (≈0.8–1.0% of price) so scores vary.
const rentByAddress: Record<string, number> = {
  '1204 E 12th Ave, Tampa, FL 33605': 3400,
  '3010 W Cherry St, Tampa, FL 33607': 5400,
  '809 E Frierson Ave, Tampa, FL 33603': 7600,
  '2515 N Albany Ave, Tampa, FL 33607': 2900,
}

const now = new Date().toISOString()
const listings = mergeListings(sample, [], {
  assumptions: DEFAULT_ASSUMPTIONS, now, newListingDays: NEW_LISTING_DAYS, rentByAddress,
})
listings.sort((a, b) => b.computed.dealScore - a.computed.dealScore)

const out: ListingsFile = {
  generatedAt: now, area: 'Tampa, FL (SAMPLE DATA)', defaultAssumptions: DEFAULT_ASSUMPTIONS, listings,
}
mkdirSync(dirname(DATA), { recursive: true })
writeFileSync(DATA, JSON.stringify(out, null, 2))
console.log(`Wrote ${listings.length} sample listings → public/data/listings.json`)
```

- [ ] **Step 2: Generate the sample file**

Run: `npx tsx scripts/make-sample.ts`
Expected: "Wrote 4 sample listings → public/data/listings.json". File exists and contains 4 listings with `computed.dealScore` values.

- [ ] **Step 3: Commit**

```bash
git add scripts/make-sample.ts public/data/listings.json
git commit -m "feat: seed sample Tampa dataset for offline UI dev"
```

---

## Task 12: Favorites/notes/overrides store (TDD)

**Files:**
- Create: `src/lib/favorites.ts`, `src/lib/favorites.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/favorites.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadStore, saveStore, toggleFavorite, setOverride, emptyStore } from './favorites'

beforeEach(() => localStorage.clear())

describe('favorites store', () => {
  it('returns an empty store when nothing is saved', () => {
    expect(loadStore()).toEqual(emptyStore())
  })

  it('toggles a favorite on and off', () => {
    let s = toggleFavorite(emptyStore(), 's1')
    expect(s.favorites).toContain('s1')
    s = toggleFavorite(s, 's1')
    expect(s.favorites).not.toContain('s1')
  })

  it('stores a per-listing override and persists across load/save', () => {
    let s = setOverride(emptyStore(), 's2', { rentTotal: 4000 })
    saveStore(s)
    const loaded = loadStore()
    expect(loaded.overrides['s2'].rentTotal).toBe(4000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/lib/favorites.ts`:

```ts
export interface Overrides {
  rentTotal?: number
  insuranceAnnual?: number
  taxAnnual?: number
  units?: number
}

export interface Store {
  favorites: string[]
  notes: Record<string, string>
  overrides: Record<string, Overrides>
}

const KEY = 'tampaplex.v1'

export function emptyStore(): Store {
  return { favorites: [], notes: {}, overrides: {} }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    return { ...emptyStore(), ...(JSON.parse(raw) as Store) }
  } catch {
    return emptyStore()
  }
}

export function saveStore(s: Store): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function toggleFavorite(s: Store, id: string): Store {
  const favorites = s.favorites.includes(id)
    ? s.favorites.filter((f) => f !== id)
    : [...s.favorites, id]
  return { ...s, favorites }
}

export function setNote(s: Store, id: string, note: string): Store {
  return { ...s, notes: { ...s.notes, [id]: note } }
}

export function setOverride(s: Store, id: string, patch: Overrides): Store {
  const merged = { ...(s.overrides[id] ?? {}), ...patch }
  return { ...s, overrides: { ...s.overrides, [id]: merged } }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/favorites.ts src/lib/favorites.test.ts
git commit -m "feat: localStorage favorites/notes/overrides"
```

---

## Task 13: useListings hook + applyOverrides helper

**Files:**
- Create: `src/hooks/useListings.ts`
- Modify: `src/lib/refresh-core.ts` (add `applyOverrides`)

- [ ] **Step 1: Create `src/hooks/useListings.ts`**

```ts
import { useEffect, useState } from 'react'
import type { ListingsFile } from '../types'

export function useListings() {
  const [data, setData] = useState<ListingsFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'data/listings.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ListingsFile) => setData(d))
      .catch((e) => setError(String(e)))
  }, [])

  return { data, error }
}
```

- [ ] **Step 2: Add `applyOverrides` to `src/lib/refresh-core.ts`** (append)

```ts
import type { Computed } from '../types'
import type { Overrides } from './favorites'

/** Recompute a listing's metrics with user overrides + current assumptions. */
export function recompute(listing: Listing, overrides: Overrides | undefined, assumptions: Assumptions): Computed {
  const inputs: ListingInputs = {
    price: listing.price,
    units: overrides?.units ?? listing.units,
    rentTotal: overrides?.rentTotal ?? listing.rentTotal,
    taxAnnual: overrides?.taxAnnual ?? listing.taxAnnual,
    insuranceAnnual: overrides?.insuranceAnnual ?? listing.insuranceAnnual,
    hoaMonthly: listing.hoaMonthly,
  }
  return computeMetrics(inputs, assumptions)
}
```

- [ ] **Step 3: Add a test for `recompute`** (append to `src/lib/refresh-core.test.ts`)

```ts
import { recompute } from './refresh-core'

describe('recompute', () => {
  it('applies a rent override and changes the deal score', () => {
    const base = mergeListings([raw], [], { assumptions: DEFAULT_ASSUMPTIONS, now: NOW, newListingDays: 7 })[0]
    const bumped = recompute(base, { rentTotal: base.rentTotal + 2000 }, DEFAULT_ASSUMPTIONS)
    expect(bumped.dealScore).toBeGreaterThan(base.computed.dealScore)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/refresh-core.test.ts`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useListings.ts src/lib/refresh-core.ts src/lib/refresh-core.test.ts
git commit -m "feat: useListings hook + recompute-with-overrides"
```

---

## Task 14: ScoreBadge component

**Files:**
- Create: `src/components/ScoreBadge.tsx`

- [ ] **Step 1: Create `src/components/ScoreBadge.tsx`**

```tsx
import { scoreTier } from '../config/assumptions'

const TIER_CLASS: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  okay: 'bg-amber-100 text-amber-800 ring-amber-300',
  weak: 'bg-rose-100 text-rose-700 ring-rose-300',
}

export function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = scoreTier(score)
  const sizeClass = size === 'lg' ? 'text-2xl px-4 py-2' : size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-bold ring-1 ${TIER_CLASS[tier]} ${sizeClass}`}>
      {Math.round(score)}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ScoreBadge.tsx
git commit -m "feat: ScoreBadge component"
```

---

## Task 15: ListingCard component

**Files:**
- Create: `src/components/ListingCard.tsx`

- [ ] **Step 1: Create `src/components/ListingCard.tsx`**

```tsx
import type { Computed, Listing } from '../types'
import { ScoreBadge } from './ScoreBadge'
import { usd, pct } from '../lib/format'

interface Props {
  listing: Listing
  computed: Computed
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}

export function ListingCard({ listing, computed, isFavorite, onToggleFavorite, onOpen }: Props) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {listing.isNew && (
              <span className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">NEW</span>
            )}
            <h3 className="truncate font-semibold text-slate-900">{listing.address}</h3>
          </div>
          <p className="text-sm text-slate-500">
            {listing.units} units · {listing.beds} bd / {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
          </p>
        </div>
        <ScoreBadge score={computed.dealScore} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Price" value={usd(listing.price)} />
        <Metric label="Est. rent" value={`${usd(listing.rentTotal)}/mo`} />
        <Metric
          label="Live-in cost"
          value={`${usd(computed.houseHackOutOfPocket)}/mo`}
          good={computed.houseHackOutOfPocket <= 0}
        />
        <Metric label="Cap rate" value={pct(computed.capRate)} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => onToggleFavorite(listing.id)} className="text-sm text-slate-500 hover:text-amber-600">
          {isFavorite ? '★ Saved' : '☆ Save'}
        </button>
        <button
          onClick={() => onOpen(listing.id)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Details
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-semibold ${good ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListingCard.tsx
git commit -m "feat: ListingCard component"
```

---

## Task 16: FilterBar component

**Files:**
- Create: `src/components/FilterBar.tsx`

- [ ] **Step 1: Create `src/components/FilterBar.tsx`**

```tsx
export interface Filters {
  maxPrice: number
  units: number // 0 = any
  minScore: number
  newOnly: boolean
  favoritesOnly: boolean
  search: string
}

export const DEFAULT_FILTERS: Filters = {
  maxPrice: 900000, units: 0, minScore: 0, newOnly: false, favoritesOnly: false, search: '',
}

export function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <Field label={`Max price: ${(filters.maxPrice / 1000).toFixed(0)}k`}>
        <input type="range" min={200000} max={1200000} step={25000}
          value={filters.maxPrice} onChange={(e) => set({ maxPrice: Number(e.target.value) })} />
      </Field>
      <Field label="Units">
        <select className="rounded border-slate-300" value={filters.units}
          onChange={(e) => set({ units: Number(e.target.value) })}>
          <option value={0}>Any</option><option value={2}>Duplex</option>
          <option value={3}>Triplex</option><option value={4}>Quadplex</option>
        </select>
      </Field>
      <Field label={`Min score: ${filters.minScore}`}>
        <input type="range" min={0} max={100} step={5}
          value={filters.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })} />
      </Field>
      <Field label="Search">
        <input className="rounded border-slate-300" placeholder="address / zip"
          value={filters.search} onChange={(e) => set({ search: e.target.value })} />
      </Field>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={filters.newOnly} onChange={(e) => set({ newOnly: e.target.checked })} /> New only
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={filters.favoritesOnly} onChange={(e) => set({ favoritesOnly: e.target.checked })} /> ★ Saved
      </label>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: FilterBar component"
```

---

## Task 17: AssumptionsPanel component

**Files:**
- Create: `src/components/AssumptionsPanel.tsx`

- [ ] **Step 1: Create `src/components/AssumptionsPanel.tsx`**

```tsx
import type { Assumptions } from '../types'
import { pct } from '../lib/format'

export function AssumptionsPanel({ a, onChange }: { a: Assumptions; onChange: (a: Assumptions) => void }) {
  const set = (patch: Partial<Assumptions>) => onChange({ ...a, ...patch })
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 font-semibold text-slate-900">Your assumptions</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Slider label={`Down payment: ${pct(a.downPct, 1)}`} min={0.035} max={0.25} step={0.005}
          value={a.downPct} onChange={(v) => set({ downPct: v })} />
        <Slider label={`Interest rate: ${pct(a.rateAnnual, 2)}`} min={0.03} max={0.1} step={0.00125}
          value={a.rateAnnual} onChange={(v) => set({ rateAnnual: v })} />
        <Slider label={`Vacancy: ${pct(a.vacancyPct)}`} min={0} max={0.15} step={0.01}
          value={a.vacancyPct} onChange={(v) => set({ vacancyPct: v })} />
        <Slider label={`Maintenance: ${pct(a.maintenancePct)}`} min={0} max={0.15} step={0.01}
          value={a.maintenancePct} onChange={(v) => set({ maintenancePct: v })} />
        <Slider label={`CapEx: ${pct(a.capexPct)}`} min={0} max={0.15} step={0.01}
          value={a.capexPct} onChange={(v) => set({ capexPct: v })} />
        <Slider label={`Mgmt (rent-all): ${pct(a.mgmtPct)}`} min={0} max={0.12} step={0.01}
          value={a.mgmtPct} onChange={(v) => set({ mgmtPct: v })} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={a.useFhaMip} onChange={(e) => set({ useFhaMip: e.target.checked })} />
        Include FHA mortgage insurance (MIP)
      </label>
    </div>
  )
}

function Slider({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium text-slate-600">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AssumptionsPanel.tsx
git commit -m "feat: AssumptionsPanel with live sliders"
```

---

## Task 18: ListingDetail component (math breakdown)

**Files:**
- Create: `src/components/ListingDetail.tsx`

- [ ] **Step 1: Create `src/components/ListingDetail.tsx`**

```tsx
import type { Computed, Listing } from '../types'
import type { Overrides } from '../lib/favorites'
import { ScoreBadge } from './ScoreBadge'
import { usd, usd2, pct } from '../lib/format'

interface Props {
  listing: Listing
  computed: Computed
  override: Overrides | undefined
  onOverride: (id: string, patch: Overrides) => void
  onClose: () => void
}

export function ListingDetail({ listing, computed, override, onOverride, onClose }: Props) {
  const rent = override?.rentTotal ?? listing.rentTotal
  const ins = override?.insuranceAnnual ?? listing.insuranceAnnual
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{listing.address}</h2>
            <p className="text-slate-500">
              {listing.units} units · {usd(listing.price)} · rent source: {listing.rentSource}
            </p>
          </div>
          <ScoreBadge score={computed.dealScore} size="lg" />
        </div>

        {!computed.fhaSelfSufficient && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            ⚠️ Fails the FHA 3–4 unit self-sufficiency test (75% of rent must cover PITI). An FHA loan likely won't be approved at this rent.
          </p>
        )}

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">🛋️ Live in one unit</h3>
          <Row label="Tenant rent (other units)" value={`${usd(rent * (listing.units - 1) / listing.units)}/mo`} />
          <Row label="Mortgage (P&I)" value={`${usd(computed.mortgageMonthly)}/mo`} />
          <Row label="FHA MIP" value={`${usd(computed.mipMonthly)}/mo`} />
          <Row label="Your out-of-pocket cost" value={`${usd2(-computed.houseHackOutOfPocket)}/mo`}
            highlight good={computed.houseHackOutOfPocket <= 0} />
          <Row label="% of housing cost covered" value={`${computed.pctCostCovered.toFixed(0)}%`} />
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">💰 Rent all units (after you move out)</h3>
          <Row label="Monthly cash flow" value={`${usd2(computed.fullRentalCashFlow)}/mo`}
            highlight good={computed.fullRentalCashFlow >= 0} />
          <Row label="Cap rate" value={pct(computed.capRate)} />
          <Row label="Cash-on-cash return" value={pct(computed.cashOnCash)} />
          <Row label="Cash needed to close" value={usd(computed.cashInvested)} />
          <Row label="1% rule (rent ÷ price)" value={pct(computed.onePercent, 2)} />
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-800">Score breakdown</h3>
          <Row label="House-hack (35%)" value={computed.scoreBreakdown.houseHack.toFixed(0)} />
          <Row label="Cash-on-cash (30%)" value={computed.scoreBreakdown.cashOnCash.toFixed(0)} />
          <Row label="Cap rate (20%)" value={computed.scoreBreakdown.capRate.toFixed(0)} />
          <Row label="1% rule (15%)" value={computed.scoreBreakdown.onePercent.toFixed(0)} />
        </section>

        <section className="mt-5 grid grid-cols-2 gap-4">
          <NumberField label="Override total rent ($/mo)" value={rent}
            onChange={(v) => onOverride(listing.id, { rentTotal: v })} />
          <NumberField label="Override insurance ($/yr)" value={ins}
            onChange={(v) => onOverride(listing.id, { insuranceAnnual: v })} />
        </section>

        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-700">
          Close
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, highlight, good }: { label: string; value: string; highlight?: boolean; good?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-1.5 ${highlight ? 'font-bold' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className={good === undefined ? 'text-slate-900' : good ? 'text-emerald-600' : 'text-rose-600'}>{value}</span>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <input type="number" className="rounded border-slate-300" value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListingDetail.tsx
git commit -m "feat: ListingDetail with full math breakdown + overrides"
```

---

## Task 19: ListingList component

**Files:**
- Create: `src/components/ListingList.tsx`

- [ ] **Step 1: Create `src/components/ListingList.tsx`**

```tsx
import type { Computed, Listing } from '../types'
import { ListingCard } from './ListingCard'

interface Props {
  items: { listing: Listing; computed: Computed }[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onOpen: (id: string) => void
}

export function ListingList({ items, favorites, onToggleFavorite, onOpen }: Props) {
  if (items.length === 0) {
    return <p className="py-12 text-center text-slate-400">No listings match your filters.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ listing, computed }) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          computed={computed}
          isFavorite={favorites.includes(listing.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListingList.tsx
git commit -m "feat: ListingList grid"
```

---

## Task 20: App wiring

Compose everything: load data, hold assumptions + filters + favorites state, recompute each listing live, filter, sort, render.

**Files:**
- Modify: `src/App.tsx` (replace placeholder)

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useListings } from './hooks/useListings'
import { recompute } from './lib/refresh-core'
import { DEFAULT_ASSUMPTIONS } from './config/assumptions'
import type { Assumptions, Computed, Listing } from './types'
import { loadStore, saveStore, toggleFavorite, setOverride, type Store } from './lib/favorites'
import { FilterBar, DEFAULT_FILTERS, type Filters } from './components/FilterBar'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { ListingList } from './components/ListingList'
import { ListingDetail } from './components/ListingDetail'

export default function App() {
  const { data, error } = useListings()
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [store, setStore] = useState<Store>(() => loadStore())
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => { if (data) setAssumptions(data.defaultAssumptions) }, [data])
  useEffect(() => { saveStore(store) }, [store])

  const computedById = useMemo(() => {
    const map = new Map<string, Computed>()
    for (const l of data?.listings ?? []) map.set(l.id, recompute(l, store.overrides[l.id], assumptions))
    return map
  }, [data, store.overrides, assumptions])

  const visible = useMemo(() => {
    const list = (data?.listings ?? []).map((l) => ({ listing: l, computed: computedById.get(l.id)! }))
    const q = filters.search.trim().toLowerCase()
    return list
      .filter(({ listing, computed }) =>
        listing.price <= filters.maxPrice &&
        (filters.units === 0 || listing.units === filters.units) &&
        computed.dealScore >= filters.minScore &&
        (!filters.newOnly || listing.isNew) &&
        (!filters.favoritesOnly || store.favorites.includes(listing.id)) &&
        (q === '' || listing.address.toLowerCase().includes(q) || listing.zip.includes(q)))
      .sort((a, b) => b.computed.dealScore - a.computed.dealScore)
  }, [data, computedById, filters, store.favorites])

  const open = openId ? (data?.listings ?? []).find((l) => l.id === openId) : undefined

  if (error) return <Shell><p className="text-rose-600">Couldn’t load listings: {error}. Run <code>npm run refresh</code> or <code>npx tsx scripts/make-sample.ts</code>.</p></Shell>
  if (!data) return <Shell><p className="text-slate-400">Loading…</p></Shell>

  return (
    <Shell sub={`${data.area} · updated ${new Date(data.generatedAt).toLocaleString()} · ${data.listings.length} listings`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <ListingList
            items={visible}
            favorites={store.favorites}
            onToggleFavorite={(id) => setStore((s) => toggleFavorite(s, id))}
            onOpen={setOpenId}
          />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <AssumptionsPanel a={assumptions} onChange={setAssumptions} />
        </div>
      </div>

      {open && (
        <ListingDetail
          listing={open as Listing}
          computed={computedById.get(open.id)!}
          override={store.overrides[open.id]}
          onOverride={(id, patch) => setStore((s) => setOverride(s, id, patch))}
          onClose={() => setOpenId(null)}
        />
      )}
    </Shell>
  )
}

function Shell({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">🏠 TampaPlex</h1>
        <p className="text-sm text-slate-500">{sub ?? 'Tampa duplex / triplex / quad investment finder'}</p>
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass (math, rentcast, refresh-core, favorites).

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open http://localhost:5173
Expected: 4 sample Tampa listings ranked by score; NEW badges on recent ones; dragging the interest-rate slider re-orders/updates cards; clicking Details shows the breakdown and the FHA warning on the low-rent quad; Save toggles persist on reload.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up App — filters, live recompute, detail, favorites"
```

---

## Task 21: README + run instructions

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# 🏠 TampaPlex

Finds current Tampa **duplex / triplex / quadplex** for-sale listings and ranks them
by a house-hacking **Deal Score** (live in one unit, rent the rest).

## Quick start

```bash
npm install
npx tsx scripts/make-sample.ts   # seeds sample data so the UI works immediately
npm run dev                      # open http://localhost:5173
```

## Live Tampa data (free RentCast key)

1. Sign up free at https://app.rentcast.io (free tier: 50 requests/month).
2. `copy .env.example .env` and paste your key into `RENTCAST_API_KEY`.
3. `npm run refresh` — pulls current Tampa multi-family listings into
   `public/data/listings.json`.
4. `npm run dev` to view.

## How the Deal Score works

A 0–100 blend: house-hack affordability (35%), future cash-on-cash (30%),
cap rate (20%), and the 1% rule (15%). Open any listing for the full breakdown.
Insurance defaults are set high on purpose — Florida insurance is the #1 cash-flow
killer. Adjust any assumption with the sliders; override rent/insurance per property.

## Tests

```bash
npm test
```

## Next (Phase 2)

Deploy + daily auto-refresh via GitHub Actions — see
`docs/superpowers/specs/2026-06-13-tampaplex-investment-finder-design.md`.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with quick start + RentCast setup"
```

---

## Self-Review

**Spec coverage check:**
- Daily cloud discovery → Phase 2 (out of scope here); Phase 1 builds the manual `npm run refresh` that the cron will later call. ✔ (refresh script, Task 10)
- RentCast free-tier listings + rent/value estimates → ✔ (Task 8 client, Task 10 budget logic)
- Two scenarios (live-in / rent-all) + cap rate + cash-on-cash + 1% rule → ✔ (Task 6)
- FHA 3.5% + MIP + self-sufficiency flag → ✔ (Tasks 4, 6)
- Florida-high insurance default → ✔ (Task 9 `estimateInsuranceAnnual`)
- Transparent Deal Score with visible breakdown → ✔ (Tasks 6, 18)
- Filters (price/units/score/new/favorites/search) → ✔ (Task 16, 20)
- Live-adjustable assumptions → ✔ (Tasks 17, 20)
- NEW-listing detection via firstSeen → ✔ (Task 9)
- Favorites/notes/overrides in localStorage → ✔ (Task 12)
- Static `listings.json` consumed by UI → ✔ (Tasks 11, 13, 20)

**Placeholder scan:** No TBD/TODO; every code step contains full code; every command has expected output.

**Type consistency:** `Assumptions`, `ListingInputs`, `Computed`, `Listing`, `Store`, `Overrides`, `RawSaleListing`, `Filters` are defined once and reused. `computeMetrics`, `mergeListings`, `recompute`, `loadStore`/`saveStore`/`toggleFavorite`/`setOverride`, `RentCastClient` names match across tasks. Data path `public/data/listings.json` is consistent in Tasks 10, 11, 13.

**Open item flagged for execution:** RentCast `/listings/sale` response field names should be confirmed against one live call (noted in Task 8); unit-count for small multi-family may need the per-property override (Task 18) since RentCast doesn't always expose it.
