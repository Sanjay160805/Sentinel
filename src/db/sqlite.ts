import { logger } from "@/lib/logger";

let db: any = null;

function getDb() {
  if (db) return db;
  if (typeof window === "undefined") {
    try {
      const Database = require("better-sqlite3");
      const path = require("path");
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), "crypto_tweets.db");
      db = new Database(dbPath);
      logger.info(`SQLite connected: ${dbPath}`);

      // Auto-create tables so fresh installs never fail
      db.exec(`
        CREATE TABLE IF NOT EXISTS decisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cycle INTEGER,
          timestamp TEXT,
          action TEXT,
          reasoning TEXT,
          threat_score REAL,
          volatility REAL,
          price REAL,
          executed INTEGER DEFAULT 0,
          tx_hash TEXT
        );
        CREATE TABLE IF NOT EXISTS tweets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT,
          text TEXT,
          time TEXT,
          likes INTEGER DEFAULT 0,
          retweets INTEGER DEFAULT 0,
          scraped_at TEXT,
          is_crypto INTEGER DEFAULT 1
        );
      `);
    } catch (err) {
      logger.warn("SQLite not available (serverless environment) — using empty fallback");
      db = null;
    }
  }
  return db;
}

export function getDatabase() {
  return getDb();
}

export function isDbAvailable(): boolean {
  return getDb() !== null;
}