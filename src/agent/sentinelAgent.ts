/**
 * SENTINEL Agent — Autonomous Decision Maker
 * Combines all 7 LangChain tools with threat × volatility decision matrix
 * Runs autonomous cycles (5-10 seconds) and chat interactions
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

import {
  AgentDecision,
  AgentAction,
  ThreatLevel,
  VolatilityTrend,
} from "../types/index.js";

// Import all 7 tools
import { hcsLoggerTool } from "./tools/hcsTool.js";
import { sentimentTool } from "./tools/sentimentTool.js";
import { volatilityTool } from "./tools/volatilityTool.js";
import {
  vaultStateTool,
  harvestTool,
  withdrawTool,
  emergencyExitTool,
} from "./tools/vaultTool.js";

// ════════════════════════════════════════════════════════════════
// SENTINEL AGENT INITIALIZATION
// ════════════════════════════════════════════════════════════════

/**
 * Initialize Sentinel Agent with all 7 tools
 */
export function createSentinelAgent() {
  const model = new ChatGoogleGenerativeAI({
    modelName: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.3, // Low temperature for consistent decisions
    maxOutputTokens: 1024,
  });

  const tools = [
    sentimentTool,
    volatilityTool,
    vaultStateTool,
    harvestTool,
    withdrawTool,
    emergencyExitTool,
    hcsLoggerTool,
  ];

  const systemPrompt = `You are SENTINEL, an autonomous AI vault keeper on Hedera Hashgraph.
Your role is to protect DeFi capital by monitoring geopolitical threats and market volatility.

You have access to 7 specialized tools:
1. get_sentiment — Analyzes geopolitical tweets and returns threat level (LOW/MEDIUM/HIGH/CRITICAL)
2. get_volatility — Fetches HBAR price and calculates volatility trend (STABLE/VOLATILE/EXTREME)
3. get_vault_state — Reads current vault TVL, share price, and user position
4. harvest_vault_rewards — Composts rewards (call during STABLE periods)
5. withdraw_from_vault — Executes partial 50% withdrawal (call during volatile threats)
6. emergency_exit_vault — FULL exit on CRITICAL threat (highest priority)
7. hcs_logger — Logs all decisions to Hedera Consensus Service for audit trail

DECISION MATRIX (threat × volatility):

┌─────────────────────────────────────────────────────────┐
│ LOW threat + STABLE volatility      → HARVEST           │
│ LOW threat + VOLATILE volatility    → HOLD              │
│ MEDIUM threat + any volatility      → HARVEST or HOLD   │
│ HIGH threat + STABLE volatility     → HARVEST           │
│ HIGH threat + VOLATILE volatility   → WITHDRAW 50%      │
│ HIGH threat + EXTREME volatility    → WITHDRAW 50%      │
│ CRITICAL threat + any volatility    → EMERGENCY_EXIT    │
└─────────────────────────────────────────────────────────┘

EXECUTION FLOW:
1. Call get_sentiment to assess geopolitical threats
2. Call get_volatility to assess market conditions
3. Call get_vault_state to assess current position
4. Apply decision matrix to determine action
5. Execute action via appropriate tool
6. Log decision via hcs_logger with threat/volatility context
7. Return decision summary

IMPORTANT RULES:
- ALWAYS analyze sentiment first, then volatility, then vault state
- ALWAYS apply decision matrix rules exactly
- CRITICAL threat ALWAYS leads to emergency_exit, no exceptions
- HCS logging MUST include full context (threat, volatility, action, vault state)
- Keep responses concise (< 150 chars) for dashboard display
- Never call tools speculatively; only call when needed

Your decisions affect real capital. Be cautious and follow the decision matrix precisely.`;

  const agent = createReactAgent({
    llmWithTools: model.bindTools(tools),
    tools,
    messageModifier: systemPrompt,
  });

  return agent;
}

// ════════════════════════════════════════════════════════════════
// AUTONOMOUS CYCLE RUNNER
// ════════════════════════════════════════════════════════════════

/**
 * Execute one complete autonomous decision cycle
 * Returns AgentDecision with action taken
 */
export async function runAutonomousCycle(): Promise<AgentDecision> {
  try {
    const agent = createSentinelAgent();
    const agentExecutor = agent;

    // Invoke agent with autonomous cycle prompt
    const input = {
      messages: [
        new HumanMessage(`You are in autonomous monitoring mode.

Execute this cycle exactly:
1. Call get_sentiment to analyze geopolitical threats
2. Call get_volatility to check market conditions
3. Call get_vault_state to see current position
4. Based on threat + volatility, decide action using decision matrix
5. Execute the action (harvest/withdraw/emergency_exit or hold)
6. Log the decision to HCS with full context

What should we do right now?`),
      ],
    };

    const startTime = Date.now();
    const result = await agentExecutor.invoke(input);
    const duration = Date.now() - startTime;

    console.log(
      `✓ Autonomous cycle completed in ${duration}ms\nAgent response: ${JSON.stringify(result.messages[result.messages.length - 1])}`,
    );

    // Parse the agent's decision from response
    const lastMessage =
      result.messages[result.messages.length - 1].content;
    const parseDecision = parseDecisionFromResponse(lastMessage);

    return {
      threat: parseDecision.threat || ThreatLevel.MEDIUM,
      volatility: parseDecision.volatility || VolatilityTrend.STABLE,
      action: parseDecision.action || AgentAction.HOLD,
      reasoning: lastMessage,
      timestamp: new Date(),
      cycleTime: duration,
    };
  } catch (error) {
    console.error("❌ Autonomous cycle failed:", error);

    return {
      threat: ThreatLevel.MEDIUM,
      volatility: VolatilityTrend.STABLE,
      action: AgentAction.HOLD,
      reasoning: `Cycle error: ${error instanceof Error ? error.message : "unknown"}`,
      timestamp: new Date(),
      cycleTime: 0,
    };
  }
}

// ════════════════════════════════════════════════════════════════
// CHAT MODE RUNNER
// ════════════════════════════════════════════════════════════════

/**
 * Execute one chat interaction
 * User can ask SENTINEL questions about vault status, threats, actions, etc.
 */
export async function runChatCycle(message: string): Promise<string> {
  try {
    const agent = createSentinelAgent();
    const agentExecutor = agent;

    // Invoke agent with user message
    const input = {
      messages: [new HumanMessage(message)],
    };

    const result = await agentExecutor.invoke(input);
    const lastMessage =
      result.messages[result.messages.length - 1].content;

    return lastMessage;
  } catch (error) {
    console.error("❌ Chat cycle failed:", error);
    return `Error: ${error instanceof Error ? error.message : "unknown"}`;
  }
}

// ════════════════════════════════════════════════════════════════
// DECISION PARSER
// ════════════════════════════════════════════════════════════════

/**
 * Parse agent response to extract decision values
 */
function parseDecisionFromResponse(response: string): {
  threat?: ThreatLevel;
  volatility?: VolatilityTrend;
  action?: AgentAction;
} {
  const result: {
    threat?: ThreatLevel;
    volatility?: VolatilityTrend;
    action?: AgentAction;
  } = {};

  // Extract threat level
  if (response.includes("CRITICAL")) result.threat = ThreatLevel.CRITICAL;
  else if (response.includes("HIGH")) result.threat = ThreatLevel.HIGH;
  else if (response.includes("MEDIUM")) result.threat = ThreatLevel.MEDIUM;
  else if (response.includes("LOW")) result.threat = ThreatLevel.LOW;

  // Extract volatility
  if (response.includes("EXTREME")) result.volatility = VolatilityTrend.EXTREME;
  else if (response.includes("VOLATILE"))
    result.volatility = VolatilityTrend.VOLATILE;
  else if (response.includes("STABLE"))
    result.volatility = VolatilityTrend.STABLE;

  // Extract action
  if (response.includes("EMERGENCY_EXIT") || response.includes("emergency exit"))
    result.action = AgentAction.EMERGENCY_EXIT;
  else if (response.includes("WITHDRAW") || response.includes("withdraw"))
    result.action = AgentAction.WITHDRAW;
  else if (response.includes("HARVEST") || response.includes("harvest"))
    result.action = AgentAction.HARVEST;
  else result.action = AgentAction.HOLD;

  return result;
}

// ════════════════════════════════════════════════════════════════
// AGENT STATUS
// ════════════════════════════════════════════════════════════════

export interface AgentStatus {
  isRunning: boolean;
  cycleCount: number;
  lastDecision: AgentDecision | null;
  lastCycleTime: number;
  threatsDetected: number;
}

export const agentStatus: AgentStatus = {
  isRunning: false,
  cycleCount: 0,
  lastDecision: null,
  lastCycleTime: 0,
  threatsDetected: 0,
};
