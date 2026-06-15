# TampaPlex v2 — Beginner Experience + Tampa Intelligence + Go-Live Prep

Date: 2026-06-15
Status: Approved direction (brainstorming) — pending implementation plan
Builds on: Phase 1 (complete, merged to `master`). See
`docs/superpowers/specs/2026-06-13-tampaplex-investment-finder-design.md`.

## Goal

Make TampaPlex usable by someone with little or no real-estate-math knowledge —
**without removing any advanced capability** — and prepare it to run as a free,
self-updating public website.

Three pillars:

1. **Beginner-first experience** — plain-English verdicts and explanations by
   default, with all pro metrics one tap away.
2. **Tampa-specific intelligence** — flood-zone awareness, insurance reality,
   local benchmarks, neighborhood context, and rules of thumb.
3. **Go-live prep** — a free daily auto-refresh + publish pipeline, ready to
   switch on with a short user checklist.

## Non-negotiable principles

- **Free forever.** No paid APIs, no runtime LLM calls, no recurring cost. All
  explanations are rule-based and run in the browser. Flood data uses FEMA's
  free public map service at refresh time only.
- **Never flatter a deal.** Estimates are always labeled as estimates. Tampa
  risks (flood, insurance, building age) are surfaced, not hidden. "Verify with
  the city / a lender / an inspector" appears wherever the app is guessing.
- **Additive, not destructive.** `src/lib/math.ts` and the existing Pro
  dashboard stay intact. v2 layers on top.

## Decisions locked during brainstorming (2026-06-15)

- Default experience: **guided/Simple by default, advanced on tap** (not a
  separate page; one app with a mode toggle).
- Guidance: **Tampa-specific, baked in** (not generic education).
- Scope this round: **beginner layer + Tampa smarts + go-live prep.**
- **5-year outlook: included**, clearly labeled an estimate (Pro view).
- **Hosting: GitHub Pages** (free, same repo, one workflow refreshes + publishes).
- Repo is **local-only** today (no remote, branch `master`); go-live checklist
  must include creating the GitHub repo and first push.
- Explanations are **rule-based and unit-tested**, never AI-generated at runtime.

---

## 1. Modes & shell

A `mode: 'simple' | 'pro'` state lives in `App.tsx`, persisted to the existing
localStorage store (extend `Store`). Default `'simple'`.

- **Header**: app title, data freshness line (existing), and a Simple ⇄ Pro
  toggle.
- **Simple mode**: filter bar simplified to the essentials (max price, units,
  "good deals only", new, favorites, search). Listings render as the
  beginner card (see §3). Assumptions panel collapsed behind a "Adjust
  assumptions" affordance.
- **Pro mode**: today's full dashboard — full filter bar, always-visible
  assumptions sliders, dense listing rows, full detail view. Unchanged in
  behavior.
- The mode toggle only changes presentation; the same data and the same
  `recompute()` pipeline feed both.

**First-run onboarding**: a skippable intro panel shown once (flag in store).
Four short cards: (1) what house-hacking is, (2) what FHA 3.5% down means,
(3) how the Deal Score is built and that it's a *starting point*, (4) the
honesty caveats (estimates, verify locally). A "Show this again" link lives in
the Guide.

## 2. Explanation engine — `src/lib/explain.ts` (pure, tested)

Pure functions consuming the existing `Listing` + `Computed` + `Assumptions`.
No React, no I/O — fully unit-testable.

### 2a. Verdict sentence
`verdict(listing, computed): { headline, sentence, tier }`
- `tier` reuses `scoreTier()` (strong/okay/weak).
- `sentence` is templated from real numbers, e.g.:
  > "You'd pay about $610/mo to live here while tenants cover 88% of all costs.
  > Rent out all 4 units later and it makes about +$240/mo. Solid for a Tampa
  > fourplex."
- Handles edge cases: negative coverage ("you'd still cover ~$X/mo yourself"),
  single-unit fallbacks, missing rent (estimate-based, flagged).

### 2b. Per-metric assessment
`assess(metricKey, value, context): { rating: 'good'|'okay'|'concern', label, why }`
Covers: house-hack coverage %, full-rental cash flow, cap rate, cash-on-cash,
1% rule, FHA self-sufficiency. Thresholds come from `tampa.ts` benchmarks (so
"good" is Tampa-calibrated, not national). Each returns a one-line plain-English
"why this matters / what good looks like here."

### 2c. Glossary
`glossary: Record<TermKey, { term, plain, tampaExample }>` — 1–2 sentence
definitions for: cap rate, cash-on-cash, 1% rule, house-hack coverage, FHA
self-sufficiency, MIP, PITI, NOI, vacancy, CapEx, down payment, closing costs.
Surfaced via an `ExplainTip` `?` affordance next to each metric and in the Guide.

All thresholds, copy, and templates live as data so they're easy to tune and
test.

## 3. Beginner listing card — `src/components/SimpleListingCard.tsx`

Renders per listing in Simple mode (matches the approved mockup):
- Address + type + price + neighborhood.
- Deal Score badge colored by tier; favorite star.
- Verdict callout (from §2a).
- Four friendly metric tiles, each: plain label, value, `good/okay/concern`
  dot, and an `ExplainTip` `?`. Tiles: "Cost to live here", "Rent all units",
  "Cap rate", "1% rule".
- Tampa flag stack (from §4): flood, insurance-high, building-age — only shown
  when relevant.
- Footer: "See the full math & adjust assumptions" → opens the existing
  `ListingDetail` (which gains beginner annotations); a hint that Pro view
  exists.

`ExplainTip` is a small accessible popover (`<details>`/button + inline panel,
no `position: fixed`) reused everywhere a `?` appears.

## 4. Tampa intelligence

### 4a. Reference data — `src/lib/tampa.ts` (pure, tested)
- `benchmarks`: typical Tampa effective tax rate, insurance $/yr band, rent-to-
  price band, "good deal" thresholds per metric. Single source of truth for
  §2b ratings and the "typical for Tampa" hints.
- `neighborhoodByZip`: curated short descriptor per Tampa ZIP (Seminole Heights,
  Ybor City, Sulphur Springs, Tampa Heights, etc.), each marked "general
  context, not advice."
- `floodProneZips`: fallback set used when coordinates are missing.
- `buildingAgeNote(yearBuilt)`: flags pre-2002 (pre-Florida Building Code) and
  older roofs for windstorm-insurance scrutiny.
- `tampaContext(listing)`: assembles the flag list a card/detail renders.

### 4b. Flood lookup — `src/lib/flood.ts` (refresh-time, mocked in tests)
- `lookupFloodZone(lat, lng, fetchImpl?)` queries FEMA's **National Flood Hazard
  Layer** public ArcGIS REST service (free, no key) and maps the result to
  `{ zone, risk: 'high'|'moderate'|'low'|'unknown' }`. High = A/AE/V/VE.
- Called from the refresh script for listings that have coordinates, with a
  small per-run budget and graceful failure (network error → `unknown`, fall
  back to `floodProneZips` heuristic in the UI).
- Adds `floodZone?: { zone: string; risk: string }` to the `Listing` type.
  Persisted in `listings.json` so the browser needs no network call.

### 4c. Guide page — `src/components/Guide.tsx`
A reachable "Guide / How this works" view containing: house-hacking explained,
the FHA basics (3.5% down, MIP, self-sufficiency for 3–4 units), "what a good
Tampa plex looks like" rules of thumb, the Tampa insurance/flood reality, and
the full glossary. Pure content; reuses glossary data from §2c.

## 5. Advanced features (kept + added)

- **Kept unchanged**: live assumption sliders, per-property overrides (rent /
  insurance / tax / units), favorites.
- **Notes UI**: wire the existing `Store.notes` into `ListingDetail` (textarea,
  autosaved).
- **Filters added**: flood risk, min year built, "passes FHA self-sufficiency".
- **Export**: "Export favorites to CSV" (client-side, no backend).
- **5-year outlook** (Pro detail section): estimated equity = principal paid
  down over 60 months (from the amortization schedule) + a user-adjustable,
  modest appreciation assumption (default conservative, e.g. 3%/yr). Output in a
  plain "where you'd likely stand" framing, prominently labeled **"estimate, not
  a promise."** New pure helper in `math.ts` (`equityProjection`), TDD'd.

## 6. Go-live pipeline (GitHub Pages)

- `vite.config.ts`: set `base` appropriately for Pages (project vs. user site;
  resolved during implementation based on repo name). `useListings` already
  uses `import.meta.env.BASE_URL`, so data fetch stays correct.
- `.github/workflows/refresh-and-deploy.yml`:
  - Triggers: daily `schedule` (cron) + manual `workflow_dispatch`.
  - Steps: checkout → install → `npm run refresh` (uses `RENTCAST_API_KEY`
    repo secret) → commit updated `public/data/listings.json` back to the repo
    (so `firstSeen`/NEW tracking persists across runs) → `npm run build` →
    deploy `dist/` to GitHub Pages via the official Pages actions.
  - Concurrency guard so overlapping runs don't fight.
- **User go-live checklist** (added to `README.md`): create GitHub repo, push,
  add `RENTCAST_API_KEY` secret, enable Pages (source = Actions), run the
  workflow once. Everything else is pre-built.

## 7. Architecture summary

New pure/testable modules: `src/lib/explain.ts`, `src/lib/tampa.ts`,
`src/lib/flood.ts`, plus `equityProjection` in `math.ts`.
New components: `SimpleListingCard`, `Verdict`, `MetricTile`, `ExplainTip`,
`ModeToggle`, `Onboarding`, `Guide`, `TampaFlags`, plus a `NotesField` and CSV
export helper. `App.tsx` gains `mode` + onboarding state and routes Simple vs Pro.
Type changes: `Listing.floodZone?`, `Store.mode`, `Store.onboarded`.

## 8. Testing strategy

- TDD for all pure logic: `explain.ts` (verdicts, ratings, glossary coverage),
  `tampa.ts` (benchmarks, neighborhood/age/flood-fallback), `flood.ts` (FEMA
  response parsing with a mocked fetch, error → unknown), `equityProjection`.
- Component smoke tests (React Testing Library) for `SimpleListingCard` and the
  mode toggle, following existing test patterns.
- Keep the full suite green (currently 27 tests) and grow it.

## 9. Out of scope (future phases)

Email alerts, Supabase-synced notes, interactive map view, single-family
conversion-potential screening (ADU / RM-12) — all remain Phase 3 per the
original spec and project memory.
