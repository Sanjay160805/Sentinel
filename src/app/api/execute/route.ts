import { NextRequest, NextResponse } from "next/server";
import { executeKeeperAction } from "@/bonzo/keeper";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { action, currentDepositHBAR } = await req.json();

    if (!action || !action.type) {
      return NextResponse.json(
        { ok: false, message: "Missing action type" },
        { status: 400 }
      );
    }

    logger.info(`🔄 Executing keeper action: ${action.type} — ${action.reason}`);

    const txId = await executeKeeperAction(action, currentDepositHBAR);

    if (txId) {
      logger.info(`✓ Keeper action executed: tx=${txId}`);
      return NextResponse.json({ ok: true, txId });
    } else {
      logger.warn(`✗ Keeper action failed: ${action.type}`);
      return NextResponse.json(
        { ok: false, message: "Keeper action execution failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error("Execute endpoint error", error?.message ?? String(error));
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
