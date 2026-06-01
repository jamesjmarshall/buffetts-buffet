import { Router, type IRouter } from "express";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();
import {
  GetStockParams,
  GetStockResponse,
  GetSimilarStocksParams,
  GetSimilarStocksResponse,
} from "@workspace/api-zod";

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
  earnings_consistency: 0.25,
  fcf_margin: 0.16,
  interest_coverage: 0.14,
  npm: 0.14,
  roc: 0.13,
  current_ratio: 0.11,
  roe: 0.11,
  de: 0.10,
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
const SIMILAR_TICKERS = ["AAPL", "KO", "JNJ", "PG", "MCO", "V", "MSFT", "AXP", "WMT", "BRK-B"];

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

async function calcBuffettScore(ticker: string): Promise<{
  ticker: string;
  companyName: string | null;
  sector: string | null;
  filingDate: string | null;
  buffettScore: number;
  scoreColor: "green" | "amber" | "red";
  metrics: {
    key: string;
    name: string;
    value: number | null;
    formattedValue: string | null;
    percentile: number | null;
    color: "green" | "amber" | "red" | "gray";
    explanation: string | null;
    buffettWhy: string;
  }[];
  disclaimer: string;
}> {
  const [info, financials, balanceSheet] = await Promise.all([
    yahooFinance.quoteSummary(ticker, {
      modules: ["summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"],
    }).catch(() => null),
    yahooFinance.quoteSummary(ticker, {
      modules: ["incomeStatementHistory"],
    }).catch(() => null),
    yahooFinance.quoteSummary(ticker, {
      modules: ["balanceSheetHistory"],
    }).catch(() => null),
  ]);

  if (!info) {
    throw new Error("Ticker not found");
  }

  const fd = (info as any).financialData ?? {};
  const ds = (info as any).summaryDetail ?? {};
  const ks = (info as any).defaultKeyStatistics ?? {};
  const ap = (info as any).assetProfile ?? {};

  // ── Metric calculations ─────────────────────────────────────────────────────

  // ROE
  const roe: number | null = fd.returnOnEquity ?? null;

  // NPM
  const npm: number | null = fd.profitMargins ?? null;

  // Current Ratio
  const current_ratio: number | null = fd.currentRatio ?? null;

  // FCF Margin
  const fcfRaw: number | null = fd.freeCashflow ?? null;
  const revenueRaw: number | null = fd.totalRevenue ?? null;
  const fcf_margin: number | null =
    fcfRaw !== null && revenueRaw !== null && revenueRaw !== 0
      ? fcfRaw / revenueRaw
      : null;

  // D/E
  const deRaw: number | null = fd.debtToEquity ?? null;
  const de: number | null = deRaw !== null ? deRaw : null;

  // Interest Coverage: operating income / abs(interest expense)
  let interest_coverage: number | null = null;
  try {
    const incomeStatements =
      (financials as any)?.incomeStatementHistory?.incomeStatementHistory ?? [];
    if (incomeStatements.length > 0) {
      const latest = incomeStatements[0];
      const opIncome: number | null = latest.operatingIncome ?? null;
      const interestExp: number | null = latest.interestExpense ?? null;
      if (opIncome !== null && interestExp !== null && interestExp !== 0) {
        interest_coverage = opIncome / Math.abs(interestExp);
      }
    }
  } catch {}

  // Earnings Consistency: std/mean of net income over available years
  let earnings_consistency: number | null = null;
  try {
    const incomeStatements =
      (financials as any)?.incomeStatementHistory?.incomeStatementHistory ?? [];
    const netIncomes: number[] = incomeStatements
      .map((s: any) => s.netIncome)
      .filter((n: any) => typeof n === "number" && isFinite(n));
    if (netIncomes.length >= 2) {
      const mean = netIncomes.reduce((a, b) => a + b, 0) / netIncomes.length;
      const variance =
        netIncomes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / netIncomes.length;
      const std = Math.sqrt(variance);
      if (mean !== 0) {
        earnings_consistency = Math.abs(std / mean);
      }
    }
  } catch {}

  // ROC: net income / (common equity + long term debt)
  let roc: number | null = null;
  try {
    const sheets =
      (balanceSheet as any)?.balanceSheetHistory?.balanceSheetStatements ?? [];
    const incomeStatements =
      (financials as any)?.incomeStatementHistory?.incomeStatementHistory ?? [];
    if (sheets.length > 0 && incomeStatements.length > 0) {
      const latestSheet = sheets[0];
      const latestIncome = incomeStatements[0];
      const commonEquity: number | null =
        latestSheet.stockholdersEquity ?? latestSheet.commonStockEquity ?? null;
      const longTermDebt: number | null = latestSheet.longTermDebt ?? null;
      const netIncome: number | null = latestIncome.netIncome ?? null;
      if (
        commonEquity !== null &&
        longTermDebt !== null &&
        netIncome !== null &&
        commonEquity + longTermDebt !== 0
      ) {
        roc = netIncome / (commonEquity + longTermDebt);
      }
    }
  } catch {}

  // ── Assemble metrics ────────────────────────────────────────────────────────
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
    const value = rawValues[key] ?? null;
    const percentile = value !== null ? calcPercentile(value, key) : null;
    const color = colorFromPercentile(percentile);
    return {
      key,
      name: meta.name,
      value,
      formattedValue: formatValue(key, value),
      percentile: percentile !== null ? Math.round(percentile) : null,
      color,
      explanation: meta.explanation,
      buffettWhy: meta.buffettWhy,
    };
  });

  // ── Buffett Score (weighted average of percentile scores) ───────────────────
  let weightedSum = 0;
  let weightTotal = 0;
  for (const m of metrics) {
    const w = WEIGHTS[m.key] ?? 0;
    if (m.percentile !== null) {
      weightedSum += m.percentile * w;
      weightTotal += w;
    }
  }
  const buffettScore = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
  const scoreColor: "green" | "amber" | "red" =
    buffettScore >= 70 ? "green" : buffettScore >= 40 ? "amber" : "red";

  // ── Filing date ─────────────────────────────────────────────────────────────
  let filingDate: string | null = null;
  try {
    const latestStmt = (financials as any)?.incomeStatementHistory?.incomeStatementHistory?.[0];
    if (latestStmt?.endDate) {
      const d = new Date(latestStmt.endDate);
      filingDate = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  } catch {}

  const companyName: string | null =
    ap.companyOfficers !== undefined
      ? null
      : null;

  // Try to get company name from a basic quote
  let displayName: string | null = null;
  try {
    const quote = await yahooFinance.quote(ticker);
    displayName = (quote as any).longName ?? (quote as any).shortName ?? null;
  } catch {}

  return {
    ticker: ticker.toUpperCase(),
    companyName: displayName,
    sector: ap.sector ?? null,
    filingDate,
    buffettScore,
    scoreColor,
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
    res.json(GetStockResponse.parse(result));
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

router.get("/stocks/:ticker/similar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.ticker)
    ? req.params.ticker[0]
    : req.params.ticker;
  const currentTicker = raw?.toUpperCase().trim();

  // Return a curated subset excluding the current ticker
  const candidates = SIMILAR_TICKERS.filter((t) => t !== currentTicker).slice(0, 6);

  const results = await Promise.allSettled(
    candidates.map(async (t) => {
      const score = await calcBuffettScore(t);
      return {
        ticker: score.ticker,
        companyName: score.companyName,
        sector: score.sector,
        buffettScore: score.buffettScore,
        scoreColor: score.scoreColor,
      };
    })
  );

  const similar = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.buffettScore - a.buffettScore)
    .slice(0, 4);

  res.json(GetSimilarStocksResponse.parse(similar));
});

export default router;
