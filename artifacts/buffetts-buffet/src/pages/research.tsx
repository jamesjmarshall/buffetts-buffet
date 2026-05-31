export function Research() {
  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-16 space-y-12 animate-in fade-in duration-700">
      <div className="space-y-4 text-center">
        <h1 className="font-serif text-5xl font-bold text-primary">How We Built This</h1>
        <p className="text-xl text-muted-foreground italic">The methodology behind the menu.</p>
      </div>

      <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-primary prose-a:text-accent hover:prose-a:text-primary">
        <p className="lead text-lg">
          Buffett's Buffet is not a stock-picking crystal ball. It is an exploration into whether the principles famously espoused by Warren Buffett actually hold mathematical weight across the broader market.
        </p>

        <h3>The Data</h3>
        <p>
          We utilized historical financial data from Simfin, specifically looking at the period from 2020 to 2021. By establishing a snapshot of fundamental data at that time, we could evaluate forward-looking performance through 2024 to determine which metrics actually correlated with market outperformance.
        </p>

        <h3>The Model</h3>
        <p>
          We trained a Random Forest classifier on nearly 2,000 companies. The model was tasked with predicting whether a stock would outperform the S&P500 benchmark based solely on 8 fundamental metrics favored by value investors:
        </p>
        <ul>
          <li><strong>Return on Equity (ROE):</strong> The holy grail of compounding capital.</li>
          <li><strong>Return on Capital (ROC):</strong> Efficiency of total capital allocation.</li>
          <li><strong>Debt to Equity:</strong> Prudence with leverage.</li>
          <li><strong>Net Profit Margin:</strong> The moat protector.</li>
          <li><strong>Current Ratio:</strong> Near-term survivability.</li>
          <li><strong>Free Cash Flow Margin:</strong> Actual cash generative power.</li>
          <li><strong>Interest Coverage:</strong> Protection against credit cycles.</li>
          <li><strong>Earnings Consistency:</strong> Historical predictability.</li>
        </ul>

        <h3>Honest Limitations</h3>
        <p>
          Any historical screening tool must acknowledge survivorship bias. Companies that went bankrupt or were acquired and delisted between 2020 and 2024 are difficult to properly account for in backward-looking datasets. 
        </p>
        <p>
          Furthermore, a pure quantitative approach cannot account for the qualitative "moat" that Buffett so frequently cites — brand power, management integrity, and shifting consumer preferences. This tool is a starting point for research, not a conclusion.
        </p>
      </div>
    </div>
  );
}
