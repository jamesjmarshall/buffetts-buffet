import { useRoute } from "wouter";
import { Link } from "wouter";
import { useGetStock, getGetStockQueryKey, useGetSimilarStocks, getGetSimilarStocksQueryKey } from "@workspace/api-client-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Loader2, ArrowLeft, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function StockResults() {
  const [, params] = useRoute("/stock/:ticker");
  const ticker = params?.ticker?.toUpperCase() || "";

  const { data: stock, isLoading, isError } = useGetStock(ticker, {
    query: {
      enabled: !!ticker,
      queryKey: getGetStockQueryKey(ticker)
    }
  });

  const { data: similar } = useGetSimilarStocks(ticker, {
    query: {
      enabled: !!ticker,
      queryKey: getGetSimilarStocksQueryKey(ticker)
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-bold text-primary">Checking the menu...</h2>
          <p className="text-muted-foreground">Running {ticker} through 60 years of compounding wisdom.</p>
        </div>
      </div>
    );
  }

  if (isError || !stock) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <span className="text-2xl font-serif text-destructive">?</span>
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="font-serif text-3xl font-bold text-primary">Not on the Menu</h2>
          <p className="text-muted-foreground">We couldn't find data for "{ticker}". It might not be in the S&P500, or we're missing historical filings.</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-medium hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  // Radar chart data preparation
  const chartData = stock.metrics.map(m => ({
    subject: m.name,
    A: m.percentile || 0,
    fullMark: 100,
  }));

  const getScoreColorHex = (color: string) => {
    if (color === "green") return "#22c55e";
    if (color === "amber") return "#f59e0b";
    if (color === "red") return "#ef4444";
    return "#9ca3af";
  };

  const getScoreColorClass = (color: string) => {
    if (color === "green") return "text-green-600 bg-green-50 border-green-200";
    if (color === "amber") return "text-amber-600 bg-amber-50 border-amber-200";
    if (color === "red") return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-12 space-y-16 animate-in fade-in duration-500">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-primary">{stock.companyName || stock.ticker}</h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wider">{stock.ticker}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-4">
            {stock.sector && <span>{stock.sector}</span>}
            {stock.filingDate && <span className="flex items-center gap-1 before:content-['•'] before:mr-3 before:text-border">As of {stock.filingDate}</span>}
          </div>
          <p className="text-xs text-muted-foreground/60 italic pt-2">{stock.disclaimer}</p>
        </div>

        <div className="shrink-0 flex flex-col items-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="80" cy="80" r="76" className="fill-none stroke-border" strokeWidth="8" />
              <circle 
                cx="80" cy="80" r="76" 
                className="fill-none transition-all duration-1000 ease-out"
                stroke={getScoreColorHex(stock.scoreColor)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="477.5"
                strokeDashoffset={477.5 - (477.5 * stock.buffettScore) / 100}
              />
            </svg>
            <div className="text-center">
              <div className="text-5xl font-bold font-serif" style={{ color: getScoreColorHex(stock.scoreColor) }}>
                {Math.round(stock.buffettScore)}
              </div>
              <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-1">Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-start">
        {/* Radar Chart */}
        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm">
          <h3 className="font-serif font-bold text-xl text-primary mb-6 text-center">Metric Balance</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }} />
                <Radar name="Score" dataKey="A" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="space-y-6">
          <h3 className="font-serif font-bold text-2xl text-primary border-b border-border/40 pb-4">The Breakdown</h3>
          <div className="space-y-4">
            {stock.metrics.map(metric => (
              <div key={metric.key} className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center border" className={getScoreColorClass(metric.color)}>
                  <div className={`w-3 h-3 rounded-full bg-current`} />
                </div>
                
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground">{metric.name}</h4>
                    <Tooltip>
                      <TooltipTrigger className="text-muted-foreground hover:text-primary transition-colors">
                        <Info className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px] p-3 text-sm leading-relaxed">
                        <p className="font-bold mb-1">Why Buffett cares:</p>
                        <p>{metric.buffettWhy}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{metric.explanation}</p>
                </div>

                <div className="shrink-0 flex items-center gap-6 sm:w-48 justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">{metric.formattedValue || '-'}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Value</div>
                  </div>
                  <div className="text-right w-16">
                    <div className="font-mono font-bold text-lg text-primary">{metric.percentile ? `${metric.percentile}` : '-'}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pct</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Similar Stocks */}
      {similar && similar.length > 0 && (
        <div className="pt-8 border-t border-border/40">
          <h3 className="font-serif font-bold text-2xl text-primary mb-6">Similar High-Scorers</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map(sim => (
              <Link key={sim.ticker} href={`/stock/${sim.ticker}`} className="block group">
                <div className="bg-card border border-border/50 hover:border-accent/50 rounded-xl p-5 transition-all hover:shadow-md h-full flex flex-col justify-between group-hover:-translate-y-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg text-primary">{sim.ticker}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColorClass(sim.scoreColor)}`}>
                        {Math.round(sim.buffettScore)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1 mb-1">{sim.companyName}</div>
                  </div>
                  {sim.sector && <div className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mt-4">{sim.sector}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
