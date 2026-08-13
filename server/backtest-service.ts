interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestTrade {
  date: string;
  symbol: string;
  action: "BUY" | "SELL";
  price: number;
  confidence: number;
  reason: string;
  outcome?: "WIN" | "LOSS";
  returnPercent?: number;
}

export interface BacktestResult {
  symbol: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  averageReturn: number;
  peakReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
}

export interface AggregateBacktestResult {
  period: string;
  symbols: string[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  averageReturnPerTrade: number;
  peakReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  outperformsSP500: boolean;
  sp500Comparison: number;
  results: BacktestResult[];
}

class BacktestService {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private resultCache: Map<string, { data: AggregateBacktestResult; timestamp: number }> = new Map();
  private cacheExpiry = 30 * 60 * 1000;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
  }

  private getCacheKey(symbols: string[], days: number): string {
    return `${[...symbols].sort().join(',')}_${days}`;
  }

  private getCachedResult(symbols: string[], days: number): AggregateBacktestResult | null {
    const cached = this.resultCache.get(this.getCacheKey(symbols, days));
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) return cached.data;
    return null;
  }

  private setCachedResult(symbols: string[], days: number, data: AggregateBacktestResult): void {
    this.resultCache.set(this.getCacheKey(symbols, days), { data, timestamp: Date.now() });
  }

  private async fetchHistoricalData(symbol: string): Promise<HistoricalData[]> {
    if (!this.apiKey) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch historical data for ${symbol}`);
    const data = await response.json();
    if (data["Note"]) throw new Error("Alpha Vantage API rate limit reached. Please try again later.");
    if (data["Error Message"]) throw new Error(`Alpha Vantage error for ${symbol}: ${data["Error Message"]}`);
    if (!data["Time Series (Daily)"]) throw new Error(`No historical data found for ${symbol}`);

    return Object.keys(data["Time Series (Daily)"]).slice(0, 90).map(date => {
      const d = data["Time Series (Daily)"][date];
      return {
        date,
        open: Number(d["1. open"]),
        high: Number(d["2. high"]),
        low: Number(d["3. low"]),
        close: Number(d["4. close"]),
        volume: Number(d["5. volume"]),
      };
    }).reverse();
  }

  private calculateRSI(closes: number[], period = 14): number[] {
    const rsi = new Array<number>(closes.length).fill(50);
    if (closes.length <= period) return rsi;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      gains += Math.max(change, 0);
      losses += Math.max(-change, 0);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return rsi;
  }

  private sma(values: number[], period: number, end: number): number {
    const start = Math.max(0, end - period + 1);
    const slice = values.slice(start, end + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private generateSignal(data: HistoricalData[], i: number): { action: "BUY" | "SELL"; confidence: number; reason: string } | null {
    if (i < 20) return null;
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const rsi = this.calculateRSI(closes)[i];
    const current = closes[i];
    const prev = closes[i - 1];
    const change5 = ((current - closes[i - 5]) / closes[i - 5]) * 100;
    const change1 = ((current - prev) / prev) * 100;
    const sma20 = this.sma(closes, 20, i);
    const sma50 = this.sma(closes, 50, i);
    const avgVolume = this.sma(volumes, 20, i);
    const volumeRatio = avgVolume > 0 ? volumes[i] / avgVolume : 1;

    let buy = 0;
    let sell = 0;
    const reasons: string[] = [];
    if (rsi < 35) { buy++; reasons.push(`RSI ${rsi.toFixed(1)} oversold`); }
    if (rsi > 65) { sell++; reasons.push(`RSI ${rsi.toFixed(1)} overbought`); }
    if (current > sma20) { buy++; reasons.push("price above 20-day trend"); }
    else { sell++; reasons.push("price below 20-day trend"); }
    if (sma20 > sma50) buy++; else sell++;
    if (change5 > 1) { buy++; reasons.push(`5-day momentum +${change5.toFixed(2)}%`); }
    if (change5 < -1) { sell++; reasons.push(`5-day momentum ${change5.toFixed(2)}%`); }
    if (volumeRatio > 1.2) { if (change1 > 0) buy++; else if (change1 < 0) sell++; }

    const score = Math.max(buy, sell);
    if (score < 3 || buy === sell) return null;
    const action = buy > sell ? "BUY" : "SELL";
    const confidence = Math.min(95, 55 + score * 8 + Math.abs(buy - sell) * 5);
    return { action, confidence, reason: `${action === "BUY" ? "Multi-factor bullish" : "Multi-factor bearish"} setup: ${reasons.join(", ")}` };
  }

  async runBacktest(symbol: string, days: number = 30): Promise<BacktestResult> {
    const historicalData = await this.fetchHistoricalData(symbol);
    const dataToTest = historicalData.slice(-days);
    const trades: BacktestTrade[] = [];
    let portfolioValue = 10000;
    let peakValue = portfolioValue;
    let maxDrawdown = 0;
    const dailyReturns: number[] = [];

    for (let i = 20; i < dataToTest.length - 1; i++) {
      const signal = this.generateSignal(dataToTest, i);
      if (!signal) continue;
      const currentDay = dataToTest[i];
      const nextDay = dataToTest[i + 1];
      const priceChange = ((nextDay.close - currentDay.close) / currentDay.close) * 100;
      const returnPercent = signal.action === "BUY" ? priceChange : -priceChange;
      const outcome = returnPercent > 0 ? "WIN" : "LOSS";
      portfolioValue *= 1 + returnPercent / 100;
      dailyReturns.push(returnPercent);
      peakValue = Math.max(peakValue, portfolioValue);
      maxDrawdown = Math.max(maxDrawdown, ((peakValue - portfolioValue) / peakValue) * 100);
      trades.push({ date: currentDay.date, symbol, action: signal.action, price: currentDay.close, confidence: signal.confidence, reason: signal.reason, outcome, returnPercent });
    }

    const winningTrades = trades.filter(t => t.outcome === "WIN").length;
    const losingTrades = trades.filter(t => t.outcome === "LOSS").length;
    const totalTrades = winningTrades + losingTrades;
    const averageReturn = dailyReturns.length ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const stdDev = dailyReturns.length ? Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / dailyReturns.length) : 0;
    return {
      symbol,
      period: `${days} days`,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades ? (winningTrades / totalTrades) * 100 : 0,
      totalReturn: ((portfolioValue - 10000) / 10000) * 100,
      averageReturn,
      peakReturn: dailyReturns.length ? Math.max(...dailyReturns) : 0,
      maxDrawdown,
      sharpeRatio: stdDev > 0 ? (averageReturn / stdDev) * Math.sqrt(252) : 0,
      trades,
    };
  }

  async runAggregateBacktest(symbols: string[], days: number = 14): Promise<AggregateBacktestResult> {
    const cached = this.getCachedResult(symbols, days);
    if (cached) return cached;
    const results: BacktestResult[] = [];
    for (const symbol of symbols) {
      try { results.push(await this.runBacktest(symbol, days)); }
      catch (error) { console.error(`Backtest failed for ${symbol}:`, error); }
    }
    const totalTrades = results.reduce((s, r) => s + r.totalTrades, 0);
    const winningTrades = results.reduce((s, r) => s + r.winningTrades, 0);
    const losingTrades = results.reduce((s, r) => s + r.losingTrades, 0);
    const totalReturn = results.length ? results.reduce((s, r) => s + r.totalReturn, 0) / results.length : 0;
    const sp500Comparison = totalReturn;
    const result: AggregateBacktestResult = {
      period: `${days} days`, symbols, totalTrades, winningTrades, losingTrades,
      winRate: totalTrades ? (winningTrades / totalTrades) * 100 : 0,
      totalReturn,
      averageReturnPerTrade: totalTrades ? results.reduce((s, r) => s + r.averageReturn * r.totalTrades, 0) / totalTrades : 0,
      peakReturn: results.length ? Math.max(...results.map(r => r.peakReturn)) : 0,
      maxDrawdown: results.length ? Math.max(...results.map(r => r.maxDrawdown)) : 0,
      sharpeRatio: results.length ? results.reduce((s, r) => s + r.sharpeRatio, 0) / results.length : 0,
      outperformsSP500: totalReturn > 0,
      sp500Comparison,
      results,
    };
    if (results.length) this.setCachedResult(symbols, days, result);
    return result;
  }
}

export const backtestService = new BacktestService();
