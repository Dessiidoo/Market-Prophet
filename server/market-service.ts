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
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
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
      const data = JSON.parse(cached.data);
      return data;
    }

    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
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
      volume: parseInt(quote["06. volume"]),
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

  private async getTechnicalIndicators(symbol: string): Promise<any> {
    const cacheKey = `${symbol}_RSI`;
    const cached = await storage.getMarketCache(cacheKey);
    if (cached) {
      return JSON.parse(cached.data);
    }

    const url = `${this.baseUrl}?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${this.apiKey}`;
    const data = await this.rateLimitedFetch(url);

    if (!data["Technical Analysis: RSI"]) {
      return { rsi: 50 };
    }

    const rsiData = data["Technical Analysis: RSI"];
    const latestDate = Object.keys(rsiData)[0];
    const rsi = parseFloat(rsiData[latestDate]["RSI"]);

    const indicators = { rsi, date: latestDate };

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);
    await storage.setMarketCache({
      symbol: cacheKey,
      data: JSON.stringify(indicators),
      expiresAt,
    });

    return indicators;
  }

  private generateSignal(quote: QuoteData, indicators: any, symbol: string): TradeSignal | null {
    const { rsi } = indicators;
    const { changePercent, price } = quote;

    if (rsi < 30 && changePercent > 0) {
      return {
        symbol,
        action: "BUY",
        confidence: Math.min(95, 70 + (30 - rsi)),
        price,
        reason: `Oversold (RSI: ${rsi.toFixed(1)}) with positive momentum (+${changePercent.toFixed(2)}%)`,
      };
    }

    if (rsi > 70 && changePercent < 0) {
      return {
        symbol,
        action: "SELL",
        confidence: Math.min(95, 70 + (rsi - 70)),
        price,
        reason: `Overbought (RSI: ${rsi.toFixed(1)}) with negative momentum (${changePercent.toFixed(2)}%)`,
      };
    }

    if (changePercent > 5) {
      return {
        symbol,
        action: "BUY",
        confidence: Math.min(92, 75 + changePercent),
        price,
        reason: `Strong upward momentum (+${changePercent.toFixed(2)}%), RSI: ${rsi.toFixed(1)}`,
      };
    }

    if (changePercent < -5) {
      return {
        symbol,
        action: "SELL",
        confidence: Math.min(88, 70 + Math.abs(changePercent)),
        price,
        reason: `Strong downward trend (${changePercent.toFixed(2)}%), protecting capital`,
      };
    }

    return null;
  }

  async cleanupCache(): Promise<void> {
    await storage.cleanExpiredCache();
  }
}

export const marketService = new MarketService();
