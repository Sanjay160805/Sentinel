import * as dotenv from "dotenv";
dotenv.config();

function require(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[Config] Missing required environment variable: ${key}\n` +
      `  → Copy .env.example to .env and fill in all values.`
    );
  }
  return value.trim();
}

function optional(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const HEDERA_ACCOUNT_ID         = require("HEDERA_ACCOUNT_ID");
export const HEDERA_PRIVATE_KEY        = require("HEDERA_PRIVATE_KEY");
export const HEDERA_EVM_ADDRESS        = require("HEDERA_EVM_ADDRESS");
export const HEDERA_NETWORK            = optional("HEDERA_NETWORK", "mainnet") as "mainnet" | "testnet";
export const HEDERA_RPC_URL            = HEDERA_NETWORK === "mainnet"
                                           ? "https://mainnet.hashio.io/api"
                                           : "https://testnet.hashio.io/api";

export const ANTHROPIC_API_KEY         = require("ANTHROPIC_API_KEY");

export const BONZO_VAULT_ADDRESS       = require("BONZO_VAULT_ADDRESS");
export const VAULT_UNDERLYING_TOKEN    = require("VAULT_UNDERLYING_TOKEN");
export const USDC_TOKEN_ADDRESS        = require("USDC_TOKEN_ADDRESS");
export const HBARX_TOKEN_ADDRESS       = require("HBARX_TOKEN_ADDRESS");
export const SAUCERSWAP_ROUTER_ADDRESS = require("SAUCERSWAP_ROUTER_ADDRESS");

export const POLL_INTERVAL_MS          = parseInt(optional("POLL_INTERVAL_MS", "300000"));
export const BEARISH_THRESHOLD         = parseFloat(optional("BEARISH_THRESHOLD_PERCENT", "-5"));
export const BULLISH_THRESHOLD         = parseFloat(optional("BULLISH_THRESHOLD_PERCENT", "5"));
export const MAX_SLIPPAGE_BPS          = parseInt(optional("MAX_SLIPPAGE_BPS", "50"));

export const COINGECKO_API_KEY         = optional("COINGECKO_API_KEY", "");
export const COINGECKO_TOKEN_ID        = optional("COINGECKO_TOKEN_ID", "hedera-hashgraph");
export const PRICE_HISTORY_DAYS        = parseInt(optional("PRICE_HISTORY_DAYS", "7"));
