import { NextResponse } from "next/server";
import { getVaultPosition } from "@/bonzo/keeper";
import { getHBARUSDPrice, getPriceFeedMeta } from "@/oracle/priceFeeds";

export async function GET() {
  try {
    const [position, hbarPrice, priceMeta] = await Promise.all([
      getVaultPosition(),
      getHBARUSDPrice(),
      getPriceFeedMeta(),
    ]);
    return NextResponse.json({
      ok: true,
      position,
      price: {
        value: hbarPrice,
        source: priceMeta?.source ?? "mock",
        timestamp: priceMeta?.timestamp ?? Date.now(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}