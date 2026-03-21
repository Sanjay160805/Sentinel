"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Position {
  asset: string;
  deposited: string;
  borrowed: string;
  healthFactor: string;
  apy: string;
  rewards: string;
}

type Tab = "overview" | "deposit" | "withdraw";

export default function PositionCard() {
  const [pos, setPos] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [hbarPrice, setHbarPrice] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [amount, setAmount] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState<{ ok: boolean; message: string; txHash?: string } | null>(null);
  const { connected, isOwner } = useWallet();

  const loadPosition = async () => {
    try {
      const r = await fetch("/api/positions").then(d => d.json());
      setPos(r.position ?? null);
      const raw = r.price?.value ?? 0;
      if (raw > 0) {
        setHbarPrice(raw);
      } else {
        const cg = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
        ).then(d => d.json()).catch(() => ({}));
        setHbarPrice(cg?.["hedera-hashgraph"]?.usd ?? 0.085);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosition();
    const t = setInterval(loadPosition, 30000);
    return () => clearInterval(t);
  }, []);

  const handleAction = async (action: "deposit" | "withdraw") => {
    if (!amount || parseFloat(amount) <= 0) return;
    setTxLoading(true);
    setTxResult(null);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount: parseFloat(amount) }),
      }).then(r => r.json());

      setTxResult({
        ok: res.ok,
        message: res.message ?? res.error ?? "Unknown result",
        txHash: res.txHash,
      });

      if (res.ok) {
        setAmount("");
        setTimeout(() => loadPosition(), 2000);
        setTimeout(() => setTxResult(null), 6000);
      }
    } catch (e) {
      setTxResult({ ok: false, message: String(e) });
    } finally {
      setTxLoading(false);
    }
  };

  const deposited = parseFloat(pos?.deposited ?? "0");
  const usdValue = (deposited * hbarPrice).toFixed(2);
  const hf = pos?.healthFactor;
  const healthDisplay = hf === "Infinity" || hf === "∞" ? "∞" : hf ?? "—";
  const healthColor = healthDisplay === "∞" ? "#10b981"
    : parseFloat(hf ?? "0") > 1.5 ? "#10b981" : "#ef4444";

  const rows = pos ? [
    { label: "Deposited", value: `${pos.deposited} ${pos.asset}`, sub: `≈ $${usdValue}`, color: "#7c3aed" },
    { label: "Borrowed",  value: pos.borrowed === "0.0000" ? "None" : pos.borrowed, color: "var(--text-primary)" },
    { label: "Health",    value: healthDisplay, color: healthColor },
    { label: "APY",       value: pos.apy, color: "#10b981" },
    { label: "Rewards",   value: pos.rewards, color: "#7c3aed" },
  ] : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "deposit",  label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  return (
    <div className="card">
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Vault Position
        <span className="badge badge-low" style={{ marginLeft: "auto" }}>
          Bonzo · Testnet
        </span>
      </div>

      {/* Tabs — only show deposit/withdraw if connected */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
        {tabs.map(t => (
          (!connected && t.id !== "overview") ? null : (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setTxResult(null); setAmount(""); }}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: 6,
                border: "none",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                background: tab === t.id ? "var(--accent)" : "var(--bg)",
                color: tab === t.id ? "white" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          )
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 70, height: 11, background: "#e8eaf0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
                <div style={{ width: 90, height: 11, background: "#e8eaf0", borderRadius: 4, animation: "shimmer 1.5s infinite" }} />
              </div>
            ))}
          </div>
        ) : pos ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map(row => (
              <div key={row.label} className="data-row">
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: row.color }}>
                    {row.value}
                  </span>
                  {row.sub && (
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{row.sub}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Failed to load position.</p>
        )
      )}

      {/* Deposit tab */}
      {tab === "deposit" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ background: "#f5f3ff", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#5b21b6" }}>
            Current position: <strong>{pos?.deposited ?? "—"} HBAR</strong> · APY: <strong>{pos?.apy ?? "—"}</strong>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
              Amount to deposit (HBAR)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.1"
                style={{
                  flex: 1, padding: "0.6rem 0.75rem",
                  borderRadius: 8, border: "1.5px solid var(--border)",
                  fontSize: "0.9rem", fontFamily: "JetBrains Mono, monospace",
                  outline: "none", color: "var(--text-primary)",
                  background: "white",
                }}
              />
              <button
                onClick={() => setAmount("1")}
                style={{ padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.72rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                1 HBAR
              </button>
              <button
                onClick={() => setAmount("5")}
                style={{ padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.72rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                5 HBAR
              </button>
            </div>
            {amount && hbarPrice > 0 && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                ≈ ${(parseFloat(amount) * hbarPrice).toFixed(4)} USD
              </div>
            )}
          </div>

          <button
            onClick={() => handleAction("deposit")}
            disabled={txLoading || !amount || parseFloat(amount) <= 0}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "0.65rem" }}
          >
            {txLoading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Depositing...
              </>
            ) : `Deposit ${amount || "0"} HBAR into Bonzo`}
          </button>

          {txResult && (
            <div style={{
              padding: "0.65rem 0.75rem", borderRadius: 8,
              background: txResult.ok ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${txResult.ok ? "#bbf7d0" : "#fecaca"}`,
              fontSize: "0.75rem",
              color: txResult.ok ? "#166534" : "#dc2626",
            }}>
              {txResult.ok ? "✓ " : "✗ "}{txResult.message}
              {txResult.txHash && (
                <div className="mono" style={{ fontSize: "0.65rem", marginTop: "0.25rem", opacity: 0.7 }}>
                  tx: {txResult.txHash.slice(0, 32)}...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Withdraw tab */}
      {tab === "withdraw" && connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "0.75rem", fontSize: "0.75rem", color: "#065f46" }}>
            Available to withdraw: <strong>{pos?.deposited ?? "—"} HBAR</strong>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem" }}>
              Amount to withdraw (HBAR)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                step="0.1"
                style={{
                  flex: 1, padding: "0.6rem 0.75rem",
                  borderRadius: 8, border: "1.5px solid var(--border)",
                  fontSize: "0.9rem", fontFamily: "JetBrains Mono, monospace",
                  outline: "none", color: "var(--text-primary)",
                  background: "white",
                }}
              />
              <button
                onClick={() => setAmount(pos?.deposited ?? "0")}
                style={{ padding: "0.6rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.72rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                Max
              </button>
            </div>
            {amount && hbarPrice > 0 && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                ≈ ${(parseFloat(amount) * hbarPrice).toFixed(4)} USD
              </div>
            )}
          </div>

          <button
            onClick={() => handleAction("withdraw")}
            disabled={txLoading || !amount || parseFloat(amount) <= 0}
            className="btn"
            style={{
              width: "100%", justifyContent: "center", padding: "0.65rem",
              background: "#ef4444", color: "white", border: "none",
            }}
          >
            {txLoading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Withdrawing...
              </>
            ) : `Withdraw ${amount || "0"} HBAR from Bonzo`}
          </button>

          {txResult && (
            <div style={{
              padding: "0.65rem 0.75rem", borderRadius: 8,
              background: txResult.ok ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${txResult.ok ? "#bbf7d0" : "#fecaca"}`,
              fontSize: "0.75rem",
              color: txResult.ok ? "#166534" : "#dc2626",
            }}>
              {txResult.ok ? "✓ " : "✗ "}{txResult.message}
              {txResult.txHash && (
                <div className="mono" style={{ fontSize: "0.65rem", marginTop: "0.25rem", opacity: 0.7 }}>
                  tx: {txResult.txHash.slice(0, 32)}...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}