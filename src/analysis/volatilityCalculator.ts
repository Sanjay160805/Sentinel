import { VOLATILITY_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";

export interface VolatilityResult {
  realized: number;
  isHigh: boolean;
  level: "LOW" | "MEDIUM" | "HIGH";
  trend: "INCREASING" | "DECREASING" | "STABLE";
}

// In-memory price history — built up across agent cycles
const priceHistory: { price: number; timestamp: number }[] = [];

export function recordPrice(price: number) {
  priceHistory.push({ price, timestamp: Date.now() });
  if (priceHistory.length > 100) priceHistory.shift();
}

export function getPriceHistory() {
  return [...priceHistory];
}

export function calculateRealizedVolatility(): number {
  if (priceHistory.length < 2) return 0;
  const prices = priceHistory.slice(-20).map(p => p.price);
  const returns = prices.slice(1).map((p, i) => Math.log(p / prices[i]));
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

export function calculateVolatility(): VolatilityResult {
  try {
    const vol = calculateRealizedVolatility();
    const history = getPriceHistory();
    let trend: "INCREASING" | "DECREASING" | "STABLE" = "STABLE";
    if (history.length >= 10) {
      const recent = history.slice(-5);
      const older = history.slice(-10, -5);
      const recentAvg = recent.reduce((s, p) => s + p.price, 0) / 5;
      const olderAvg = older.reduce((s, p) => s + p.price, 0) / 5;
      const change = (recentAvg - olderAvg) / olderAvg;
      if (change > 0.01) trend = "INCREASING";
      else if (change < -0.01) trend = "DECREASING";
    }
    return {
      realized: vol,
      isHigh: vol > VOLATILITY_THRESHOLD,
      level: vol > VOLATILITY_THRESHOLD * 2 ? "HIGH" : vol > VOLATILITY_THRESHOLD ? "MEDIUM" : "LOW",
      trend,
    };
  } catch (error) {
    logger.error("Volatility calculation failed", error);
    return { realized: 0, isHigh: false, level: "LOW", trend: "STABLE" };
  }
}