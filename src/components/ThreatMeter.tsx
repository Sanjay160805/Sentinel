"use client";
import { useEffect, useState } from "react";

export default function ThreatMeter() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState("LOW");
  const [action, setAction] = useState("—");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/status").then(x => x.json());
        const d = r.agent?.lastDecision;
        if (d) {
          setScore(d.threatScore ?? 0);
          setLevel(d.threatLevel ?? "LOW");
          setAction(d.action ?? "—");
          setReason(d.reasoning ?? d.reason ?? "");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.round(score * 100);
  const levelColor: Record<string, string> = {
    LOW: "#10b981", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#9d174d"
  };
  const color = levelColor[level] ?? "#10b981";

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Threat Level
        {!loading && (
          <span className="badge" style={{ marginLeft: "auto", background: color + "22", color }}>
            {level}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 100, background: "#f1f5f9", borderRadius: 8, animation: "shimmer 1.5s infinite" }} />
      ) : (
        <>
          <div className="mono" style={{ fontSize: "2.5rem", fontWeight: 700, color, lineHeight: 1, marginBottom: "0.5rem" }}>
            {pct}%
          </div>
          <div className="threat-bar-track">
            <div className="threat-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Last action:</span>
            <span className={`badge badge-${action.toLowerCase()}`}>{action}</span>
          </div>
          {reason && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
              {reason}
            </p>
          )}
        </>
      )}
    </div>
  );
}