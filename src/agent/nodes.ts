import { AgentStateType } from "./state";
import { ingestTweets } from "@/rag/ingestor";
import { scoreThreat } from "@/analysis/threatScorer";
import { calculateVolatility, recordPrice } from "@/analysis/volatilityCalculator";
import { getHBARUSDPrice } from "@/oracle/priceFeeds";
import { getVaultPosition, determineKeeperAction, executeKeeperAction } from "@/bonzo/keeper";
import { saveDecision } from "@/db/decisions";
import { logDecisionToHCS } from "@/hedera/hcs";
import { logger } from "@/lib/logger";

export async function ingestNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Ingesting tweets...`);
  try {
    const count = await ingestTweets(2);
    logger.info(`[Cycle #${state.cycle}] Ingested ${count} tweets`);
    return {};
  } catch (error) {
    return { error: `Ingest failed: ${error}` };
  }
}

export async function analyzeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Analyzing threats...`);
  try {
    const [threatAnalysis, hbarPrice] = await Promise.all([scoreThreat(), getHBARUSDPrice()]);
    // Record price for volatility tracking across cycles
    recordPrice(hbarPrice);
    const volatility = calculateVolatility();
    logger.info(`[Cycle #${state.cycle}] Threat: ${threatAnalysis.level} (${threatAnalysis.score.toFixed(2)})`);
    return { threatAnalysis, volatility, price: hbarPrice };
  } catch (error) {
    return { error: `Analysis failed: ${error}` };
  }
}

export async function positionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Fetching vault position...`);
  try {
    const vaultPosition = await getVaultPosition();
    return { vaultPosition };
  } catch (error) {
    logger.warn("Position fetch failed, continuing without it");
    return {};
  }
}

export async function decideNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  logger.info(`[Cycle #${state.cycle}] Making decision...`);
  if (!state.threatAnalysis || !state.volatility) {
    return {
      decision: {
        cycle: state.cycle,
        timestamp: new Date().toISOString(),
        action: "HOLD",
        reasoning: "Insufficient data",
        threat_score: 0,
        volatility: 0,
        price: state.price,
        executed: false,
      },
    };
  }
  const action = determineKeeperAction(state.threatAnalysis, state.volatility, state.price);
  const decision = {
    cycle: state.cycle,
    timestamp: new Date().toISOString(),
    action: action.type,
    reasoning: action.reason,
    threat_score: state.threatAnalysis.score,
    volatility: state.volatility.realized,
    price: state.price,
    executed: false,
  };
  logger.info(`[Cycle #${state.cycle}] Decision: ${decision.action}`);
  return { decision };
}

export async function executeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  if (!state.decision) return {};
  logger.info(`[Cycle #${state.cycle}] Executing: ${state.decision.action}`);
  try {
    const txHash = await executeKeeperAction({
      type: state.decision.action as any,
      reason: state.decision.reasoning,
    });

    const id = saveDecision({
      ...state.decision,
      executed: !!txHash,
      tx_hash: txHash || undefined,
    });

    const finalDecision = {
      ...state.decision,
      id,
      executed: !!txHash,
      tx_hash: txHash || undefined,
    };

    // Non-blocking — HCS failure won't crash the graph
    logDecisionToHCS(finalDecision).catch(e =>
      logger.warn("HCS logging failed silently", e)
    );

    return { decision: finalDecision };
  } catch (error) {
    logger.error(`[Cycle #${state.cycle}] Execute node failed`, error);
    return { decision: { ...state.decision, executed: false } };
  }
}