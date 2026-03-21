import { getLocalDbPath } from '@/db/githubFallback';
import Database from 'better-sqlite3';

export async function GET() {
  try {
    const dbPath = process.env.NODE_ENV === 'production'
      ? await getLocalDbPath()
      : 'scraper/crypto_tweets.db';

    const db = new Database(dbPath, { readonly: true });
    const tweets = db.prepare(
      'SELECT * FROM tweets ORDER BY scraped_at DESC LIMIT 100'
    ).all();
    db.close();

    return Response.json({ tweets });
  } catch (e) {
    return Response.json({ tweets: [], error: String(e) });
  }
}