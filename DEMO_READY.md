# Sentinel Keeper Agent — Demo Ready ✅

## What Works

### ✅ Core Features
- **Threat Analysis** — Gemini AI + RAG context (with fallback to keyword matching)
- **Keeper Decisions** — TIGHTEN, HARVEST, WIDEN, PROTECT, HOLD based on threat scores
- **Blockchain Execution** — Withdraw actions execute on Hedera EVM (deposit disabled - gateway inactive)
- **HCS Logging** — All decisions logged immutably to Hedera Consensus Service
  - Topic: `0.0.8314584`
  - Entries #1-16+ visible on HashScan

### ✅ Automation
- **60-120s Cycle Duration** — Full analysis → decision → HCS logging → execution
- **GitHub Actions** — Hourly automated cycles (cron: `0 * * * *`)
- **Manual Testing** — "Run Cycle" button on dashboard for immediate testing

### ⚠️ Current Limitations
- **Deposit disabled** — WETHGateway not responding on testnet (returns empty `data` field)
- **Withdraw works** — Uses existing 2.4 HBAR vault balance
- **Gemini rate-limiting** — 429 errors handled gracefully with keyword fallback
- **EVM Balance** — 555 HBAR available for transactions (verified)

## For Your Demo/PPT

### Key Points to Explain

1. **Autonomous Decision Making**
   - Ingests tweets → Analyzes threat via Gemini → Makes action decision → Logs to HCS → Executes
   - All visible on dashboard in real-time

2. **Immutable Audit Trail**
   - Every decision logged to HCS (Hedera Consensus Service)
   - Timestamp, threat score, reasoning, action type — all on-chain
   - Visible at: https://hashscan.io/testnet/topic/0.0.8314584

3. **Hourly Automation**
   - GitHub Actions triggers `/api/cycle` every hour
   - Can also manually trigger via "Run Cycle" button
   - 120-second execution window on Vercel

### Dashboard Flow
1. **Shows current HBAR price** (from CoinGecko)
2. **Threat Level** — Current market threat assessment
3. **Decision Log** — Last 5 keeper decisions with on-chain status ✓
4. **Recent Signals** — Latest tweets being analyzed
5. **Vault Position** — Current Bonzo vault balance (2.4 HBAR)

### What to Show
1. Run a manual cycle — show threat analysis → decision → HCS entry
2. Check HashScan — show decision appearing immutably on-chain
3. Explain GitHub Actions — autonomous hourly runs (show `.github/workflows/agent.yml`)
4. Show Bonzo position — demonstrate vault tracking

## Commands for Demo

### Manual Cycle
```bash
curl -X POST https://sentinel-one-teal.vercel.app/api/cycle \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Check Status
```bash
curl https://sentinel-one-teal.vercel.app/api/status | jq
```

### View Decisions
```bash
curl "https://sentinel-one-teal.vercel.app/api/decisions?limit=10" | jq
```

### View HCS Logs
Visit: https://hashscan.io/testnet/topic/0.0.8314584

## Deployment Notes

### Environment Variables (Vercel)
- `HEDERA_ACCOUNT_ID` — Operator account
- `HEDERA_PRIVATE_KEY` — DER-encoded private key  
- `HCS_TOPIC_ID` — `0.0.8314584`
- `GOOGLE_API_KEY` — Gemini API key
- `NEXT_PUBLIC_APP_URL` — `https://sentinel-one-teal.vercel.app`

### Function Timeout
- Set to **120 seconds** in `/api/cycle/route.ts`
- Allows full cycle (analysis + HCS logging + execution) to complete

### Automation
- **GitHub Actions** — `.github/workflows/agent.yml` runs hourly
- **No long-running scheduler on Vercel** — Serverless can't maintain background jobs
- GitHub Actions is the reliable automation layer

## Next Steps (Post-Demo)

1. **Fix WETHGateway** — Investigate why deposits revert (possibly contract not deployed properly)
2. **Optimize Gemini** — Add request queuing to avoid 429 rate limits
3. **Add more analysis nodes** — On-chain metrics, volume analysis, discord sentiment
4. **Enhanced execution** — Add slippage protection, position sizing logic
5. **Monitoring** — Add alerts for failed cycles, missed decisions

---

**Status:** ✅ Ready for demo  
**Last Updated:** March 22, 2026  
**Tested:** Full cycle (ingest → analyze → decide → log HCS → execute)
