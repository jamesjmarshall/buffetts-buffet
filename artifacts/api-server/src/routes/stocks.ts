import { Router, type IRouter } from "express";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();
import {
  GetStockParams,
  GetStockResponse,
  GetSimilarStocksParams,
  GetSimilarStocksResponse,
} from "@workspace/api-zod";
import { findSimilarStocks } from "../similarStocks";

const router: IRouter = Router();

// ─── Percentile thresholds from S&P500 training dataset (2020-2024) ──────────
// Source: Simfin dataset, ~1,900 S&P500 companies, 3yr forward returns
// These are empirical 25th/50th/75th percentile values per metric.

const PERCENTILES: Record<
  string,
  { p25: number; p50: number; p75: number; higherIsBetter: boolean }
> = {
  roe: { p25: 0.08, p50: 0.14, p75: 0.22, higherIsBetter: true },
  roc: { p25: 0.06, p50: 0.10, p75: 0.18, higherIsBetter: true },
  de: { p25: 40, p50: 85, p75: 200, higherIsBetter: false }, // lower D/E is better
  npm: { p25: 0.04, p50: 0.09, p75: 0.18, higherIsBetter: true },
  current_ratio: { p25: 1.0, p50: 1.5, p75: 2.5, higherIsBetter: true },
  fcf_margin: { p25: 0.04, p50: 0.09, p75: 0.18, higherIsBetter: true },
  interest_coverage: { p25: 3.0, p50: 8.0, p75: 20.0, higherIsBetter: true },
  earnings_consistency: { p25: 0.15, p50: 0.35, p75: 0.70, higherIsBetter: false }, // lower CoV is better
};

// Buffett feature importance weights (from Random Forest model)
const WEIGHTS: Record<string, number> = {
  earnings_consistency: 0.22,
  fcf_margin: 0.14,
  interest_coverage: 0.12,
  npm: 0.12,
  roc: 0.11,
  current_ratio: 0.10,
  roe: 0.10,
  de: 0.09,
};

const METRIC_META: Record<
  string,
  { name: string; explanation: string; buffettWhy: string }
> = {
  roe: {
    name: "Return on Equity",
    explanation: "Net income as a % of shareholders' equity.",
    buffettWhy:
      "Buffett looks for consistently high ROE — it signals a durable competitive advantage.",
  },
  roc: {
    name: "Return on Capital",
    explanation: "Net income relative to total invested capital (equity + debt).",
    buffettWhy:
      "True capital efficiency. Buffett wants businesses that generate outsized returns on every dollar deployed.",
  },
  de: {
    name: "Debt/Equity",
    explanation: "Total debt relative to shareholders' equity.",
    buffettWhy:
      "Buffett avoids heavily leveraged companies. Debt amplifies both gains and losses — he prefers businesses that don't need it.",
  },
  npm: {
    name: "Net Profit Margin",
    explanation: "Percentage of revenue that becomes profit.",
    buffettWhy:
      "Wide margins signal pricing power — the hallmark of a great business with an economic moat.",
  },
  current_ratio: {
    name: "Current Ratio",
    explanation: "Current assets divided by current liabilities.",
    buffettWhy:
      "A measure of short-term financial health. Buffett wants businesses that can weather a downturn without scrambling for cash.",
  },
  fcf_margin: {
    name: "Free Cash Flow Margin",
    explanation: "Free cash flow as a % of total revenue.",
    buffettWhy:
      "Free cash flow is the lifeblood of a business. Buffett prizes companies that generate more cash than they need to reinvest.",
  },
  interest_coverage: {
    name: "Interest Coverage",
    explanation: "How many times operating income covers interest expense.",
    buffettWhy:
      "Buffett won't invest in a business that struggles to service its debt. High coverage means financial resilience.",
  },
  earnings_consistency: {
    name: "Earnings Consistency",
    explanation: "Coefficient of variation in net income over available years (lower = more consistent).",
    buffettWhy:
      "Predictable earnings are the foundation of sound valuation. Buffett calls volatile earnings a red flag for fragile businesses.",
  },
};

// Curated list of well-known high-quality Buffett-style stocks for comparison

function calcPercentile(value: number, metric: string): number | null {
  const p = PERCENTILES[metric];
  if (!p) return null;

  const { p25, p50, p75, higherIsBetter } = p;

  let raw: number;
  if (higherIsBetter) {
    if (value <= p25) raw = 25 * (value / p25);
    else if (value <= p50) raw = 25 + 25 * ((value - p25) / (p50 - p25));
    else if (value <= p75) raw = 50 + 25 * ((value - p50) / (p75 - p50));
    else raw = 75 + 25 * Math.min(1, (value - p75) / (p75 - p50));
  } else {
    // Lower is better — invert
    if (value >= p75) raw = 25 * (1 - Math.min(1, (value - p75) / (p75 - p50)));
    else if (value >= p50) raw = 25 + 25 * ((p75 - value) / (p75 - p50));
    else if (value >= p25) raw = 50 + 25 * ((p50 - value) / (p50 - p25));
    else raw = 75 + 25 * Math.min(1, (p25 - value) / (p50 - p25));
  }

  return Math.max(0, Math.min(100, raw));
}

function colorFromPercentile(p: number | null): "green" | "amber" | "red" | "gray" {
  if (p === null) return "gray";
  if (p >= 66) return "green";
  if (p >= 33) return "amber";
  return "red";
}

function formatValue(key: string, value: number | null): string | null {
  if (value === null) return null;
  switch (key) {
    case "roe":
    case "roc":
    case "npm":
    case "fcf_margin":
      return `${(value * 100).toFixed(1)}%`;
    case "de":
      return value.toFixed(1);
    case "current_ratio":
      return value.toFixed(2) + "x";
    case "interest_coverage":
      return value.toFixed(1) + "x";
    case "earnings_consistency":
      return (value * 100).toFixed(1) + "% CoV";
    default:
      return value.toFixed(2);
  }
}

// ── Layer 2: Sector-aware metric exclusions ───────────────────────────────────
// Some metrics are structurally meaningless for certain sectors.
// Metrics excluded per sector because they are structurally inapplicable:
//   Financial Services: D/E and Current Ratio (leverage is the business model for banks/insurers,
//     not a risk signal); Interest Coverage (interest income/expense IS the product);
//     Earnings Consistency (GAAP mark-to-market of investment portfolios creates
//     artificial earnings swings that don't reflect business quality).
//   Real Estate: FCF Margin (REITs are required to distribute ~90% of income, so
//     retained FCF is structurally near zero); D/E and Interest Coverage (REITs
//     are mandated to use leverage as their primary financing model).
const SECTOR_EXCLUSIONS: Record<string, string[]> = {
  "Financial Services": ["current_ratio", "de", "interest_coverage", "earnings_consistency"],
  "Real Estate": ["fcf_margin", "de", "interest_coverage"],
};

function isMetricApplicable(metricKey: string, sector: string | null): boolean {
  if (!sector) return true;
  return !SECTOR_EXCLUSIONS[sector]?.includes(metricKey);
}

// ── fundamentalsTimeSeries extraction helpers ─────────────────────────────────
// yahoo-finance2 can return data in two formats depending on version/ticker:
//   Format A (native): array of { date: Date, annualNetIncome: number, ... }
//   Format B (raw):    object of { annualNetIncome: [{ asOfDate, reportedValue: { raw } }] }
// Both are handled below.

function extractTsValues(timeSeries: any, field: string): number[] {
  if (!timeSeries) return [];

  // Format A: array of dated objects
  if (Array.isArray(timeSeries)) {
    return timeSeries
      .sort((a: any, b: any) =>
        new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      )
      .map((e: any) => e?.[field])
      .filter((v): v is number => typeof v === "number" && isFinite(v));
  }

  // Format B: object with per-field arrays
  const arr = timeSeries?.[field];
  if (Array.isArray(arr)) {
    return [...arr]
      .sort((a: any, b: any) =>
        new Date(b.asOfDate ?? 0).getTime() - new Date(a.asOfDate ?? 0).getTime()
      )
      .map((e: any) => {
        const v = e?.reportedValue?.raw ?? e?.value ?? e?.[field];
        return typeof v === "number" && isFinite(v) ? v : null;
      })
      .filter((v): v is number => v !== null);
  }

  return [];
}

function tsLatestFrom(timeSeries: any, field: string): number | null {
  const values = extractTsValues(timeSeries, field);
  return values.length > 0 ? values[0]! : null;
}

function tsDateFrom(timeSeries: any, field: string): Date | null {
  if (!timeSeries) return null;

  if (Array.isArray(timeSeries)) {
    const sorted = [...timeSeries].sort((a: any, b: any) =>
      new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    );
    const entry = sorted.find((e: any) => {
      const v = e?.[field];
      return typeof v === "number" && isFinite(v);
    });
    return entry?.date ? new Date(entry.date) : null;
  }

  const arr = timeSeries?.[field];
  if (Array.isArray(arr) && arr.length > 0) {
    const sorted = [...arr].sort((a: any, b: any) =>
      new Date(b.asOfDate ?? 0).getTime() - new Date(a.asOfDate ?? 0).getTime()
    );
    return sorted[0]?.asOfDate ? new Date(sorted[0].asOfDate) : null;
  }

  return null;
}

async function calcBuffettScore(ticker: string): Promise<{
  ticker: string;
  companyName: string | null;
  sector: string | null;
  filingDate: string | null;
  buffettScore: number;
  scoreColor: "green" | "amber" | "red";
  scoreConfidence: number;
  metrics: {
    key: string;
    name: string;
    value: number | null;
    formattedValue: string | null;
    percentile: number | null;
    color: "green" | "amber" | "red" | "gray";
    explanation: string | null;
    buffettWhy: string;
    notApplicable: boolean;
  }[];
  disclaimer: string;
}> {
  const today = new Date().toISOString().split("T")[0]!;

  // Fetch financialData and time series in parallel.
  // Make separate fundamentalsTimeSeries calls for income vs balance sheet
  // to maximise per-ticker data availability.
  const [info, tsIncome, tsBalance] = await Promise.all([
    yahooFinance.quoteSummary(ticker, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"],
    }).catch(() => null),
    yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: "2019-01-01",
      period2: today,
      type: "annual",
      module: "financials",
    }).catch(() => null),
    yahooFinance.fundamentalsTimeSeries(ticker, {
      period1: "2019-01-01",
      period2: today,
      type: "annual",
      module: "balance-sheet",
    }).catch(() => null),
  ]);

  if (!info) {
    throw new Error("Ticker not found");
  }

  const fd = (info as any).financialData ?? {};
  const ap = (info as any).assetProfile ?? {};
  const sector: string | null = ap.sector ?? null;

  // ── Layer 1: Metric calculations with fallback chains ────────────────────────

  // ROE: financialData → null
  const roe: number | null = fd.returnOnEquity ?? null;

  // NPM: financialData → null
  const npm: number | null = fd.profitMargins ?? null;

  // Current Ratio: financialData → null
  const current_ratio: number | null = fd.currentRatio ?? null;

  // FCF Margin: financialData (freeCashflow / totalRevenue) → null
  const fcfRaw: number | null = fd.freeCashflow ?? null;
  const revenueRaw: number | null = fd.totalRevenue ?? null;
  const fcf_margin: number | null =
    fcfRaw !== null && revenueRaw !== null && revenueRaw !== 0
      ? fcfRaw / revenueRaw
      : null;

  // D/E: financialData → null
  const de: number | null = fd.debtToEquity ?? null;

  // Interest Coverage: fundamentalsTimeSeries (opIncome / |interestExp|) → null
  const opIncome = tsLatestFrom(tsIncome, "operatingIncome");
  const interestExp = tsLatestFrom(tsIncome, "interestExpense");
  const interest_coverage: number | null =
    opIncome !== null && interestExp !== null && interestExp !== 0
      ? opIncome / Math.abs(interestExp)
      : null;

  // ROC: fundamentalsTimeSeries netIncome / (equity + ltDebt)
  //   → fallback: financialData netIncomeToCommon / (equity + ltDebt) if ts net income missing
  const netIncomeLatestTs = tsLatestFrom(tsIncome, "netIncome");
  const netIncomeFd: number | null = (fd.netIncomeToCommon as number) ?? null;
  const netIncomeLatest = netIncomeLatestTs ?? netIncomeFd;
  const equity = tsLatestFrom(tsBalance, "commonStockEquity");
  const ltDebt = tsLatestFrom(tsBalance, "longTermDebt") ?? 0;
  const roc: number | null =
    netIncomeLatest !== null && equity !== null && equity + ltDebt !== 0
      ? netIncomeLatest / (equity + ltDebt)
      : null;

  // Earnings Consistency: multi-year CoV from fundamentalsTimeSeries netIncome
  //   Requires at least 2 years — no meaningful fallback to single-year data
  const netIncomes = extractTsValues(tsIncome, "netIncome");
  let earnings_consistency: number | null = null;
  if (netIncomes.length >= 2) {
    const mean = netIncomes.reduce((a, b) => a + b, 0) / netIncomes.length;
    const variance =
      netIncomes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / netIncomes.length;
    const std = Math.sqrt(variance);
    if (mean !== 0) {
      earnings_consistency = Math.abs(std / mean);
    }
  }

  // ── Assemble metrics ─────────────────────────────────────────────────────────
  const rawValues: Record<string, number | null> = {
    roe,
    roc,
    de,
    npm,
    current_ratio,
    fcf_margin,
    interest_coverage,
    earnings_consistency,
  };

  const metrics = Object.entries(METRIC_META).map(([key, meta]) => {
    const notApplicable = !isMetricApplicable(key, sector);
    const value = notApplicable ? null : (rawValues[key] ?? null);
    const percentile = value !== null ? calcPercentile(value, key) : null;
    const color: "green" | "amber" | "red" | "gray" = notApplicable
      ? "gray"
      : colorFromPercentile(percentile);

    const explanation = notApplicable
      ? `Not meaningful for the ${sector} sector.`
      : meta.explanation;

    return {
      key,
      name: meta.name,
      value,
      formattedValue: notApplicable ? "N/A" : formatValue(key, value),
      percentile: percentile !== null ? Math.round(percentile) : null,
      color,
      explanation,
      buffettWhy: meta.buffettWhy,
      notApplicable,
    };
  });

  // ── Buffett Score ─────────────────────────────────────────────────────────────
  let weightedSum = 0;
  let weightTotal = 0;
  for (const m of metrics) {
    if (m.notApplicable) continue; // excluded metrics don't lower confidence
    const w = WEIGHTS[m.key] ?? 0;
    if (m.percentile !== null) {
      weightedSum += m.percentile * w;
      weightTotal += w;
    }
  }
  const buffettScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  const scoreColor: "green" | "amber" | "red" =
    buffettScore >= 70 ? "green" : buffettScore >= 40 ? "amber" : "red";

  // ── Layer 3: Score confidence ─────────────────────────────────────────────────
  // Total applicable weight (excludes sector-excluded metrics)
  const applicableWeight = Object.entries(WEIGHTS)
    .filter(([key]) => isMetricApplicable(key, sector))
    .reduce((sum, [, w]) => sum + w, 0);
  const scoreConfidence =
    applicableWeight > 0 ? Math.round((weightTotal / applicableWeight) * 100) : 0;

  // ── Filing date ───────────────────────────────────────────────────────────────
  // Try time series first, fall back to financialData mostRecentQuarter
  let filingDate: string | null = null;
  try {
    const tsDate =
      tsDateFrom(tsIncome, "netIncome") ??
      tsDateFrom(tsBalance, "commonStockEquity");
    if (tsDate) {
      filingDate = tsDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (fd.mostRecentQuarter) {
      filingDate = new Date(
        typeof fd.mostRecentQuarter === "number"
          ? fd.mostRecentQuarter * 1000
          : fd.mostRecentQuarter
      ).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  } catch {}

  // ── Company name ──────────────────────────────────────────────────────────────
  let displayName: string | null = null;
  try {
    const quote = await yahooFinance.quote(ticker);
    displayName = (quote as any).longName ?? (quote as any).shortName ?? null;
  } catch {}

  return {
    ticker: ticker.toUpperCase(),
    companyName: displayName,
    sector,
    filingDate,
    buffettScore,
    scoreColor,
    scoreConfidence,
    metrics,
    disclaimer:
      "This score reflects historical patterns from 2020–2024 data. Not financial advice.",
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get("/stocks/:ticker", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.ticker)
    ? req.params.ticker[0]
    : req.params.ticker;
  const ticker = raw?.toUpperCase().trim();

  if (!ticker || !/^[A-Z0-9.\-^]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: "Invalid ticker symbol" });
    return;
  }

  try {
    const result = await calcBuffettScore(ticker);
    const similarStocks = findSimilarStocks(ticker, result.buffettScore);
    res.json(GetStockResponse.parse({ ...result, similarStocks }));
  } catch (err: any) {
    req.log.warn({ err, ticker }, "Stock lookup failed");
    if (
      err?.message?.includes("not found") ||
      err?.message?.includes("No fundamentals") ||
      err?.message?.includes("404") ||
      err?.message?.includes("No data")
    ) {
      res.status(404).json({
        error: `We couldn't find that stock — check the ticker and try again`,
      });
    } else {
      res.status(404).json({
        error: `We couldn't find data for ${ticker} — check the ticker and try again`,
      });
    }
  }
});

router.get("/stocks/:ticker/similar", (req, res): void => {
  const raw = Array.isArray(req.params.ticker)
    ? req.params.ticker[0]
    : req.params.ticker;
  const currentTicker = raw?.toUpperCase().trim() ?? "";

  const similar = findSimilarStocks(currentTicker, 50);
  res.json(similar);
});

export default router;
