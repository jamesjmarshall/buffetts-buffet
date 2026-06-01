export interface ScoredStock {
  ticker: string;
  name: string;
  score: number;
  sector: string;
}

export const SCORED_UNIVERSE: ScoredStock[] = [
  { ticker: "AAPL",  name: "Apple Inc.",                 score: 79, sector: "Technology" },
  { ticker: "MSFT",  name: "Microsoft Corporation",      score: 75, sector: "Technology" },
  { ticker: "KO",    name: "The Coca-Cola Company",      score: 68, sector: "Consumer Defensive" },
  { ticker: "V",     name: "Visa Inc.",                  score: 80, sector: "Financial Services" },
  { ticker: "PG",    name: "Procter & Gamble",           score: 72, sector: "Consumer Defensive" },
  { ticker: "MCO",   name: "Moody's Corporation",        score: 72, sector: "Financial Services" },
  { ticker: "JNJ",   name: "Johnson & Johnson",          score: 66, sector: "Healthcare" },
  { ticker: "MA",    name: "Mastercard Inc.",            score: 78, sector: "Financial Services" },
  { ticker: "COST",  name: "Costco Wholesale",           score: 64, sector: "Consumer Defensive" },
  { ticker: "NKE",   name: "Nike Inc.",                  score: 58, sector: "Consumer Cyclical" },
  { ticker: "MCD",   name: "McDonald's Corporation",     score: 61, sector: "Consumer Cyclical" },
  { ticker: "AMZN",  name: "Amazon.com Inc.",            score: 55, sector: "Consumer Cyclical" },
  { ticker: "GOOGL", name: "Alphabet Inc.",              score: 70, sector: "Technology" },
  { ticker: "META",  name: "Meta Platforms",             score: 67, sector: "Technology" },
  { ticker: "BRK-B", name: "Berkshire Hathaway",         score: 55, sector: "Financial Services" },
  { ticker: "WMT",   name: "Walmart Inc.",               score: 59, sector: "Consumer Defensive" },
  { ticker: "HD",    name: "Home Depot",                 score: 62, sector: "Consumer Cyclical" },
  { ticker: "TSLA",  name: "Tesla Inc.",                 score: 42, sector: "Consumer Cyclical" },
  { ticker: "NVDA",  name: "NVIDIA Corporation",         score: 71, sector: "Technology" },
  { ticker: "UNH",   name: "UnitedHealth Group",         score: 65, sector: "Healthcare" },
  { ticker: "BAC",   name: "Bank of America",            score: 48, sector: "Financial Services" },
  { ticker: "JPM",   name: "JPMorgan Chase",             score: 52, sector: "Financial Services" },
  { ticker: "CVX",   name: "Chevron Corporation",        score: 57, sector: "Energy" },
  { ticker: "XOM",   name: "Exxon Mobil",                score: 54, sector: "Energy" },
  { ticker: "PEP",   name: "PepsiCo Inc.",               score: 67, sector: "Consumer Defensive" },
  { ticker: "ABBV",  name: "AbbVie Inc.",                score: 63, sector: "Healthcare" },
  { ticker: "TMO",   name: "Thermo Fisher Scientific",   score: 60, sector: "Healthcare" },
  { ticker: "ADBE",  name: "Adobe Inc.",                 score: 69, sector: "Technology" },
  { ticker: "CRM",   name: "Salesforce Inc.",            score: 44, sector: "Technology" },
  { ticker: "NFLX",  name: "Netflix Inc.",               score: 51, sector: "Communication Services" },
  { ticker: "DIS",   name: "The Walt Disney Company",    score: 38, sector: "Communication Services" },
  { ticker: "GME",   name: "GameStop Corp.",             score: 31, sector: "Consumer Cyclical" },
  { ticker: "AMC",   name: "AMC Entertainment",          score: 12, sector: "Communication Services" },
  { ticker: "INTC",  name: "Intel Corporation",          score: 35, sector: "Technology" },
  { ticker: "T",     name: "AT&T Inc.",                  score: 33, sector: "Communication Services" },
];

export function findSimilarStocks(
  currentTicker: string,
  currentScore: number,
  count = 4,
): ScoredStock[] {
  return SCORED_UNIVERSE
    .filter((s) => s.ticker !== currentTicker.toUpperCase())
    .sort((a, b) => Math.abs(a.score - currentScore) - Math.abs(b.score - currentScore))
    .slice(0, count);
}
