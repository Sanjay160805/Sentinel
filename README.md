# 🛡️ Sentinel — Intelligent Keeper Agent on Hedera

<div align="center">

![Sentinel Banner](https://img.shields.io/badge/Sentinel-Intelligent%20Keeper%20Agent-6366f1?style=for-the-badge&logo=shield&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Hedera](https://img.shields.io/badge/Hedera-Testnet-8259ef?style=flat-square&logo=hedera)](https://hedera.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-green?style=flat-square)](https://langchain-ai.github.io/langgraphjs)
[![Gemini](https://img.shields.io/badge/Gemini-2.0%20Flash%20Lite-blue?style=flat-square&logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

**An autonomous AI agent that monitors DeFi threat signals, analyzes market sentiment, and manages vault positions on Hedera using Bonzo Finance — 24/7, fully automated.**

[Live Demo](https://sentinel-hedera.vercel.app) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
- [Agent Decision Logic](#agent-decision-logic)
- [Oracle Integration](#oracle-integration)
- [Hedera Integration](#hedera-integration)
- [Bonzo Finance Integration](#bonzo-finance-integration)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Dashboard](#dashboard)
- [Scraper Setup](#scraper-setup)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Sentinel is an **autonomous AI-powered keeper agent** running on Hedera that monitors cryptocurrency threat signals via social media (Twitter/Nitter), analyzes sentiment and risk using Gemini AI, and makes autonomous keeper decisions — all logged immutably to Hedera Consensus Service (HCS).

The agent runs in a fully autonomous closed loop, triggered hourly via GitHub Actions:

```
Fetch Latest Tweets → RAG + Sentiment Analysis → Threat Score → Keeper Decision → HCS Logging
```

Every decision is transparently recorded on-chain. The dashboard displays threat metrics, price data, and an immutable audit trail of all agent decisions via HCS.

This project demonstrates:
- **Autonomous AI Agents** on Hedera with scheduled execution via GitHub Actions
- **RAG + Gemini Integration** for dynamic threat assessment from social signals
- **Immutable Decision Logging** via Hedera Consensus Service (HCS Topic `0.0.8314584`)
- **Seamless Fallback Patterns** (Gemini → keyword analysis, Supra → CoinGecko → mock pricing)
- **Serverless-Safe Architecture** with graceful degradation on Vercel (120s function timeout)

---

## Features

### Core Agent Features
- **Hourly Autonomous Execution** — Runs via GitHub Actions cron (`0 * * * *`) without manual intervention
- **AI-Powered Threat Scoring** — Gemini 2.0 Flash Lite analyzes crypto sentiment from 1,500+ continuously growing ingested tweets (updated hourly by scraper)
- **Graceful AI Fallback** — When Gemini hits rate limits (429), seamlessly falls back to keyword-based threat scoring
- **Multi-Source Price Oracle** — Supra Push Oracle (Hedera EVM) → REST API → CoinGecko → $0.085 mock
- **Keeper Decision Engine** — TIGHTEN, WIDEN, HARVEST, PROTECT, HOLD based on threat score + volatility
- **Immutable HCS Logging** — Every decision permanently recorded on Hedera Consensus Service (auditable via HashScan)
- **Vercel Serverless Safe** — 120-second function timeout enables full cycle completion with HCS submission

### Dashboard Features
- **Live Threat Meter** — Real-time threat score with animated progress bar
- **Price Feed Chart** — Live HBAR/USDT sparkline with source badge (Supra/CoinGecko/Mock)
- **Vault Position Card** — Deposited, borrowed, health factor, APY, rewards
- **Decision Log** — Timeline feed of all agent decisions with reasoning
- **Recent Signals** — Latest crypto tweets ingested by the agent
- **System Status** — Network, tweet count, last cycle, tech stack badges

### Technical Features
- **LangGraph State Machine** — Ingest → Analyze → Position → Decide → Execute nodes with HCS logging
- **RAG Pipeline** — In-memory vector store with LangChain similarity search + keyword fallback
- **SQLite Persistence** — Local DB for tweets (6,000+, growing hourly) and decisions (16+, growing per cycle)
- **GitHub Actions Automation** — Cron-triggered hourly cycles via POST /api/cycle (scraper also runs hourly)
- **Vercel Timeout Optimization** — 120-second max duration (up from 60s) enables full analytics cycle

---

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 15.x | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **AI Orchestration** | LangGraph | 0.2.x | Agent state machine |
| **AI Framework** | LangChain | 0.3.x | LLM chains and tools |
| **LLM** | Gemini 2.0 Flash Lite | Latest | Threat analysis and sentiment |
| **Blockchain** | Hedera SDK | 2.x | HCS, account management |
| **DeFi** | Bonzo Finance | — | Lending pool on Hedera |
| **Oracle** | Supra Oracle | Push Model | HBAR/USDT price feed |
| **Price Fallback** | CoinGecko API | v3 | Free tier price fallback |
| **Database** | better-sqlite3 | 9.x | Local tweet and decision storage |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Charts** | Recharts | 2.x | Price sparkline chart |
| **Scraper** | Python + Selenium | 4.x | Nitter-based tweet scraper |
| **Deployment** | Vercel | — | Serverless deployment |
| **Version Control** | GitHub | — | Source control |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SENTINEL SYSTEM                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│  │   SCRAPER    │    │              LANGGRAPH AGENT             │  │
│  │  (Python)    │    │                                          │  │
│  │              │    │  ┌──────────┐    ┌──────────────────┐   │  │
│  │  Selenium +  │───▶│  │  Ingest  │───▶│     Analyze      │   │  │
│  │  Nitter      │    │  │  Node    │    │     Node         │   │  │
│  │              │    │  └──────────┘    └──────────────────┘   │  │
│  └──────────────┘    │       │                   │              │  │
│                      │       ▼                   ▼              │  │
│  ┌──────────────┐    │  ┌──────────┐    ┌──────────────────┐   │  │
│  │   SQLITE DB  │    │  │ Position │    │    Decide Node   │   │  │
│  │              │    │  │  Node    │    │                  │   │  │
│  │  tweets      │◀───│  └──────────┘    └──────────────────┘   │  │
│  │  decisions   │    │       │                   │              │  │
│  └──────────────┘    │       └──────────┬────────┘              │  │
│                      │                  ▼                        │  │
│  ┌──────────────┐    │         ┌──────────────────┐             │  │
│  │  HEDERA HCS  │◀───│         │  Execute Node    │             │  │
│  │              │    │         └──────────────────┘             │  │
│  │  Immutable   │    └──────────────────────────────────────────┘  │
│  │  Decision    │                                                   │
│  │  Log         │    ┌──────────────────────────────────────────┐  │
│  └──────────────┘    │           NEXT.JS DASHBOARD              │  │
│                      │                                          │  │
│  ┌──────────────┐    │  ThreatMeter  PriceChart  PositionCard  │  │
│  │ SUPRA ORACLE │───▶│  DecisionFeed  TweetFeed  StatusBadge   │  │
│  │ + CoinGecko  │    │                                          │  │
│  └──────────────┘    │  /api/status  /api/cycle  /api/tweets   │  │
│                      │  /api/decisions  /api/positions          │  │
│  ┌──────────────┐    └──────────────────────────────────────────┘  │
│  │  BONZO FINANCE│                                                  │
│  │  Lending Pool │                                                  │
│  │  Hedera EVM   │                                                  │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent State Machine (LangGraph)

```
START
  │
  ▼
┌─────────────┐
│ ingestNode  │  ← Pulls latest tweets from SQLite, ingests into vector store
└─────────────┘
  │
  ▼
┌─────────────┐
│ analyzeNode │  ← Scores threat via Gemini AI + keyword fallback, fetches HBAR price
└─────────────┘
  │
  ▼
┌──────────────┐
│ positionNode │  ← Fetches Bonzo vault position (EVM → HTS fallback)
└──────────────┘
  │
  ▼
┌─────────────┐
│ decideNode  │  ← Applies keeper logic: TIGHTEN / WIDEN / HARVEST / PROTECT / HOLD
└─────────────┘
  │
  ▼
┌───────────────┐
│ executeNode   │  ← Saves decision to SQLite, logs to Hedera HCS
└───────────────┘
  │
  ▼
END (returns CycleResult)
```

### Data Flow

```
Twitter/Nitter
    │
    ▼ (Python Selenium scraper)
SQLite DB (crypto_tweets.db)
    │
    ▼ (ingestTweets)
Vector Store (in-memory, LangChain)
    │
    ▼ (retrieveContext / keyword fallback)
Gemini 2.0 Flash Lite
    │
    ▼ (ThreatAnalysis)
Keeper Decision Engine
    ├── + HBAR Price (Supra Oracle → CoinGecko)
    ├── + Vault Position (Bonzo Finance EVM)
    └── + Volatility Calculator
         │
         ▼
    Keeper Action (TIGHTEN/WIDEN/HARVEST/PROTECT/HOLD)
         │
         ├── Save to SQLite (decisions table)
         └── Submit to Hedera HCS (TopicMessageSubmitTransaction)
```

---

## Folder Structure

```
Sentinel/
│
├── src/
│   │
│   ├── agent/                          # LangGraph agent
│   │   ├── graph.ts                    # Builds the LangGraph StateGraph
│   │   ├── index.ts                    # runAgentCycle() entry point
│   │   ├── nodes.ts                    # ingestNode, analyzeNode, positionNode, decideNode, executeNode
│   │   ├── scheduler.ts                # Start/stop scheduler, manual trigger
│   │   ├── state.ts                    # AgentStateType definition
│   │   └── tools.ts                    # LangChain tools (optional)
│   │
│   ├── analysis/                       # Signal processing
│   │   ├── sentimentAnalyzer.ts        # Tweet sentiment classification
│   │   ├── threatScorer.ts             # AI + keyword threat scoring (0.0 - 1.0)
│   │   └── volatilityCalculator.ts     # Realized volatility from price history
│   │
│   ├── app/                            # Next.js App Router
│   │   ├── api/
│   │   │   ├── agent/
│   │   │   │   ├── start/route.ts      # POST /api/agent/start
│   │   │   │   └── stop/route.ts       # POST /api/agent/stop
│   │   │   ├── cycle/route.ts          # POST /api/cycle (manual trigger)
│   │   │   ├── decisions/route.ts      # GET /api/decisions
│   │   │   ├── positions/route.ts      # GET /api/positions
│   │   │   ├── status/route.ts         # GET /api/status
│   │   │   └── tweets/route.ts         # GET /api/tweets
│   │   ├── globals.css                 # Global styles, animations, CSS variables
│   │   ├── layout.tsx                  # Root layout with animated background
│   │   └── page.tsx                    # Home page → Dashboard
│   │
│   ├── bonzo/                          # Bonzo Finance integration
│   │   ├── client.ts                   # Ethers.js provider + signer setup
│   │   ├── dataProvider.ts             # AaveProtocolDataProvider ABI + calls
│   │   ├── keeper.ts                   # getVaultPosition, determineKeeperAction, executeKeeperAction
│   │   ├── lendingPool.ts              # getUserAccountData from Bonzo lending pool
│   │   ├── types.ts                    # KeeperAction type definitions
│   │   └── wethGateway.ts              # WETH gateway for HBAR deposits
│   │
│   ├── components/                     # React dashboard components
│   │   ├── Dashboard.tsx               # Main layout, navbar, grid
│   │   ├── DecisionFeed.tsx            # Timeline of agent decisions
│   │   ├── PositionCard.tsx            # Vault position with USD value
│   │   ├── PriceChart.tsx              # HBAR price + sparkline chart
│   │   ├── StatusBadge.tsx             # System status, tech stack badges
│   │   ├── ThreatMeter.tsx             # Threat score with animated bar
│   │   └── TweetFeed.tsx               # Recent crypto signals feed
│   │
│   ├── db/                             # Database layer
│   │   ├── decisions.ts                # saveDecision, getRecentDecisions, getLastDecision
│   │   ├── sqlite.ts                   # SQLite connection + auto table creation
│   │   └── tweets.ts                   # getTweetCount, getRecentTweets, getCryptoTweets, getAllCryptoTweets
│   │
│   ├── hedera/                         # Hedera SDK integration
│   │   ├── account.ts                  # Account balance and info queries
│   │   ├── client.ts                   # Hedera client initialization
│   │   ├── hcs.ts                      # HCS message submission
│   │   └── topicSetup.ts               # Create HCS topic if not exists
│   │
│   ├── hooks/                          # React custom hooks
│   │   ├── usePositions.ts             # Vault position polling
│   │   ├── useThreatScore.ts           # Threat score polling
│   │   └── useWebSocket.ts             # WebSocket connection (future)
│   │
│   ├── lib/                            # Shared utilities
│   │   ├── constants.ts                # THREAT_THRESHOLD, VOLATILITY_THRESHOLD, etc.
│   │   ├── gemini.ts                   # Gemini API client initialization
│   │   ├── logger.ts                   # Structured logger with timestamps
│   │   └── types.ts                    # Shared TypeScript interfaces
│   │
│   ├── oracle/                         # Price feed integration
│   │   ├── priceFeeds.ts               # getHBARUSDPrice() with 5-min cache
│   │   ├── supraClient.ts              # Supra push oracle → REST → CoinGecko fallback
│   │   └── types.ts                    # PriceData interface
│   │
│   └── rag/                            # Retrieval-Augmented Generation
│       ├── embeddings.ts               # Google embeddings (optional)
│       ├── ingestor.ts                 # Tweet ingestion → LangChain Documents
│       ├── retriever.ts                # Context retrieval + keyword fallback
│       └── vectorStore.ts              # In-memory vector store
│
├── scraper/                            # Python tweet scraper
│   ├── scraper.py                      # Main Selenium + Nitter scraper
│   ├── generic_scraper.py              # Generic version
│   └── requirements.txt                # Python dependencies
│
├── .env.local                          # Environment variables (never commit)
├── .gitignore                          # Git ignore rules
├── next.config.ts                      # Next.js configuration
├── package.json                        # Node.js dependencies
├── postcss.config.js                   # PostCSS configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # This file
```

---

## How It Works

### 1. Tweet Ingestion & Storage

The Python Selenium scraper (`scraper/scraper.py`) harvests crypto-related tweets from Nitter instances hourly. Tweets are stored in SQLite with metadata:
- `username` — Tweet author handle
- `text` — Full tweet content
- `time` — Tweet creation time
- `likes` / `retweets` — Engagement metrics
- `scraped_at` — Collection timestamp
- `is_crypto` — Relevance flag

**Current State:** 1,500+ tweets cached in SQLite, updated hourly by Python scraper (tweet count grows every cycle)

### 2. Vector Store Ingestion

When an agent cycle begins, `ingestNode` calls `ingestTweets()` which:
1. Fetches recent tweets (last 2 hours) from SQLite
2. Falls back to all crypto tweets if no recent ones found
3. Converts tweets to LangChain `Document` objects
4. Loads them into an in-memory vector store via `addDocuments()`
5. If embeddings fail (quota), keyword fallback is used instead

### 3. Threat Scoring with AI & Fallback

`analyzeNode` calls `scoreThreat()` which:

**Primary: Gemini 2.0 Flash Lite Analysis**
1. Retrieves relevant tweets via RAG similarity search (embedding-based context)
2. Sends structured prompt: geopolitical/regulatory/macro signals + tweet context
3. Returns threat score (0.0 → 1.0) with sentiment and reasoning
4. **Rate Limit Handling:** When Gemini returns 429 status, automatically switches to fallback

**Fallback: Keyword-Based Threat Scoring**
1. Scans all retrieved tweets for threat keywords (war, ban, crash, liquidation, regulation, etc.)
2. Weights keywords by frequency and severity
3. calculates threat score and classifies as LOW / MEDIUM / HIGH / CRITICAL
4. **Status:** Fallback is graceful and transparent—no impact on cycle completion

### 4. Price Fetching with Multi-Source Fallback

The oracle client attempts sources in order with intelligent fallback:

```
Supra Push Oracle (EVM contract on Hedera testnet)
    ↓ returns 0 (oracle not active on testnet)
Supra REST API (prod-kline-rest.supra.com)
    ↓ rate limited or unavailable
CoinGecko Free API (hedera-hashgraph/usd)
    ↓ most reliable, no auth required
Hardcoded Mock: $0.085 (last resort)
```

**Caching:** 5-minute TTL prevents rate limit exhaustion. **Status:** CoinGecko typically succeeds, providing current HBAR/USD pricing for threat calculations.

### 5. Vault Position Query

`positionNode` calls `getVaultPosition()` which:
1. Attempts EVM call to Bonzo lending pool contract via ethers.js
2. **Testnet Limitation:** Returns 0 because Bonzo HTS tokens aren't indexed in EVM storage
3. **Fallback:** Hardcoded position (10 HBAR at 94.15% APY) confirmed via Bonzo UI
4. **Balance Check:** Verifies EVM wallet has 555+ HBAR (confirmed, sufficient for gas)

### 6. Decision Engine

`decideNode` applies `determineKeeperAction()` based on threat score and volatility:

| Condition | Action | Justification |
|-----------|--------|---------------|
| Threat CRITICAL (score > 0.85) | **PROTECT** | Withdraw collateral to defend position |
| Threat HIGH + high volatility | **WIDEN** | Spread liquidity to reduce impermanent loss |
| Bearish + elevated threat | **HARVEST** | Claim rewards before downturn |
| Low threat + low volatility | **TIGHTEN** | Concentrate for higher fee earning |
| Otherwise | **HOLD** | Maintain position, accumulate rewards |

**Historical Data:** 16+ decisions logged and verified on HashScan

### 7. Execution, Persistence, & HCS Logging

`executeNode` (the critical final step):
1. **Local Persistence:** Saves decision to SQLite (decisions table) with threat score, reasoning, price
2. **On-Chain Audit Trail:** Submits decision as JSON to Hedera HCS Topic `0.0.8314584` via `TopicMessageSubmitTransaction`
3. **Transaction Confirmation:** Returns HCS transaction ID (format: `0.0.X@Y.Z`) for verification on HashScan
4. **Blockchain Verification:** All 16+ decisions visible on [Hedera Testnet HashScan](https://hashscan.io/testnet/topic/0.0.8314584)

**Timeout Critical Fix:** 120-second Vercel function timeout (`export const maxDuration = 120`) enables this entire node to complete before serverless termination. Previous 60-second limit caused cycles to abort before HCS logging.

---

## Agent Decision Logic

### Threat Levels

| Level | Score Range | Description |
|-------|------------|-------------|
| LOW | 0.0 – 0.3 | Normal market conditions, low risk |
| MEDIUM | 0.3 – 0.6 | Elevated signals, monitoring closely |
| HIGH | 0.6 – 0.85 | Significant threat, defensive posture |
| CRITICAL | 0.85 – 1.0 | Immediate protective action required |

### Keeper Actions

| Action | When | What It Does |
|--------|------|-------------|
| **TIGHTEN** | Low threat + low volatility | Concentrate liquidity for higher fees |
| **WIDEN** | High threat + high volatility | Spread liquidity to reduce impermanent loss |
| **HARVEST** | Bearish + elevated threat | Claim accumulated rewards before downturn |
| **PROTECT** | Critical threat | Withdraw collateral to protect from liquidation |
| **HOLD** | Moderate/bullish conditions | Maintain current position, accumulate rewards |

### Volatility Calculation

Realized volatility is computed using log returns over the last 20 price observations:

```
returns[i] = ln(price[i] / price[i-1])
variance = mean((return - mean_return)²)
realized_vol = sqrt(variance)
```

A rolling window of 100 price observations is maintained in memory across cycles.

---

## Oracle Integration

### Supra Oracle (Primary)

Sentinel uses the Supra Push Oracle on Hedera Testnet.

**Contract Address (Hedera Testnet):** `0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917`

**Update Frequency:** 1 hour  
**Deviation Threshold:** 5%  
**Pair Index:** 800 (HBAR/USDT)

**ABI Method:**
```solidity
function getSvalue(uint256 _pairIndex) external view returns (
    uint256 round,
    uint256 decimals,
    uint256 time,
    uint256 price
)
```

**Price Calculation:**
```typescript
const price = rawPrice / Math.pow(10, decimals);
```

### Fallback Chain

```
1. Supra Push Oracle (EVM call via Ethers.js)
   └── Fails if price == 0 (Hedera testnet limitation)

2. Supra REST API
   URL: https://prod-kline-rest.supra.com/latest?trading_pair=hbar_usdt
   └── Fails if rate limited

3. CoinGecko Free API
   URL: https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd
   └── Reliable, no API key required

4. Hardcoded mock: $0.085
```

---

## Hedera Integration

### Hedera Consensus Service (HCS)

Every agent decision is recorded immutably to HCS.

**Topic ID:** Set via `HCS_TOPIC_ID` environment variable

**Message Format:**
```json
{
  "type": "SENTINEL_DECISION",
  "cycle": 1,
  "timestamp": "2026-03-21T09:51:19.000Z",
  "action": "TIGHTEN",
  "threat_score": 0.00,
  "volatility": 0.0012,
  "price": 0.092739,
  "reasoning": "Low threat (0.00) and low volatility. Tightening ranges for higher fees."
}
```

**Transaction:**
```typescript
new TopicMessageSubmitTransaction()
  .setTopicId(TopicId.fromString(topicId))
  .setMessage(JSON.stringify(message))
  .execute(client)
```

View your HCS messages at: [HashScan Testnet](https://hashscan.io/testnet/topic/YOUR_TOPIC_ID)

### Network Configuration

| Setting | Value |
|---------|-------|
| Network | Hedera Testnet |
| RPC URL | `https://testnet.hashio.io/api` |
| Chain ID | 296 |
| Mirror Node | `testnet.mirrornode.hedera.com` |

### Account Setup

Sentinel uses an ECDSA key pair (EVM-compatible) for signing transactions. The account must:
- Have sufficient HBAR for gas fees
- Be associated with HBAR token on testnet
- Have a valid HCS topic created

---

## Bonzo Finance Integration

Bonzo Finance is an Aave v2 fork deployed on Hedera EVM testnet.

### Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| Lending Pool | `BONZO_LENDING_POOL` | Main pool, fetches account data |
| WETH Gateway | `BONZO_WETH_GATEWAY` | HBAR → WHBAR wrapping (testnet inactive) |

### Contract Interactions

#### Position Query

```typescript
// Attempts EVM call to Bonzo lending pool
const data = await getUserAccountData();
// Returns: totalCollateralETH, totalDebtETH, healthFactor, etc.
```

**Testnet Reality:**
- EVM call returns 0 (HTS tokens not indexed in EVM storage)
- Fallback: Hardcoded 10 HBAR at 94.15% APY (verified via Bonzo UI)
- This is acceptable for agent decision logic

#### Keeper Actions

| Action | Implementation | Status |
|--------|-----------------|--------|
| TIGHTEN | Would adjust range parameters | Simulated |
| WIDEN | Would widen range parameters | Simulated |
| HARVEST | Would claim rewards | Simulated |
| PROTECT | Calls withdraw() | Tested & Ready |
| HOLD | No-op | Active |

#### Wallet Status

- **EVM Wallet Balance:** 555+ HBAR (sufficient for gas)
- **Deposit:** Currently skipped (gateway inactive on testnet)
- **Withdraw:** Ready for execution (uses existing vault balance)
- **Transaction Pattern:** Using ethers.js v6 with manual function encoding

> In production, these would execute real transactions: `depositNative()`, `withdrawNative()`, `claimRewards()` on actual Bonzo contracts.

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.9+ (for scraper)
- A Hedera testnet account ([create one free](https://portal.hedera.com))
- A Gemini API key ([get one free](https://ai.google.dev))

### 1. Clone the Repository

```bash
git clone https://github.com/Sanjay160805/Sentinel.git
cd Sentinel
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values (see [Environment Variables](#environment-variables)).

### 4. Initialize Database

```bash
node -e "
const Database = require('better-sqlite3');
const db = new Database('crypto_tweets.db');
db.exec('CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY AUTOINCREMENT, cycle INTEGER, timestamp TEXT, action TEXT, reasoning TEXT, threat_score REAL, volatility REAL, price REAL, executed INTEGER DEFAULT 0, tx_hash TEXT)');
db.exec('CREATE TABLE IF NOT EXISTS tweets (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, text TEXT, time TEXT, likes INTEGER DEFAULT 0, retweets INTEGER DEFAULT 0, scraped_at TEXT, is_crypto INTEGER DEFAULT 1)');
console.log(\"Database initialized\");
db.close();
"
```

### 5. Set Up Python Scraper (Optional)

```bash
cd scraper
pip install -r requirements.txt
python scraper.py
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 7. Run Your First Cycle

Click **Run Cycle** in the dashboard or:

```bash
curl -X POST http://localhost:3000/api/cycle
```

---

## Environment Variables

Create a `.env.local` file in the project root with these variables:

```env
# ─── Gemini AI ───────────────────────────────────────────────────────
# Get your key at: https://ai.google.dev/gemini-api/docs/api-key
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# ─── Hedera Network ──────────────────────────────────────────────────
# Create a testnet account at: https://portal.hedera.com
HEDERA_ACCOUNT_ID=0.0.XXXXXXX
HEDERA_PRIVATE_KEY=your_ecdsa_private_key_hex
HEDERA_NETWORK=testnet

# ─── Hedera Consensus Service ────────────────────────────────────────
# Create a topic first using topicSetup.ts or Hedera portal
HCS_TOPIC_ID=0.0.XXXXXXX

# ─── Bonzo Finance Contracts (Hedera Testnet) ────────────────────────
# Get addresses from: https://docs.bonzo.finance
BONZO_LENDING_POOL=0x...
BONZO_DATA_PROVIDER=0x...
BONZO_WETH_GATEWAY=0x...
BONZO_RPC_URL=https://testnet.hashio.io/api

# ─── Supra Oracle ────────────────────────────────────────────────────
# Hedera Testnet Push Oracle address
SUPRA_ORACLE_ADDRESS=0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917

# ─── Agent Configuration ─────────────────────────────────────────────
# How often the agent runs (milliseconds). Default: 1 hour
MONITORING_INTERVAL_MS=3600000

# ─── Database (Optional) ─────────────────────────────────────────────
# Custom SQLite path (defaults to project root)
# DB_PATH=/custom/path/crypto_tweets.db
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Gemini AI for threat analysis |
| `GOOGLE_API_KEY` | Yes | Google embeddings (optional) |
| `HEDERA_ACCOUNT_ID` | Yes | Your Hedera account (0.0.XXXXX) |
| `HEDERA_PRIVATE_KEY` | Yes | ECDSA private key for signing |
| `HEDERA_NETWORK` | Yes | `testnet` or `mainnet` |
| `HCS_TOPIC_ID` | Yes | HCS topic for decision logging |
| `BONZO_LENDING_POOL` | Yes | Bonzo lending pool contract |
| `BONZO_DATA_PROVIDER` | Yes | Bonzo data provider contract |
| `BONZO_WETH_GATEWAY` | Yes | WETH gateway for HBAR wrapping |
| `BONZO_RPC_URL` | Yes | Hedera EVM RPC endpoint |
| `SUPRA_ORACLE_ADDRESS` | Yes | Supra push oracle contract |
| `MONITORING_INTERVAL_MS` | No | Agent cycle interval (default: 3600000) |

---

## API Reference

All endpoints are REST APIs using Next.js App Router route handlers.

### GET `/api/status`

Returns current agent status, last decision, and tweet count.

**Response:**
```json
{
  "ok": true,
  "agent": {
    "running": false,
    "interval": 3600000,
    "lastDecision": {
      "id": 1,
      "cycle": 1,
      "timestamp": "2026-03-21T09:51:19.000Z",
      "action": "TIGHTEN",
      "reasoning": "Low threat (0.00) and low volatility...",
      "threat_score": 0.00,
      "volatility": 0.0012,
      "price": 0.092739,
      "executed": 1
    },
    "tweetCount": 1500  // Updates hourly as scraper ingests new tweets
  },
  "timestamp": "2026-03-21T09:51:20.000Z"
}
```

### GET `/api/positions`

Returns current vault position and HBAR price.

**Response:**
```json
{
  "ok": true,
  "position": {
    "asset": "HBAR",
    "deposited": "10.0000",
    "borrowed": "0.0000",
    "healthFactor": "Infinity",
    "apy": "94.15%",
    "rewards": "0.0000"
  },
  "price": {
    "value": 0.092739,
    "source": "coingecko",
    "timestamp": 1711014679000
  }
}
```

### GET `/api/decisions?limit=20`

Returns recent agent decisions.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of decisions to return |

**Response:**
```json
{
  "ok": true,
  "decisions": [
    {
      "id": 1,
      "cycle": 1,
      "timestamp": "2026-03-21T09:51:19.000Z",
      "action": "TIGHTEN",
      "reasoning": "Low threat (0.00) and low volatility...",
      "threat_score": 0.00,
      "volatility": 0.0012,
      "price": 0.092739,
      "executed": 1,
      "tx_hash": null
    }
  ],
  "total": 1
}
```

### GET `/api/tweets?limit=50`

Returns recent crypto tweets from the database.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Number of tweets to return |

**Response:**
```json
{
  "ok": true,
  "tweets": [
    {
      "id": 1,
      "username": "Uniswap",
      "text": "Tweet content here...",
      "time": "2026-03-14 15:19:00",
      "likes": 4,
      "retweets": 0,
      "scraped_at": "2026-03-14T15:20:00.000Z",
      "is_crypto": 1
    }
  ],
  "total": 6,
  "count": 6
}
```

### POST `/api/cycle`

Manually triggers one agent cycle.

**Response (success):**
```json
{
  "ok": true,
  "result": {
    "decision": { "action": "TIGHTEN", "reasoning": "..." },
    "threatAnalysis": { "score": 0.00, "level": "LOW" },
    "priceData": { "pair": "HBAR/USDC", "price": 0.092739 },
    "position": { "asset": "HBAR", "deposited": "10.0000" }
  }
}
```

**Response (already running):**
```json
{
  "ok": false,
  "message": "Cycle already running or failed"
}
```
Status: `409 Conflict`

### POST `/api/agent/start`

Starts the autonomous agent scheduler.

**Response:**
```json
{
  "ok": true,
  "status": { "running": true, "interval": 3600000 }
}
```

### POST `/api/agent/stop`

Stops the autonomous agent scheduler.

**Response:**
```json
{
  "ok": true,
  "status": { "running": false, "interval": 3600000 }
}
```

---

## Dashboard

The dashboard is a real-time Next.js app showing all agent activity.

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Dashboard` | `src/components/Dashboard.tsx` | Main layout, navbar, grid container |
| `ThreatMeter` | `src/components/ThreatMeter.tsx` | Threat score, level badge, action badge |
| `PriceChart` | `src/components/PriceChart.tsx` | Live price with Recharts sparkline |
| `PositionCard` | `src/components/PositionCard.tsx` | Vault position with USD calculation |
| `DecisionFeed` | `src/components/DecisionFeed.tsx` | Timeline of agent decisions |
| `TweetFeed` | `src/components/TweetFeed.tsx` | Recent crypto signal tweets |
| `StatusBadge` | `src/components/StatusBadge.tsx` | System health, network, tech stack |

### Design System

The dashboard uses a custom CSS design system defined in `globals.css`:

- **Font:** DM Sans + DM Mono (Google Fonts)
- **Theme:** Light with animated gradient background
- **Colors:** Indigo/violet accent, emerald for success, amber for warning, red for danger
- **Cards:** White with `box-shadow`, 16px border-radius, 3px top accent border
- **Animations:** CSS keyframes for shimmer loading, pulse dots, floating hexagons
- **Responsive:** 3-column grid → 2-column → 1-column

### Polling Intervals

| Component | Interval | Endpoint |
|-----------|----------|---------|
| ThreatMeter | 10 seconds | `/api/status` |
| PriceChart | 15 seconds | `/api/positions` |
| PositionCard | 30 seconds | `/api/positions` |
| DecisionFeed | 10 seconds | `/api/decisions` |
| TweetFeed | 30 seconds | `/api/tweets` |
| StatusBadge | 15 seconds | `/api/status` |

---

## Scraper Setup

The Python scraper uses Selenium to collect crypto tweets from Nitter instances.

### Installation

```bash
cd scraper
pip install -r requirements.txt
```

**Requirements:**
```
selenium>=4.0.0
webdriver-manager>=4.0.0
```

### Running Manually

```bash
python scraper/scraper.py
```

### Automated Scheduling

#### Option 1: GitHub Actions (Free, no server needed)

Create `.github/workflows/scraper.yml`:

```yaml
name: Tweet Scraper

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:      # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Chrome
        run: |
          sudo apt-get update
          sudo apt-get install -y chromium-browser
      
      - name: Install dependencies
        run: pip install -r scraper/requirements.txt
      
      - name: Run scraper
        run: python scraper/scraper.py
        env:
          DB_PATH: ${{ github.workspace }}/crypto_tweets.db
      
      - name: Commit database update
        run: |
          git config --global user.email "bot@sentinel.ai"
          git config --global user.name "Sentinel Bot"
          git add crypto_tweets.db
          git diff --staged --quiet || git commit -m "chore: update tweet database [skip ci]"
          git push
```

#### Option 2: Linux Cron Job (VPS)

```bash
# Edit crontab
crontab -e

# Add this line to run every hour
0 * * * * cd /path/to/Sentinel && python scraper/scraper.py >> /var/log/sentinel-scraper.log 2>&1
```

#### Option 3: Windows Task Scheduler

```powershell
# Create scheduled task to run every hour
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\Sentinel\scraper\scraper.py" -WorkingDirectory "C:\Sentinel"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -Once -At (Get-Date)
Register-ScheduledTask -TaskName "SentinelScraper" -Action $action -Trigger $trigger
```

### Scraper Configuration

The scraper targets these crypto accounts by default:
- `@Uniswap`, `@aave`, `@chainlink`, `@hedera`, `@CoinDesk`, `@Cointelegraph`

To add more accounts, edit `scraper/scraper.py` and add to the `ACCOUNTS` list.

---

## Deployment

### Automated Hourly Execution (GitHub Actions)

**Current Setup:** Sentinel cycles run automatically every hour via GitHub Actions.

#### Workflow Configuration

File: `.github/workflows/agent.yml`

```yaml
name: Sentinel Agent Cycle

on:
  schedule:
    - cron: '0 * * * *'  # Hourly at minute 0 (00:00, 01:00, etc. UTC)
  workflow_dispatch:      # Manual trigger via GitHub UI

jobs:
  cycle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Trigger Sentinel Cycle
        run: |
          curl -X POST \https://sentinel-one-teal.vercel.app/api/cycle \\
            -H "Content-Type: application/json" \\
            -H "Authorization: Bearer ${{ secrets.CYCLE_TOKEN }}"
        env:
          CYCLE_TOKEN: ${{ secrets.CYCLE_TOKEN }}
```

**Status:** ✔ Active and running. Tweet database grows hourly via scraper, interval: 3600000ms (1 hour). Current snapshot: 1,500+ tweets.

### Deploy to Vercel

#### Critical Configuration: 120-Second Timeout

The single most important setting for Sentinel is in `src/app/api/cycle/route.ts`:

```typescript
export const maxDuration = 120;  // Hedera Pro tier maximum
```

**Why This Matters:**
- Default Vercel timeout: 60 seconds
- Sentinel cycle duration: 90-120 seconds (tweet analysis + Gemini scoring + HCS submission)
- Previous setting (60s) caused cycles to abort before HCS logging completed
- **Fix:** 120s allows full cycle execution including HCS TopicMessageSubmitTransaction
- **Result:** Decision #16+ now appearing on HashScan (previous 60s setting lost them)

#### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add -A
   git commit -m "feat: production deployment"
   git push origin main
   ```

2. **Vercel Import**
   - Go to [vercel.com](https://vercel.com) → **Add New Project**
   - Import GitHub repository (auto-detects Next.js)
   - Select `main` branch

3. **Environment Variables**
   
   Set these in Vercel project settings → Environment Variables:
   ```
   GEMINI_API_KEY=your_key
   GOOGLE_API_KEY=your_key  
   HEDERA_ACCOUNT_ID=0.0.XXXXX
   HEDERA_PRIVATE_KEY=your_hex_private_key
   HEDERA_NETWORK=testnet
   HCS_TOPIC_ID=0.0.8314584
   BONZO_LENDING_POOL=0x...
   BONZO_WETH_GATEWAY=0x...
   SUPRA_ORACLE_ADDRESS=0x...
   ```

4. **Deploy**
   - Click **Deploy**
   - Vercel builds and deploys to CDN
   - Check `.github/workflows/agent.yml` runs at next scheduled time (every hour)

#### API Endpoints Available

All endpoints respond correctly after deployment:

- **GET `/api/status`** — Returns `{ok: true, agent: {running: false, tweetCount: <dynamic>, interval: 3600000}}` (tweetCount updates hourly)
- **POST `/api/cycle`** — Manually trigger a cycle (returns HCS submission confirmation)
- **GET `/api/decisions`** — Fetch recent decisions (16+ entries)
- **GET `/api/positions`** — Vault position + HBAR price
- **GET `/api/tweets`** — Recent ingested tweets

#### Dashboard Verification

After deployment:
1. Open [https://sentinel-one-teal.vercel.app](https://sentinel-one-teal.vercel.app)
2. Verify ThreatMeter, PriceChart, and PositionCard load
3. Check DecisionFeed shows 16+ decisions
4. Confirm TweetFeed populates with crypto tweets
5. Monitor `/api/status` responses via cURL

### Important Vercel Limitations

- **SQLite:** Not persistent (serverless filesystem is ephemeral). Database resets between deployments.
  - Workaround: GitHub Actions commits `crypto_tweets.db` to repo after each cycle
  - Production fix: Use Turso or PlanetScale for hosted SQLite

- **Agent Scheduler:** The autonomous scheduler cannot run on Vercel (60s serverless timeout).
  - Solution: GitHub Actions triggers cycles via `/api/cycle` endpoint
  - This is more reliable than a persistent scheduler anyway

- **Cycle Duration:** 90-120 seconds is acceptable on 120s timeout.
  - If cycles exceed 110s, increase `maxDuration` to 180s (or next power of 10)
  - Monitor `POST /api/cycle` response times via Vercel logs

---

## Known Limitations

### Current Testnet Limitations

| Issue | Root Cause | Workaround | Impact |
|-------|-----------|-----------|--------|
| Supra Oracle returns `0` | Hedera testnet push oracle not fully active | CoinGecko fallback (reliable) | No impact on demo |
| Bonzo vault query returns `0` | HTS-to-EVM storage mismatch | Hardcoded 10 HBAR position | Acceptable for agent logic |
| Gemini rate limiting (429 errors) | Free tier: 1500 req/day limit | Keyword-based fallback | Graceful degradation |
| Deposit transactions skip | WETHGateway inactive on testnet | Withdraw path tested & ready | No blocking impact |
| 555 HBAR EVM wallet | Manual funding via faucet | Sufficient for gas | No blocker |

### Vercel / Serverless Constraints

| Constraint | Details | Solution |
|----------|---------|----------|
| SQLite ephemeral | `/crypto_tweets.db` cleared on redeploy | GitHub Actions commits DB to repo |
| Function timeout | 120s is Hedera Pro maximum | Increase to 180s if needed |
| No persistent scheduler | Cannot run 24/7 on serverless | GitHub Actions cron (`0 * * * *`) |
| 16+ decisions preserved | HCS logging immutable on Hedera | Query HashScan topic for full history |

### Production Considerations

- **Database:** Migrate SQLite to Turso (SQLite in cloud) or PlanetScale for persistence
- **Bonzo Position:** Implement Hedera Mirror Node API queries for HTS-compatible position reads
- **Supra Oracle:** May require staking SUPRA tokens for mainnet guaranteed updates
- **Gemini:** Enable billing or implement multi-key rotation for unlimited quota
- **Security:** Use AWS Secrets Manager or Vercel Secrets for key management (never hardcode)
- **HCS Topic:** Topics are account-owned; backup topic ID in secure storage

---

## Roadmap

### Phase 1 — Current (Hackathon MVP) ✓
- [x] Autonomous LangGraph agent with 5-node state machine
- [x] Gemini 2.0 Flash Lite threat analysis + keyword fallback
- [x] Multi-source price oracle (Supra → CoinGecko)
- [x] Bonzo Finance position tracking (with fallback)
- [x] **HCS Immutable Decision Logging** (Topic `0.0.8314584`)
- [x] Real-time Next.js dashboard (6 components)
- [x] Python Selenium tweet scraper (1,500+ and growing, updated hourly)
- [x] **GitHub Actions dual hourly automation** (agent cycle + scraper both cron `0 * * * *`)
- [x] **Vercel deployment with 120s timeout** (enables HCS logging)
- [x] 16+ decisions verified on HashScan (decisions growing per cycle)

### Phase 2 — Post-Hackathon 🚧
- [ ] **Persistent Database** — Migrate SQLite to Turso for serverless compatibility
- [ ] **Real Bonzo Position** — Implement Hedera Mirror Node API queries for HTS token queries
- [ ] **WebSocket Real-Time** — Replace polling with server-sent events for live updates
- [ ] **GitHub Actions Scraper** — Automate tweet ingestion via scheduled workflow
- [ ] **Multi-Key Gemini** — Implement key rotation to avoid rate limits
- [ ] **Alert System** — Telegram/Discord notifications for CRITICAL threat levels
- [ ] **HCS Decision Explorer** — UI for browsing historical decisions on-chain

### Phase 3 — Mainnet & Scale 🔮
- [ ] Mainnet deployment (Hedera mainnet)
- [ ] Real vault execution (actual HBAR deposits/withdrawals via Bonzo)
- [ ] Multi-asset support (USDC, ETH via Hedera EVM)
- [ ] Performance analytics dashboard
- [ ] Multiple threat signal sources (Reddit, Telegram, Discord)
- [ ] Automated market-making integration
- [ ] Liquidation risk alerts for other protocols

---

## Contributing

Contributions are welcome! This is a hackathon project but we'd love to keep building it.

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Sentinel.git
cd Sentinel

# Install dependencies
npm install --legacy-peer-deps

# Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# Start dev server
npm run dev
```

### Project Structure Guidelines

- **Agent logic** → `src/agent/`
- **Analysis modules** → `src/analysis/`
- **Blockchain integrations** → `src/hedera/` or `src/bonzo/`
- **API routes** → `src/app/api/`
- **UI components** → `src/components/`
- **Shared types** → `src/lib/types.ts`
- **Constants** → `src/lib/constants.ts`

### Code Style

- TypeScript strict mode
- Async/await over promises
- Named exports (not default where possible)
- Descriptive variable names over comments
- Error handling with try/catch in every async function
- Logger (`src/lib/logger.ts`) over `console.log`

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
4. Push and open a PR against `main`
5. Describe what you changed and why

---

## Acknowledgements

- **Hedera** — For the incredible HCS infrastructure and EVM compatibility
- **Bonzo Finance** — For bringing Aave-compatible lending to Hedera
- **Supra Oracle** — For the push oracle infrastructure on Hedera
- **LangChain / LangGraph** — For the agent orchestration framework
- **Google Gemini** — For the AI that powers threat analysis
- **CoinGecko** — For the free price API that saves the day when oracles fail

---

## License

```
MIT License

Copyright (c) 2026 Sanjay — Sentinel Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with ❤️ for the Hedera Hackathon**

[⬆ Back to top](#-sentinel--intelligent-keeper-agent-on-hedera)

</div>