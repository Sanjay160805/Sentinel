import { logger } from "@/lib/logger";

let db: any = null;
let dbInitialized = false;

function getDb() {
  if (db) return db;
  if (typeof window === "undefined") {
    try {
      const Database = require("better-sqlite3");
      const path = require("path");
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), "crypto_tweets.db");
      db = new Database(dbPath);
      logger.info(`SQLite connected: ${dbPath}`);
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

export async function getDatabaseAsync(): Promise<any> {
  if (db) return db;
  if (typeof window !== "undefined") return null;

  try {
    const Database = require("better-sqlite3");
    // Try local first
    try {
      const path = require("path");
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), "crypto_tweets.db");
      db = new Database(dbPath);
      return db;
    } catch {
      // Local failed — download from GitHub
      logger.info("Local DB not found, downloading from GitHub...");
      const { getLocalDbPath } = await import("./githubFallback");
      const tmpPath = await getLocalDbPath();
      db = new Database(tmpPath, { readonly: true });
      logger.info("GitHub DB loaded successfully");
      return db;
    }
  } catch (err) {
    logger.warn("DB unavailable: " + String(err));
    return null;
  }
}

export function isDbAvailable(): boolean {
  return getDb() !== null;
}