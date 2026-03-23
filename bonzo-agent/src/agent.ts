import { POLL_INTERVAL_MS } from "./config";
import { fetchMarketData } from "./scraper";
import { getPrediction, Prediction } from "./predictor";
import {
  getVaultPosition, getUnderlyingBalance,
  depositToVault, redeemAllShares, redeemPercent, VaultPosition,
} from "./bonzo";
import { swapUnderlyingToUSDC, swapUSDCToUnderlying } from "./saucerswap";
import { logger } from "./logger";

interface AgentState {
  inVault:      boolean;
  lastSignal:   string;
  lastAction:   string;
  lastActionAt: Date | null;
  cycleCount:   number;
}

const state: AgentState = {
  inVault:      true,   // ← change to false if you start with funds NOT in the vault
  lastSignal:   "UNKNOWN",
  lastAction:   "NONE",
  lastActionAt: null,
  cycleCount:   0,
};

async function executeExit(prediction: Prediction): Promise<void> {
  logger.info("━━━ ACTION: EXIT VAULT ━━━");
  if (prediction.urgency === "MEDIUM" && prediction.confidence < 70) {
    logger.info("[Agent] Medium urgency — partial exit (50%)");
    await redeemPercent(50);
  } else {
    logger.info("[Agent] High urgency / high confidence — full exit");
    await redeemAllShares();
  }
  logger.info("[Agent] Swapping underlying → USDC for safety ...");
  const swapResult = await swapUnderlyingToUSDC();
  logger.info(`[Agent] Protected ${swapResult.amountIn} underlying → ${swapResult.amountOut} USDC`);
  state.inVault     = false;
  state.lastAction  = "EXIT_VAULT";
  state.lastActionAt = new Date();
}

async function executeReEnter(): Promise<void> {
  logger.info("━━━ ACTION: RE-ENTER VAULT ━━━");
  const swapResult = await swapUSDCToUnderlying();
  logger.info(`[Agent] Swapped ${swapResult.amountIn} USDC → ${swapResult.amountOut} underlying`);
  const balance = await getUnderlyingBalance();
  if (balance === 0n) {
    logger.error("[Agent] Underlying balance is zero after swap — aborting re-entry.");
    return;
  }
  logger.info(`[Agent] Depositing ${balance.toString()} underlying into Bonzo vault ...`);
  await depositToVault(balance);
  state.inVault     = true;
  state.lastAction  = "RE_ENTER_VAULT";
  state.lastActionAt = new Date();
}

function executeHold(): void {
  logger.info("━━━ ACTION: HOLD — no changes ━━━");
  state.lastAction = "HOLD";
}

async function runCycle(): Promise<void> {
  state.cycleCount++;
  logger.info(`\n${"═".repeat(60)}`);
  logger.info(`[Agent] Cycle #${state.cycleCount} | inVault: ${state.inVault}`);

  try {
    const position: VaultPosition = await getVaultPosition();
    logger.info(`[Agent] Position: ${position.sharesFormatted} shares (~${position.assetsFormatted} underlying)`);
    state.inVault = position.sharesBalance > 0n;
  } catch (err) {
    logger.error(`[Agent] Failed to read vault position: ${err}`);
  }

  const marketData = await fetchMarketData();
  const prediction = await getPrediction(marketData, state.inVault);
  state.lastSignal  = prediction.signal;

  try {
    if (prediction.action === "EXIT_VAULT" && state.inVault) {
      await executeExit(prediction);
    } else if (prediction.action === "RE_ENTER_VAULT" && !state.inVault) {
      await executeReEnter();
    } else {
      if (prediction.action === "EXIT_VAULT" && !state.inVault)
        logger.info("[Agent] EXIT signal but already out — HOLD.");
      if (prediction.action === "RE_ENTER_VAULT" && state.inVault)
        logger.info("[Agent] RE_ENTER signal but already in — HOLD.");
      executeHold();
    }
  } catch (err) {
    logger.error(`[Agent] Action failed: ${err}`);
  }

  logger.info(`[Agent] Done. inVault=${state.inVault}  lastAction=${state.lastAction}`);
}

export async function startAgent(): Promise<void> {
  logger.info("╔════════════════════════════════════════╗");
  logger.info("║   Bonzo-Hedera Autonomous Agent v1.0   ║");
  logger.info("╚════════════════════════════════════════╝");
  logger.info(`[Agent] Poll interval: ${POLL_INTERVAL_MS / 1000}s`);

  await runCycle();
  setInterval(async () => {
    try { await runCycle(); }
    catch (err) { logger.error(`[Agent] Unhandled error: ${err}`); }
  }, POLL_INTERVAL_MS);
}
