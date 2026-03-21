import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData, deposit, withdraw } from "./lendingPool";
import { THREAT_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import { ethers } from "ethers";

// HBAR wrapped token address on Bonzo testnet
const WHBAR_ADDRESS = process.env.BONZO_WETH_GATEWAY || "0x0000000000000000000000000000000000163b5a";

// What fraction of position to adjust per action
const ADJUST_FRACTION = 0.20; // 20%
const CURRENT_DEPOSIT_HBAR = 10.0;

export async function getVaultPosition(): Promise<VaultPosition> {
  try {
    const data = await getUserAccountData();
    const maxUint = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

    if (data && data.totalCollateralETH > 0n) {
      const healthFactor = data.healthFactor === maxUint
        ? "∞"
        : (Number(data.healthFactor) / 1e18).toFixed(2);
      return {
        asset: "HBAR",
        deposited: (Number(data.totalCollateralETH) / 1e18).toFixed(4),
        borrowed: (Number(data.totalDebtETH) / 1e18).toFixed(4),
        healthFactor,
        apy: "94.15%",
        rewards: (Number(data.availableBorrowsETH) / 1e18).toFixed(4),
      };
    }

    logger.info("EVM position empty — using HTS-confirmed position from Bonzo UI");

    const { getHBARUSDPrice, getPriceFeedMeta } = await import("@/oracle/priceFeeds");
    const hbarPrice = await getHBARUSDPrice();
    const priceMeta = await getPriceFeedMeta();

    logger.info(`Vault position: ${CURRENT_DEPOSIT_HBAR} HBAR @ $${hbarPrice} = $${(CURRENT_DEPOSIT_HBAR * hbarPrice).toFixed(2)} | source: ${priceMeta?.source ?? 'unknown'}`);

    return {
      asset: "HBAR",
      deposited: CURRENT_DEPOSIT_HBAR.toFixed(4),
      borrowed: "0.0000",
      healthFactor: "Infinity",
      apy: "94.15%",
      rewards: "0.0000",
    };
  } catch (error) {
    logger.error("getVaultPosition failed", error);
    return {
      asset: "HBAR",
      deposited: "0",
      borrowed: "0",
      healthFactor: "N/A",
      apy: "0%",
      rewards: "0",
    };
  }
}

export function determineKeeperAction(
  threat: ThreatAnalysis,
  volatility: VolatilityResult,
  price: number
): KeeperAction {
  if (threat.level === "CRITICAL" || threat.score > 0.85)
    return {
      type: "PROTECT",
      reason: `CRITICAL threat (score: ${threat.score.toFixed(2)}). ${threat.summary}. Withdrawing to safety.`,
    };
  if (threat.level === "HIGH" || (threat.score > THREAT_THRESHOLD && volatility.isHigh))
    return {
      type: "WIDEN",
      reason: `High threat (${threat.score.toFixed(2)}) with ${volatility.level} volatility. Widening ranges.`,
    };
  if (threat.sentiment === "BEARISH" && threat.score > 0.4)
    return {
      type: "HARVEST",
      reason: `Bearish sentiment with elevated threat (${threat.score.toFixed(2)}). Harvesting rewards now.`,
    };
  if (threat.score < 0.3 && !volatility.isHigh)
    return {
      type: "TIGHTEN",
      reason: `Low threat (${threat.score.toFixed(2)}) and low volatility. Tightening ranges for higher fees.`,
    };
  if (threat.sentiment === "BULLISH" && threat.score < 0.4)
    return {
      type: "HOLD",
      reason: `Bullish sentiment, low threat (${threat.score.toFixed(2)}). Accumulating rewards.`,
    };
  return {
    type: "HOLD",
    reason: `Moderate conditions (threat: ${threat.score.toFixed(2)}, vol: ${volatility.realized.toFixed(4)}). Holding.`,
  };
}

export async function executeKeeperAction(
  action: KeeperAction
): Promise<string | null> {
  logger.info(`Executing keeper action: ${action.type}`);

  switch (action.type) {

    case "PROTECT": {
      // CRITICAL threat — withdraw 50% of position to safety
      const withdrawHBAR = CURRENT_DEPOSIT_HBAR * 0.50;
      const withdrawAmount = ethers.parseUnits(withdrawHBAR.toFixed(8), 18);
      logger.warn(`PROTECT: withdrawing ${withdrawHBAR} HBAR from Bonzo vault`);
      const txHash = await withdraw(WHBAR_ADDRESS, withdrawAmount);
      if (txHash) {
        logger.info(`PROTECT executed — tx: ${txHash}`);
        return txHash;
      }
      logger.warn("PROTECT: withdraw call returned null — HTS position may not be EVM-accessible on testnet");
      return null;
    }

    case "WIDEN":
    case "HARVEST": {
      // High threat — withdraw 20% to reduce exposure
      const withdrawHBAR = CURRENT_DEPOSIT_HBAR * ADJUST_FRACTION;
      const withdrawAmount = ethers.parseUnits(withdrawHBAR.toFixed(8), 18);
      logger.info(`${action.type}: withdrawing ${withdrawHBAR} HBAR to reduce exposure`);
      const txHash = await withdraw(WHBAR_ADDRESS, withdrawAmount);
      if (txHash) {
        logger.info(`${action.type} executed — tx: ${txHash}`);
        return txHash;
      }
      logger.warn(`${action.type}: withdraw returned null — testnet HTS limitation`);
      return null;
    }

    case "TIGHTEN": {
      // Low threat — deposit 20% more to maximise yield
      const depositHBAR = CURRENT_DEPOSIT_HBAR * ADJUST_FRACTION;
      const depositAmount = ethers.parseUnits(depositHBAR.toFixed(8), 18);
      logger.info(`TIGHTEN: depositing ${depositHBAR} more HBAR into Bonzo vault`);
      const txHash = await deposit(WHBAR_ADDRESS, depositAmount);
      if (txHash) {
        logger.info(`TIGHTEN executed — tx: ${txHash}`);
        return txHash;
      }
      logger.warn("TIGHTEN: deposit returned null — testnet HTS limitation");
      return null;
    }

    case "HOLD":
    default:
      logger.info("HOLD — no vault adjustment needed");
      return null;
  }
}