"use client";
import { useState, useEffect, useCallback } from "react";
import ThreatMeter from "./ThreatMeter";
import DecisionFeed from "./DecisionFeed";
import TweetFeed from "./TweetFeed";
import PositionCard from "./PositionCard";
import PriceChart from "./PriceChart";
import StatusBadge from "./StatusBadge";
import WalletConnect from "./WalletConnect";
import { useWallet } from "@/context/WalletContext";

export default function Dashboard() {
  const [agentRunning, setAgentRunning] = useState(false);
  const [tweetCount, setTweetCount] = useState(0);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [lastCycle, setLastCycle] = useState<string | null>(null);
  const [hbarPrice, setHbarPrice] = useState<number>(0);
  const [vaultDeposited, setVaultDeposited] = useState<string>("—");
  const [vaultApy, setVaultApy] = useState<string>("—");
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number>(60);
  const { connected, accountId, connect, disconnect } = useWallet();

  // Load status + tweet count
  useEffect(() => {
    const load = async () => {
      try {
        const [statusRes, tweetsRes] = await Promise.all([
          fetch("/api/status").then(r => r.json()),
          fetch("/api/tweets?limit=1").then(r => r.json()),
        ]);
        setAgentRunning(statusRes.agent?.running ?? false);
        setTweetCount(statusRes.agent?.tweetCount || tweetsRes.total || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Load live price + vault
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/positions").then(x => x.json());
        let p = r.price?.value ?? 0;
        if (p === 0) {
          const cg = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd"
          ).then(x => x.json()).catch(() => ({}));
          p = cg?.["hedera-hashgraph"]?.usd ?? 0;
        }
        setHbarPrice(p);
        if (r.position) {
          setVaultDeposited(r.position.deposited);
          setVaultApy(r.position.apy);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Tweet refresh countdown
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/tweets?limit=1").then(x => x.json());
        const first = r.tweets?.[0];
        if (first?.scraped_at) {
          const scraped = new Date(first.scraped_at.replace(" ", "T"));
          setLastScraped(scraped.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
          const minsAgo = Math.floor((Date.now() - scraped.getTime()) / 60000);
          setNextUpdate(Math.max(0, 60 - minsAgo));
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  // Countdown timer ticking every minute
  useEffect(() => {
    const t = setInterval(() => setNextUpdate(p => Math.max(0, p - 1)), 60000);
    return () => clearInterval(t);
  }, []);

  const handleStartStop = useCallback(async () => {
    await fetch(agentRunning ? "/api/agent/stop" : "/api/agent/start", { method: "POST" });
    setAgentRunning(p => !p);
  }, [agentRunning]);

  const handleRunCycle = useCallback(async () => {
    setCycleRunning(true);
    try {
      await fetch("/api/cycle", { method: "POST" });
      setLastCycle(new Date().toLocaleTimeString());
    } finally {
      setCycleRunning(false);
    }
  }, []);

  const usdValue = hbarPrice > 0 && vaultDeposited !== "—"
    ? `≈$${(parseFloat(vaultDeposited) * hbarPrice).toFixed(2)}`
    : "—";

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <div className="sidebar-title">Sentinel</div>
          <div className="sidebar-subtitle">Intelligent Keeper Agent</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Main</div>
          <div className="sidebar-item active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Info</div>
          <div className="sidebar-item" style={{ cursor: "default", opacity: 0.7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
            </svg>
            Hedera Testnet
          </div>
          <div className="sidebar-item" style={{ cursor: "default", opacity: 0.7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Bonzo Finance
          </div>
          <div className="sidebar-item" style={{ cursor: "default", opacity: 0.7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
            {tweetCount > 0 ? `${tweetCount.toLocaleString()} tweets` : "Loading tweets..."}
          </div>
          <div className="sidebar-item" style={{ cursor: "default", opacity: 0.7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {lastScraped
              ? `Updated ${lastScraped} · ${nextUpdate}m`
              : "Checking updates..."}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="agent-status-pill">
            <span className={`pulse-dot ${agentRunning ? "running" : "stopped"}`} />
            <span style={{ color: agentRunning ? "#065f46" : "#dc2626" }}>
              {agentRunning ? "Agent Running" : "Agent Stopped"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Hedera · Bonzo Finance · LangGraph
              {lastScraped && (
                <span style={{ marginLeft: "0.75rem", color: nextUpdate <= 5 ? "#10b981" : "var(--text-muted)" }}>
                  · Tweets updated {lastScraped} · Next in {nextUpdate}m
                </span>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <button
              className={`btn ${agentRunning ? "btn-ghost" : "btn-primary"}`}
              onClick={handleStartStop}
            >
              {agentRunning ? "Stop Agent" : "Start Agent"}
            </button>
            <button
              className="btn btn-outline"
              onClick={handleRunCycle}
              disabled={cycleRunning}
            >
              {cycleRunning ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Running...
                </>
              ) : "⚡ Run Cycle"}
            </button>
            <WalletConnect />
          </div>
        </div>

        {lastCycle && (
          <div style={{
            background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
            padding: "0.35rem 1.5rem", fontSize: "0.75rem", color: "#166534",
            display: "flex", alignItems: "center", gap: "0.4rem"
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Cycle completed at {lastCycle}
          </div>
        )}

        <div className="page-content">
          {/* Live stat row */}
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-label">HBAR Price</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {hbarPrice > 0 ? `$${hbarPrice.toFixed(4)}` : "—"}
              </div>
              <div className="stat-delta up">Live · CoinGecko</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Vault Deposited</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {vaultDeposited !== "—" ? parseFloat(vaultDeposited).toFixed(2) : "—"}
              </div>
              <div className="stat-delta neutral">HBAR · {usdValue}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">APY</div>
              <div className="stat-value" style={{ fontSize: "1.2rem", color: "#10b981" }}>
                {vaultApy !== "—" ? vaultApy : "—"}
              </div>
              <div className="stat-delta neutral">Bonzo Finance</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Tweets Indexed</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>
                {tweetCount > 0 ? tweetCount.toLocaleString() : "—"}
              </div>
              <div className="stat-delta neutral">
                {nextUpdate > 0 ? `Next update in ${nextUpdate}m` : "Updating soon..."}
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="dashboard-grid">
            <ThreatMeter />
            <PriceChart />
            <PositionCard />
            <DecisionFeed />
            <TweetFeed />
            <StatusBadge />
          </div>
        </div>
      </div>
    </div>
  );
}