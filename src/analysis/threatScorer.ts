import { geminiModel } from "@/lib/gemini";
import { retrieveGeopoliticalContext, retrieveRegulatoryContext, retrieveMacroContext } from "@/rag/retriever";
import { ThreatAnalysis } from "@/lib/types";
import { logger } from "@/lib/logger";
import { getRecentTweets } from "@/db/tweets";

export async function scoreThreat(): Promise<ThreatAnalysis> {
  try {
    // Try RAG retrieval first
    let geoContext = "";
    let regContext = "";
    let macroContext = "";

    try {
      [geoContext, regContext, macroContext] = await Promise.all([
        retrieveGeopoliticalContext(),
        retrieveRegulatoryContext(),
        retrieveMacroContext(),
      ]);
    } catch (ragError) {
      logger.warn("RAG retrieval failed, using direct tweets", ragError);
    }

    // If RAG returns empty, fall back to direct tweet text
    if (!geoContext && !regContext && !macroContext) {
      logger.info("RAG empty — using direct tweet text for Gemini");
      const tweets = getRecentTweets(50);
      const tweetText = tweets
        .map((t: any) => `@${t.username}: ${t.text}`)
        .join("\n")
        .slice(0, 4000);

      geoContext = tweetText;
      regContext = "See tweets above for regulatory signals";
      macroContext = "See tweets above for macro signals";
    }

    const prompt = `You are a DeFi risk assessment AI for a crypto keeper agent on Hedera blockchain.
Analyze these real-world signals and produce a threat score for crypto/DeFi markets:

GEOPOLITICAL SIGNALS:
${geoContext}

REGULATORY SIGNALS:
${regContext}

MACRO ECONOMIC SIGNALS:
${macroContext}

Produce a threat score from 0.0 (completely safe) to 1.0 (extreme danger).
Consider: Wars/invasions = high threat. Crypto bans/SEC enforcement = high threat. Rate shocks/bank failures = medium-high. Normal bullish conditions = low.

Respond in this exact JSON format with no other text:
{"score":0.15,"level":"LOW","signals":["signal1","signal2"],"sentiment":"BULLISH","summary":"one sentence summary"}`;

    const response = await geminiModel.invoke(prompt);
    const text = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleaned);

    logger.info(`Gemini threat score: ${result.score} (${result.level}) — ${result.summary}`);

    return {
      score: Math.max(0, Math.min(1, result.score || 0)),
      level: result.level || "LOW",
      signals: result.signals || [],
      sentiment: result.sentiment || "NEUTRAL",
      summary: result.summary || "No significant threats detected",
    };

  } catch (error: any) {
    // Log concisely — Gemini rate limiting is expected, fallback handles it
    if (error.status === 429) {
      logger.warn("Gemini rate limited (429) — using keyword analysis fallback");
    } else {
      logger.error("Threat scoring failed", error?.message || String(error));
    }

    // Keyword fallback when Gemini fails
    try {
      const tweets = getRecentTweets(100);
      const text = tweets.map((t: any) => t.text?.toLowerCase() || "").join(" ");

      const highThreat = ["war", "ban", "crash", "hack", "sec", "arrest", "sanctions", "collapse"].filter(k => text.includes(k));
      const bullish = ["ath", "pump", "moon", "bullish", "adoption", "etf", "approved"].filter(k => text.includes(k));

      const score = Math.min(1, highThreat.length * 0.15);
      const level = score > 0.6 ? "HIGH" : score > 0.3 ? "MEDIUM" : "LOW";
      const sentiment = bullish.length > highThreat.length ? "BULLISH" : highThreat.length > 2 ? "BEARISH" : "NEUTRAL";

      logger.info(`Keyword fallback: score=${score}, level=${level}, sentiment=${sentiment}`);

      return {
        score,
        level,
        signals: highThreat,
        sentiment,
        summary: `Keyword analysis: ${highThreat.length} threat signals, ${bullish.length} bullish signals`,
      };
    } catch {
      return {
        score: 0,
        level: "LOW",
        signals: [],
        sentiment: "NEUTRAL",
        summary: "Threat scoring failed — defaulting to LOW",
      };
    }
  }
}