"use client";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export default function WalletConnect() {
  const { connected, accountId, isOwner, connecting, connect, disconnect } = useWallet();
  const [showTooltip, setShowTooltip] = useState(false);

  if (connected && accountId) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Owner badge */}
        {isOwner && (
          <span style={{
            fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem",
            background: "#d1fae5", color: "#065f46", borderRadius: 999,
            letterSpacing: "0.05em",
          }}>
            OWNER
          </span>
        )}

        {/* Account ID pill */}
        <div
          onClick={() => setShowTooltip(p => !p)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            background: isOwner ? "#ede9fe" : "#f1f5f9",
            borderRadius: 999, cursor: "pointer",
            border: `1.5px solid ${isOwner ? "#c4b5fd" : "#e4e9f5"}`,
            position: "relative",
          }}
        >
          {/* HashPack icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
              fill={isOwner ? "#8b5cf6" : "#64748b"}/>
          </svg>
          <span style={{
            fontSize: "0.75rem", fontWeight: 600,
            color: isOwner ? "#6d28d9" : "#475569",
            fontFamily: "'DM Mono', monospace",
          }}>
            {accountId}
          </span>

          {/* Disconnect tooltip */}
          {showTooltip && (
            <div
              onClick={(e) => { e.stopPropagation(); disconnect(); setShowTooltip(false); }}
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "white", border: "1px solid #e4e9f5",
                borderRadius: 8, padding: "0.5rem 1rem",
                fontSize: "0.75rem", color: "#ef4444",
                fontWeight: 600, whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                cursor: "pointer", zIndex: 999,
              }}
            >
              Disconnect wallet
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white", border: "none", borderRadius: 999,
        padding: "0.5rem 1.1rem", fontSize: "0.8rem",
        fontWeight: 600, cursor: connecting ? "not-allowed" : "pointer",
        opacity: connecting ? 0.7 : 1,
        transition: "opacity 0.2s, transform 0.15s",
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* HashPack logo */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
          fill="white" fillOpacity="0.9"/>
      </svg>
      {connecting ? "Connecting..." : "Connect HashPack"}
    </button>
  );
}