import { useRoute } from "wouter";
import { Link } from "wouter";
import {
  useGetStock,
  getGetStockQueryKey,
  useGetSimilarStocks,
  getGetSimilarStocksQueryKey,
} from "@workspace/api-client-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { ArrowLeft, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const METRIC_ICONS: Record<string, string> = {
  roe: "🔑",
  roc: "🏭",
  de: "📉",
  npm: "💰",
  current_ratio: "⚖️",
  fcf_margin: "💸",
  interest_coverage: "🛡️",
  earnings_consistency: "📈",
};

export function StockResults() {
  const [, params] = useRoute("/stock/:ticker");
  const ticker = params?.ticker?.toUpperCase() || "";

  const { data: stock, isLoading, isError } = useGetStock(ticker, {
    query: {
      enabled: !!ticker,
      queryKey: getGetStockQueryKey(ticker),
    },
  });

  const { data: similar } = useGetSimilarStocks(ticker, {
    query: {
      enabled: !!ticker,
      queryKey: getGetSimilarStocksQueryKey(ticker),
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="relative w-24 h-24">
          <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin" style={{ animationDuration: "2s" }}>
            <circle cx="48" cy="48" r="44" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
            <circle
              cx="48" cy="48" r="44" fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="276.5"
              strokeDashoffset="138"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-primary">Checking the menu…</h2>
          <p className="text-muted-foreground">Running {ticker} through 60 years of compounding wisdom.</p>
        </div>
      </div>
    );
  }

  if (isError || !stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="text-5xl">🚫</div>
        <div className="space-y-2 max-w-md">
          <h2 className="font-serif text-3xl font-bold text-primary">Not on the Menu</h2>
          <p className="text-muted-foreground">
            We couldn't find data for "{ticker}". It might not be in the S&P500, or we're missing historical filings.
          </p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-medium hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const chartData = stock.metrics.map((m) => ({
    subject: shortLabel(m.name),
    A: m.percentile ?? 0,
    fullMark: 100,
  }));

  const scoreHex = stock.scoreColor === "green" ? "#22c55e" : stock.scoreColor === "amber" ? "#f59e0b" : "#ef4444";
  const scoreLabel = stock.scoreColor === "green" ? "Strong" : stock.scoreColor === "amber" ? "Moderate" : "Weak";
  const circumference = 2 * Math.PI * 76;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-14 animate-in fade-in duration-500">

      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground">
        {/* SVG mesh background */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="relative p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-none">
                {stock.companyName || stock.ticker}
              </h1>
              <span className="px-3 py-1 rounded-full bg-white/15 font-bold text-sm tracking-wider">
                {stock.ticker}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-primary-foreground/70 text-sm">
              {stock.sector && <span className="font-medium">{stock.sector}</span>}
              {stock.sector && stock.filingDate && <span className="text-primary-foreground/30">•</span>}
              {stock.filingDate && <span>Data as of {stock.filingDate}</span>}
            </div>
            <p className="text-xs text-primary-foreground/50 italic pt-1">{stock.disclaimer}</p>
          </div>

          {/* Score circle */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div className="relative w-44 h-44">
              {/* Glow */}
              <div
                className="absolute inset-4 rounded-full opacity-20 blur-xl"
                style={{ backgroundColor: scoreHex }}
              />
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="88" cy="88" r="76" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                <circle
                  cx="88" cy="88" r="76"
                  fill="none"
                  stroke={scoreHex}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * stock.buffettScore) / 100}
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="font-serif text-6xl font-bold" style={{ color: scoreHex }}>
                  {Math.round(stock.buffettScore)}
                </div>
                <div className="text-xs uppercase tracking-widest font-bold text-primary-foreground/60 mt-1">
                  / 100
                </div>
              </div>
            </div>
            <div
              className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest"
              style={{ backgroundColor: `${scoreHex}22`, color: scoreHex, border: `1px solid ${scoreHex}44` }}
            >
              {scoreLabel} Buffett Fit
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Table ────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-10 items-start">

        {/* Radar Chart */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h3 className="font-serif font-bold text-lg text-primary">Metric Balance</h3>
            <p className="text-xs text-muted-foreground mt-1">Percentile vs S&P500 dataset</p>
          </div>
          <div className="h-[280px] w-full px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={chartData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 600 }}
                />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="hsl(var(--accent))"
                  fill="hsl(var(--accent))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Score breakdown legend */}
          <div className="border-t border-border/40 px-6 py-4 flex justify-around text-center">
            {[
              { color: "#22c55e", label: "Strong", range: "66–100" },
              { color: "#f59e0b", label: "Average", range: "33–65" },
              { color: "#ef4444", label: "Weak", range: "0–32" },
            ].map((l) => (
              <div key={l.label} className="flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{l.label}</span>
                <span className="text-[10px] text-muted-foreground/60">{l.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Table */}
        <div>
          <h3 className="font-serif font-bold text-2xl text-primary border-b border-border/40 pb-3 mb-5">
            The Breakdown
          </h3>
          <div className="space-y-3">
            {stock.metrics.map((metric) => {
              const pct = metric.percentile ?? 0;
              const barColor =
                metric.color === "green" ? "#22c55e"
                  : metric.color === "amber" ? "#f59e0b"
                  : metric.color === "red" ? "#ef4444"
                  : "#9ca3af";
              const TrendIcon =
                metric.color === "green" ? TrendingUp
                  : metric.color === "red" ? TrendingDown
                  : Minus;

              return (
                <div
                  key={metric.key}
                  className="bg-card border border-border/50 rounded-xl overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${barColor}18`, border: `1px solid ${barColor}33` }}
                    >
                      {METRIC_ICONS[metric.key] ?? "📊"}
                    </div>

                    {/* Name + explanation */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{metric.name}</span>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                            <Info className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] p-3 text-sm leading-relaxed">
                            <p className="font-bold mb-1 text-accent">Why Buffett cares:</p>
                            <p>{metric.buffettWhy}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{metric.explanation}</p>
                      {/* Percentile bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground w-10 text-right shrink-0">
                          {metric.percentile !== null ? `${metric.percentile}th` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Value + trend icon */}
                    <div className="shrink-0 flex items-center gap-2 pl-2">
                      <div className="text-right">
                        <div className="font-mono font-bold text-base text-foreground">
                          {metric.formattedValue ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                          Value
                        </div>
                      </div>
                      <TrendIcon className="h-5 w-5 shrink-0" style={{ color: barColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Similar Stocks ───────────────────────────────────────────────────── */}
      {similar && similar.length > 0 && (
        <div className="pt-6 border-t border-border/40">
          <div className="flex items-center gap-4 mb-6">
            <h3 className="font-serif font-bold text-2xl text-primary">Similar High-Scorers</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map((sim) => {
              const hex = sim.scoreColor === "green" ? "#22c55e" : sim.scoreColor === "amber" ? "#f59e0b" : "#ef4444";
              return (
                <Link key={sim.ticker} href={`/stock/${sim.ticker}`} className="block group">
                  <div className="relative bg-card border border-border/50 hover:border-accent/50 rounded-xl p-5 transition-all hover:shadow-md group-hover:-translate-y-1 overflow-hidden">
                    {/* Score bar accent at top */}
                    <div className="absolute top-0 left-0 h-1 rounded-t-xl" style={{ width: `${sim.buffettScore}%`, backgroundColor: hex }} />
                    <div className="flex items-start justify-between mb-3 mt-1">
                      <div>
                        <span className="font-bold text-lg text-primary">{sim.ticker}</span>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sim.companyName}</div>
                      </div>
                      <div
                        className="text-xl font-serif font-bold"
                        style={{ color: hex }}
                      >
                        {Math.round(sim.buffettScore)}
                      </div>
                    </div>
                    {/* Mini score bar */}
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${sim.buffettScore}%`, backgroundColor: hex }} />
                    </div>
                    {sim.sector && (
                      <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-3">
                        {sim.sector}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function shortLabel(name: string): string {
  const map: Record<string, string> = {
    "Return on Equity": "ROE",
    "Return on Capital": "ROC",
    "Debt/Equity": "D/E",
    "Net Profit Margin": "NPM",
    "Current Ratio": "Curr Ratio",
    "Free Cash Flow Margin": "FCF Margin",
    "Interest Coverage": "Int Cover",
    "Earnings Consistency": "Earnings",
  };
  return map[name] ?? name;
}
