"use client";
import { useEffect, useState } from "react";

interface StatusData {
  ok: boolean;
  agent: {
    running: boolean;
    tweetCount: number;
    interval: number;
    lastDecision: {
      action?: string;
      timestamp?: string;
      hcsTopic?: string;
    } | null;
  };
  timestamp: string;
}

export default function StatusBadge() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const agent = status?.agent;

  const rows = agent ? [
    { label: "Network",      value: "Hedera Testnet",                                                          color: "#6366f1" },
    { label: "Tweets",       value: (agent.tweetCount ?? 0).toLocaleString(),                                  color: "#0ea5e9" },
    { label: "Last Action",  value: agent.lastDecision?.action ?? "—",                                         color: "#8b5cf6" },
    { label: "Last Cycle",   value: agent.lastDecision?.timestamp
        ? new Date(agent.lastDecision.timestamp.replace(" ", "T")).toLocaleTimeString()
        : "Never",                                                                                              color: "var(--text-secondary)" },
    { label: "Interval",     value: `${((agent.interval ?? 3600000) / 60000).toFixed(0)} min`,                 color: "#f59e0b" },
  ] : [];

  const isRunning = agent?.running ?? false;

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #64748b, #94a3b8)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        System Status
        <span style={{ marginLeft: "auto" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", fontWeight: 600, color: isRunning ? "#065f46" : "#dc2626" }}>
            <span className={`pulse-dot ${isRunning ? "running" : "stopped"}`} style={{ width: 6, height: 6 }} />
            {isRunning ? "Online" : "Offline"}
          </span>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Loading...</p>
        ) : rows.map(row => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{row.label}</span>
            <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 600, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f8faff", borderRadius: 10, border: "1px solid #e0e7ff" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Stack</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {["Next.js 15", "LangGraph", "Gemini 2.0", "Hedera SDK", "Bonzo Finance", "Supra Oracle"].map(t => (
            <span key={t} className="badge" style={{ background: "#ede9fe", color: "#6d28d9", fontSize: "0.65rem" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}