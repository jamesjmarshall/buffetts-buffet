# Buffett's Buffet

A stock screener that scores any ticker against Warren Buffett's 8 core fundamental metrics. Enter a symbol — get a Buffett Score (0–100), a radar chart, and a metric breakdown with percentile rankings against ~1,960 S&P 500 companies.

---

## Running locally

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) — install with `npm install -g pnpm`

### Install

```bash
pnpm install
```

### Start (frontend + backend together)

```bash
pnpm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API:      [http://localhost:3001](http://localhost:3001)

The frontend's Vite dev server proxies `/api` requests to the backend automatically.

### Run services individually

```bash
# API server only (hot-reloads on file changes)
pnpm --filter @workspace/api-server run dev

# Frontend only
pnpm --filter @workspace/buffetts-buffet run dev
```

---

## Environment variables

Copy `.env.example` to `.env` (already done — `.env` is gitignored):

```
PORT=3001           # API server port
NODE_ENV=development
# DATABASE_URL=...  # Only needed when DB features are wired up
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind 4, wouter, TanStack Query, Recharts |
| Backend | Express 5, TypeScript, Pino logging |
| Data | `yahoo-finance2` — live Yahoo Finance data |
| API contract | OpenAPI 3.1 → Orval → React Query hooks + Zod schemas |
| DB | Drizzle + Postgres (scaffolded, not yet used) |

---

## Project layout

```
├── artifacts/
│   ├── buffetts-buffet/    # React + Vite frontend
│   └── api-server/         # Express API (port 3001)
├── lib/
│   ├── api-spec/           # openapi.yaml — source of truth for the API
│   ├── api-client-react/   # Generated React Query hooks (run codegen to update)
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle schema + config
└── scripts/
```

---

## Useful commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks + Zod schemas after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (requires DATABASE_URL)
pnpm --filter @workspace/db run push

# Production build
pnpm run build
```

---

## The 8 Metrics

Scored via a Random Forest model trained on ~1,960 S&P 500 companies (2020–2021 data, 3-year forward returns):

| Metric | Weight | Direction |
|---|---|---|
| Earnings Consistency (CV) | 25% | Lower is better |
| Free Cash Flow Margin | 16% | Higher is better |
| Interest Coverage | 14% | Higher is better |
| Net Profit Margin | 14% | Higher is better |
| Return on Capital | 13% | Higher is better |
| Current Ratio | 11% | Higher is better |
| Return on Equity | 11% | Higher is better |
| Debt / Equity | 10% | Lower is better |

Score colours: green ≥ 70 · amber 40–69 · red < 40

---

## TODO

- [ ] Update `PERCENTILE_BENCHMARKS` in `artifacts/api-server/src/routes/stocks.ts` with real values from `df_clean[metrics].describe()` in the Jupyter notebook
- [ ] Add `feature_importance.png` to the Research page
- [ ] Test on AAPL, KO, BRK-B, a highly-leveraged name, and a small cap
- [ ] Deploy to Vercel (frontend) + Railway (API) once stable locally
