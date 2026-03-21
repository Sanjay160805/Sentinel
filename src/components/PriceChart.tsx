"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export default function PriceChart() {
  const [price, setPrice] = useState(0);
  const [source, setSource] = useState<string>("mock");
  const [history, setHistory] = useState<{ t: string; v: number }[]>([]);
  const [change, setChange] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/positions").then(x => x.json());
        let p = r.price?.value ?? 0;
        let src = r.price?.source ?? "mock";

        // Fallback to CoinGecko if supra returns 0
        if (p === 0) {
          const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd")
            .then(x => x.json()).catch(() => ({}));
          p = cg?.["hedera-hashgraph"]?.usd ?? 0.085;
          src = "coingecko";
        }

        setPrice(p);
        setSource(src);
        setHistory(prev => {
          const next = [...prev, { t: new Date().toLocaleTimeString(), v: p }].slice(-24);
          if (next.length >= 2) {
            setChange(((next[next.length - 1].v - next[0].v) / next[0].v) * 100);
          }
          return next;
        });
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const sourceLabel: Record<string, string> = {
    supra: "Supra Oracle", rest_api: "Supra REST", coingecko: "CoinGecko", mock: "Mock"
  };
  const sourceBg: Record<string, string> = {
    supra: "#ede9fe", rest_api: "#ede9fe", coingecko: "#d1fae5", mock: "#f1f5f9"
  };
  const sourceColor: Record<string, string> = {
    supra: "#6d28d9", rest_api: "#6d28d9", coingecko: "#065f46", mock: "#64748b"
  };

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Price Feed
        <span className="badge" style={{ marginLeft: "auto", background: sourceBg[source] ?? "#f1f5f9", color: sourceColor[source] ?? "#64748b" }}>
          {sourceLabel[source] ?? source}
        </span>
      </div>

      {loading ? (
        <div style={{ height: 80, background: "#f1f5f9", borderRadius: 8, animation: "shimmer 1.5s infinite", marginBottom: "1rem" }} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <span className="mono" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              ${price.toFixed(6)}
            </span>
            <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: change >= 0 ? "#10b981" : "#ef4444" }}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>HBAR / USDT</div>

          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={history}>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e4e9f5", borderRadius: 8, fontSize: "0.72rem" }}
                  formatter={(v) => [`$${Number(v).toFixed(6)}`, "HBAR"]}
                />
                <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.75rem", background: "#f8faff", borderRadius: 8 }}>
              Collecting price history...
            </div>
          )}
        </>
      )}
    </div>
  );
}