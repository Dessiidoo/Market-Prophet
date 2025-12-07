import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { marketService } from "./market-service";
import { insertPortfolioSchema, insertTradeSchema, insertWithdrawalSchema } from "@shared/schema";
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
      const portfolioId = session.metadata?.portfolioId;
      
      if (session.payment_status === 'paid' && portfolioId) {
        await storage.markPaymentCompleted(portfolioId);
      }
      
      res.json({ 
        status: session.payment_status,
        portfolioId: portfolioId,
        amount: session.metadata?.investmentAmount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/connect/onboard", async (req, res) => {
    try {
      const { portfolioId } = req.body;
      
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }

      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      let connectAccountId = portfolio.stripeConnectAccountId;

      if (!connectAccountId) {
        const account = await stripeService.createConnectAccount(portfolioId);
        connectAccountId = account.id;
        await storage.updatePortfolioConnectAccount(portfolioId, connectAccountId, false);
      }

      const host = req.get('host');
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;
      
      const accountLink = await stripeService.createConnectOnboardingLink(
        connectAccountId,
        `${baseUrl}/?connect=refresh&portfolioId=${portfolioId}`,
        `${baseUrl}/?connect=complete&portfolioId=${portfolioId}`
      );

      res.json({ url: accountLink.url, accountId: connectAccountId });
    } catch (error: any) {
      console.error("Connect onboarding error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connect/status/:portfolioId", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      if (!portfolio.stripeConnectAccountId) {
        return res.json({ 
          hasConnectAccount: false, 
          onboardingComplete: false,
          canWithdraw: false 
        });
      }

      const account = await stripeService.getConnectAccount(portfolio.stripeConnectAccountId);
      const detailsSubmitted = account.details_submitted;
      const payoutsEnabled = account.payouts_enabled;
      const onboardingComplete = detailsSubmitted === true;
      const canWithdraw = detailsSubmitted === true && payoutsEnabled === true;

      if (onboardingComplete && portfolio.connectOnboardingComplete !== "true") {
        await storage.updatePortfolioConnectAccount(
          req.params.portfolioId, 
          portfolio.stripeConnectAccountId, 
          true
        );
      }

      res.json({ 
        hasConnectAccount: true,
        onboardingComplete,
        canWithdraw,
        accountId: portfolio.stripeConnectAccountId
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/withdraw", async (req, res) => {
    try {
      const { portfolioId, amount } = req.body;
      
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }
      
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }

      if (!portfolio.stripeConnectAccountId) {
        return res.status(400).json({ error: "No bank account connected. Please complete onboarding first." });
      }

      const account = await stripeService.getConnectAccount(portfolio.stripeConnectAccountId);
      if (!account.payouts_enabled) {
        return res.status(400).json({ error: "Bank account not fully verified. Please complete onboarding." });
      }

      if (amount > portfolio.currentValue) {
        return res.status(400).json({ error: "Insufficient balance for withdrawal" });
      }

      const withdrawal = await storage.createWithdrawal({
        portfolioId,
        amount,
        status: "processing"
      });

      try {
        const transfer = await stripeService.createPayout(
          portfolio.stripeConnectAccountId,
          amount,
          portfolioId
        );

        await storage.updateWithdrawalStatus(withdrawal.id, "completed", transfer.id);

        const newValue = portfolio.currentValue - amount;
        await storage.updatePortfolioValue(portfolioId, newValue);

        res.json({ 
          success: true, 
          withdrawalId: withdrawal.id,
          transferId: transfer.id,
          newBalance: newValue
        });
      } catch (transferError: any) {
        await storage.updateWithdrawalStatus(withdrawal.id, "failed");
        throw transferError;
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/withdrawals/:portfolioId", async (req, res) => {
    try {
      const withdrawals = await storage.getWithdrawalsByPortfolio(req.params.portfolioId);
      res.json(withdrawals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
