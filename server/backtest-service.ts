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

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
  }

  private async fetchHistoricalData(symbol: string): Promise<HistoricalData[]> {
    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${this.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }

    const data = await response.json();
    
    if (data["Note"]) {
      throw new Error("Alpha Vantage API rate limit reached. Please try again later.");
    }

    if (!data["Time Series (Daily)"]) {
      throw new Error(`No historical data found for ${symbol}`);
    }

    const timeSeries = data["Time Series (Daily)"];
    const historicalData: HistoricalData[] = [];

    for (const date of Object.keys(timeSeries).slice(0, 90)) {
      const dayData = timeSeries[date];
      historicalData.push({
        date,
        open: parseFloat(dayData["1. open"]),
        high: parseFloat(dayData["2. high"]),
        low: parseFloat(dayData["3. low"]),
        close: parseFloat(dayData["4. close"]),
        volume: parseInt(dayData["5. volume"]),
      });
    }

    return historicalData.reverse();
  }

  private async fetchRSIData(symbol: string): Promise<Map<string, number>> {
    const url = `${this.baseUrl}?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`;
    
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSI data for ${symbol}`);
    }

    const data = await response.json();
    
    if (data["Note"]) {
      throw new Error("Alpha Vantage API rate limit reached");
    }

    const rsiMap = new Map<string, number>();
    
    if (data["Technical Analysis: RSI"]) {
      const rsiData = data["Technical Analysis: RSI"];
      for (const date of Object.keys(rsiData)) {
        rsiMap.set(date, parseFloat(rsiData[date]["RSI"]));
      }
    }

    return rsiMap;
  }

  private generateSignal(
    currentPrice: number,
    prevPrice: number,
    rsi: number,
    symbol: string
  ): { action: "BUY" | "SELL"; confidence: number; reason: string } | null {
    const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;

    if (rsi < 30 && changePercent > 0) {
      return {
        action: "BUY",
        confidence: Math.min(95, 70 + (30 - rsi)),
        reason: `Oversold (RSI: ${rsi.toFixed(1)}) with positive momentum (+${changePercent.toFixed(2)}%)`,
      };
    }

    if (rsi > 70 && changePercent < 0) {
      return {
        action: "SELL",
        confidence: Math.min(95, 70 + (rsi - 70)),
        reason: `Overbought (RSI: ${rsi.toFixed(1)}) with negative momentum (${changePercent.toFixed(2)}%)`,
      };
    }

    if (changePercent > 3) {
      return {
        action: "BUY",
        confidence: Math.min(92, 75 + changePercent),
        reason: `Strong upward momentum (+${changePercent.toFixed(2)}%), RSI: ${rsi.toFixed(1)}`,
      };
    }

    if (changePercent < -3) {
      return {
        action: "SELL",
        confidence: Math.min(88, 70 + Math.abs(changePercent)),
        reason: `Strong downward trend (${changePercent.toFixed(2)}%), protecting capital`,
      };
    }

    return null;
  }

  async runBacktest(symbol: string, days: number = 30): Promise<BacktestResult> {
    const historicalData = await this.fetchHistoricalData(symbol);
    const rsiData = await this.fetchRSIData(symbol);
    
    const dataToTest = historicalData.slice(-days);
    const trades: BacktestTrade[] = [];
    let portfolioValue = 10000;
    let peakValue = 10000;
    let maxDrawdown = 0;
    const dailyReturns: number[] = [];

    for (let i = 1; i < dataToTest.length; i++) {
      const currentDay = dataToTest[i];
      const prevDay = dataToTest[i - 1];
      const rsi = rsiData.get(currentDay.date) || 50;

      const signal = this.generateSignal(
        currentDay.close,
        prevDay.close,
        rsi,
        symbol
      );

      if (signal) {
        const nextDayIndex = i + 1;
        let outcome: "WIN" | "LOSS" | undefined;
        let returnPercent: number | undefined;

        if (nextDayIndex < dataToTest.length) {
          const nextDay = dataToTest[nextDayIndex];
          const priceChange = ((nextDay.close - currentDay.close) / currentDay.close) * 100;

          if (signal.action === "BUY") {
            returnPercent = priceChange;
            outcome = priceChange > 0 ? "WIN" : "LOSS";
          } else {
            returnPercent = -priceChange;
            outcome = priceChange < 0 ? "WIN" : "LOSS";
          }

          portfolioValue *= (1 + (returnPercent || 0) / 100);
          dailyReturns.push(returnPercent || 0);

          if (portfolioValue > peakValue) {
            peakValue = portfolioValue;
          }
          const drawdown = ((peakValue - portfolioValue) / peakValue) * 100;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }

        trades.push({
          date: currentDay.date,
          symbol,
          action: signal.action,
          price: currentDay.close,
          confidence: signal.confidence,
          reason: signal.reason,
          outcome,
          returnPercent,
        });
      }
    }

    const winningTrades = trades.filter(t => t.outcome === "WIN").length;
    const losingTrades = trades.filter(t => t.outcome === "LOSS").length;
    const totalTrades = winningTrades + losingTrades;

    const avgReturn = dailyReturns.length > 0 
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length 
      : 0;
    
    const stdDev = dailyReturns.length > 0
      ? Math.sqrt(dailyReturns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / dailyReturns.length)
      : 1;
    
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    const peakReturn = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0;

    return {
      symbol,
      period: `${days} days`,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      totalReturn: ((portfolioValue - 10000) / 10000) * 100,
      averageReturn: avgReturn,
      peakReturn,
      maxDrawdown,
      sharpeRatio,
      trades,
    };
  }

  async runAggregateBacktest(symbols: string[], days: number = 14): Promise<AggregateBacktestResult> {
    const results: BacktestResult[] = [];

    for (const symbol of symbols) {
      try {
        const result = await this.runBacktest(symbol, days);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 12000));
      } catch (error) {
        console.error(`Backtest failed for ${symbol}:`, error);
      }
    }

    const totalTrades = results.reduce((sum, r) => sum + r.totalTrades, 0);
    const winningTrades = results.reduce((sum, r) => sum + r.winningTrades, 0);
    const losingTrades = results.reduce((sum, r) => sum + r.losingTrades, 0);
    
    const avgTotalReturn = results.length > 0
      ? results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length
      : 0;
    
    const avgWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgReturnPerTrade = totalTrades > 0
      ? results.reduce((sum, r) => sum + r.averageReturn * r.totalTrades, 0) / totalTrades
      : 0;
    
    const peakReturn = results.length > 0 ? Math.max(...results.map(r => r.peakReturn)) : 0;
    const maxDrawdown = results.length > 0 ? Math.max(...results.map(r => r.maxDrawdown)) : 0;
    const avgSharpe = results.length > 0
      ? results.reduce((sum, r) => sum + r.sharpeRatio, 0) / results.length
      : 0;

    const sp500AvgReturn = 0.04 * (days / 365) * 100;
    const outperformsSP500 = avgTotalReturn > sp500AvgReturn;
    const sp500Comparison = avgTotalReturn - sp500AvgReturn;

    return {
      period: `${days} days`,
      symbols,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: avgWinRate,
      totalReturn: avgTotalReturn,
      averageReturnPerTrade: avgReturnPerTrade,
      peakReturn,
      maxDrawdown,
      sharpeRatio: avgSharpe,
      outperformsSP500,
      sp500Comparison,
      results,
    };
  }
}

export const backtestService = new BacktestService();
