import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  LabelList,
} from "recharts";

// ── Static data ──────────────────────────────────────────────────────────────

const IMPORTANCE_DATA = [
  { metric: "Earnings Consistency", short: "Earn. Consistency", weight: 25, key: "earnings_consistency" },
  { metric: "FCF Margin",           short: "FCF Margin",        weight: 16, key: "fcf_margin" },
  { metric: "Interest Coverage",    short: "Int. Coverage",     weight: 14, key: "interest_coverage" },
  { metric: "Net Profit Margin",    short: "Net Margin",        weight: 14, key: "npm" },
  { metric: "Return on Capital",    short: "ROC",               weight: 13, key: "roc" },
  { metric: "Current Ratio",        short: "Current Ratio",     weight: 11, key: "current_ratio" },
  { metric: "Return on Equity",     short: "ROE",               weight: 11, key: "roe" },
  { metric: "Debt / Equity",        short: "Debt / Equity",     weight: 10, key: "de" },
];

const METHODOLOGY_STEPS = [
  {
    n: "01",
    title: "Data Collection",
    body: "Pulled fundamental snapshots for ~1,960 S&P 500 companies at end of 2020-2021 from the Simfin dataset, covering balance sheets, income statements, and cash flow statements.",
  },
  {
    n: "02",
    title: "Feature Engineering",
    body: "Calculated 8 fundamental ratios per company: ROE, ROC, D/E, Net Profit Margin, Current Ratio, FCF Margin, Interest Coverage, and Earnings Consistency (coefficient of variation in net income).",
  },
  {
    n: "03",
    title: "Label Generation",
    body: "Each company was labelled 1 (outperformed the S&P 500 benchmark over the following 3 years through 2024) or 0 (underperformed). The benchmark was total return including dividends.",
  },
  {
    n: "04",
    title: "Model Training",
    body: "A Random Forest classifier was trained on the labelled dataset. Feature importance scores were extracted directly from the fitted model. These are the weights shown in the chart above.",
  },
  {
    n: "05",
    title: "Live Scoring",
    body: "Each new ticker is fetched live from Yahoo Finance. Metrics are calculated, then scored against the empirical 25th/50th/75th percentile thresholds from the training dataset.",
  },
];

const STATS = [
  { value: "1,960", label: "companies analyzed" },
  { value: "2020–2024", label: "data window" },
  { value: "25%", label: "weight on earnings consistency, the top metric" },
];

// ── Chart tick component for bold earnings_consistency label ─────────────────
function CustomYTick({ x, y, payload }: any) {
  const isTop = payload.value === "Earnings Consistency";
  return (
    <text
      x={x - 6}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      fontWeight={isTop ? 700 : 400}
      fill={isTop ? "hsl(44 54% 54%)" : "hsl(var(--muted-foreground))"}
    >
      {payload.value}
    </text>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function Research() {
  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-700">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground px-6 py-20">
        {/* Grid texture */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.07]">
          <defs>
            <pattern id="rsr-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#rsr-grid)" />
        </svg>

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <span className="text-xs font-bold uppercase tracking-[0.35em] text-accent/80">
            Methodology
          </span>
          <h1 className="font-serif text-5xl sm:text-6xl font-bold leading-tight">
            The Oracle's Playbook,<br />Tested
          </h1>

          {/* Pull quote */}
          <blockquote className="border-l-4 border-accent text-left mx-auto max-w-2xl bg-white/5 rounded-r-xl px-6 py-5">
            <p className="font-serif italic text-xl sm:text-2xl text-primary-foreground/90 leading-relaxed">
              "Earnings consistency was the single strongest predictor, carrying{" "}
              <span className="text-accent font-bold not-italic">2.5× more weight</span>{" "}
              than leverage or liquidity measures."
            </p>
          </blockquote>
        </div>
      </section>

      {/* ── Stat cards ───────────────────────────────────────────────────────── */}
      <section className="bg-card border-b border-border/40 px-6 py-8">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center space-y-1">
              <div className="font-serif text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature importance chart ──────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-3xl mx-auto w-full">
        <div className="text-center space-y-2 mb-10">
          <h2 className="font-serif text-3xl font-bold text-primary">Model Feature Importance</h2>
          <p className="text-sm text-muted-foreground">
            Random Forest trained to predict 3-year S&P 500 outperformance. Feature weights from the fitted model.
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={IMPORTANCE_DATA}
                margin={{ left: 130, right: 48, top: 4, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 30]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={130}
                  tick={<CustomYTick />}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {IMPORTANCE_DATA.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.key === "earnings_consistency"
                          ? "hsl(44 54% 54%)"
                          : "hsl(var(--primary))"
                      }
                      fillOpacity={entry.key === "earnings_consistency" ? 1 : 0.65}
                    />
                  ))}
                  <LabelList
                    dataKey="weight"
                    position="right"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Caption */}
          <p className="mt-4 text-center text-xs text-muted-foreground/70 italic border-t border-border/30 pt-4">
            Earnings consistency (25%) outweighed the bottom two metrics combined (D/E 10% + ROE 11%). Highlighted in gold.
          </p>
        </div>
      </section>

      {/* ── Methodology timeline ─────────────────────────────────────────────── */}
      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <h2 className="font-serif text-3xl font-bold text-primary">How It Works</h2>
          <p className="text-sm text-muted-foreground">Five steps from raw financial data to live Buffett score</p>
        </div>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[22px] top-8 bottom-8 w-px bg-border/60" aria-hidden="true" />

          <div className="space-y-8">
            {METHODOLOGY_STEPS.map((step, i) => (
              <div key={step.n} className="relative flex gap-6 items-start">
                {/* Step circle */}
                <div
                  className="relative z-10 shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-[11px] font-bold tracking-wider"
                  style={{
                    borderColor: i === 0 ? "hsl(44 54% 54%)" : "hsl(var(--border))",
                    backgroundColor: i === 0 ? "hsl(44 54% 54% / 0.12)" : "hsl(var(--background))",
                    color: i === 0 ? "hsl(44 54% 54%)" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {step.n}
                </div>

                {/* Content */}
                <div className="pt-1.5 pb-2">
                  <h3 className="font-serif font-bold text-primary text-lg leading-none mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Honest limitations ───────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-3xl mx-auto w-full">
        <div className="bg-card border border-border/50 rounded-2xl p-8 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-primary">Honest Limitations</h2>

          <p className="text-sm text-foreground/75 leading-relaxed">
            Any historical screening tool must acknowledge survivorship bias. Companies that went bankrupt or were delisted between 2020 and 2024 are difficult to properly account for in backward-looking datasets; the training set is biased toward companies that survived.
          </p>
          <p className="text-sm text-foreground/75 leading-relaxed">
            A pure quantitative approach cannot capture the qualitative "moat" Buffett frequently cites: brand power, management integrity, and shifting consumer preferences. This screener is a starting point for research, not a conclusion.
          </p>
          <p className="text-sm text-foreground/75 leading-relaxed">
            Live scores use current Yahoo Finance data. The training percentile thresholds were derived from 2020–2021 snapshots. If a company's fundamentals have changed substantially since then, the percentile ranking may not reflect today's competitive landscape.
          </p>
        </div>
      </section>

    </div>
  );
}
