import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { marketService } from "./market-service";
import { insertPortfolioSchema, insertTradeSchema } from "@shared/schema";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/portfolio", async (req, res) => {
    try {
      const validated = insertPortfolioSchema.parse(req.body);
      const portfolio = await storage.createPortfolio(validated);
      res.json(portfolio);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/portfolio/:id", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/portfolio/:id/value", async (req, res) => {
    try {
      const { currentValue } = req.body;
      if (typeof currentValue !== "number") {
        return res.status(400).json({ error: "currentValue must be a number" });
      }
      const portfolio = await storage.updatePortfolioValue(req.params.id, currentValue);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trades/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const trades = await storage.getRecentTrades(limit);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trades/portfolio/:portfolioId", async (req, res) => {
    try {
      const trades = await storage.getTradesByPortfolio(req.params.portfolioId);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/market/quote/:symbol", async (req, res) => {
    try {
      const quote = await marketService.fetchQuote(req.params.symbol);
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/market/signals", async (req, res) => {
    try {
      const { symbols, portfolioId } = req.body;
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: "symbols must be a non-empty array" });
      }
      
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }
      
      const signals = await marketService.getTradeSignals(symbols, portfolioId);
      res.json(signals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cache/cleanup", async (req, res) => {
    try {
      await marketService.cleanupCache();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/initialize", async (req, res) => {
    try {
      const { portfolioId } = req.body;
      
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }
      
      const symbols = ["NVDA", "TSLA", "AAPL", "AMD"];
      const signals = await marketService.getTradeSignals(symbols, portfolioId);
      
      res.json({ 
        success: true, 
        signalsGenerated: signals.length,
        signals 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const { amount, portfolioId } = req.body;
      
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }

      const host = req.get('host');
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;
      
      const session = await stripeService.createCheckoutSession(
        amount,
        portfolioId,
        `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/?payment=cancelled`
      );
      
      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/checkout/session/:sessionId", async (req, res) => {
    try {
      const session = await stripeService.getSession(req.params.sessionId);
      res.json({ 
        status: session.payment_status,
        portfolioId: session.metadata?.portfolioId,
        amount: session.metadata?.investmentAmount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
