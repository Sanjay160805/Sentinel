const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'crypto_tweets.db'));

db.exec(
  "CREATE TABLE IF NOT EXISTS decisions (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "cycle INTEGER," +
  "timestamp TEXT," +
  "action TEXT," +
  "reasoning TEXT," +
  "threat_score REAL," +
  "volatility REAL," +
  "price REAL," +
  "executed INTEGER DEFAULT 0," +
  "tx_hash TEXT" +
  ")"
);

console.log('decisions table created successfully');
db.close();