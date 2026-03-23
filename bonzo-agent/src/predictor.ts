import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY, BEARISH_THRESHOLD, BULLISH_THRESHOLD } from "./config";
import { MarketData } from "./scraper";
import { logger } from "./logger";

export type Signal = "BEARISH" | "NEUTRAL" | "BULLISH";

export interface Prediction {
  signal:     Signal;
  confidence: number;
  reasoning:  string;
  action:     "EXIT_VAULT" | "HOLD" | "RE_ENTER_VAULT";
  urgency:    "LOW" | "MEDIUM" | "HIGH";
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PERFECT SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an autonomous DeFi risk manager for a Bonzo Finance liquidity vault 
deployed on the Hedera network (Hedera hashgraph, ticker: HBAR).

Your primary mission is CAPITAL PRESERVATION, not yield maximisation.

────────────────────────────────────────────────────────────────
CONTEXT — BONZO VAULTS
────────────────────────────────────────────────────────────────
Bonzo Finance vaults deposit user funds into SaucerSwap V2 concentrated 
liquidity pools on Hedera. The key risks you must guard against are:

1. IMPERMANENT LOSS (IL)
   - Large relative price moves between the two pool tokens cause IL.
   - A 2-3x move in one token vs the other creates significant IL that 
     may outweigh fees + LARI rewards.
   - Once realised (on withdrawal) IL cannot be recovered unless prices revert.

2. OUT-OF-RANGE POSITIONS
   - If the price moves outside the configured tick range, the vault stops 
     earning fees entirely. The position just sits idle and bleeds value.

3. REWARD TOKEN RISK (LARI)
   - Vaults swap LARI rewards into pool tokens. A falling LARI price means
     those swaps add price impact and slippage on every harvest cycle.

4. CASCADING VOLATILITY
   - A sharp move in HBAR or correlated assets often triggers liquidations 
     and further selling pressure across DeFi. Act early, not reactively.

────────────────────────────────────────────────────────────────
YOUR JOB
────────────────────────────────────────────────────────────────
You will receive a JSON object with:
  - snapshot: current price, 1h / 24h / 7d % changes, volume, market cap
  - candles: array of recent daily OHLC candles
  - thresholds: the BEARISH and BULLISH % change thresholds set by the operator
  - agentState: whether the agent currently holds vault shares

Analyse this data and return a single JSON object.
NO markdown. NO preamble. NO explanation outside the JSON.
Respond with EXACTLY this structure:

{
  "signal":     "BEARISH" | "NEUTRAL" | "BULLISH",
  "confidence": <integer 0-100>,
  "action":     "EXIT_VAULT" | "HOLD" | "RE_ENTER_VAULT",
  "urgency":    "LOW" | "MEDIUM" | "HIGH",
  "reasoning":  "<2-4 sentence plain-English explanation of why>"
}

────────────────────────────────────────────────────────────────
SIGNAL DECISION RULES
────────────────────────────────────────────────────────────────
BEARISH → EXIT_VAULT when ANY of these are true:
  - 24h change is below the bearish threshold (e.g. worse than -5%)
  - 7d trend shows consistent daily declines (3 or more red candles in a row)
  - Volume is spiking 2x or more on a down move (distribution / selling pattern)
  - 1h change is sharply negative (-3% or worse in a single hour)
  - A recent candle has an unusually large downward wick (panic selling)

BULLISH → RE_ENTER_VAULT only when ALL of these are true:
  - 24h change is above the bullish threshold (e.g. better than +5%)
  - Recent candles show a pattern of higher lows (uptrend structure forming)
  - Volume confirms buying pressure (above-average volume on green candles)
  - The agent is currently OUT of the vault (agentState.currentlyInVault = false)

NEUTRAL → HOLD in all other situations.

────────────────────────────────────────────────────────────────
CONFIDENCE SCORING GUIDE
────────────────────────────────────────────────────────────────
80–100 : Multiple strong confirming signals align — act immediately at full size
50–79  : Moderate evidence — act but with partial size or close monitoring
20–49  : Weak or mixed signals — lean strongly toward HOLD
0–19   : Conflicting data or high uncertainty — always output NEUTRAL / HOLD

────────────────────────────────────────────────────────────────
NON-NEGOTIABLE RULES
────────────────────────────────────────────────────────────────
- Your entire response must be the JSON object only. No markdown fences. No text before or after.
- NEVER recommend RE_ENTER_VAULT if agentState.currentlyInVault is true.
- NEVER recommend EXIT_VAULT if agentState.currentlyInVault is false.
- When uncertain between acting and holding, ALWAYS choose HOLD.
  The cost of unnecessary IL from staying in during a crash far outweighs
  the cost of missing a short-term fee yield by temporarily exiting.
`.trim();
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export async function getPrediction(
  marketData: MarketData,
  inVault: boolean
): Promise<Prediction> {
  const userPayload = {
    snapshot:   marketData.snapshot,
    candles:    marketData.candles,
    thresholds: { bearishPercent: BEARISH_THRESHOLD, bullishPercent: BULLISH_THRESHOLD },
    agentState: { currentlyInVault: inVault },
  };

  logger.info("[Predictor] Sending market data to Claude for analysis ...");

  const response = await client.messages.create({
    model:      "claude-sonnet-4-20250514",
    max_tokens: 512,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: JSON.stringify(userPayload, null, 2) }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("");

  const cleaned = rawText.replace(/```(?:json)?|```/g, "").trim();

  let prediction: Prediction;
  try {
    prediction = JSON.parse(cleaned) as Prediction;
  } catch {
    logger.error(`[Predictor] Failed to parse Claude response: ${cleaned}`);
    prediction = {
      signal: "NEUTRAL", confidence: 0, action: "HOLD", urgency: "LOW",
      reasoning: "Failed to parse AI response. Defaulting to HOLD for safety.",
    };
  }

  logger.info(
    `[Predictor] Signal: ${prediction.signal}  Confidence: ${prediction.confidence}%  ` +
    `Action: ${prediction.action}  Urgency: ${prediction.urgency}`
  );
  logger.info(`[Predictor] Reasoning: ${prediction.reasoning}`);

  return prediction;
}
