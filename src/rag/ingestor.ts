import { getDatabase } from "../db/sqlite";
import { Document } from "@langchain/core/documents";
import { addDocuments } from "./vectorStore";
import { logger } from "@/lib/logger";

export function getTweetCount(): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM tweets").get() as { count: number };
/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Ingests recent tweets into the vector store for analysis.
 * If no recent tweets are found, it falls back to ingesting all crypto tweets.
 * If no tweets are found to ingest, it logs a warning and returns 0.
 * @param {number} hoursBack - The number of hours to look back for tweets (default = 2)
 * @returns {Promise<number>} The number of tweets ingested into the vector store
 */
/*******  1826066c-f767-4049-ac7a-8619fb72a7ae  *******/    return row?.count ?? 0;
  } catch { return 0; }
}

export function getRecentTweets(limit = 10): any[] {
  const db = getDatabase();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM tweets ORDER BY id DESC LIMIT ?").all(limit);
  } catch { return []; }
}

export function getCryptoTweets(limit = 100, hoursBack = 2): any[] {
  const db = getDatabase();
  if (!db) return [];
  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    return db.prepare(
      "SELECT * FROM tweets WHERE scraped_at >= ? ORDER BY id DESC LIMIT ?"
    ).all(since, limit);
  } catch { return []; }
}

export function getAllCryptoTweets(limit = 100): any[] {
  const db = getDatabase();
  if (!db) return [];
  try {
    return db.prepare(
      "SELECT * FROM tweets WHERE is_crypto = 1 ORDER BY id DESC LIMIT ?"
    ).all(limit);
  } catch {
    return getRecentTweets(limit);
  }
}

export const getAllTweets = getAllCryptoTweets;

export function getCachedDocs(): Document[] {
  const tweets = getAllTweets(100);
  return tweets.map((tweet: any) => 
    new Document({
      pageContent: tweet.text || tweet.content || "",
      metadata: {
        scraped_at: tweet.scraped_at,
        time: tweet.scraped_at,
        source: tweet.source || "twitter",
      },
    })
  );
}

export async function ingestTweets(hoursBack: number = 2): Promise<number> {
  try {
    const tweets = getCryptoTweets(100, hoursBack);
    if (tweets.length === 0) {
      logger.warn("No tweets found to ingest, falling back to all crypto tweets");
      const fallbackTweets = getAllCryptoTweets(100);
      if (fallbackTweets.length === 0) {
        logger.warn("No crypto tweets found in database");
        return 0;
      }
      const docs = fallbackTweets.map((tweet: any) =>
        new Document({
          pageContent: tweet.text || tweet.content || "",
          metadata: {
            scraped_at: tweet.scraped_at,
            time: tweet.scraped_at,
            source: tweet.source || "twitter",
          },
        })
      );
      await addDocuments(docs);
      return docs.length;
    }
    const docs = tweets.map((tweet: any) =>
      new Document({
        pageContent: tweet.text || tweet.content || "",
        metadata: {
          scraped_at: tweet.scraped_at,
          time: tweet.scraped_at,
          source: tweet.source || "twitter",
        },
      })
    );
    await addDocuments(docs);
    return docs.length;
  } catch (error) {
    logger.error(`Ingest tweets error: ${error}`);
    return 0;
  }
}