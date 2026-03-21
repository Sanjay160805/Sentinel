import { NextRequest, NextResponse } from "next/server";

const HCS_TOPIC_ID = process.env.HCS_TOPIC_ID ?? "0.0.8314584";
const MIRROR_URL = `https://testnet.mirrornode.hedera.com/api/v1/topics/${HCS_TOPIC_ID}/messages`;

interface HCSMessage {
  consensus_timestamp: string;
  message: string;
  sequence_number: number;
}

interface Decision {
  id: number;
  action: string;
  reason: string;
  threatScore: number;
  price: number;
  timestamp: string;
  sequence: number;
  fromHCS: boolean;
  walletId?: string;
}

function parseHCSMessage(msg: HCSMessage): Decision | null {
  try {
    const decoded = Buffer.from(msg.message, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (parsed.type !== "SENTINEL_DECISION") return null;
    return {
      id: msg.sequence_number,
      action: parsed.action ?? "HOLD",
      reason: parsed.reasoning ?? parsed.reason ?? "—",
      threatScore: parsed.threat_score ?? 0,
      price: parsed.price ?? 0,
      timestamp: new Date(
        parseFloat(msg.consensus_timestamp) * 1000
      ).toISOString(),
      sequence: msg.sequence_number,
      fromHCS: true,
      walletId: parsed.wallet_id ?? "unknown",
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const walletId = searchParams.get("wallet") ?? null;

    // Fetch from Hedera mirror node — get more to allow filtering
    const fetchLimit = walletId ? Math.min(limit * 5, 100) : limit;
    const url = `${MIRROR_URL}?limit=${fetchLimit}&order=desc`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 10 },
    });

    if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);

    const data = await res.json();
    const messages: HCSMessage[] = data.messages ?? [];

    let decisions = messages
      .map(parseHCSMessage)
      .filter(Boolean) as Decision[];

    // Filter by wallet if provided
    if (walletId) {
      decisions = decisions.filter(d =>
        d.walletId === walletId ||
        d.walletId === "unknown"
      );
    }

    decisions = decisions.slice(0, limit);

    // Fallback to SQLite if HCS returns nothing
    if (decisions.length === 0) {
      const { getRecentDecisions } = await import("@/db/decisions");
      const local = getRecentDecisions(limit);
      return NextResponse.json({
        ok: true,
        decisions: local,
        total: local.length,
        source: "sqlite",
      });
    }

    return NextResponse.json({
      ok: true,
      decisions,
      total: decisions.length,
      source: "hcs",
      topic: HCS_TOPIC_ID,
    });

  } catch (error) {
    try {
      const { getRecentDecisions } = await import("@/db/decisions");
      const local = getRecentDecisions(20);
      return NextResponse.json({
        ok: true,
        decisions: local,
        total: local.length,
        source: "sqlite-fallback",
      });
    } catch {
      return NextResponse.json({
        ok: false,
        decisions: [],
        total: 0,
        error: String(error),
      });
    }
  }
}