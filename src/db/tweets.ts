import { getDatabase, getDatabaseAsync } from "./sqlite";

export function getTweetCount(): number {
  const db = getDatabase();
  if (!db) return 0;
  const row = db.prepare("SELECT COUNT(*) as count FROM tweets").get() as { count: number };
  return row?.count ?? 0;
}

export async function getTweetCountAsync(): Promise<number> {
  const db = await getDatabaseAsync();
  if (!db) return 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM tweets").get() as { count: number };
    return row?.count ?? 0;
  } catch { return 0; }
}

export function getRecentTweets(limit = 10): any[] {
  const db = getDatabase();
  if (!db) return [];
  return db.prepare("SELECT * FROM tweets ORDER BY id DESC LIMIT ?").all(limit);
}

export async function getRecentTweetsAsync(limit = 100): Promise<any[]> {
  const db = await getDatabaseAsync();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM tweets ORDER BY scraped_at DESC LIMIT ?").all(limit);
  } catch { return []; }
}