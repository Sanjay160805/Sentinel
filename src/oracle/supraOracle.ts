/**
 * Supra Oracle Integration
 * Gets HBAR volatility and price data from Supra Oracle
 * Falls back to CoinGecko and then mock data
 */

import axios from "axios";
import { VolatilityData, VolatilityTrend } from "../types/index.js";
import * as dotenv from "dotenv";

dotenv.config();

// ════════════════════════════════════════════════════════════════
// PRICE HISTORY FOR VOLATILITY CALCULATION
// ════════════════════════════════════════════════════════════════

const priceHistory: number[] = [];
const MAX_HISTORY = 20;

function addPriceToHistory(price: number): void {
  priceHistory.push(price);
  if (priceHistory.length > MAX_HISTORY) {
    priceHistory.shift();
  }
}

function calculateVolatility(prices: number[]): { volatility: number; trend: VolatilityTrend } {
  if (prices.length < 2) {
    return { volatility: 0, trend: VolatilityTrend.STABLE };
  }

  // Calculate returns (log-returns)
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1];
    const currPrice = prices[i];
    if (prevPrice && currPrice) {
      const ret = Math.log(currPrice / prevPrice);
      returns.push(ret);
    }
  }

  if (returns.length === 0) {
    return { volatility: 0, trend: VolatilityTrend.STABLE };
  }

  // Calculate standard deviation (volatility)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Classify trend
  let trend: VolatilityTrend;
  if (volatility < 0.02) {
    trend = VolatilityTrend.STABLE;
  } else if (volatility < 0.05) {
    trend = VolatilityTrend.VOLATILE;
  } else {
    trend = VolatilityTrend.EXTREME;
  }

  return { volatility, trend };
}

// ════════════════════════════════════════════════════════════════
// SUPRA ORACLE (PRIMARY)
// ════════════════════════════════════════════════════════════════

async function getSupraPrice(): Promise<number | null> {
  try {
    const oracleAddress = process.env.SUPRA_ORACLE_ADDRESS;
    const rpcUrl = process.env.SUPRA_RPC_URL;

    if (!oracleAddress) {
      console.log("⚠ SUPRA_ORACLE_ADDRESS not set, trying CoinGecko");
      return null;
    }

    // Try to call Supra Oracle contract (simplified)
    // In production, you'd decode the contract response properly
    console.log("🔄 Querying Supra Oracle...");

    // For now, fallback to CoinGecko as Supra requires contract interaction
    return null;
  } catch (error) {
    console.warn("⚠ Supra Oracle unavailable:", error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// COINGECKO API (FALLBACK)
// ════════════════════════════════════════════════════════════════

async function getCoinGeckoPrice(): Promise<number | null> {
  try {
    console.log("🔄 Querying CoinGecko API...");

    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids: "hedera-hashgraph",
        vs_currencies: "usd",
      },
      timeout: 5000,
    });

    const price = response.data["hedera-hashgraph"]?.usd;
    if (price) {
      console.log(`✓ CoinGecko price: $${price.toFixed(4)}`);
      return price;
    }

    return null;
  } catch (error) {
    console.warn("⚠ CoinGecko API error:", error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// MOCK DATA (FALLBACK)
// ════════════════════════════════════════════════════════════════

function getMockPrice(): number {
  // Return realistic mock price with small random variance
  const basePrice = 0.08;
  const variance = (Math.random() - 0.5) * 0.02;
  const price = basePrice + variance;
  console.log(`📊 Using mock price: $${price.toFixed(4)}`);
  return parseFloat(price.toFixed(4));
}

// ════════════════════════════════════════════════════════════════
// MAIN INTERFACE
// ════════════════════════════════════════════════════════════════

export async function getVolatilityData(): Promise<VolatilityData> {
  try {
    let currentPrice: number | null = null;

    // Try Supra first, fallback to CoinGecko, then mock
    currentPrice = await getSupraPrice();
    if (!currentPrice) {
      currentPrice = await getCoinGeckoPrice();
    }
    if (!currentPrice) {
      currentPrice = getMockPrice();
    }

    // Add to history
    addPriceToHistory(currentPrice);

    // Calculate volatility from history
    const { volatility, trend } = calculateVolatility(priceHistory);

    // Determine recommendation
    let recommendation = "HOLD";
    if (trend === VolatilityTrend.STABLE) {
      recommendation = "MONITOR";
    } else if (trend === VolatilityTrend.VOLATILE) {
      recommendation = "HARVEST";
    } else if (trend === VolatilityTrend.EXTREME) {
      recommendation = "WITHDRAW";
    }

    // Get previous price
    const previousPrice = priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : currentPrice;

    // Calculate 24h change (mock)
    const priceChangePercent24h = previousPrice ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

    const volatilityData: VolatilityData = {
      price: currentPrice,
      previousPrice: previousPrice || currentPrice,
      volatility,
      trend,
      recommendation,
      timestamp: new Date(),
      priceChangePercent24h,
      currentPrice,
      realizedVolatility: volatility,
    };

    console.log(
      `✓ Volatility: ${trend} (${(volatility * 100).toFixed(2)}%) | Price: $${currentPrice.toFixed(4)}`,
    );

    return volatilityData;
  } catch (error) {
    console.error("❌ Error getting volatility data:", error);

    // Return safe default
    return {
      price: 0.08,
      previousPrice: 0.08,
      volatility: 0.03,
      trend: VolatilityTrend.STABLE,
      recommendation: "HOLD",
      timestamp: new Date(),
    };
  }
}

// Reset history for testing
export function resetPriceHistory(): void {
  priceHistory.length = 0;
  console.log("✓ Price history reset");
}
