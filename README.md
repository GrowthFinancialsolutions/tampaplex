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

## New to real estate? Start in Simple mode

The app opens in **Simple mode** (default): each listing leads with a plain-English
verdict ("You'd pay about $X/mo to live here while tenants cover Y% of the costs"),
four easy metrics with good / okay / concern dots, and Tampa-specific flags (flood
zone, high insurance, older-building heads-up, neighborhood notes). Tap the **?** on
any number for a plain definition, or open the **Guide** for "what a good Tampa plex
looks like" plus a full glossary. Flip to **Pro mode** anytime for the dense
dashboard, sliders, score breakdown, and a 5-year equity outlook — nothing is hidden,
just one tap away.

Flood zones come from FEMA's free public map service (looked up once during refresh).
Every estimate is labeled as an estimate, and the app always tells you to verify with
a lender, inspector, and the city.

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

## Live site

**https://growthfinancialsolutions.github.io/tampaplex/** — published free via GitHub
Pages, redeployed automatically every day (see
`.github/workflows/refresh-and-deploy.yml`). No servers, no monthly cost.

### One step left: turn on live Tampa data

The site is live right now on **sample data**. To pull real current listings, add your
free RentCast key as a repository secret — then the daily job switches to live data
automatically (no key in the browser; it only lives in the encrypted secret):

1. Get a free key at https://app.rentcast.io (free tier: 50 requests/month).
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**.
   Name it `RENTCAST_API_KEY`, paste your key, save.
3. **Actions** tab → "Refresh data & deploy" → **Run workflow** (or just wait for the
   next daily run).

> Tip: from the project folder you can also run
> `gh secret set RENTCAST_API_KEY` and paste the key when prompted.

### Forking this for another city

Change `city`/`state` in `scripts/refresh.ts`, adjust the Tampa specifics in
`src/lib/tampa.ts`, push to your own public repo, enable Pages (Source: GitHub
Actions), and add your `RENTCAST_API_KEY` secret.
