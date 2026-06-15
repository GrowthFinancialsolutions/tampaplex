# 🏠 TampaPlex

Finds current Tampa **duplex / triplex / quadplex** for-sale listings and ranks them
by a house-hacking **Deal Score** (live in one unit, rent the rest).

## Quick start

```bash
npm install
npm run sample      # seeds sample data so the UI works immediately
npm run dev         # open http://localhost:5173
```

## Live Tampa data (free RentCast key)

1. Sign up free at https://app.rentcast.io (free tier: 50 requests/month).
2. Copy `.env.example` to `.env` and paste your key into `RENTCAST_API_KEY`.
   - PowerShell: `Copy-Item .env.example .env`
3. `npm run refresh` — pulls current Tampa multi-family listings into
   `public/data/listings.json`.
4. `npm run dev` to view.

## How the Deal Score works

A 0–100 blend: house-hack affordability (35%), future cash-on-cash (30%),
cap rate (20%), and the 1% rule (15%). Open any listing for the full breakdown.

Insurance defaults are set high on purpose — Florida insurance is the #1 cash-flow
killer. Adjust any assumption with the sliders; override rent/insurance per property
in the detail view. The score recomputes live in your browser.

For 3–4 unit properties the app also checks the **FHA self-sufficiency rule**
(75% of rent must cover PITI) and warns you when a property would fail it.

## Tests

```bash
npm test
```

## Project layout

- `src/lib/math.ts` — pure investment math + Deal Score (shared by the refresh job and the browser)
- `src/lib/rentcast.ts` — RentCast API client
- `src/lib/refresh-core.ts` — transform + firstSeen/NEW merge + live recompute
- `scripts/refresh.ts` — fetches from RentCast → writes `public/data/listings.json`
- `scripts/make-sample.ts` — generates offline sample data
- `src/components/*` — the dashboard UI

## Next (Phase 2)

Deploy + daily auto-refresh via GitHub Actions — see
`docs/superpowers/specs/2026-06-13-tampaplex-investment-finder-design.md`.
