"use client";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export default function WalletConnect() {
  const { connected, accountId, connecting, connect, disconnect } = useWallet();
  const [showDrop, setShowDrop] = useState(false);

  if (connected && accountId) {
    return (
      <div style={{ position: "relative" }}>
        <div
          onClick={() => setShowDrop(p => !p)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            background: "#ede9fe",
            border: "1.5px solid #c4b5fd",
            borderRadius: 8, cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
              fill="#7c3aed"/>
          </svg>
          <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6d28d9" }}>
            {accountId}
          </span>
        </div>

        {showDrop && (
          <div
            onClick={() => { disconnect(); setShowDrop(false); }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "white", border: "1px solid var(--border)",
              borderRadius: 8, padding: "0.5rem 1rem",
              fontSize: "0.75rem", color: "#ef4444", fontWeight: 600,
              whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              cursor: "pointer", zIndex: 999,
            }}
          >
            Disconnect wallet
          </div>
        )}
      </div>
    );
  }

  return (
    <button className="btn btn-primary" onClick={connect} disabled={connecting}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
          fill="white" fillOpacity="0.9"/>
      </svg>
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}