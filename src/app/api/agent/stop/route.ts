import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { stopScheduler, getSchedulerStatus } = await import("@/agent/scheduler");
    stopScheduler();
    return NextResponse.json({ ok: true, status: getSchedulerStatus() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}