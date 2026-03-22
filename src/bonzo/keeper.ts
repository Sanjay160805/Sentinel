import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData } from "./lendingPool";
import { THREAT_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import { ethers } from "ethers";

// ─── Contract addresses (testnet) ─────────────────────────────────────────────
// Used only for vault-balance tracking (tx-history fallback)
const BONZO_CONTRACT_ID = "0.0.7154915";

const ADJUST_FRACTION = 0.20;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const WETH_GATEWAY_ADDRESS = "0x16197Ef10F26De77C9873d075f8774BdEc20A75d";
const ATOKEN_ADDRESS = "0x6e96a607F2F5657b39bf58293d1A006f9415aF32";
const LENDING_POOL_ADDRESS = "0xf67DBe9bD1B331cA379c44b5562EAa1CE831EbC2";
const RPC_URL = "https://testnet.hashio.io/api";

const WETH_GATEWAY_ABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable",
  "function withdrawETH(address lendingPool, uint256 amount, address to)",
];

const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];

/**
 * Get ethers wallet from private key
 */
function getWallet(): ethers.Wallet {
  let pk = process.env.HEDERA_PRIVATE_KEY ?? "";
  if (!pk.startsWith("0x")) {
    // Hedera DER key — strip 24-char header to get raw 32-byte key
    pk = "0x" + pk.slice(24);
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(pk, provider);
}

// ─── Native deposit via ethers.js ────────────────────────────────────────────
async function depositNative(amountHbar: number): Promise<string | null> {
  try {
    const wallet = getWallet();
    const contract = new ethers.Contract(
      WETH_GATEWAY_ADDRESS,
      WETH_GATEWAY_ABI,
      wallet
    );

    logger.info(`Depositing ${amountHbar} HBAR via WETHGateway.depositETH`);

    const tx = await contract.depositETH(
      LENDING_POOL_ADDRESS,
      wallet.address,
      0,
      { value: ethers.parseEther(amountHbar.toString()) }
    );

    logger.info(`depositETH tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`depositETH confirmed: ${receipt?.hash}, status: ${receipt?.status}`);
    return receipt?.hash ?? tx.hash;
  } catch (error: any) {
    logger.error("Native deposit failed", error?.message ?? JSON.stringify(error));
    return null;
  }
}

// ─── Native withdraw via ethers.js ───────────────────────────────────────────
async function withdrawNative(amountHbar: number): Promise<string | null> {
  try {
    const wallet = getWallet();
    const amountWei = ethers.parseEther(amountHbar.toString());

    logger.info(`Withdrawing ${amountHbar} HBAR from Bonzo`);

    // Step 1: Approve aToken to be spent by WETHGateway
    logger.info(`Approving aToken for WETHGateway: ${amountWei.toString()}`);
    const aTokenContract = new ethers.Contract(ATOKEN_ADDRESS, ERC20_ABI, wallet);
    const approveTx = await aTokenContract.approve(WETH_GATEWAY_ADDRESS, amountWei);
    await approveTx.wait();
    logger.info(`aToken approved: ${approveTx.hash}`);

    // Step 2: Call withdrawETH
    logger.info(
      `Calling WETHGateway.withdrawETH: lendingPool=${LENDING_POOL_ADDRESS}, amount=${amountWei}, to=${wallet.address}`
    );
    const contract = new ethers.Contract(
      WETH_GATEWAY_ADDRESS,
      WETH_GATEWAY_ABI,
      wallet
    );
    const tx = await contract.withdrawETH(
      LENDING_POOL_ADDRESS,
      amountWei,
      wallet.address
    );

    logger.info(`withdrawETH tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`withdrawETH confirmed: ${receipt?.hash}, status: ${receipt?.status}`);
    return receipt?.hash ?? tx.hash;
  } catch (error: any) {
    logger.error("Native withdraw failed", error?.message ?? JSON.stringify(error));
    return null;
  }
}

// ─── Mirror node balance (tx-history fallback) ────────────────────────────────
async function getBonzoBalanceFromTransactions(
  accountId: string
): Promise<number> {
  try {
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let nextUrl: string | null =
      `https://testnet.mirrornode.hedera.com/api/v1/transactions` +
      `?account.id=${accountId}&limit=100&order=desc&transactiontype=CONTRACTCALL`;

    let pages = 0;
    while (nextUrl && pages < 5) {
      const res = await fetch(nextUrl);
      const data: any = await res.json();
      const txs: any[] = data?.transactions ?? [];

      for (const tx of txs) {
        if (tx.result !== "SUCCESS") continue;
        if (tx.name !== "CONTRACTCALL") continue;
        if (tx.entity_id !== BONZO_CONTRACT_ID) continue;

        for (const transfer of tx.transfers ?? []) {
          if (transfer.account !== accountId) continue;
          if (transfer.amount < 0) {
            const netAmount =
              Math.abs(transfer.amount) - (tx.charged_tx_fee ?? 0);
            const hbar = netAmount / 1e8;
            if (hbar > 0.5) totalDeposited += netAmount;
          } else if (transfer.amount > 0) {
            totalWithdrawn += transfer.amount;
          }
        }
      }

      nextUrl = data?.links?.next
        ? `https://testnet.mirrornode.hedera.com${data.links.next}`
        : null;
      pages++;
    }

    const netHBAR = (totalDeposited - totalWithdrawn) / 1e8;
    logger.info(
      `Bonzo balance for ${accountId}: ` +
      `deposited=${totalDeposited / 1e8} ` +
      `withdrawn=${totalWithdrawn / 1e8} ` +
      `net=${netHBAR}`
    );
    return Math.max(0, parseFloat(netHBAR.toFixed(4)));
  } catch (err) {
    logger.error("getBonzoBalanceFromTransactions failed", err);
    return 0;
  }
}

// ─── Vault position ────────────────────────────────────────────────────────────
export async function getVaultPosition(
  accountId?: string
): Promise<VaultPosition> {
  if (!accountId) {
    return {
      asset: "HBAR",
      deposited: "0.0000",
      borrowed: "0.0000",
      healthFactor: "∞",
      apy: "94.15%",
      rewards: "0.0000",
    };
  }

  try {
    const data = await getUserAccountData(accountId);
    if (data && data.totalCollateralETH > 0n) {
      const healthFactor =
        Number(data.healthFactor) / 1e18 > 1e15
          ? "∞"
          : (Number(data.healthFactor) / 1e18).toFixed(2);
      return {
        asset: "HBAR",
        deposited: (Number(data.totalCollateralETH) / 1e18).toFixed(4),
        borrowed: (Number(data.totalDebtETH) / 1e18).toFixed(4),
        healthFactor,
        apy: "94.15%",
        rewards: (Number(data.availableBorrowsETH) / 1e18).toFixed(4),
      };
    }
  } catch (err) {
    logger.warn("EVM contract call failed, using transaction history", err);
  }

  const balance = await getBonzoBalanceFromTransactions(accountId);
  return {
    asset: "HBAR",
    deposited: balance.toFixed(4),
    borrowed: "0.0000",
    healthFactor: "∞",
    apy: "94.15%",
    rewards: "0.0000",
  };
}

// ─── Keeper decision ───────────────────────────────────────────────────────────
export function determineKeeperAction(
  threat: ThreatAnalysis,
  volatility: VolatilityResult,
  price: number
): KeeperAction {
  if (threat.level === "CRITICAL" || threat.score > 0.85)
    return {
      type: "PROTECT",
      reason:
        `CRITICAL threat (score: ${threat.score.toFixed(2)}). ` +
        `${threat.summary}. Withdrawing to safety.`,
    };
  if (
    threat.level === "HIGH" ||
    (threat.score > THREAT_THRESHOLD && volatility.isHigh)
  )
    return {
      type: "WIDEN",
      reason:
        `High threat (${threat.score.toFixed(2)}) with ` +
        `${volatility.level} volatility. Widening ranges.`,
    };
  if (threat.sentiment === "BEARISH" && threat.score > 0.4)
    return {
      type: "HARVEST",
      reason:
        `Bearish sentiment with elevated threat (${threat.score.toFixed(2)}). ` +
        `Harvesting rewards now.`,
    };
  if (threat.score < 0.3 && !volatility.isHigh)
    return {
      type: "TIGHTEN",
      reason:
        `Low threat (${threat.score.toFixed(2)}) and low volatility. ` +
        `Tightening ranges for higher fees.`,
    };
  if (threat.sentiment === "BULLISH" && threat.score < 0.4)
    return {
      type: "HOLD",
      reason:
        `Bullish sentiment, low threat (${threat.score.toFixed(2)}). ` +
        `Accumulating rewards.`,
    };
  return {
    type: "HOLD",
    reason:
      `Moderate conditions (threat: ${threat.score.toFixed(2)}, ` +
      `vol: ${volatility.realized.toFixed(4)}). Holding.`,
  };
}

// ─── Execute action ────────────────────────────────────────────────────────────
export async function executeKeeperAction(
  action: KeeperAction,
  currentDepositHBAR: number = 16.0
): Promise<string | null> {
  logger.info(`Executing keeper action: ${action.type}`);

  switch (action.type) {
    case "PROTECT": {
      const amount = currentDepositHBAR * 0.50;
      logger.warn(`PROTECT: withdrawing ${amount} HBAR from Bonzo`);
      const txId = await withdrawNative(amount);
      if (txId) {
        logger.info(`PROTECT executed — tx: ${txId}`);
        return txId;
      }
      logger.warn("PROTECT: native withdraw failed");
      return null;
    }

    case "WIDEN":
    case "HARVEST": {
      const amount = currentDepositHBAR * ADJUST_FRACTION;
      logger.info(`${action.type}: withdrawing ${amount} HBAR from Bonzo`);
      const txId = await withdrawNative(amount);
      if (txId) {
        logger.info(`${action.type} executed — tx: ${txId}`);
        return txId;
      }
      logger.warn(`${action.type}: native withdraw failed`);
      return null;
    }

    case "TIGHTEN": {
      const amount = currentDepositHBAR * ADJUST_FRACTION;
      logger.info(`TIGHTEN: depositing ${amount} HBAR into Bonzo`);
      const txId = await depositNative(amount);
      if (txId) {
        logger.info(`TIGHTEN executed — tx: ${txId}`);
        return txId;
      }
      logger.warn("TIGHTEN: native deposit failed");
      return null;
    }

    case "HOLD":
    default:
      logger.info("HOLD — no vault adjustment needed");
      return null;
  }
}