# Buffett's Buffet — Technical Briefing

**Last updated:** 2 June 2026  
**Live URL:** https://buffettsbuffet.com  
**GitHub:** https://github.com/jamesjmarshall/buffetts-buffet  
**Status:** Deployed and live on Railway with custom domain

---

## What the app does

**Buffett's Buffet** is a stock screener. A user enters any US-listed ticker (e.g. `AAPL`, `KO`, `BRK-B`) and the app:

1. Fetches live financial data from Yahoo Finance
2. Calculates 8 fundamental metrics that Warren Buffett's investment methodology is built on
3. Scores each metric as a percentile against a benchmark dataset of ~1,960 S&P 500 companies (2020–2021, sourced from Simfin)
4. Computes a weighted **Buffett Score (0–100)** using feature importances from a Random Forest ML model
5. Displays the results as a radar chart, a metric breakdown table, and a curated list of similar high-scoring stocks for comparison

There are three pages:

| Route | Purpose |
|---|---|
| `/` | Hero + ticker search bar ("Check the Menu"), 8-pillar explainer, example tickers |
| `/stock/:ticker` | Score circle, radar chart, metric table, similar stocks panel |
| `/research` | Methodology writeup — Simfin data, Random Forest model, honest limitations |

US-listed stocks only. Non-US tickers may return incomplete or no data.

---

## Architecture

### Monorepo structure (pnpm workspaces)

```
Buffett-Buffet/
├── artifacts/
│   ├── buffetts-buffet/     # React frontend (Vite, port 5173 in dev)
│   └── api-server/          # Express API (port 3001 in dev, 8080 in prod)
├── lib/
│   ├── api-spec/            # openapi.yaml — single source of truth for API contract
│   ├── api-client-react/    # Auto-generated React Query hooks (from openapi.yaml via Orval)
│   ├── api-zod/             # Auto-generated Zod validation schemas (from openapi.yaml via Orval)
│   └── db/                  # Drizzle ORM + Postgres scaffold (schema empty, not yet used)
├── scripts/
├── railway.toml             # Railway build + start commands
└── nixpacks.toml            # Node 22 + openssl, corepack install phase
```

### Request flow

```
Browser
  → buffettsbuffet.com (Railway, Node 22, port 8080)
    → Express serves static Vite build for all non-/api routes (SPA)
    → /api/* routes handled by Express router
      → yahoo-finance2 (live Yahoo Finance data)
      → metric calculation + percentile scoring
      → Zod-validated JSON response
  → React Query cache
  → React components render
```

### Key technology choices

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite 7 | Fast dev server, modern React |
| Routing | wouter | Lightweight SPA routing |
| Data fetching | TanStack Query (React Query v5) | Caching, loading/error states |
| Charts | Recharts | Radar chart for the 8 metrics |
| Styling | Tailwind CSS v4 + shadcn/Radix UI | Design system + accessible primitives |
| Type safety | TypeScript 5.9 end-to-end | Frontend, backend, and generated API contract |
| API contract | OpenAPI 3.1 → Orval codegen | Changing `openapi.yaml` regenerates both hooks and validation schemas |
| Backend | Express 5 + Pino logging | Structured JSON logs, async-native routing |
| Data source | `yahoo-finance2` v3 | No API key needed, wraps Yahoo Finance |
| Validation | Zod (on API responses) | Runtime type-checking at the API boundary |
| Package manager | pnpm 9.15.9 workspaces | Shared dependency catalog |
| Runtime | Node.js 22 | Required by yahoo-finance2 v3 |

---

## The 8 metrics and scoring model

### Weights (normalized to sum to 100%)

Weights come from a Random Forest classifier trained on ~1,960 S&P 500 companies, predicting 3-year forward outperformance vs. benchmark (2020–2021 Simfin data, labels through 2024).

| Metric | Weight | Direction | Data source |
|---|---|---|---|
| Earnings Consistency (CV) | 22% | Lower = better | `fundamentalsTimeSeries` annual net income |
| FCF Margin | 14% | Higher = better | `financialData` (freeCashflow / totalRevenue) |
| Interest Coverage | 12% | Higher = better | `fundamentalsTimeSeries` (operatingIncome / interestExpense) |
| Net Profit Margin | 12% | Higher = better | `financialData.profitMargins` |
| Return on Capital | 11% | Higher = better | `fundamentalsTimeSeries` (netIncome / equity + ltDebt) |
| Current Ratio | 10% | Higher = better | `financialData.currentRatio` |
| Return on Equity | 10% | Higher = better | `financialData.returnOnEquity` |
| Debt / Equity | 9% | Lower = better | `financialData.debtToEquity` |

### Percentile benchmarks (p25/p50/p75 from 2020–2021 S&P 500 cohort)

```typescript
roe:                { p25: 0.08,  p50: 0.14,  p75: 0.22  }
roc:                { p25: 0.06,  p50: 0.10,  p75: 0.18  }
de:                 { p25: 40,    p50: 85,    p75: 200   }  // lower is better
npm:                { p25: 0.04,  p50: 0.09,  p75: 0.18  }
current_ratio:      { p25: 1.0,   p50: 1.5,   p75: 2.5   }
fcf_margin:         { p25: 0.04,  p50: 0.09,  p75: 0.18  }
interest_coverage:  { p25: 3.0,   p50: 8.0,   p75: 20.0  }
earnings_consistency:{ p25: 0.15, p50: 0.35,  p75: 0.70  }  // lower CoV is better
```

### Score calculation

Each metric is interpolated to a 0–100 percentile. The Buffett Score is the weighted average of per-metric percentiles, normalized by the sum of weights that have data (handles missing metrics gracefully).

Score confidence is shown as `{availableCount} of 8 metrics scored`, with a note for sector-excluded metrics.

---

## Sector exclusions

Some metrics are structurally inapplicable for certain sectors. These are excluded from scoring and shown as "N/A" in the breakdown table.

| Sector | Excluded metrics | Reason |
|---|---|---|
| Financial Services | current_ratio, de, interest_coverage, earnings_consistency | Leverage is the business model; interest is the product; GAAP mark-to-market distorts earnings (BRK-B, banks, insurers) |
| Real Estate | fcf_margin, de, interest_coverage | REITs distribute ~90% of income by law; leverage is mandated |

---

## Holding company badge

Tickers in `HOLDING_COMPANY_TICKERS` (currently: `BRK-A`, `BRK-B`, `MKL`, `SPLP`, `CNSWF`) display a gold plaque badge over the score ring that reads **"Why is this score low?"**. Hovering it explains that scores reflect fundamental ratios, not balance sheet strength or competitive moat — which aren't captured in the 8 metrics.

The badge animates on hover: scales up 25% and rotates -5 degrees.

---

## Data fetching (yahoo-finance2 v3)

**Critical note:** yahoo-finance2 upgraded to v3 which changed the `fundamentalsTimeSeries` API completely.

Old (v2) format — broken, returns nothing:
```typescript
module: "annualNetIncome,annualOperatingIncome,annualInterestExpense"
// field names: annualNetIncome, annualOperatingIncome, etc.
```

Current (v3) format — working:
```typescript
// Income statement
fundamentalsTimeSeries(ticker, { period1: "2019-01-01", type: "annual", module: "financials" })
// Fields: netIncome, operatingIncome, interestExpense

// Balance sheet
fundamentalsTimeSeries(ticker, { period1: "2019-01-01", type: "annual", module: "balance-sheet" })
// Fields: commonStockEquity, longTermDebt
```

Five metrics come from `quoteSummary.financialData` (ROE, NPM, Current Ratio, FCF Margin, D/E) — these are stable and unaffected by the API change.

Three metrics require `fundamentalsTimeSeries` (Interest Coverage, ROC, Earnings Consistency). ROC has a fallback to `financialData.netIncomeToCommon` if time series net income is missing.

---

## Deployment

### Infrastructure

| Component | Service | Notes |
|---|---|---|
| Everything (API + frontend) | Railway | Single service, Express serves static Vite build |
| Domain | Porkbun (DNS via Cloudflare) | buffettsbuffet.com |
| DNS | ALIAS @ → qaigp6z4.up.railway.app | TXT verify record also present |

### How Railway serves the frontend

In production, Express statically serves the built Vite frontend:

```typescript
const frontendDist = path.resolve(__dirname, "../../buffetts-buffet/dist/public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
```

`__dirname` at runtime = `artifacts/api-server/dist/`  
Resolved path = `artifacts/buffetts-buffet/dist/public` (Vite's output dir)

### Build config

**railway.toml:**
```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm --filter @workspace/buffetts-buffet run build && pnpm --filter @workspace/api-server run build"

[deploy]
startCommand = "pnpm --filter @workspace/api-server run start"
restartPolicyType = "on_failure"
```

**nixpacks.toml:**
```toml
[phases.setup]
nixPkgs = ["nodejs_22", "openssl"]

[phases.install]
cmds = ["npm install -g corepack@0.24.1 && corepack enable && pnpm i --frozen-lockfile"]
```

Node 22 is required at runtime for yahoo-finance2 v3. The custom install phase bypasses nixpacks' default corepack bootstrap (which had a bug with the pnpm 9 + Node 22 combination on the nixpkgs version available).

### CORS

CORS is configured to allow:
- `https://buffettsbuffet.com`
- `https://www.buffettsbuffet.com`
- `http://localhost:5173`

### Auto-deploy

Every push to `main` on GitHub triggers a Railway rebuild. Build takes approximately 3–5 minutes. The frontend and API are rebuilt on every push.

---

## Local development

```bash
cd /Users/jamesmarshall/Desktop/Buffett-Buffet

# First time only
pnpm install
pnpm approve-builds   # select esbuild, press Enter

# Every time
pnpm run dev
# → Frontend: http://localhost:5173
# → API:      http://localhost:3001
```

The Vite dev server proxies `/api/*` requests to `localhost:3001`, so both services work together without CORS issues locally.

### Other useful commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks + Zod schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Production build (what Railway runs)
pnpm --filter @workspace/buffetts-buffet run build && pnpm --filter @workspace/api-server run build
```

---

## Known limitations (documented on /research page)

1. **Survivorship bias** — Companies delisted between 2020–2024 are underrepresented. The model learned from survivors.
2. **No moat measurement** — Brand power, management quality, competitive positioning are not in financial statements.
3. **Static 2020–2021 benchmarks** — Percentile rankings are relative to that cohort, not today's market.
4. **US-listed only** — Non-US tickers may return incomplete Yahoo Finance data.
5. **Sector exclusions** — Financial Services and Real Estate companies are scored on fewer metrics by design.

---

## Post-launch changes made in this session (2 June 2026)

| Change | Detail |
|---|---|
| Fixed Railway build (pnpm/Node version) | Resolved corepack vs pnpm 11 vs Node version conflicts; settled on pnpm 9.15.9 + Node 22 |
| Fixed `.pnpm-store` gitignore | Was showing 794 uncommitted files in GitHub Desktop |
| Fixed `fundamentalsTimeSeries` v3 API | Old v2 field names (`annualNetIncome` etc.) returned nothing; updated to v3 format (`netIncome`, `module: "financials"` etc.) |
| Normalized weights to 100% | Raw weights summed to 114%; normalized across API constants, home page, and research page chart |
| Expanded sector exclusions | Added `interest_coverage` + `earnings_consistency` for Financial Services; added `de` + `interest_coverage` for Real Estate |
| Added holding company gold plaque badge | BRK-A/B and similar show "Why is this score low?" badge on score ring with tooltip explanation |
| Fixed score confidence display | Changed from "X% confidence, N of M metrics" to "N of 8 metrics scored" + "X excluded for sector" — eliminates misleading "100% confidence" for sector-restricted stocks |
| Updated research page copy | New pull quote, stats row, methodology steps 01/03/05, and honest limitations section |
| Added "US-listed stocks only" note | Inside search card, above Today's Specials |
| "Score methodology" pulsates | Scales 5x on stock page entry to draw attention |
| Deployed to Railway + custom domain | Express serves frontend statically in production; buffettsbuffet.com live |
| Mobile layout fixes | Score ring centered on mobile; Value column hidden on small screens so metric names are readable |
| GitHub username rename | movinlikejimmy → jamesjmarshall; remote URL updated |
