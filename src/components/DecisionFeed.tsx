"use client";
import { useEffect, useState } from "react";

interface Decision {
  id: number;
  action: string;
  reason: string;
  threatScore: number;
  price: number;
  timestamp: string;
}

const DOT_COLORS: Record<string, string> = {
  TIGHTEN: "#8b5cf6", PROTECT: "#ef4444", HARVEST: "#f59e0b",
  HOLD: "#3b82f6", WIDEN: "#10b981",
};

export default function DecisionFeed() {
  const [decisions, setDecisions] = useState<Decision[]>([]);

  useEffect(() => {
    const load = () => fetch("/api/decisions?limit=8").then(r => r.json())
      .then(d => setDecisions(d.decisions ?? [])).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Decision Log
        <span className="mono" style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{decisions.length} entries</span>
      </div>

      <div className="timeline" style={{ maxHeight: 280, overflowY: "auto" }}>
        {decisions.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>No decisions yet. Run a cycle.</p>
        ) : decisions.map((d, i) => (
          <div key={d.id ?? i} className="timeline-item">
            <span className="timeline-dot" style={{ color: DOT_COLORS[d.action] ?? "#64748b", background: DOT_COLORS[d.action] ?? "#64748b" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span className={`badge badge-${d.action?.toLowerCase()}`}>{d.action}</span>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "auto" }}>
                {new Date(d.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{d.reason}</p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                Threat: {Math.round((d.threatScore ?? 0) * 100)}%
              </span>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                ${(d.price ?? 0).toFixed(4)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}