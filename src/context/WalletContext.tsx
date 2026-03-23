"use client";
import {
  createContext, useContext, useState,
  useCallback, useEffect, ReactNode, useRef
} from "react";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletState {
  connected: boolean;
  accountId: string | null;
  connecting: boolean;
  availableExtensions: { id: string; name?: string; icon?: string }[];
  connect: (extensionId?: string) => Promise<void>;
  disconnect: () => void;
  executeContractCall: (to: string, data: string, amountHbar?: string) => Promise<string>;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  accountId: null,
  connecting: false,
  availableExtensions: [],
  connect: async () => {},
  disconnect: () => {},
  executeContractCall: async () => "",
});

// ─── Provider ────────────────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [availableExtensions, setAvailableExtensions] = useState<{ id: string; name?: string; icon?: string }[]>([]);  const [sdkReady, setSdkReady] = useState(false);
  // Hold the DAppConnector instance
  const connectorRef = useRef<any>(null);

  // ── Initialise Hedera Wallet Connect SDK once ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Dynamic import — keeps this SSR-safe
        // Use specific subpaths to avoid pulling in @reown/appkit optional deps
        const [{ DAppConnector }, { LedgerId }] = await Promise.all([
          import("@hashgraph/hedera-wallet-connect/dist/lib/dapp/index.js"),
          import("@hashgraph/sdk"),
        ]);
        const { findExtensions } = await import(
          "@hashgraph/hedera-wallet-connect/dist/lib/shared/extensionController.js"
        );

        const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "b68e341a84b5f4af97fa3a54c9543bfd";

        const connector = new DAppConnector(
          {
            name: "Cerberus",
            description: "Intelligent Keeper Agent on Hedera",
            url: typeof window !== "undefined" ? window.location.origin : "https://cerberus-agent.vercel.app",
            icons: ["https://cryptologos.cc/logos/hedera-hbar-logo.png"],
          },
          LedgerId.TESTNET,
          projectId,
          undefined, // methods – SDK supplies defaults
          undefined, // events
          undefined  // chains
        );

        await connector.init({ logger: "error" });
        connectorRef.current = connector;

        if (cancelled) return;
        
        setSdkReady(true);

        // Restore any existing session
        const sessions = connector.walletConnectClient?.session?.getAll?.() ?? [];
        if (sessions.length > 0 && connector.signers.length > 0) {
          const id = connector.signers[0].getAccountId().toString();
          setAccountId(id);
          setConnected(true);
          sessionStorage.setItem("cerberus-wallet", id);
          return;
        }

        // Restore from sessionStorage (faster UX on page reload)
        const saved = sessionStorage.getItem("cerberus-wallet");
        if (saved) {
          setAccountId(saved);
          setConnected(true);
          return;
        }

        // Discover installed extensions
        findExtensions((ext: any) => {
          if (ext.available) {
            setAvailableExtensions(prev => {
              if (prev.find(e => e.id === ext.id)) return prev;
              return [...prev, { id: ext.id, name: ext.name, icon: ext.icon }];
            });
          }
        });
      } catch (err) {
        console.error("[CerberusWallet] Init failed:", err);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (extensionId?: string) => {
    setConnecting(true);
    try {
      const connector = connectorRef.current;
      if (!connector || !sdkReady) {
        throw new Error("SDK not initialised. Please wait...");
      }

      let session: any;

      // 🎯 Explicitly default to HashPack if available
      const hp = availableExtensions.find(e => e.id.toLowerCase().includes("hashpack") || e.id === "hashpack" || e.name?.toLowerCase().includes("hashpack"));
      const targetId = extensionId || hp?.id || (availableExtensions.length > 0 ? availableExtensions[0].id : null);

      if (targetId) {
        // Direct extension connect — no pairing string dialog shown to user
        logger.info(`[CerberusWallet] Connecting to extension: ${targetId}`);
        session = await connector.connectExtension(targetId);
      } else {
        // Fallback: show WalletConnect QR modal (for mobile or generic WC)
        logger.info("[CerberusWallet] No extension found, opening WalletConnect modal");
        session = await connector.openModal();
      }

      // Extract accountId from the session
      const accounts: string[] = session?.namespaces?.hedera?.accounts ?? [];
      if (accounts.length > 0) {
        // Format is "hedera:testnet:0.0.xxxxxx"
        const id = accounts[0].split(":").pop() ?? accounts[0];
        setAccountId(id);
        setConnected(true);
        sessionStorage.setItem("cerberus-wallet", id);
      } else {
        throw new Error("No accounts returned from wallet");
      }
    } catch (err: any) {
      console.error("[CerberusWallet] Connect failed:", err?.message ?? err);
      // Clear any stale data
      sessionStorage.removeItem("cerberus-wallet");
    } finally {
      setConnecting(false);
    }
  }, [availableExtensions, sdkReady]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      const connector = connectorRef.current;
      if (connector) {
        const sessions = connector.walletConnectClient?.session?.getAll?.() ?? [];
        for (const s of sessions) {
          await connector.walletConnectClient?.disconnect?.({
            topic: s.topic,
            reason: { code: 6000, message: "User disconnected" },
          });
        }
      }
    } catch (err) {
      console.error("[CerberusWallet] Disconnect error:", err);
    } finally {
      setConnected(false);
      setAccountId(null);
      sessionStorage.removeItem("cerberus-wallet");
    }
  }, []);

  // ── Execute Contract Call ────────────────────────────────────────────────
  const executeContractCall = useCallback(async (to: string, data: string, amountHbar: string = "0") => {
    const connector = connectorRef.current;
    if (!connector || connector.signers.length === 0) {
      throw new Error("Wallet not connected");
    }

    // Dynamically import SDK elements & ethers utils
    const { ContractExecuteTransaction, ContractId, Hbar, Client, TransactionId, AccountId } = await import("@hashgraph/sdk");
    const { getBytes } = await import("ethers");

    // Create a testnet client for network context (node account IDs)
    const client = Client.forTestnet();

    const signer = connector.signers[0];
    const signerAccountId = signer.getAccountId();

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromEvmAddress(0, 0, to))
      .setGas(300000)
      .setFunctionParameters(getBytes(data))
      .setTransactionId(TransactionId.generate(signerAccountId))
      .setNodeAccountIds([new AccountId(3)]); // Use a standard testnet node to avoid freezeWith network query issues

    if (parseFloat(amountHbar) > 0) {
      tx.setPayableAmount(Hbar.fromString(amountHbar));
    }

    // Freeze manually instead of using a client to avoid "Query.fromBytes" bugs during network map fetch
    await tx.freeze();

    // Sign and execute via the wallet signer (HashPack)
    const response = await signer.call(tx);
    
    // SDK response has transactionId
    return (response as any).transactionId?.toString() ?? response.toString();
  }, []);

  return (
    <WalletContext.Provider value={{
      connected, accountId, connecting, availableExtensions, connect, disconnect, executeContractCall,
    }}>
      {sdkReady ? children : <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>Initializing wallet SDK...</div>}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}