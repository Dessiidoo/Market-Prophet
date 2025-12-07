import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initialInvestment: real("initial_investment").notNull(),
  currentValue: real("current_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  connectOnboardingComplete: text("connect_onboarding_complete").default("false"),
  paymentCompleted: text("payment_completed").default("false"),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  updatedAt: true,
});

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull(),
  symbol: text("symbol").notNull(),
  action: text("action").notNull(), // BUY or SELL
  confidence: real("confidence").notNull(), // 0-100
  price: real("price").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  reason: text("reason"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  timestamp: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export const marketCache = pgTable("market_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  data: text("data").notNull(), // JSON stringified market data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertMarketCacheSchema = createInsertSchema(marketCache).omit({
  id: true,
  timestamp: true,
});

export type InsertMarketCache = z.infer<typeof insertMarketCacheSchema>;
export type MarketCache = typeof marketCache.$inferSelect;

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  stripePayoutId: text("stripe_payout_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  stripePayoutId: true,
});

export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
