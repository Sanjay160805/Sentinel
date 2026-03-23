import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData, borrow, repay } from "./lendingPool";
import { THREAT_THRESHOLD, BONZO_LENDING_POOL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import { depositHBAR, withdrawHBAR } from "./wethGateway";
import { ethers } from "ethers";

const ADJUST_FRACTION = 0.20;
const HBAR_APY = "94.15%"; // Static APY for HBAR deposits on Bonzo testnet

// ─── Vault position ────────────────────────────────────────────────────────────
export async function getVaultPosition(
  accountId?: string
): Promise<VaultPosition> {
  if (!accountId) {
    return {
      asset: "HBAR",
      deposited: "0.0000",
      borrowed: "0.0000",
      healthFactor: "∞",
      apy: HBAR_APY,
      rewards: "0.0000",
    };
  }

  try {
    const data = await getUserAccountData(accountId);

    if (!data) throw new Error("Could not retrieve user account data from Bonzo");

    const healthFactor =
      Number(data.healthFactor) / 1e18 > 1e15
        ? "∞"
        : (Number(data.healthFactor) / 1e18).toFixed(2);
    
    return {
      asset: "HBAR",
      deposited: (Number(data.totalCollateralETH) / 1e18).toFixed(4),
      borrowed: (Number(data.totalDebtETH) / 1e18).toFixed(4),
      healthFactor,
      apy: HBAR_APY,
      rewards: (Number(data.availableBorrowsETH) / 1e18).toFixed(4),
    };
  } catch (err) {
    logger.error("Real-time Bonzo position fetch failed:", err);
    throw err; // Real implementation only, no fallbacks
  }
}

// ─── Keeper decision ───────────────────────────────────────────────────────────
export function determineKeeperAction(
  threat: ThreatAnalysis,
  volatility: VolatilityResult,
  price: number,
  vaultPos?: VaultPosition | null
): KeeperAction {
  // 1. Critical Liquidation Protection
  if (vaultPos && vaultPos.healthFactor !== "∞") {
    const hf = parseFloat(vaultPos.healthFactor);
    if (hf < 1.1) {
      return {
        type: "REPAY",
        reason: `CRITICAL: Health factor ${hf.toFixed(2)} is dangerously low (below 1.1). Repaying debt to avoid liquidation.`,
        params: { amount: parseFloat(vaultPos.borrowed) * 0.5 }
      };
    }
  }

  // 2. High Risk - Major Protection
  if (threat.level === "CRITICAL" || threat.score > 0.85) {
    return {
      type: "PROTECT",
      reason: `CRITICAL threat (score: ${threat.score.toFixed(2)}). ${threat.summary}. Withdrawing to safety.`,
    };
  }

  // 3. Elevated Risk - Range Adjustment
  if (threat.level === "HIGH" || (threat.score > THREAT_THRESHOLD && volatility.isHigh)) {
    return {
      type: "WIDEN",
      reason: `High threat (${threat.score.toFixed(2)}) with ${volatility.level} volatility. Widening ranges.`,
    };
  }

  // 4. Stable Bearish - Reward Collection
  if (threat.sentiment === "BEARISH" && threat.score > 0.4) {
    return {
      type: "HARVEST",
      reason: `Bearish sentiment with elevated threat (${threat.score.toFixed(2)}). Harvesting rewards now.`,
    };
  }

  // 5. Very Safe Bullish - Active Leverage
  if (threat.sentiment === "BULLISH" && threat.score < 0.2 && vaultPos && parseFloat(vaultPos.healthFactor) > 2.0) {
    return {
      type: "BORROW",
      reason: `Very low risk (${threat.score.toFixed(2)}) and High HF (${vaultPos.healthFactor}). Borrowing 10% to leverage position.`,
      params: { amount: parseFloat(vaultPos.deposited) * 0.1 }
    };
  }

  // 6. Good Growth - Incremental Deposit
  if (threat.score < 0.3 && !volatility.isHigh) {
    return {
      type: "TIGHTEN",
      reason: `Low threat (${threat.score.toFixed(2)}) and low volatility. Tightening ranges for higher yield.`,
    };
  }

  // 7. Neutral/Growth - No Action
  return {
    type: "HOLD",
    reason: `Moderate conditions (threat: ${threat.score.toFixed(2)}, vol: ${volatility.realized.toFixed(4)}). Holding current position.`,
  };
}

// ─── Execute action ────────────────────────────────────────────────────────────
export async function executeKeeperAction(
  action: KeeperAction,
  currentDepositHBAR: number = 16.0,
  accountId?: string
): Promise<string | null> {
  logger.info(`Executing keeper action: ${action.type}`);

  switch (action.type) {
    case "PROTECT": {
      const amountNative = currentDepositHBAR * 0.50;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await withdrawHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "WIDEN":
    case "HARVEST": {
      const amountNative = currentDepositHBAR * ADJUST_FRACTION;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await withdrawHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "TIGHTEN": {
      const amountNative = currentDepositHBAR * ADJUST_FRACTION;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await depositHBAR(BONZO_LENDING_POOL, amountWei, accountId);
    }

    case "BORROW": {
      const amountNative = action.params?.amount ? Number(action.params.amount) : currentDepositHBAR * 0.10;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      // Default to variable rate (2) and aHBAR token
      return await borrow("0x6e96a607F2F5657b39bf58293d1A006f9415aF32", amountWei, 2, accountId);
    }

    case "REPAY": {
      const amountNative = action.params?.amount ? Number(action.params.amount) : currentDepositHBAR * 0.10;
      const amountWei = BigInt(Math.floor(amountNative * 1e8)) * BigInt(1e10);
      return await repay("0x6e96a607F2F5657b39bf58293d1A006f9415aF32", amountWei, 2, accountId);
    }

    case "HOLD":
    default:
      logger.info("HOLD — no vault adjustment needed");
      return null;
  }
}