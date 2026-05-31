# Buffett's Buffet — Replit Build Prompt

## Concept

Build a web app called **"Buffett's Buffet"** — a stock screener that scores any S&P500 stock against Warren Buffett's core fundamental metrics.

The name is a pun — it's a "buffet" of Buffett's investing principles. The tone is warm and slightly cheeky, but the underlying data and methodology are serious and rigorous.

---

## Tech Stack

- Python Flask backend
- HTML/CSS/JS frontend (single file templates)
- yfinance for live data
- Chart.js for the radar chart
- No database needed

---

## App Structure — 3 Pages

### 1. Home (`/`)

- Hero section with the name **"Buffett's Buffet"** in a bold retro diner font (suggest Playfair Display or similar serif)
- Tagline: *"Warren Buffett has beaten the market for 60 years. We tested his 8 core metrics on nearly 2,000 S&P500 companies to find which ones actually predicted outperformance. Now you can run any stock through the same lens."*
- Single search bar: placeholder text `Enter a ticker (e.g. AAPL)`
- Submit button labelled **"Check the Menu"**
- Warm colour palette: deep burgundy (`#5C1A1A`), cream (`#FDF6EC`), gold accents (`#C9A84C`)
- Subtle chalkboard or diner menu texture in the background

---

### 2. Stock Results (`/stock/<ticker>`)

**Top section:**
- Company name and ticker
- "As of [filing date]" displayed clearly
- Disclaimer: *"This score reflects historical patterns from 2020–2024 data. Not financial advice."*

**Buffett Score (0–100):**
- Large circular score display, colour coded:
  - Green: 70+
  - Amber: 40–69
  - Red: below 40
- Score is a weighted average of the 8 metrics based on their feature importance from the ML model

**Radar chart (Chart.js):**
- Octagon showing all 8 metrics as percentile scores vs the S&P500 dataset
- Labels: Earnings Consistency, Free Cash Flow Margin, Interest Coverage, Net Profit Margin, Return on Capital, Current Ratio, Return on Equity, Debt/Equity

**Metric breakdown table:**
- 8 rows, one per metric
- Columns: Metric Name | Value | Percentile vs Dataset | Green/Amber/Red Indicator | One-line explanation of why Buffett cares

---

### 3. Research (`/research`)

- Title: **"How We Built This"**
- Origin story: *"My grandfather has beaten the market for decades following Buffett's principles but won't tell me how. So I built an ML pipeline on nearly 2,000 S&P500 companies to test which of his metrics actually predicted outperformance."*
- Feature importance bar chart (embed as static image)
- Methodology summary:
  - Data source: Simfin
  - Time period: 2020–2021 publish dates, 3-year forward returns
  - Model: Random Forest with balanced class weights
  - Survivorship bias acknowledgement
- Honest limitations section
- Link to GitHub

---

## Backend Logic (`app.py`)

```python
# For each ticker lookup, fetch:
info = ticker.info
financials = ticker.financials
balance = ticker.balance_sheet

# Calculate 8 metrics:
roe = info.get('returnOnEquity')
roc = net_income / (common_equity + long_term_debt)  # from balance sheet
de = info.get('debtToEquity')
npm = info.get('profitMargins')
current_ratio = info.get('currentRatio')
fcf_margin = info.get('freeCashflow') / info.get('totalRevenue')
interest_coverage = operating_income / abs(interest_expense)  # from financials
earnings_consistency = net_income_series.std() / net_income_series.mean()  # from financials

# Buffett Score weights (based on feature importance from ML model):
weights = {
    'earnings_consistency': 0.25,
    'fcf_margin': 0.16,
    'interest_coverage': 0.14,
    'npm': 0.14,
    'roc': 0.13,
    'current_ratio': 0.11,
    'roe': 0.11,
    'de': 0.10  # note: lower D/E is better — invert this one
}
```

Percentile scores should be calculated against hardcoded dataset percentiles from the training data (25th, 50th, 75th percentile for each metric).

---

## Design Details

- Mobile responsive
- Navigation: "Buffett's Buffet" logo left, "Research" link right
- Footer: *"Built on data. Inspired by the Oracle of Omaha."* + GitHub link
- Loading state on results page while yfinance fetches (spinner or "Checking the menu...")
- Error handling: if ticker not found — *"We couldn't find that stock — check the ticker and try again"*

---

## yfinance Field Mapping

| Metric | Source | Field |
|--------|--------|-------|
| ROE | `ticker.info` | `returnOnEquity` |
| ROC | `ticker.balance_sheet` | `netIncomeToCommon / (Common Stock Equity + Long Term Debt)` |
| Debt/Equity | `ticker.info` | `debtToEquity` |
| Net Profit Margin | `ticker.info` | `profitMargins` |
| Current Ratio | `ticker.info` | `currentRatio` |
| FCF Margin | `ticker.info` | `freeCashflow / totalRevenue` |
| Interest Coverage | `ticker.financials` | `Operating Income / abs(Interest Expense)` |
| Earnings Consistency | `ticker.financials` | `Net Income` std/mean across available years |

---

## TODO After Build

- Run `df_clean[metrics].describe()` in the Jupyter notebook to get the 25th/50th/75th percentile values for each metric from the training dataset
- Hardcode those percentiles into the backend to calculate accurate percentile scores for each live ticker
- Add the `feature_importance.png` chart to the `/research` page
