import { logger } from "@/lib/logger";

const SCRAPER_API_URL = "https://x-scrapper-wheat.vercel.app/api/results";

/**
 * PRODUCTION: Fetch latest signals directly from Vercel Scraper API.
 * Replaces local SQLite queries for higher real-time accuracy and "REAL" implementation.
 */
export async function getRecentTweetsAsync(limit = 100): Promise<any[]> {
  try {
    logger.info(`[TweetsDB] Fetching live signals from ${SCRAPER_API_URL}`);
    const res = await fetch(SCRAPER_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Scraper API returned ${res.status}`);
    const data = await res.json();
    const raw = data.data || [];
    
    return raw.slice(0, limit).map((t: any, i: number) => ({
      id: i,
      username: t.account,
      text: t.tweet_text,
      time: t.tweet_time,
      likes: t.likes || 0,
      retweets: t.retweets || 0,
      scraped_at: t.scraped_at || t.tweet_time,
      is_crypto: t.importance_score > 0.5 ? 1 : 0
    }));
  } catch (err) {
    logger.error("[TweetsDB] Live fetch failed:", err);
    return [];
  }
}

// Sync fallback for components still using non-async (throws error in production to force migration)
export function getRecentTweets(limit = 10): any[] {
  throw new Error("Synchronous getRecentTweets is deprecated for REAL implementation. Use getRecentTweetsAsync instead.");
}

export async function getTweetCountAsync(): Promise<number> {
    try {
        const res = await fetch(SCRAPER_API_URL, { cache: 'no-store' });
        const data = await res.json();
        return data.count || (data.data?.length ?? 0);
    } catch { return 0; }
}

export function getTweetCount(): number { return 0; }