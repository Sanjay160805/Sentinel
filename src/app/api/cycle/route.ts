import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST() {
  try {
    const { triggerManualCycle } = await import("@/agent/scheduler");
    const result = await triggerManualCycle();
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Cycle already running or failed" },
        { status: 409 }
      );
    }

    // Fire-and-forget: execute the keeper action independently
    if (result.decision && result.position) {
      const executePayload = {
        action: result.decision,
        currentDepositHBAR: parseFloat(result.position.deposited),
      };

      // Don't await — let it run in the background
      fetch(
        `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/api/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(executePayload),
        }
      ).catch((e) => logger.error("Failed to trigger execute endpoint", e));

      logger.info("Keeper execution triggered asynchronously");
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}