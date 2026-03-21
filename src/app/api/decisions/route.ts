import { NextRequest, NextResponse } from "next/server";
import { getRecentDecisions } from "@/db/decisions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const decisions = getRecentDecisions(limit);
    return NextResponse.json({
      ok: true,
      decisions,
      total: decisions.length,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}