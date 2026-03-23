# Cerberus: Intelligent Keeper Agent on Hedera 🐺

Cerberus is a real-time, AI-driven automation agent built on the Hedera network. It monitors social sentiment (via a production-grade external scraper) and market conditions to actively manage a decentralized finance (DeFi) position on Bonzo Finance. The entire application features a **Premium Retro Neobrutalist UI**, specifically designed to stand out with striking colors, sharp shadows, and arcade-style visual feedback.

> **Hackathon Edition**: This version utilizes a completely custom Neobrutalist design system to deliver a truly engaging, interactive, and visually striking experience. Wallet connect is fully functional natively with the HashPack browser extension using the official Hedera Wallet Connect SDK.

---

## ✨ Features

- **🔌 Native HashPack Integration**: Uses the official `@hashgraph/hedera-wallet-connect` SDK (v2). No more pairing strings or manual account ID entry—just one click to connect via the browser extension.
- **⚡ Real-Time Scraper API**: Integrated with a production-ready Vercel scraper (`https://x-scrapper-wheat.vercel.app`) that monitors major crypto influencers (Elon Musk, Vitalik Buterin, CZ, etc.) every hour.
- **🎨 Retro Neobrutalism UI**: A stark, highly stylized dashboard featuring vibrant colors (mint, purple, yellow), deep shadows, thick borders, and a subtle CRT noise overlay.
- **🧠 100% Real AI Decisions**: Integrates with Google Gemini (2.5 Flash Lite) to analyze live market sentiment. No mocks, no fallbacks—only real-time analysis or a clear error if the AI is unavailable.
- **📜 On-Chain Audit Trail**: Every AI decision is permanently logged to the Hedera Consensus Service (HCS), ensuring an immutable and transparent history of all agent actions.
- **💰 DeFi Automation**: Manages positions on Bonzo Finance using real-time Supra Oracle and CoinGecko price feeds.
- **🎮 Arcade Dashboard**: Includes an Arcade-style Threat Meter, terminal-inspired Position Cards, a blocky Price Chart, and a "Scraped Signals" box for raw X/Twitter data.

---

## 🏗️ Architecture

1.  **Frontend**: Next.js (React) + Vanilla CSS (100% custom Neobrutalist design system).
2.  **Wallet**: Official `@hashgraph/hedera-wallet-connect` for native extension pairing.
3.  **Signal Source**: External Vercel-based REST API for market intelligence.
4.  **AI Engine**: LangChain + `@google/genai` (Gemini 2.0 Flash Lite) with RAG (Retrieval Augmented Generation).
5.  **Blockchain**: `@hashgraph/sdk` for HCS Logging and contract interaction on Hedera Testnet.
6.  **DeFi**: Bonzo Finance (Lending/Borrowing) & Supra Oracles (Asset Prices).

---

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js 18+
- A Hedera Testnet Account (`accountId` and `privateKey`)
- A Google Gemini API Key
- HashPack Wallet (Browser Extension) installed.

### 2. Installation
```bash
git clone <repository_url>
cd cerberus
npm install
```

### 3. Environment Variables
Create a `.env.local` file:
```env
# Hedera Testnet Credentials (for the Agent backend)
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e020100300506032b65700422...

# Gemini API Key
GEMINI_API_KEY=AIzaSy...

# WalletConnect Project ID (from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### 4. Running Locally
```bash
npm run dev
```
Navigate to `http://localhost:3000`.

---

## 🎮 Using the Dashboard

1.  **Connect Wallet**: Click the "Connect HashPack" button. Your extension will prompt you to pair immediately. 
2.  **Watch Signals**: The "Scraped Signals" box will populate with real-time data from the Vercel Scraper.
3.  **Run Cycle**: Click "Run Cycle" to force an autonomous decision. The agent will fetch signals, analyze threat levels with Gemini, and execute a vault adjustment on Bonzo if needed.
4.  **Track Audit**: Check the "Decision Feed" to see the HCS transaction hash for every action taken.

---

## 🏆 Hackathon Highlights

- **Visual Excellence**: Cerberus delivers a premium, custom UI that shatters the "generic web3" aesthetic.
- **No Mock Integrity**: From price feeds to wallet connections and AI results, the implementation is 100% real.
- **Immutable Trust**: Transparency is baked in via Hedera HCS, creating the first "trustless" keeper agent.

Built with 🐺 for the Hedera Ecosystem.