import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { getHederaClient } from "./client";
import { AgentDecision } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function logDecisionToHCS(
  decision: AgentDecision,
  walletId?: string
): Promise<string | null> {
  const topicId = process.env.HCS_TOPIC_ID;
  if (!topicId || topicId === "0.0.XXXXXX" || topicId === "") {
    logger.warn("HCS_TOPIC_ID not set, skipping HCS logging");
    return null;
  }
  try {
    const client = getHederaClient();
    const message = JSON.stringify({
      type: "SENTINEL_DECISION",
      cycle: decision.cycle,
      timestamp: decision.timestamp,
      action: decision.action,
      threat_score: decision.threat_score,
      volatility: decision.volatility,
      price: decision.price,
      reasoning: decision.reasoning.slice(0, 500),
      wallet_id: walletId ?? process.env.HEDERA_ACCOUNT_ID ?? "unknown",
    });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message)
      .execute(client);
    const txHash = tx.transactionId?.toString() || "";
    logger.info(`HCS message submitted: ${txHash}`);
    return txHash;
  } catch (error) {
    logger.error("Failed to submit HCS message", error);
    return null;
  }
}

export async function logEventToHCS(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  const topicId = process.env.HCS_TOPIC_ID;
  if (!topicId || topicId === "0.0.XXXXXX" || topicId === "") return;
  try {
    const client = getHederaClient();
    const message = JSON.stringify({
      type: eventType,
      timestamp: new Date().toISOString(),
      ...data,
    });
    await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message)
      .execute(client);
  } catch (error) {
    logger.error("HCS event log failed", error);
  }
}