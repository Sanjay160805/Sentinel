import { getDatabase } from "./sqlite";

export function getTweetCount(): number {
  const db = getDatabase();
  if (!db) return 0;
  const row = db.prepare("SELECT COUNT(*) as count FROM tweets").get() as { count: number };
  return row?.count ?? 0;
}

export function getRecentTweets(limit = 10): any[] {
  const db = getDatabase();
  if (!db) return [];
  return db.prepare("SELECT * FROM tweets ORDER BY id DESC LIMIT ?").all(limit);
}