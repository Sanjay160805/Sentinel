import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { logDecisionToHCS } from "@/hedera/hcs";

export const maxDuration = 60;

export async function POST() {
  try {
    const { runAgentCycle } = await import("@/agent/index");
    
    // Apply 25-second timeout to Gemini analysis
    logger.info("⏱️ Starting analysis with 25s timeout");
    const result = await Promise.race([
      runAgentCycle(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout after 25s')), 25000)
      )
    ]) as { decision: any; position: any };
    
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "No decision produced" },
        { status: 400 }
      );
    }

    // Log decision to HCS IMMEDIATELY after determining action
    if (result.decision) {
      try {
        logger.info("📢 Submitting decision to HCS...");
        await logDecisionToHCS(result.decision);
        logger.info("✓ Decision logged to HCS");
      } catch (hcsError) {
        logger.error("HCS logging failed, but continuing", hcsError);
      }
    }

    // Fire-and-forget: execute the keeper action independently
    if (result.decision && result.position) {
      const executePayload = {
        action: result.decision,
        currentDepositHBAR: parseFloat(result.position.deposited),
      };

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://sentinel-one-teal.vercel.app";
      fetch(`${appUrl}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(executePayload),
      }).catch((e) =>
        logger.error("Failed to trigger execute endpoint", e?.message ?? e)
      );

      logger.info("🚀 Keeper execution triggered asynchronously");
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logger.error("❌ Cycle failed", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}