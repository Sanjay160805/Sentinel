import { Document } from "@langchain/core/documents";
import { addDocuments } from "./vectorStore";
import { logger } from "@/lib/logger";

const SCRAPER_API_URL = "https://x-scrapper-wheat.vercel.app/api/results";

/**
 * Get most recent tweets from the Vercel Scraper API.
 * Real implementation only: no fallbacks or local mock DBs.
 */
export async function getRecentTweets(limit = 100): Promise<any[]> {
  try {
    const res = await fetch(SCRAPER_API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Scraper API returned ${res.status}`);
    const data = await res.json();
    const raw = data.data || [];
    
    // Map to normalized format
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
    logger.error("[Ingestor] API Fetch failed:", err);
    return [];
  }
}

/**
 * Ingest the real signals from Vercel into the vector store.
 */
export async function getCachedDocs(): Promise<Document[]> {
  const tweets = await getRecentTweets(100);
  return tweets.map((tweet: any) => 
    new Document({
      pageContent: tweet.text || "",
      metadata: {
        scraped_at: tweet.scraped_at,
        time: tweet.scraped_at,
        source: tweet.username || "Vercel Scraper",
      },
    })
  );
}

/**
 * Trigger real signal ingestion for RAG cross-analysis.
 */
export async function ingestTweets(limit: number = 50): Promise<number> {
  try {
    logger.info(`[Ingestor] Syncing real signals from ${SCRAPER_API_URL}...`);
    const tweets = await getRecentTweets(limit);
    if (tweets.length === 0) return 0;
    
    const docs = tweets.map((tweet: any) =>
      new Document({
        pageContent: tweet.text || "",
        metadata: {
          scraped_at: tweet.scraped_at,
          time: tweet.scraped_at,
          source: tweet.username || "Vercel Scraper",
        },
      })
    );
    await addDocuments(docs);
    return docs.length;
  } catch (error) {
    logger.error(`[Ingestor] SIGNAL INGEST FAILED: ${error}`);
    return 0;
  }
}

export async function getTweetCount(): Promise<number> {
    try {
        const res = await fetch(SCRAPER_API_URL, { cache: 'no-store' });
        const data = await res.json();
        return data.count || (data.data?.length ?? 0);
    } catch { return 0; }
}