import { getDatabase } from "./sqlite";
import { logger } from "@/lib/logger";

export function saveDecision(decision: any): number {
  const db = getDatabase();
  if (!db) return 0;
  try {
    const stmt = db.prepare(`
      INSERT INTO decisions (cycle, timestamp, action, reasoning, threat_score, volatility, price, executed, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      decision.cycle ?? 0,
      decision.timestamp ?? new Date().toISOString(),
      decision.action ?? "HOLD",
      decision.reasoning ?? "",
      decision.threat_score ?? decision.threatScore ?? 0,
      decision.volatility ?? 0,
      decision.price ?? 0,
      decision.executed ? 1 : 0,
      decision.tx_hash ?? null,
    );
    return result.lastInsertRowid as number;
  } catch (error) {
    logger.error("saveDecision failed", error);
    return 0;
  }
}

export function getRecentDecisions(limit = 10): any[] {
  const db = getDatabase();
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM decisions ORDER BY id DESC LIMIT ?").all(limit);
  } catch { return []; }
}

export function getLastDecision(): any {
  const db = getDatabase();
  if (!db) return null;
  try {
    return db.prepare("SELECT * FROM decisions ORDER BY id DESC LIMIT 1").get() ?? null;
  } catch { return null; }
}