import { logger } from "@/lib/logger";

const SCRAPER_API_URL = "https://x-scrapper-wheat.vercel.app/api/results";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '10');

    logger.info(`[TweetsAPI] Fetching real-time signals from ${SCRAPER_API_URL}`);
    
    // FETCH DIRECTLY FROM THE VERCEL SCRAPER API (REAL IMPLEMENTATION)
    const res = await fetch(SCRAPER_API_URL, {
        cache: 'no-store' // Always fetch fresh to avoid caching empty states
    });
    
    if (!res.ok) throw new Error(`Scraper API returned ${res.status}`);
    
    const data = await res.json();
    const rawTweets = data.data || [];
    
    // Map to the internal format expected by the frontend
    const tweets = rawTweets.slice(0, limit).map((t: any, i: number) => ({
        id: i,
        username: t.account,
        text: t.tweet_text,
        time: t.tweet_time,
        likes: t.likes,
        retweets: t.retweets,
        scraped_at: t.scraped_at || t.tweet_time,
        is_crypto: t.importance_score > 0.5 ? 1 : 0,
        sentiment: t.sentiment
    }));

    return Response.json({
      tweets,
      total: data.count || tweets.length,
      cryptoTotal: tweets.filter((t: any) => t.is_crypto === 1).length,
      source: "Vercel Scraper API"
    });
  } catch (e) {
    logger.error("[TweetsAPI] ERROR:", e);
    return Response.json({ tweets: [], total: 0, cryptoTotal: 0, error: String(e) });
  }
}