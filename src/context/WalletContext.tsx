"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      // Dynamically import HashConnect to avoid SSR issues
      const { HashConnect } = await import("@hashgraph/hashconnect");

      const hashconnect = new HashConnect();

      const appMetadata = {
        name: "Sentinel",
        description: "Intelligent Keeper Agent on Hedera",
        icon: "https://sentinel-hedera.vercel.app/favicon.ico",
      };

      const initData = await hashconnect.init(appMetadata, "testnet", true);

      hashconnect.foundExtensionEvent.once((walletMetadata) => {
        hashconnect.connectToLocalWallet();
      });

      hashconnect.pairingEvent.once((pairingData) => {
        const id = pairingData.accountIds?.[0] ?? null;
        setAccountId(id);
        setConnected(true);
        // Persist to sessionStorage so refresh keeps you connected
        if (id) sessionStorage.setItem("sentinel-wallet", id);
      });

      // If no extension found after 3s, show install prompt
      setTimeout(() => {
        if (!connected) setConnecting(false);
      }, 3000);

    } catch (err) {
      console.error("HashConnect error:", err);
      setConnecting(false);
    }
  }, [connected]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAccountId(null);
    sessionStorage.removeItem("sentinel-wallet");
  }, []);

  const isOwner = connected && !!accountId && accountId === OWNER_ID;

  return (
    <WalletContext.Provider value={{ connected, accountId, isOwner, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}