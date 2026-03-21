"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface WalletState {
  connected: boolean;
  accountId: string | null;
  isOwner: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  accountId: null,
  isOwner: false,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_WALLET_ID ?? "";

// Global setter so the modal can update context
let _setAccount: ((id: string) => void) | null = null;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("sentinel-wallet");
    if (saved) { setAccountId(saved); setConnected(true); }
  }, []);

  const connect = useCallback(async () => {
    setShowModal(true);
    setInputValue("");
    setInputError("");
  }, []);

  const confirmConnect = useCallback(() => {
    const id = inputValue.trim();
    // Validate Hedera account ID format: 0.0.XXXXX
    if (!/^0\.0\.\d+$/.test(id)) {
      setInputError("Invalid format. Use 0.0.XXXXXX");
      return;
    }
    setAccountId(id);
    setConnected(true);
    sessionStorage.setItem("sentinel-wallet", id);
    setShowModal(false);
    setInputError("");
  }, [inputValue]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAccountId(null);
    sessionStorage.removeItem("sentinel-wallet");
  }, []);

  const isOwner = connected && !!accountId &&
    OWNER_ID !== "" && accountId === OWNER_ID;

  return (
    <WalletContext.Provider value={{
      connected, accountId, isOwner, connecting, connect, disconnect,
    }}>
      {children}

      {/* Account ID Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "white", borderRadius: 20, padding: "2rem",
            width: "100%", maxWidth: 400,
            boxShadow: "0 20px 60px rgba(99,102,241,0.2)",
            border: "1px solid #e4e9f5",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                    fill="white" fillOpacity="0.9"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                  Connect Hedera Wallet
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Enter your Hedera account ID
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem",
                }}
              >✕</button>
            </div>

            {/* Input */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{
                fontSize: "0.78rem", fontWeight: 600,
                color: "#475569", display: "block", marginBottom: "0.5rem",
              }}>
                Hedera Account ID
              </label>
              <input
                type="text"
                placeholder="0.0.1234567"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setInputError(""); }}
                onKeyDown={e => e.key === "Enter" && confirmConnect()}
                autoFocus
                style={{
                  width: "100%", padding: "0.75rem 1rem",
                  borderRadius: 10, fontSize: "0.95rem",
                  border: inputError ? "1.5px solid #ef4444" : "1.5px solid #e4e9f5",
                  outline: "none", fontFamily: "'DM Mono', monospace",
                  color: "#0f172a",
                }}
              />
              {inputError && (
                <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "0.4rem" }}>
                  {inputError}
                </div>
              )}
            </div>

            {/* Info box */}
            <div style={{
              background: "#f8faff", borderRadius: 10,
              border: "1px solid #e0e7ff", padding: "0.75rem",
              marginBottom: "1.25rem",
            }}>
              <div style={{ fontSize: "0.72rem", color: "#6366f1", lineHeight: 1.6 }}>
                💡 Find your account ID in HashPack wallet under <strong>Account Details</strong>. Format: <code>0.0.XXXXXX</code>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: 10,
                  border: "1.5px solid #e4e9f5", background: "white",
                  cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                  color: "#64748b", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmConnect}
                disabled={!inputValue}
                style={{
                  flex: 2, padding: "0.75rem", borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  border: "none", cursor: inputValue ? "pointer" : "not-allowed",
                  fontSize: "0.85rem", fontWeight: 600, color: "white",
                  opacity: inputValue ? 1 : 0.6,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Connect Wallet →
              </button>
            </div>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}