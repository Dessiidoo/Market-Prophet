import { storage } from "./storage";

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface TradeSignal {
  symbol: string;
  action: "BUY" | "SELL";
  confidence: number;
  price: number;
  reason: string;
}

interface DailyBar {
  date: string;
  close: number;
  volume: number;
}

class MarketService {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private rateLimitDelay = 12000;
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
    if (!this.apiKey) {
      console.warn("ALPHA_VANTAGE_API_KEY not set - market data will be unavailable");
    }
  }

  private async rateLimitedFetch(url: string): Promise<any> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchQuote(symbol: string): Promise<QuoteData> {
    const cached = await storage.getMarketCache(symbol);
    if (cached) {
      return JSON.parse(cached.data);
    }

    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
    const data = await this.rateLimitedFetch(url);

    if (!data["Global Quote"] || Object.keys(data["Global Quote"]).length === 0) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }

    const quote = data["Global Quote"];
    const quoteData: QuoteData = {
      symbol: quote["01. symbol"],
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      volume: parseInt(quote["06. volume"], 10),
      timestamp: new Date(quote["07. latest trading day"]),
    };

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);
    await storage.setMarketCache({
      symbol,
      data: JSON.stringify(quoteData),
      expiresAt,
    });

    return quoteData;
  }

  async getTradeSignals(symbols: string[], portfolioId: string): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    for (const symbol of symbols) {
      try {
        const quote = await this.fetchQuote(symbol);
        const indicators = await this.getTechnicalIndicators(symbol);
        const signal = this.generateSignal(quote, indicators, symbol);

        if (signal) {
          signals.push(signal);
          await storage.createTrade({
            portfolioId,
            symbol: signal.symbol,
            action: signal.action,
            confidence: signal.confidence,
            price: signal.price,
            reason: signal.reason,
          });
        }
      } catch (error) {
        console.error(`Error generating signal for ${symbol}:`, error);
      }
    }

    return signals;
  }

  private async getTechnicalIndicators(symbol: string): Promise<{
    rsi: number;
    sma20: number;
    sma50: number;
    momentum5: number;
    volumeRatio: number;
  }> {
    const cacheKey = `${symbol}_TECHNICAL_V2`;
    const cached = await storage.getMarketCache(cacheKey);
    if (cached) {
      return JSON.parse(cached.data);
    }

    const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${this.apiKey}`;
    const data = await this.rateLimitedFetch(url);
    const series = data["Time Series (Daily)"];

    if (!series) {
      throw new Error(`No historical data found for symbol: ${symbol}`);
    }

    const bars: DailyBar[] = Object.entries(series)
      .slice(0, 60)
      .map(([date, value]: [string, any]) => ({
        date,
        close: parseFloat(value["4. close"]),
        volume: parseInt(value["5. volume"], 10),
      }));

    const closes = bars.map(bar => bar.close);
    const volumes = bars.map(bar => bar.volume);

    const sma = (values: number[], period: number): number => {
      const sample = values.slice(0, period);
      return sample.length ? sample.reduce((sum, value) => sum + value, 0) / sample.length : values[0];
    };

    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 0; i < Math.min(14, closes.length - 1); i++) {
      const change = closes[i] - closes[i + 1];
      if (change >= 0) gains.push(change);
      else losses.push(Math.abs(change));
    }

    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / 14 : 0;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    const latestClose = closes[0];
    const momentum5 = closes.length > 5 ? ((latestClose - closes[5]) / closes[5]) * 100 : 0;
    const avgVolume20 = sma(volumes, 20);
    const volumeRatio = avgVolume20 > 0 ? volumes[0] / avgVolume20 : 1;

    const indicators = {
      rsi,
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      momentum5,
      volumeRatio,
    };

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    await storage.setMarketCache({
      symbol: cacheKey,
      data: JSON.stringify(indicators),
      expiresAt,
    });

    return indicators;
  }

  private generateSignal(
    quote: QuoteData,
    indicators: {
      rsi: number;
      sma20: number;
      sma50: number;
      momentum5: number;
      volumeRatio: number;
    },
    symbol: string,
  ): TradeSignal | null {
    const { price, changePercent } = quote;
    const { rsi, sma20, sma50, momentum5, volumeRatio } = indicators;

    let buyScore = 0;
    let sellScore = 0;
    const reasons: string[] = [];

    if (rsi < 35) {
      buyScore += 2;
      reasons.push(`RSI ${rsi.toFixed(1)} is oversold`);
    } else if (rsi > 65) {
      sellScore += 2;
      reasons.push(`RSI ${rsi.toFixed(1)} is overbought`);
    }

    if (price > sma20 && sma20 > sma50) {
      buyScore += 2;
      reasons.push("price is above rising short/medium trend");
    } else if (price < sma20 && sma20 < sma50) {
      sellScore += 2;
      reasons.push("price is below falling short/medium trend");
    }

    if (momentum5 > 2) {
      buyScore += 1;
      reasons.push(`5-day momentum +${momentum5.toFixed(1)}%`);
    } else if (momentum5 < -2) {
      sellScore += 1;
      reasons.push(`5-day momentum ${momentum5.toFixed(1)}%`);
    }

    if (volumeRatio >= 1.25) {
      if (buyScore > sellScore) {
        buyScore += 1;
        reasons.push("volume is elevated");
      } else if (sellScore > buyScore) {
        sellScore += 1;
        reasons.push("selling volume is elevated");
      }
    }

    if (changePercent > 5) {
      buyScore += 1;
      reasons.push(`strong daily momentum +${changePercent.toFixed(2)}%`);
    } else if (changePercent < -5) {
      sellScore += 1;
      reasons.push(`strong daily decline ${changePercent.toFixed(2)}%`);
    }

    const winningScore = Math.max(buyScore, sellScore);
    const minimumScore = 4;

    if (winningScore < minimumScore || buyScore === sellScore) {
      return null;
    }

    const action: "BUY" | "SELL" = buyScore > sellScore ? "BUY" : "SELL";
    const confidence = Math.min(97, 55 + winningScore * 7 + Math.min(10, Math.abs(buyScore - sellScore) * 3));

    return {
      symbol,
      action,
      confidence,
      price,
      reason: `${action === "BUY" ? "Multi-factor bullish setup" : "Multi-factor bearish setup"}: ${reasons.join("; ")}`,
    };
  }

  async cleanupCache(): Promise<void> {
    await storage.cleanExpiredCache();
  }
}

export const marketService = new MarketService();
