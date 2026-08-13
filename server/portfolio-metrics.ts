import type { Portfolio } from "@shared/schema";

export interface PortfolioMetrics {
  initialInvestment: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  isProfitable: boolean;
}

/**
 * Calculates portfolio performance from persisted portfolio values.
 * No projections or simulated returns are introduced here.
 */
export function calculatePortfolioMetrics(portfolio: Portfolio): PortfolioMetrics {
  const initialInvestment = Number(portfolio.initialInvestment);
  const currentValue = Number(portfolio.currentValue);
  const totalReturn = currentValue - initialInvestment;
  const totalReturnPercent = initialInvestment > 0
    ? (totalReturn / initialInvestment) * 100
    : 0;

  return {
    initialInvestment,
    currentValue,
    totalReturn,
    totalReturnPercent,
    isProfitable: totalReturn > 0,
  };
}
