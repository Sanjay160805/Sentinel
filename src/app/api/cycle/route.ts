import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST() {
  try {
    const { runAgentCycle } = await import("@/agent/index");
    
    // Run cycle with graceful fallback on timeout
    logger.info("⏱️ Starting cycle with 50s timeout");
    let result;
    try {
      result = await Promise.race([
        runAgentCycle(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Cycle timeout after 50s')), 50000)
        )
      ]);
    } catch (timeoutError) {
      logger.warn("⏰ Cycle timeout - graph nodes may have logged partial decision");
      result = null;
    }
    
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Cycle produced no decision" },
        { status: 400 }
      );
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