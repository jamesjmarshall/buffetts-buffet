import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EXAMPLES = ["AAPL", "KO", "BRK-B", "JNJ"];

const PILLARS = [
  { icon: "📈", key: "Earnings Consistency", desc: "Stable profits year over year", weight: "25%" },
  { icon: "💸", key: "FCF Margin", desc: "Cash left after reinvestment", weight: "16%" },
  { icon: "🛡️", key: "Interest Coverage", desc: "Ability to service debt", weight: "14%" },
  { icon: "💰", key: "Net Profit Margin", desc: "Percentage of revenue kept", weight: "14%" },
  { icon: "🏭", key: "Return on Capital", desc: "Efficiency of capital deployed", weight: "13%" },
  { icon: "⚖️", key: "Current Ratio", desc: "Short-term financial health", weight: "11%" },
  { icon: "🔑", key: "Return on Equity", desc: "Returns to shareholders", weight: "11%" },
  { icon: "📉", key: "Debt / Equity", desc: "Financial leverage (lower = better)", weight: "10%" },
];

const STATS = [
  { value: "60", label: "Years Buffett has beaten the market" },
  { value: "8", label: "Core metrics from his playbook" },
  { value: "~2,000", label: "S&P500 companies analyzed" },
];

export function Home() {
  const [, setLocation] = useLocation();
  const [ticker, setTicker] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      setLocation(`/stock/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center px-6 py-28 text-center">
        {/* SVG background texture */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.035]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="diamond" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <polygon points="20,2 38,20 20,38 2,20" fill="none" stroke="#5C1A1A" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamond)" />
        </svg>

        {/* Top ornament */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <OrnamentalDivider />
          <span className="text-xs font-bold uppercase tracking-[0.35em] text-accent opacity-80">
            A Buffett Scorecard
          </span>
          <OrnamentalDivider />
        </div>

        {/* Title */}
        <div className="relative max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="font-serif text-6xl sm:text-8xl font-bold tracking-tight text-primary leading-none">
            Buffett's<br />Buffet
          </h1>

          <p className="text-base sm:text-lg text-foreground/70 max-w-xl mx-auto leading-relaxed">
            Warren Buffett has beaten the market for 60 years. We tested his 8 core metrics
            on nearly 2,000 S&P500 companies to find which ones actually predicted outperformance.
            <br /><br />
            Now you can run any stock through the same lens.
          </p>
        </div>

        {/* Search card */}
        <div className="mt-12 w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <div className="relative bg-card rounded-2xl shadow-2xl overflow-hidden border border-accent/30">
            {/* Gold top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-accent/40 via-accent to-accent/40" />
            <div className="p-8">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="Enter a ticker (e.g. AAPL)"
                    className="pl-10 h-12 text-lg uppercase bg-background border-primary/20 focus-visible:ring-accent"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide">
                  Check the Menu
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border/40 flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Specials</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => setLocation(`/stock/${ex}`)}
                      className="px-4 py-1.5 rounded-full border border-accent/40 bg-accent/5 hover:bg-accent/15 text-primary font-semibold text-sm transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Gold bottom bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-accent/40 via-accent to-accent/40" />
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-border/40 bg-primary/5">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 divide-x divide-border/30">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center px-4">
              <span className="font-serif text-4xl sm:text-5xl font-bold text-accent">{s.value}</span>
              <span className="text-xs sm:text-sm text-muted-foreground mt-1 leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-12 space-y-3">
          <OrnamentalDivider />
          <h2 className="font-serif text-4xl font-bold text-primary mt-4">The 8 Pillars</h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Each stock is scored against these metrics — weighted by their actual predictive power from a Random Forest model trained on S&P500 data.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => (
            <div key={p.key} className="group relative bg-card border border-border/50 rounded-2xl p-5 hover:border-accent/50 hover:shadow-md transition-all">
              {/* Weight badge */}
              <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/30 rounded-full px-2 py-0.5">
                {p.weight}
              </div>

              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-serif font-bold text-primary text-base leading-snug mb-1">{p.key}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quote ────────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <svg aria-hidden="true" className="w-12 h-12 mx-auto text-accent opacity-60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="font-serif text-2xl sm:text-3xl italic font-medium leading-relaxed text-primary-foreground/90">
            "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price."
          </p>
          <p className="text-accent font-semibold tracking-wide text-sm uppercase">— Warren Buffett</p>
          <OrnamentalDivider light />
        </div>
      </section>

    </div>
  );
}

function OrnamentalDivider({ light = false }: { light?: boolean }) {
  const color = light ? "hsl(44 54% 54% / 0.6)" : "hsl(44 54% 54% / 0.7)";
  return (
    <svg width="180" height="12" viewBox="0 0 180 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="0" y1="6" x2="72" y2="6" stroke={color} strokeWidth="1" />
      <circle cx="80" cy="6" r="2" fill={color} />
      <circle cx="90" cy="6" r="3.5" fill={color} />
      <circle cx="100" cy="6" r="2" fill={color} />
      <line x1="108" y1="6" x2="180" y2="6" stroke={color} strokeWidth="1" />
    </svg>
  );
}
