"use client";
import { useEffect, useState } from "react";

interface Position {
  asset: string;
  deposited: string;
  borrowed: string;
  healthFactor: string;
  apy: string;
  rewards: string;
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between",
          padding: "0.4rem 0", borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ width: 70, height: 12, background: "#e2e8f0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
          <div style={{ width: 90, height: 12, background: "#e2e8f0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
        </div>
      ))}
    </div>
  );
}

export default function PositionCard() {
  const [pos, setPos] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [hbarPrice, setHbarPrice] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/positions").then(d => d.json());
        setPos(r.position ?? null);
        // Use CoinGecko if supra returns 0
        const rawPrice = r.price?.value ?? 0;
        if (rawPrice > 0) {
          setHbarPrice(rawPrice);
        } else {
          const cg = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd")
            .then(d => d.json()).catch(() => ({}));
          setHbarPrice(cg?.["hedera-hashgraph"]?.usd ?? 0.085);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const deposited = parseFloat(pos?.deposited ?? "0");
  const usdValue = (deposited * hbarPrice).toFixed(2);
  const hf = pos?.healthFactor;
  const healthDisplay = hf === "Infinity" || hf === "â" || hf === "∞" ? "∞" : hf ?? "—";
  const healthColor = healthDisplay === "∞" ? "#10b981" : parseFloat(hf ?? "0") > 1.5 ? "#10b981" : "#ef4444";

  const rows = pos ? [
    { label: "Deposited",  value: `${pos.deposited} ${pos.asset}`, sub: `≈ $${usdValue}`, color: "#6366f1" },
    { label: "Borrowed",   value: pos.borrowed === "0.0000" ? "None" : pos.borrowed,        color: "var(--text-primary)" },
    { label: "Health",     value: healthDisplay,                                             color: healthColor },
    { label: "APY",        value: pos.apy,                                                  color: "#10b981" },
    { label: "Rewards",    value: pos.rewards,                                              color: "#8b5cf6" },
  ] : [];

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #10b981, #06b6d4)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        </svg>
        Vault Position
        <span className="badge" style={{ marginLeft: "auto", background: "#d1fae5", color: "#065f46" }}>
          Bonzo · Testnet
        </span>
      </div>

      {loading ? <Skeleton /> : pos ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {rows.map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{row.label}</span>
              <div style={{ textAlign: "right" }}>
                <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 600, color: row.color }}>{row.value}</span>
                {row.sub && <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{row.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Failed to load position.</p>
      )}
    </div>
  );
}