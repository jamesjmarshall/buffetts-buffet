import { useRoute, Link } from "wouter";
import { useEffect, useRef } from "react";
import {
  useGetStock,
  getGetStockQueryKey,
} from "@workspace/api-client-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, Info, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Metric display config ────────────────────────────────────────────────────
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

// Short radar axis labels
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    "Return on Equity": "ROE",
    "Return on Capital": "ROC",
    "Debt/Equity": "D/E",
    "Net Profit Margin": "NPM",
    "Current Ratio": "Curr Ratio",
    "Free Cash Flow Margin": "FCF",
    "Interest Coverage": "Int Cov",
    "Earnings Consistency": "Earnings",
  };
  return map[name] ?? name;
}

// Generate a one-line summary from the metrics
function generateSummary(
  metrics: Array<{ key: string; name: string; color: string; percentile: number | null }>,
  scoreColor: string
): string {
  const greens = metrics.filter((m) => m.color === "green");
  const reds = metrics.filter((m) => m.color === "red");

  const top = greens.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0];
  const concern = reds.sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100))[0];

  const prefix =
    scoreColor === "green"
      ? "Passes Buffett's core tests."
      : scoreColor === "amber"
      ? "Mixed signals on Buffett's metrics."
      : "Struggles on several Buffett metrics.";

  const topStr = top ? ` Strong ${top.name.toLowerCase()}.` : "";
  const concernStr = concern ? ` ${concern.name} is a concern.` : "";

  return `${prefix}${topStr}${concernStr}`.trim();
}

// Diversified holding companies where fundamental ratios understate quality
const HOLDING_COMPANY_TICKERS = new Set(["BRK-A", "BRK-B", "MKL", "SPLP", "CNSWF"]);

// Score colour helpers
function scoreHex(color: string) {
  if (color === "green") return "#2D6A4F";
  if (color === "amber") return "#D4960A";
  return "#C1121F";
}

function signalColor(pct: number | null) {
  if (pct === null) return "gray";
  return pct >= 50 ? "green" : "red";
}

export function StockResults() {
  const [, params] = useRoute("/stock/:ticker");
  const ticker = params?.ticker?.toUpperCase() || "";

  // Single data object: swap the hook for any data source and the UI is unchanged
  const { data: stock, isLoading, isError } = useGetStock(ticker, {
    query: { enabled: !!ticker, queryKey: getGetStockQueryKey(ticker) },
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="relative w-28 h-28">
          <svg className="absolute inset-0 w-full h-full -rotate-90 animate-spin" style={{ animationDuration: "2s" }}>
            <circle cx="56" cy="56" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle cx="56" cy="56" r="50" fill="none" stroke="hsl(var(--accent))" strokeWidth="6"
              strokeLinecap="round" strokeDasharray="314" strokeDashoffset="157" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🍽️</div>
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-primary">Checking the menu…</h2>
          <p className="text-muted-foreground">Running {ticker} through 60 years of compounding wisdom.</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="text-5xl">🚫</div>
        <div className="space-y-2 max-w-md">
          <h2 className="font-serif text-3xl font-bold text-primary">Not on the Menu</h2>
          <p className="text-muted-foreground">
            We couldn't find data for "{ticker}". Check the ticker and try again.
          </p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-medium hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────
  const hex = scoreHex(stock.scoreColor);
  const summary = generateSummary(stock.metrics, stock.scoreColor);
  const circumference = 2 * Math.PI * 72;

  // Only plot metrics that have real data; keeps the polygon uniform rather than
  // collapsing toward zero for missing/excluded metrics.
  const chartData = stock.metrics
    .filter((m) => !m.notApplicable && m.value !== null && m.percentile !== null)
    .map((m) => ({
      subject: shortLabel(m.name),
      A: m.percentile ?? 0,
      fullMark: 100,
    }));

  const isHoldingCompany = HOLDING_COMPANY_TICKERS.has(ticker);

  const methodologyRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const trigger = () => {
      const el = methodologyRef.current;
      if (!el) return;
      el.classList.remove("animate-pulsate");
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add("animate-pulsate");
    };
    trigger(); // run immediately on mount
    const id = setInterval(trigger, 5000);
    return () => clearInterval(id);
  }, []);

  // Data-gap footnote: metrics that are null due to API availability (not sector exclusions)
  const nullDataMetrics = stock.metrics.filter((m) => !m.notApplicable && m.value === null);
  const totalMetrics = stock.metrics.length; // always 8
  const sectorExcludedCount = stock.metrics.filter((m) => m.notApplicable).length;
  const totalApplicable = totalMetrics - sectorExcludedCount;
  const availableCount = totalApplicable - nullDataMetrics.length;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-12 animate-in fade-in duration-500">

      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground">
        {/* Grid texture */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.08]">
          <defs>
            <pattern id="hdr-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hdr-grid)" />
        </svg>

        <div className="relative p-8 sm:p-10 flex flex-col md:flex-row gap-10 items-start md:items-center justify-between">
          {/* Company info */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-none">
                {stock.companyName || stock.ticker}
              </h1>
              <span className="px-3 py-1 rounded-full bg-white/15 font-bold text-sm tracking-wider shrink-0">
                {stock.ticker}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-primary-foreground/65 text-sm">
              {stock.sector && <span className="font-medium">{stock.sector}</span>}
              {stock.sector && stock.filingDate && <span className="text-primary-foreground/30">•</span>}
              {stock.filingDate && <span>As of {stock.filingDate}</span>}
            </div>
            <p className="text-xs text-primary-foreground/45 italic pt-1">{stock.disclaimer}</p>
          </div>

          {/* Score circle */}
          <div className="shrink-0 flex flex-col items-center gap-2 self-center md:self-auto">
            <div className="relative w-40 h-40">
              {/* Holding company gold plaque badge */}
              {isHoldingCompany && (
                <Tooltip delayDuration={80}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 cursor-pointer select-none whitespace-nowrap px-3 py-1 rounded transition-all duration-200 ease-out hover:scale-125 hover:-rotate-[5deg] hover:shadow-lg"
                      style={{
                        background: "linear-gradient(160deg, #f5c842 0%, #c8960c 50%, #e8b824 100%)",
                        border: "1px solid #f0d060",
                        boxShadow: "0 1px 0 #a07808 inset, 0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.25)",
                        fontFamily: "Georgia, serif",
                        transformOrigin: "center center",
                      }}
                    >
                      <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3a1f00", textShadow: "0 1px 0 rgba(255,220,80,0.4)" }}>
                        ⚜ Why is this score low? ⚜
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="max-w-[280px] p-3 animate-in fade-in-0 zoom-in-95 duration-100">
                    <p className="text-xs leading-relaxed">This score measures fundamental ratios like ROE and ROC. At Berkshire's scale, those numbers are naturally moderate. Its real edge comes from its $300B cash fortress, insurance float, wide economic moat, and AA credit rating. None of those are captured in these 8 metrics.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Glow */}
              <div className="absolute inset-6 rounded-full opacity-25 blur-xl" style={{ backgroundColor: hex }} />
              {/* Track + arc */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle cx="80" cy="80" r="72" fill="none"
                  stroke={hex} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * stock.buffettScore) / 100}
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-6xl font-bold leading-none" style={{ color: hex }}>
                  {Math.round(stock.buffettScore)}
                </span>
                <span className="text-xs uppercase tracking-widest font-bold text-primary-foreground/50 mt-1">
                  / 100
                </span>
              </div>
            </div>
            {/* Summary sentence */}
            <p className="text-center text-xs text-primary-foreground/60 max-w-[180px] leading-relaxed">
              {summary}
            </p>
            {/* Score confidence */}
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary-foreground/40 shrink-0" />
                <span className="text-[10px] text-primary-foreground/45 leading-none">
                  {availableCount} of {totalMetrics} metrics scored
                </span>
              </div>
              {sectorExcludedCount > 0 && (
                <span className="text-[9px] text-primary-foreground/30 leading-none">
                  {sectorExcludedCount} excluded for sector
                </span>
              )}
            </div>

            {/* Methodology link */}
            <span ref={methodologyRef} className="mt-1 inline-block">
              <Link
                href="/research"
                className="text-[10px] text-accent/60 hover:text-accent transition-colors underline underline-offset-2"
              >
                Score methodology
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* ── Chart + Table grid ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-10 items-start">

        {/* Radar chart */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 pt-6 pb-1">
            <h3 className="font-serif font-bold text-lg text-primary">Metric Balance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Percentile vs S&P500 dataset</p>
          </div>
          <div className="h-[260px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 600 }}
                />
                <Radar name="Score" dataKey="A"
                  stroke="#5C1A1A" fill="#5C1A1A" fillOpacity={0.25} strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="border-t border-border/40 px-5 py-3 flex justify-around text-center">
            {[
              { hex: "#2D6A4F", label: "Strong", range: "≥50th" },
              { hex: "#C1121F", label: "Weak", range: "<50th" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.hex }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{l.label}</span>
                <span className="text-[10px] text-muted-foreground/50">({l.range})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metric breakdown table */}
        <div>
          <h3 className="font-serif font-bold text-2xl text-primary pb-3 mb-2 border-b border-border/40">
            The Breakdown
          </h3>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Metric</span>
            <span className="hidden sm:block text-right w-20">Value</span>
            <span className="text-right w-16">Percentile</span>
            <span className="text-center w-12">Signal</span>
          </div>

          <div className="space-y-1.5">
            {stock.metrics.map((metric) => {
              const pct = metric.percentile;
              const isNA = metric.notApplicable;
              const isMissing = !isNA && metric.value === null;
              const sig = isNA || isMissing ? "gray" : signalColor(pct);
              const sigHex = sig === "green" ? "#2D6A4F" : sig === "red" ? "#C1121F" : "#9ca3af";

              return (
                <div key={metric.key}
                  className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center bg-card border rounded-xl px-4 py-3 transition-colors group ${
                    isNA ? "border-border/25 opacity-60" : "border-border/50 hover:border-accent/30"
                  }`}
                >
                  {/* Metric name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-xl shrink-0 ${isNA ? "grayscale opacity-50" : ""}`}>
                      {METRIC_ICONS[metric.key] ?? "📊"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">{metric.name}</span>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground hover:text-primary transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] p-3 text-sm leading-relaxed">
                            <p className="font-bold mb-1 text-accent">Why Buffett cares:</p>
                            <p>{metric.buffettWhy}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {isNA ? (
                        <p className="text-[10px] text-muted-foreground/60 italic mt-0.5">{metric.explanation}</p>
                      ) : (
                        <div className="mt-1 h-1 w-full max-w-[160px] rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct ?? 0}%`, backgroundColor: sigHex }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Value — hidden on mobile */}
                  <div className="hidden sm:block text-right w-20">
                    <span className={`font-mono font-bold text-sm ${isNA || isMissing ? "text-muted-foreground" : "text-foreground"}`}>
                      {metric.formattedValue ?? "-"}
                    </span>
                  </div>

                  {/* Percentile */}
                  <div className="text-right w-16">
                    <span className="font-mono font-bold text-sm text-primary">
                      {pct !== null ? `${pct}th` : "-"}
                    </span>
                  </div>

                  {/* Signal dot */}
                  <div className="flex justify-center w-12">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: sigHex, boxShadow: `0 0 6px ${sigHex}66` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data-gap footnote */}
          {nullDataMetrics.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground/55 leading-relaxed">
              {nullDataMetrics.length} {nullDataMetrics.length === 1 ? "metric" : "metrics"} unavailable due to Yahoo Finance data gaps. Score calculated from {availableCount} of {totalMetrics} metrics.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
