import { 
  type User, 
  type InsertUser,
  type Portfolio,
  type InsertPortfolio,
  type Trade,
  type InsertTrade,
  type MarketCache,
  type InsertMarketCache,
  type Withdrawal,
  type InsertWithdrawal,
  users,
  portfolios,
  trades,
  marketCache,
  withdrawals,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, lt, gt } from "drizzle-orm";
import pg from "pg";

const { Pool } = pg;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  updatePortfolioValue(id: string, currentValue: number): Promise<Portfolio | undefined>;
  updatePortfolioConnectAccount(id: string, connectAccountId: string, onboardingComplete: boolean): Promise<Portfolio | undefined>;
  
  createTrade(trade: InsertTrade): Promise<Trade>;
  getTradesByPortfolio(portfolioId: string): Promise<Trade[]>;
  getRecentTrades(limit: number): Promise<Trade[]>;
  
  getMarketCache(symbol: string): Promise<MarketCache | undefined>;
  setMarketCache(cache: InsertMarketCache): Promise<MarketCache>;
  cleanExpiredCache(): Promise<void>;
  
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawalsByPortfolio(portfolioId: string): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: string, status: string, stripePayoutId?: string): Promise<Withdrawal | undefined>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(pool);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const result = await this.db.insert(portfolios).values(portfolio).returning();
    return result[0];
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const result = await this.db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
    return result[0];
  }

  async updatePortfolioValue(id: string, currentValue: number): Promise<Portfolio | undefined> {
    const result = await this.db
      .update(portfolios)
      .set({ currentValue, updatedAt: new Date() })
      .where(eq(portfolios.id, id))
      .returning();
    return result[0];
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const result = await this.db.insert(trades).values(trade).returning();
    return result[0];
  }

  async getTradesByPortfolio(portfolioId: string): Promise<Trade[]> {
    return await this.db
      .select()
      .from(trades)
      .where(eq(trades.portfolioId, portfolioId))
      .orderBy(desc(trades.timestamp));
  }

  async getRecentTrades(limit: number): Promise<Trade[]> {
    return await this.db
      .select()
      .from(trades)
      .orderBy(desc(trades.timestamp))
      .limit(limit);
  }

  async getMarketCache(symbol: string): Promise<MarketCache | undefined> {
    const now = new Date();
    const result = await this.db
      .select()
      .from(marketCache)
      .where(and(eq(marketCache.symbol, symbol), gt(marketCache.expiresAt, now)))
      .limit(1);
    return result[0];
  }

  async setMarketCache(cache: InsertMarketCache): Promise<MarketCache> {
    const result = await this.db.insert(marketCache).values(cache).returning();
    return result[0];
  }

  async cleanExpiredCache(): Promise<void> {
    const now = new Date();
    await this.db.delete(marketCache).where(lt(marketCache.expiresAt, now));
  }

  async updatePortfolioConnectAccount(id: string, connectAccountId: string, onboardingComplete: boolean): Promise<Portfolio | undefined> {
    const result = await this.db
      .update(portfolios)
      .set({ 
        stripeConnectAccountId: connectAccountId, 
        connectOnboardingComplete: onboardingComplete ? "true" : "false",
        updatedAt: new Date() 
      })
      .where(eq(portfolios.id, id))
      .returning();
    return result[0];
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const result = await this.db.insert(withdrawals).values(withdrawal).returning();
    return result[0];
  }

  async getWithdrawalsByPortfolio(portfolioId: string): Promise<Withdrawal[]> {
    return await this.db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.portfolioId, portfolioId))
      .orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawalStatus(id: string, status: string, stripePayoutId?: string): Promise<Withdrawal | undefined> {
    const updateData: any = { status };
    if (stripePayoutId) {
      updateData.stripePayoutId = stripePayoutId;
    }
    const result = await this.db
      .update(withdrawals)
      .set(updateData)
      .where(eq(withdrawals.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
