import axios from "axios";
import { COINGECKO_API_KEY, COINGECKO_TOKEN_ID, PRICE_HISTORY_DAYS } from "./config";
import { logger } from "./logger";

export interface PriceSnapshot {
  tokenId:   string;
  priceUsd:  number;
  change1h:  number;
  change24h: number;
  change7d:  number;
  volume24h: number;
  marketCap: number;
  fetchedAt: Date;
}

export interface OHLCCandle {
  timestamp: number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
}

export interface MarketData {
  snapshot: PriceSnapshot;
  candles:  OHLCCandle[];
}

const BASE_URL = "https://api.coingecko.com/api/v3";

function headers() {
  return COINGECKO_API_KEY ? { "x-cg-demo-api-key": COINGECKO_API_KEY } : {};
}

export async function fetchPriceSnapshot(): Promise<PriceSnapshot> {
  logger.info(`[Scraper] Fetching price snapshot for ${COINGECKO_TOKEN_ID} ...`);
  const res = await axios.get(`${BASE_URL}/coins/${COINGECKO_TOKEN_ID}`, {
    headers: headers(),
    params: { localization: false, tickers: false, community_data: false, developer_data: false },
    timeout: 10_000,
  });
  const md = res.data.market_data;
  return {
    tokenId:   COINGECKO_TOKEN_ID,
    priceUsd:  md.current_price.usd ?? 0,
    change1h:  md.price_change_percentage_1h_in_currency?.usd ?? 0,
    change24h: md.price_change_percentage_24h ?? 0,
    change7d:  md.price_change_percentage_7d ?? 0,
    volume24h: md.total_volume.usd ?? 0,
    marketCap: md.market_cap.usd ?? 0,
    fetchedAt: new Date(),
  };
}

export async function fetchOHLCCandles(): Promise<OHLCCandle[]> {
  logger.info(`[Scraper] Fetching ${PRICE_HISTORY_DAYS}d OHLC candles ...`);
  const res = await axios.get(`${BASE_URL}/coins/${COINGECKO_TOKEN_ID}/ohlc`, {
    headers: headers(),
    params: { vs_currency: "usd", days: PRICE_HISTORY_DAYS },
    timeout: 10_000,
  });
  return (res.data as number[][]).map(([ts, o, h, l, c]) => ({
    timestamp: ts, open: o, high: h, low: l, close: c,
  }));
}

export async function fetchMarketData(): Promise<MarketData> {
  const [snapshot, candles] = await Promise.all([fetchPriceSnapshot(), fetchOHLCCandles()]);
  logger.info(
    `[Scraper] Price: $${snapshot.priceUsd.toFixed(6)}  ` +
    `24h: ${snapshot.change24h.toFixed(2)}%  7d: ${snapshot.change7d.toFixed(2)}%`
  );
  return { snapshot, candles };
}
