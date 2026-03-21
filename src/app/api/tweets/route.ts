import { getLocalDbPath } from '@/db/githubFallback';
import Database from 'better-sqlite3';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '10');

    const dbPath = process.env.NODE_ENV === 'production'
      ? await getLocalDbPath()
      : 'scraper/crypto_tweets.db';

    const db = new Database(dbPath, { readonly: true });

    const tweets = db.prepare(
      `SELECT * FROM tweets ORDER BY scraped_at DESC LIMIT ?`
    ).all(limit);

    const totalRow = db.prepare(
      `SELECT COUNT(*) as count FROM tweets`
    ).get() as { count: number };

    const cryptoRow = db.prepare(
      `SELECT COUNT(*) as count FROM tweets WHERE is_crypto = 1`
    ).get() as { count: number };

    db.close();

    return Response.json({
      tweets,
      total: totalRow?.count ?? 0,
      cryptoTotal: cryptoRow?.count ?? 0,
    });
  } catch (e) {
    return Response.json({ tweets: [], total: 0, cryptoTotal: 0, error: String(e) });
  }
}