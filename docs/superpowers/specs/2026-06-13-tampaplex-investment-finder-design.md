# TampaPlex — Tampa Multi-Family Investment Finder

**Date:** 2026-06-13
**Status:** Approved design → ready for implementation plan

## 1. Summary

A free web dashboard that automatically pulls **current Tampa duplex / triplex / quadplex (2–4 unit) for-sale listings** every day, runs **house-hacking investment math** on each one, and ranks them by a transparent **0–100 Deal Score** — prominently flagging brand-new listings.

The target user is a young, first-time house-hacker: someone who wants to buy a small multi-family with low money down (FHA 3.5%), live in one unit, rent the others, and ideally "live for free" while building equity. The app does the searching and the math so they don't have to.

**Core constraint:** everything must be free and stay free, legal, and reliable (no scraping, no servers running 24/7, no recurring bill).

## 2. Goals & Non-Goals

### Goals
- Automatically discover current + newly-listed Tampa 2–4 unit for-sale properties.
- Compute realistic investment math per property, tuned for **Florida** (high insurance is modeled honestly).
- Rank by a transparent, explainable Deal Score; never a black box — every sub-number is visible.
- Run unattended in the cloud on a daily schedule, $0/month.
- Let the user adjust key assumptions (down %, interest rate, rents, expenses) and see rankings update live.

### Non-Goals (explicitly out of v1 — YAGNI)
- No user accounts / login / auth (personal app; per-user state lives in the browser).
- No payments or buying/offer features.
- Not nationwide — Tampa / Hillsborough only (area is configurable but built for Tampa).
- No email/push alerts in v1 (planned as an optional Phase 3 add-on).
- No mortgage pre-approval or lender integration.

## 3. Architecture

The key idea that keeps it $0 and unbannable: a small scheduled script asks a **real, legal listings API** (RentCast) for data and bakes the results into a static file that the website reads. No live browser scraping, no always-on backend, no database bill.

```
┌─────────────────────────────────────────────────────────────┐
│  DAILY, IN THE CLOUD (free GitHub Actions cron)              │
│   ① fetch    → RentCast API free tier: current Tampa 2–4     │
│                unit for-sale listings. API key stored as a   │
│                GitHub Actions secret — never in the browser. │
│   ② analyze  → run investment math on each listing.          │
│   ③ compare  → diff vs previous data → preserve firstSeen,   │
│                tag NEW listings.                             │
│   ④ save     → write data/listings.json, commit to repo.     │
└───────────────────────────┬─────────────────────────────────┘
                            │ commit triggers auto-deploy
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  STATIC WEBSITE (free hosting — Vercel / Cloudflare Pages)   │
│   • Ranked list (best Deal Score first), 🆕 badges          │
│   • Filters: price, # units, score, cash flow, zip, beds     │
│   • Click property → full math breakdown                     │
│   • Sliders (down% / rate / rents) → re-rank live in browser │
│   • ⭐ Favorites + notes + manual rent overrides (localStorage)│
└─────────────────────────────────────────────────────────────┘
```

### Why this shape
- The frontend only ever reads a static `listings.json` → no secrets in the client, nothing to attack, trivially cacheable, can't run up a bill.
- The investment math is written **once** as a shared module so it runs both in the Node refresh job and live in the browser (when the user drags a slider). No duplicated logic.
- Storage is a committed JSON file (simplest possible). A Supabase free-tier database is the documented upgrade path if the user later wants synced notes across devices or server-side "new since last visit" — not built in v1.

## 4. Components (isolated, testable units)

| Unit | Responsibility | Depends on | Tested by |
|------|----------------|-----------|-----------|
| `src/lib/math.ts` | **Pure** investment math + Deal Score. No I/O. | nothing | Unit tests (TDD — this is the critical core) |
| `src/lib/rentcast.ts` | RentCast API client: sale listings, rent AVM, property records. Request-budget aware. | RentCast API | Unit tests w/ mocked fetch |
| `scripts/refresh.ts` | Orchestrator: fetch → analyze → merge firstSeen/NEW → write `data/listings.json`. Runs locally (Phase 1) and in CI (Phase 2). | math, rentcast | Unit tests for merge logic |
| `src/config/assumptions.ts` | Default financial assumptions + Deal Score thresholds/weights, in one place. | nothing | — |
| `src/` React app | UI: `FilterBar`, `ListingList`, `ListingCard`, `ListingDetail` (math breakdown), `AssumptionsPanel` (sliders), `ScoreBadge`, `FavoritesStore` (localStorage). | math, listings.json | Light component tests + manual |
| `.github/workflows/refresh.yml` | Daily cron; runs refresh, commits JSON (Phase 2). | refresh script | Manual / CI run |

**Test stance:** the math module is pure and is the thing most worth getting exactly right, so it is built test-first (TDD). The RentCast client is tested against recorded/mocked responses. The refresh merge logic (firstSeen preservation + NEW tagging) is unit-tested. UI gets light component tests plus manual verification.

## 5. Investment Math

Every listing is evaluated under **two scenarios**, because that is how house-hacking actually works.

### Inputs (per listing)
- `price` — list price (from RentCast).
- `units` (N = 2, 3, or 4), `beds`, `baths`, `sqft`, `yearBuilt`.
- `rentTotal` — estimated total monthly market rent across all units (RentCast rent AVM where fetched; otherwise estimated and flagged; user can override per-property). `rentPerUnit = rentTotal / N`.
- `taxAnnual` — actual prior-year property tax from RentCast records where available, else estimated at an effective rate (default ~1.1% of price), with owner-occupied homestead noted.
- `insuranceAnnual` — **modeled high for Florida.** Default `max($3,000, price × 1.0%)` per year, prominently adjustable. Flood insurance is flagged as a separate verify-item (not auto-priced).
- `hoaMonthly` — from listing if present, else 0.
- Assumptions (adjustable, defaults below): down %, annual interest rate, term, FHA MIP, vacancy %, maintenance %, capex %, property-management %.

### Financing (FHA default)
- Down payment = `price × downPct` (default 3.5%).
- Base loan = `price − down`. Upfront MIP (1.75%) is financed → `loan = base × 1.0175`.
- Monthly P&I via standard amortization: `M = L · i(1+i)^n / ((1+i)^n − 1)`, `i = annualRate/12`, `n = termYears × 12`.
- Monthly FHA annual MIP ≈ `loan × 0.55% / 12` (>90% LTV, 30-yr default).

### Scenario A — "Live in one unit" (now)
- Rent collected = other units = `rentTotal × (N−1)/N`.
- Total monthly cost = P&I + MIP + taxes/12 + insurance/12 + maintenance + capex + vacancy (on rented units) + HOA + owner-paid utilities.
- **Out-of-pocket to live there** = total cost − rent collected. Negative = you live free and pocket money.
- **% of housing cost covered** = rent collected / total monthly cost × 100.

### Scenario B — "Rent it all" (after moving out)
- Gross rent = `rentTotal`.
- **NOI** (annual, excludes financing) = gross rent − vacancy − maintenance − capex − property mgmt − taxes − insurance − HOA − utilities.
- **Cap rate** = NOI / price.
- **Monthly cash flow** = gross rent/12 − all monthly operating costs − P&I − MIP.
- **Cash invested** = down payment + closing costs (default 3% of price).
- **Cash-on-cash** = annual cash flow / cash invested.

### 1% rule
`rentTotal / price ≥ 1%` → pass.

### FHA self-sufficiency flag (3–4 units)
FHA requires 3–4 unit properties to be "self-sufficient": **75% of total rent must cover the full PITI**. Computed as a pass/fail flag for triplex/quadplex (not required for duplex). Surfaced because it can disqualify an FHA purchase regardless of how good the deal looks.

### Deal Score (0–100, "balanced")
Each component is normalized to 0–100 against sensible thresholds, then weighted:

| Component | Weight | 0 pts | ~70–80 pts | 100 pts |
|-----------|--------|-------|-----------|---------|
| House-hack affordability (% cost covered) | 35% | 0% covered | 100% (live free) | ≥130% |
| Future cash-on-cash (Scenario B) | 30% | ≤0% | 8% | ≥12% |
| Cap rate | 20% | ≤4% | 6% | ≥8% |
| 1% rule (rent/price) | 15% | 0.5% | 1.0% | ≥1.2% |

`DealScore = Σ(weight × componentScore)`, clamped 0–100. Tiers: **≥75 green** (strong), **55–74 yellow** (okay), **<55 red** (weak). All thresholds/weights live in `assumptions.ts` so they're easy to tune. The detail view shows the full breakdown so the user sees *why* a property scored what it did.

### Default assumptions (all adjustable in the UI)
down 3.5% · 30-yr · current ~market rate (set as a config constant, user-editable) · FHA MIP on · vacancy 5% · maintenance 5% · capex 5% · property mgmt 0% (Scenario A) / 8% (Scenario B) · closing 3% · FL insurance default as above.

## 6. Data Model (`data/listings.json`)

```jsonc
{
  "generatedAt": "2026-06-13T08:00:00Z",
  "area": "Tampa, FL (Hillsborough)",
  "defaultAssumptions": { "downPct": 0.035, "rateAnnual": 0.069, "termYears": 30, "...": "..." },
  "listings": [
    {
      "id": "string",
      "address": "string", "zip": "string", "lat": 0, "lng": 0,
      "price": 0, "units": 2, "beds": 0, "baths": 0, "sqft": 0, "yearBuilt": 0,
      "propertyType": "string",
      "listedDate": "ISO", "firstSeen": "ISO", "daysOnMarket": 0, "isNew": true,
      "rentTotal": 0, "rentPerUnit": 0, "rentSource": "rentcast|estimated|manual",
      "taxAnnual": 0, "taxSource": "rentcast|estimated",
      "insuranceAnnual": 0, "hoaMonthly": 0,
      "photoUrl": "string", "listingUrl": "string",
      "computed": {
        "mortgageMonthly": 0, "mipMonthly": 0,
        "houseHackOutOfPocket": 0, "pctCostCovered": 0,
        "fullRentalCashFlow": 0, "capRate": 0, "cashOnCash": 0,
        "onePercent": 0, "fhaSelfSufficient": true,
        "dealScore": 0, "scoreBreakdown": { "houseHack": 0, "cashOnCash": 0, "capRate": 0, "onePercent": 0 }
      }
    }
  ]
}
```

`computed` values are stored using the default assumptions; the browser recomputes them with the shared math module whenever the user changes a slider or overrides a rent.

## 7. RentCast Free-Tier Budget Strategy

RentCast free tier = **50 requests/month** (confirmed 2026); hard limit 20 req/sec. Budget plan:
- **Listing pull** is cheap (~1 paginated request per refresh). A daily pull ≈ ~30 requests/month.
- **Rent AVM** is a separate per-property request. Fetch it **only for brand-new listings**, then **cache forever** per property id. New Tampa 2–4 unit listings per month are few; reserve ~20 requests for these.
- **Graceful fallback** if a hot month exceeds budget: estimate rent from sqft × area $/sqft (flagged "estimated — verify"), and always allow a **manual per-unit rent override** (stored in localStorage) that supersedes everything and re-runs the math live.
- If the user later wants more headroom, RentCast's cheap paid tier is a drop-in; the design targets staying within free.

## 8. Build Phases

- **Phase 1 — Local MVP:** math module (TDD) + RentCast client + refresh script run locally with a RentCast key in `.env` → `data/listings.json` → full React app reading it (filters, detail/math breakdown, assumption sliders, favorites). Workflow: `npm run refresh` then `npm run dev`. Proves data + math + UX end-to-end on the user's PC.
- **Phase 2 — Cloud:** create GitHub repo + Actions cron (key as a secret) + deploy to Vercel/Cloudflare Pages. Now automatic and always-on. Same code as Phase 1 plus the workflow file and deploy config.
- **Phase 3 — Optional later:** email/push alerts on new high-score deals; Supabase for synced notes/"new since last visit"; map view; flood-zone lookup.

## 9. Risks & Open Questions

- **RentCast per-unit rent coverage for multi-family** may be thin → handled via estimate + manual override.
- **Free-tier request budget** → handled via caching + new-only AVM fetches + weekly-fallback option.
- **Tampa boundary** → use City of Tampa + a configurable list of key Hillsborough zip codes.
- **Current interest rate** is a config constant the user edits (no live rate feed in v1 to avoid extra dependencies).
- **Tax/insurance accuracy** → use RentCast actuals where available; otherwise clearly-labeled estimates the user can override.
