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
  const [mounted, setMounted] = useState(false);

  // Wallet state
  const { isOwner, connected, accountId } = useWallet();

  useEffect(() => {
    setMounted(true);
    fetch("/api/status")
      .then(r => r.json())
      .then(d => {
        setAgentRunning(d.agent?.running ?? false);
        setTweetCount(d.agent?.tweetCount ?? 0);
      })
      .catch(() => {});
  }, []);

  const handleStartStop = useCallback(async () => {
    if (!isOwner) return;
    const endpoint = agentRunning ? "/api/agent/stop" : "/api/agent/start";
    await fetch(endpoint, { method: "POST" });
    setAgentRunning(p => !p);
  }, [agentRunning, isOwner]);

  const handleRunCycle = useCallback(async () => {
    if (!isOwner) return;
    setCycleRunning(true);
    try {
      await fetch("/api/cycle", { method: "POST" });
      setLastCycle(new Date().toLocaleTimeString());
      fetch("/api/status").then(r => r.json()).then(d => {
        setTweetCount(d.agent?.tweetCount ?? 0);
      });
    } finally {
      setCycleRunning(false);
    }
  }, [isOwner]);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{
          maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                  fill="white" fillOpacity="0.9"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                Sentinel
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", letterSpacing: "0.03em" }}>
                Hedera · Bonzo Finance · LangGraph
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Tweet count */}
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              <span className="mono" style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>
                {tweetCount.toLocaleString()}
              </span> tweets
            </div>

            {/* Agent status pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.35rem 0.85rem",
              background: agentRunning ? "#d1fae5" : "#fee2e2",
              borderRadius: 999,
              transition: "background 0.3s ease",
            }}>
              <span className={`pulse-dot ${agentRunning ? "running" : "stopped"}`} />
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em",
                color: agentRunning ? "#065f46" : "#dc2626",
              }}>
                {agentRunning ? "AGENT RUNNING" : "AGENT STOPPED"}
              </span>
            </div>

            {/* Owner-only controls */}
            {isOwner ? (
              <>
                <button className="btn-primary" onClick={handleStartStop}>
                  {agentRunning ? "⏹ Stop" : "▶ Start Agent"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleRunCycle}
                  disabled={cycleRunning}
                  style={{ opacity: cycleRunning ? 0.7 : 1, cursor: cycleRunning ? "not-allowed" : "pointer" }}
                >
                  {cycleRunning ? "⟳ Running..." : "⚡ Run Cycle"}
                </button>
              </>
            ) : connected && !isOwner ? (
              /* Connected but wrong wallet */
              <div style={{
                fontSize: "0.72rem", color: "#dc2626", fontWeight: 600,
                padding: "0.35rem 0.85rem",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 999,
              }}>
                🔒 Not the owner wallet
              </div>
            ) : (
              /* Not connected at all */
              <div style={{
                fontSize: "0.72rem", color: "var(--text-secondary)",
                padding: "0.35rem 0.85rem",
                background: "#f8faff",
                border: "1px solid #e0e7ff",
                borderRadius: 999,
              }}>
                🔒 Connect wallet to control
              </div>
            )}

            {/* HashPack connect button — always visible */}
            <WalletConnect />
          </div>
        </div>
      </nav>

      {/* Cycle success banner */}
      <div style={{
        maxHeight: lastCycle ? 40 : 0,
        overflow: "hidden",
        transition: "max-height 0.4s ease",
        background: "linear-gradient(135deg, #ede9fe, #dbeafe)",
        borderBottom: lastCycle ? "1px solid #c7d2fe" : "none",
      }}>
        <div style={{ padding: "0.5rem 1.5rem", fontSize: "0.78rem", color: "#4f46e5", textAlign: "center" }}>
          ✓ Cycle completed at {lastCycle}
        </div>
      </div>

      {/* Owner welcome banner — shows when owner connects */}
      {isOwner && (
        <div style={{
          background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
          borderBottom: "1px solid #c4b5fd",
          padding: "0.4rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "0.75rem", color: "#6d28d9", fontWeight: 600 }}>
            🛡️ Owner access granted —
          </span>
          <span className="mono" style={{ fontSize: "0.72rem", color: "#7c3aed" }}>
            {accountId}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#6d28d9" }}>
            — Full agent control enabled
          </span>
        </div>
      )}

      {/* Dashboard grid */}
      <div className="dashboard-grid" style={{
        maxWidth: 1400,
        margin: "0 auto",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        <ThreatMeter />
        <PriceChart />
        <PositionCard />
        <DecisionFeed />
        <TweetFeed />
        <StatusBadge />
      </div>
    </div>
  );
}