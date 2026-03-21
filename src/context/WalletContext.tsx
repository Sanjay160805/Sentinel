"use client";
import {
  createContext, useContext, useState,
  useCallback, useEffect, useRef, ReactNode,
} from "react";
import { HashConnect } from "@hashgraph/hashconnect";

// ─────────────────────────────────────────────────────────────────────────────

const APP_METADATA = {
  name: "Sentinel",
  description: "Intelligent Keeper Agent on Hedera",
  icon: "https://sentinel-one-teal.vercel.app/favicon.ico",
  url: "https://sentinel-one-teal.vercel.app",
};

interface WalletState {
  connected: boolean;
  accountId: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  accountId: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected]   = useState(false);
  const [accountId, setAccountId]   = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [hcChecking, setHcChecking] = useState(false);

  const hcRef = useRef<HashConnect | null>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("sentinel-wallet");
    if (saved) { setAccountId(saved); setConnected(true); }
  }, []);

  // Open the modal
  const connect = useCallback(async () => {
    setShowModal(true);
    setInputValue("");
    setInputError("");
  }, []);

  // HashConnect (HashPack browser extension) flow
  const connectWithHashPack = useCallback(async () => {
    setHcChecking(true);
    setInputError("");

    try {
      // Initialise HashConnect once per session
      if (!hcRef.current) {
        hcRef.current = new HashConnect();
        await hcRef.current.init(APP_METADATA, "testnet");
      }

      const hc = hcRef.current;

      // Listen for the pairing result (fires once)
      hc.pairingEvent.once((pairingData) => {
        const id = pairingData?.accountIds?.[0];
        if (id) {
          setAccountId(id);
          setConnected(true);
          sessionStorage.setItem("sentinel-wallet", id);
          setShowModal(false);
        } else {
          setInputError("No account returned. Try manual input below.");
        }
        setHcChecking(false);
      });

      // Initiate connection with HashPack
      await hc.connect();

    } catch (err: any) {
      console.error("HashConnect error:", err);
      setInputError("HashPack connection failed — use manual input below.");
      setHcChecking(false);
    }
  }, []);

  // Manual account ID input
  const confirmConnect = useCallback(() => {
    const id = inputValue.trim();
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
    hcRef.current = null;
  }, []);

  return (
    <WalletContext.Provider value={{
      connected, accountId, connecting, connect, disconnect,
    }}>
      {children}

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)",
        }}>
          <div style={{
            background: "white", borderRadius: 20, padding: "2rem",
            width: "100%", maxWidth: 420,
            boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
            border: "1px solid #e8eaf0",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                    fill="white" fillOpacity="0.9"/>
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1d2e" }}>
                  Connect to Sentinel
                </div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                  Connect your Hedera wallet to manage your vault
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  cursor: "pointer", color: "#9ca3af", fontSize: "1.2rem",
                }}
              >✕</button>
            </div>

            {/* HashPack button */}
            <button
              onClick={connectWithHashPack}
              disabled={hcChecking}
              style={{
                width: "100%", padding: "0.85rem",
                borderRadius: 12, marginBottom: "1rem",
                border: "2px solid #e8eaf0",
                background: "white", cursor: hcChecking ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: "0.75rem",
                transition: "all 0.15s",
                fontSize: "0.9rem", fontWeight: 600, color: "#1a1d2e",
                opacity: hcChecking ? 0.7 : 1,
              }}
              onMouseEnter={e => !hcChecking && (e.currentTarget.style.borderColor = "#7c3aed")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8eaf0")}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                    fill="white"/>
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                  {hcChecking ? "Waiting for HashPack..." : "Connect with HashPack"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: 400 }}>
                  Browser extension wallet
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ marginLeft: "auto" }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: 1, background: "#e8eaf0" }} />
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 500 }}>or enter manually</span>
              <div style={{ flex: 1, height: 1, background: "#e8eaf0" }} />
            </div>

            {/* Manual input */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{
                fontSize: "0.75rem", fontWeight: 600,
                color: "#6b7280", display: "block", marginBottom: "0.4rem",
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
                  width: "100%", padding: "0.7rem 1rem",
                  borderRadius: 10, fontSize: "0.9rem",
                  border: inputError ? "1.5px solid #ef4444" : "1.5px solid #e8eaf0",
                  outline: "none",
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#1a1d2e",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#7c3aed")}
                onBlur={e => (e.target.style.borderColor = inputError ? "#ef4444" : "#e8eaf0")}
              />
              {inputError && (
                <div style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "0.35rem" }}>
                  {inputError}
                </div>
              )}
            </div>

            {/* Info box */}
            <div style={{
              background: "#f5f3ff", borderRadius: 10,
              border: "1px solid #ddd6fe", padding: "0.65rem 0.75rem",
              marginBottom: "1.25rem", fontSize: "0.72rem",
              color: "#5b21b6", lineHeight: 1.6,
            }}>
              Find your account ID in HashPack under <strong>Account Details</strong>. Format: <code>0.0.XXXXXX</code>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "0.7rem", borderRadius: 10,
                  border: "1.5px solid #e8eaf0", background: "white",
                  cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                  color: "#6b7280",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmConnect}
                disabled={!inputValue}
                style={{
                  flex: 2, padding: "0.7rem", borderRadius: 10,
                  background: inputValue ? "#7c3aed" : "#e8eaf0",
                  border: "none",
                  cursor: inputValue ? "pointer" : "not-allowed",
                  fontSize: "0.85rem", fontWeight: 600,
                  color: inputValue ? "white" : "#9ca3af",
                  transition: "all 0.15s",
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