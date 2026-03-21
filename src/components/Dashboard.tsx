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
  const [activeNav, setActiveNav] = useState("dashboard");
  const { connected, accountId, isOwner, connect, disconnect } = useWallet();

  useEffect(() => {
    fetch("/api/status").then(r => r.json()).then(d => {
      setAgentRunning(d.agent?.running ?? false);
      setTweetCount(d.agent?.tweetCount ?? 0);
    }).catch(() => {});
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

  const navItems = [
    {
      id: "dashboard", label: "Dashboard",
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    },
    {
      id: "signals", label: "Signals",
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
    },
    {
      id: "decisions", label: "Decisions",
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    },
    {
      id: "vault", label: "Vault",
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
    },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <div className="sidebar-title">Sentinel</div>
          <div className="sidebar-subtitle">Intelligent Keeper Agent</div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Main</div>
          {navItems.map(item => (
            <div key={item.id} className={`sidebar-item ${activeNav === item.id ? "active" : ""}`} onClick={() => setActiveNav(item.id)}>
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Network</div>
          <div className="sidebar-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            Hedera Testnet
          </div>
          <div className="sidebar-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Bonzo Finance
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="agent-status-pill">
            <span className={`pulse-dot ${agentRunning ? "running" : "stopped"}`} />
            <span style={{ color: agentRunning ? "#065f46" : "#dc2626" }}>
              {agentRunning ? "Agent Running" : "Agent Stopped"}
            </span>
          </div>
          {connected ? (
            <div className="wallet-chip" onClick={disconnect} title="Click to disconnect">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="#7c3aed"/></svg>
              {accountId}
              {isOwner && <span className="badge badge-tighten" style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem" }}>Owner</span>}
            </div>
          ) : (
            <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={connect}>
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Hedera · Bonzo Finance · LangGraph</div>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>{tweetCount.toLocaleString()}</span> tweets
            </span>
            {isOwner && (
              <>
                <button className={`btn ${agentRunning ? "btn-ghost" : "btn-primary"}`} onClick={handleStartStop}>
                  {agentRunning ? "Stop Agent" : "Start Agent"}
                </button>
                <button className="btn btn-outline" onClick={handleRunCycle} disabled={cycleRunning}>
                  {cycleRunning ? "Running..." : "⚡ Run Cycle"}
                </button>
              </>
            )}
            <WalletConnect />
          </div>
        </div>

        {isOwner && (
          <div className="owner-banner">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="#7c3aed"/></svg>
            Owner access granted —
            <span className="mono">{accountId}</span>
            — Full agent control enabled
          </div>
        )}

        {lastCycle && (
          <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", padding: "0.35rem 1.5rem", fontSize: "0.75rem", color: "#166534", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Cycle completed at {lastCycle}
          </div>
        )}

        <div className="page-content">
          {/* Stat row */}
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-label">HBAR Price</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>$0.093</div>
              <div className="stat-delta up">Live · CoinGecko</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Vault Deposited</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>10.00</div>
              <div className="stat-delta neutral">HBAR · ≈$0.93</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">APY</div>
              <div className="stat-value" style={{ fontSize: "1.2rem", color: "#10b981" }}>94.15%</div>
              <div className="stat-delta neutral">Bonzo Finance</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Tweets Indexed</div>
              <div className="stat-value" style={{ fontSize: "1.2rem" }}>{tweetCount > 0 ? tweetCount.toLocaleString() : "—"}</div>
              <div className="stat-delta neutral">Updated hourly</div>
            </div>
          </div>

          {/* Cards grid */}
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