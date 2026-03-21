"use client";
import { useEffect, useState } from "react";

interface StatusData { ok: boolean; agent: { running: boolean; tweetCount: number; interval: number; lastDecision: { action?: string; timestamp?: string; hcsTopic?: string; } | null; }; timestamp: string; }

export default function StatusBadge() {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const agent = status?.agent;
  const isRunning = agent?.running ?? false;

  const rows = agent ? [
    { label: "Network",     value: "Hedera Testnet",                                                                                                           color: "#7c3aed" },
    { label: "Tweets",      value: (agent.tweetCount ?? 0).toLocaleString(),                                                                                   color: "#0ea5e9" },
    { label: "Last Action", value: agent.lastDecision?.action ?? "—",                                                                                         color: "#7c3aed" },
    { label: "Last Cycle",  value: agent.lastDecision?.timestamp ? new Date(agent.lastDecision.timestamp.replace(" ", "T")).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "Never", color: "var(--text-secondary)" },
    { label: "Interval",    value: `${((agent.interval ?? 3600000) / 60000).toFixed(0)} min`,                                                                  color: "#f59e0b" },
    { label: "HCS Topic",   value: agent.lastDecision?.hcsTopic ?? "0.0.8008987",                                                                             color: "#10b981" },
  ] : [];

  return (
    <div className="card">
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        System Status
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", fontWeight: 600, color: isRunning ? "#065f46" : "#dc2626" }}>
          <span className={`pulse-dot ${isRunning ? "running" : "stopped"}`} />
          {isRunning ? "Online" : "Offline"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.length === 0 ? (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Loading...</p>
        ) : rows.map(row => (
          <div key={row.label} className="data-row">
            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.label}</span>
            <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 600, color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}