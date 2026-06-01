# Buffett's Buffet — Technical Briefing

**Date:** 1 June 2026
**Status:** ✅ Running locally at `localhost:5173` (frontend) / `localhost:3001` (API)

---

## What the app does

**Buffett's Buffet** is a stock screener. A user enters any ticker symbol (e.g. `AAPL`, `KO`, `GAP`) and the app:

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

---

## Architecture

### Monorepo structure (pnpm workspaces)

```
Buffett-Buffet/
├── artifacts/
│   ├── buffetts-buffet/     # React frontend (port 5173 in dev)
│   └── api-server/          # Express API (port 3001 in dev)
├── lib/
│   ├── api-spec/            # openapi.yaml — single source of truth for the API contract
│   ├── api-client-react/    # Auto-generated React Query hooks (from openapi.yaml via Orval)
│   ├── api-zod/             # Auto-generated Zod validation schemas (from openapi.yaml via Orval)
│   └── db/                  # Drizzle ORM + Postgres scaffold (schema empty — not yet used)
└── scripts/
```

### Request flow

```
Browser
  → Vite dev server (port 5173)
    → /api/* proxied to Express (port 3001)
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
| Data source | `yahoo-finance2` npm package | No API key needed, wraps Yahoo Finance |
| Validation | Zod (on API responses) | Runtime type-checking at the API boundary |
| Package manager | pnpm workspaces | Shared dependency catalog across all packages |

---

## The 8 metrics and scoring model

| Metric | Weight | Direction | Source |
|---|---|---|---|
| Earnings Consistency (CV) | 25% | Lower = better | Income statement history |
| Free Cash Flow Margin | 16% | Higher = better | `financialData` |
| Interest Coverage | 14% | Higher = better | Income statement |
| Net Profit Margin | 14% | Higher = better | `financialData` |
| Return on Capital | 13% | Higher = better | Balance sheet + income |
| Current Ratio | 11% | Higher = better | `financialData` |
| Return on Equity | 11% | Higher = better | `financialData` |
| Debt / Equity | 10% | Lower = better | `financialData` |

Weights come from a Random Forest classifier trained on ~1,960 S&P 500 companies, predicting 3-year forward outperformance vs. benchmark (2020–2021 data, Simfin source).

Percentile scoring interpolates between hardcoded p25/p50/p75 benchmarks from that training dataset. The Buffett Score is the weighted average of per-metric percentiles.

---

## What was completed — Replit → local migration

The codebase was originally built and hosted on Replit. The following was done to make it fully self-contained and locally runnable:

| Change | Detail |
|---|---|
| Deleted Replit infrastructure | `.replit`, `.replitignore`, `replit.md`, all `.replit-artifact/` dirs, `artifacts/mockup-sandbox/` (Replit UI sandbox), `.local/` (Replit state logs) |
| Removed Replit Vite plugins | `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal` removed from `vite.config.ts` and `package.json` |
| Fixed hard environment variable throws | `vite.config.ts` and `api-server/src/index.ts` previously threw if `PORT`/`BASE_PATH` weren't set. Now both use sensible defaults (`5173`, `/`, `3001`) |
| Fixed platform overrides | `pnpm-workspace.yaml` was excluding all non-Linux native binaries (esbuild, lightningcss, rollup, etc.) — this prevented `pnpm install` from working on macOS. All Linux-only overrides removed |
| Added `/api` proxy | `vite.config.ts` now proxies `/api` calls to `localhost:3001` so both services work together without CORS issues |
| Improved API dev experience | `api-server` dev script changed from `build + start` to `tsx watch` (hot-reload on file changes) |
| Removed `preinstall` guard | Root `package.json` had a Replit-era script that blocked non-pnpm installs. Removed — it was breaking `pnpm run dev` when concurrently spawned child processes |
| Added root `dev` script | `pnpm run dev` now starts both API and frontend together via `concurrently` with colour-coded output (`[api]` blue, `[web]` green) |
| Added `.env` / `.env.example` | `PORT=3001`, `NODE_ENV=development`. `.env` gitignored |
| Written `README.md` | Local setup instructions, stack table, project layout, all useful commands |
| Approved esbuild build scripts | `pnpm approve-builds` run to allow esbuild's native binary to install on macOS |

---

## Current known issue — critical data gap

The terminal shows a recurring warning from `yahoo-finance2`:

> `QuoteSummary financial statements submodules like incomeStatementHistory have provided almost no data since Nov 2024. Use fundamentalsTimeSeries instead.`

**What this means:** Yahoo Finance deprecated the `incomeStatementHistory` and `balanceSheetHistory` modules in `quoteSummary` in late 2024. The API still responds but returns mostly empty data. This affects the calculation of:

| Affected metric | Weight | Impact |
|---|---|---|
| Earnings Consistency | 25% | Requires multi-year net income history from income statement |
| Interest Coverage | 14% | Requires `operatingIncome` + `interestExpense` from income statement |
| Return on Capital | 13% | Requires balance sheet (equity + debt) + net income |

These three metrics together represent **52% of the total Buffett Score weighting.** When they return `null`, the score is calculated on fewer inputs and is less reliable.

**The fix (not yet done):** The data-fetching section of `artifacts/api-server/src/routes/stocks.ts` needs to be updated to use `yahoo-finance2`'s `fundamentalsTimeSeries` module instead of the deprecated `incomeStatementHistory` / `balanceSheetHistory` modules.

**Tickers that still work well:** The 5 metrics sourced from `financialData` (ROE, NPM, Current Ratio, FCF Margin, D/E) are unaffected and return accurate data.

---

## What is not yet built

| Item | Priority | Notes |
|---|---|---|
| Fix `fundamentalsTimeSeries` data fetch | High | Affects 3 of 8 metrics (52% of score weight) for most tickers |
| Real percentile benchmarks | Medium | Current p25/p50/p75 constants are estimates. Actual values need `df_clean[metrics].describe()` run in the original Jupyter notebook |
| Feature importance chart | Low | `research.tsx` page has no chart — text only |
| Database usage | Low | Drizzle + Postgres is scaffolded (`lib/db/`) but schema is empty. No persistence exists yet |
| Deployment | — | Nothing deployed. Next step: Vercel (frontend) + Railway (API) |
| Test coverage | — | No tests |

---

## How to run

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

### Other useful commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks + Zod schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (requires DATABASE_URL in .env)
pnpm --filter @workspace/db run push

# Production build
pnpm run build
```
