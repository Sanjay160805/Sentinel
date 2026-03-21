"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Decision {
  id: number;
  action: string;
  reason: string;
  threatScore: number;
  price: number;
  timestamp: string;
  sequence?: number;
  fromHCS?: boolean;
  walletId?: string;
}

const DOT_COLORS: Record<string, string> = {
  TIGHTEN: "#7c3aed", PROTECT: "#ef4444", HARVEST: "#f59e0b",
  HOLD: "#3b82f6", WIDEN: "#10b981",
};

const HCS_TOPIC_ID = process.env.NEXT_PUBLIC_HCS_TOPIC_ID ?? "0.0.8314584";

export default function DecisionFeed({ expanded = false }: { expanded?: boolean }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [source, setSource] = useState<string>("loading");
  const [loading, setLoading] = useState(true);
  const { accountId } = useWallet();

  useEffect(() => {
    const load = async () => {
      try {
        const walletParam = accountId ? `&wallet=${accountId}` : "";
        const d = await fetch(
          `/api/decisions?limit=${expanded ? 50 : 8}${walletParam}`
        ).then(r => r.json());
        setDecisions(d.decisions ?? []);
        setSource(d.source ?? "unknown");
      } catch {
        setDecisions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [expanded, accountId]);

  const fmt = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  return (
    <div className="card">
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Decision Log
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {source === "hcs" && (
            <span className="badge" style={{
              fontSize: "0.6rem", padding: "0.1rem 0.4rem",
              background: "#d1fae5", color: "#065f46",
            }}>
              ⛓ Hedera HCS
            </span>
          )}
          {(source === "sqlite" || source === "sqlite-fallback") && (
            <span className="badge" style={{
              fontSize: "0.6rem", padding: "0.1rem 0.4rem",
              background: "#f3f4f6", color: "#6b7280",
            }}>
              Local DB
            </span>
          )}
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {decisions.length} entries
          </span>
        </div>
      </div>

      <div className="timeline" style={{
        maxHeight: expanded ? "none" : 280,
        overflowY: "auto",
      }}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            Loading from Hedera...
          </p>
        ) : decisions.length === 0 ? (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
              {accountId
                ? `No decisions yet for ${accountId}. Run a cycle.`
                : "Connect wallet to see your decisions, or run a cycle."}
            </p>
          </div>
        ) : decisions.map((d, i) => (
          <div key={d.id ?? i} className="timeline-item">
            <span
              className="timeline-dot"
              style={{
                color: DOT_COLORS[d.action] ?? "#6b7280",
                background: DOT_COLORS[d.action] ?? "#6b7280",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <span className={`badge badge-${d.action?.toLowerCase()}`}>
                {d.action}
              </span>
              {d.sequence && (
                <span className="mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                  #{d.sequence}
                </span>
              )}
              <span className="mono" style={{
                fontSize: "0.66rem", color: "var(--text-muted)", marginLeft: "auto",
              }}>
                {fmt(d.timestamp)}
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {d.reason}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.2rem", alignItems: "center" }}>
              <span className="mono" style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>
                Threat: {Math.round((d.threatScore ?? 0) * 100)}%
              </span>
              <span className="mono" style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>
                ${(d.price ?? 0).toFixed(4)}
              </span>
              {d.fromHCS && (
                <span style={{ fontSize: "0.6rem", color: "#10b981", marginLeft: "auto" }}>
                  ✓ on-chain
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {source === "hcs" && (
        <div style={{
          marginTop: "0.75rem", padding: "0.5rem 0.75rem",
          background: "#f0fdf4", borderRadius: 8,
          border: "1px solid #bbf7d0",
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span style={{ fontSize: "0.7rem", color: "#166534" }}>
            Live from Hedera HCS ·{" "}
            <a
              href={`https://hashscan.io/testnet/topic/${HCS_TOPIC_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#059669", fontWeight: 600 }}
            >
              View on HashScan ↗
            </a>
          </span>
        </div>
      )}
    </div>
  );
}