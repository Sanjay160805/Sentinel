import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST() {
  try {
    const { triggerManualCycle } = await import("@/agent/scheduler");
    const result = await triggerManualCycle();
    if (!result) {
      return NextResponse.json({ ok: false, message: "Cycle already running or failed" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}