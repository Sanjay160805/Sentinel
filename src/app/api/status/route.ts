import { NextResponse } from "next/server";
import { getTweetCountAsync } from "@/db/tweets";
import { getLastDecision } from "@/db/decisions";

export async function GET() {
  try {
    const { getSchedulerStatus } = await import("@/agent/scheduler");
    const status = getSchedulerStatus();
    const lastDecision = getLastDecision();
    const tweetCount = await getTweetCountAsync();
    return NextResponse.json({
      ok: true,
      agent: {
        running: status.running,
        interval: status.interval,
        lastDecision,
        tweetCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}