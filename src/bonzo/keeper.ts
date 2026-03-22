import { ThreatAnalysis, VaultPosition } from "@/lib/types";
import { VolatilityResult } from "@/analysis/volatilityCalculator";
import { getUserAccountData } from "./lendingPool";
import { THREAT_THRESHOLD } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { KeeperAction } from "./types";
import {
  AccountId,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  TokenAssociateTransaction,
  TokenId,
} from "@hashgraph/sdk";
import { getHederaClient } from "@/hedera/client";
import BigNumber from "bignumber.js";

// ─── Contract addresses (testnet) ─────────────────────────────────────────────
const BONZO_WETH_GATEWAY_ID  = "0.0.4999384"; // WETHGateway Hedera ID
const BONZO_WETH_GATEWAY_EVM = "0x16197Ef10F26De77C9873d075f8774BdEc20A75d";
const BONZO_LENDING_POOL_EVM =
  process.env.BONZO_LENDING_POOL ?? "0xf67DBe9bD1B331cA379c44b5562EAa1CE831EbC2";
const BONZO_DATA_PROVIDER_ID = "0.0.4999382"; // AaveProtocolDataProvider Hedera ID
const WHBAR_EVM              = "0x0000000000000000000000000000000000163b5a"; // WHBAR testnet

// Used only for vault-balance tracking (tx-history fallback)
const BONZO_CONTRACT_ID = "0.0.7154915";

const ADJUST_FRACTION = 0.20;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert HBAR float → wei as a BigNumber.
 * addUint256() accepts string | number | BigNumber | Long.
 * 1 HBAR = 1e8 tinybars = 1e18 wei on Hedera EVM.
 */
function hbarToWei(amountHbar: number): BigNumber {
  // Multiply in BigInt to avoid float precision loss, then convert to BigNumber
  return new BigNumber((BigInt(Math.floor(amountHbar * 1e8)) * BigInt(1e10)).toString());
}

/**
 * Query AaveProtocolDataProvider for the aToken EVM address for WHBAR.
 * Returns the EVM hex address (e.g. "0xAbc...").
 */
async function getATokenAddress(): Promise<string> {
  const client = getHederaClient();

  logger.info("Querying DataProvider for WHBAR aToken address...");

  const result = await new ContractCallQuery()
    .setContractId(ContractId.fromString(BONZO_DATA_PROVIDER_ID))
    .setGas(100_000)
    .setFunction(
      "getReserveTokensAddresses",
      new ContractFunctionParameters().addAddress(WHBAR_EVM)
    )
    .execute(client);

  // Returns (aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress)
  const aTokenEVM = "0x" + result.getAddress(0);
  logger.info(`WHBAR aToken EVM address: ${aTokenEVM}`);
  return aTokenEVM;
}

/**
 * Convert an EVM hex address to a Hedera ContractId.
 */
function evmToContractId(evmAddress: string): ContractId {
  // Strip 0x prefix if present
  const clean = evmAddress.startsWith("0x") ? evmAddress.slice(2) : evmAddress;
  return ContractId.fromEvmAddress(0, 0, clean);
}

// ─── Step 1: Approve aToken spend ─────────────────────────────────────────────
/**
 * Call aToken.approve(WETHGateway, amount) so the gateway can burn our aTokens.
 * This is mandatory before calling withdrawETH — skipping it causes CONTRACT_REVERT_EXECUTED.
 */
async function approveAToken(
  aTokenContractId: ContractId,
  amountWei: BigNumber
): Promise<void> {
  const client = getHederaClient();

  logger.info(
    `Approving aToken ${aTokenContractId.toString()} for WETHGateway, amount: ${amountWei.toString()}`
  );

  const approveTx = await new ContractExecuteTransaction()
    .setContractId(aTokenContractId)
    .setGas(150_000)
    .setFunction(
      "approve",
      new ContractFunctionParameters()
        .addAddress(BONZO_WETH_GATEWAY_EVM) // spender = WETHGateway
        .addUint256(new BigNumber(amountWei))              // amount to allow
    )
    .execute(client);

  const approveReceipt = await approveTx.getReceipt(client);
  logger.info(`aToken approve status: ${approveReceipt.status.toString()}`);

  if (approveReceipt.status.toString() !== "SUCCESS") {
    throw new Error(`aToken approve failed: ${approveReceipt.status.toString()}`);
  }
}

// ─── Native Hedera SDK deposit ─────────────────────────────────────────────────
async function depositNative(amountHbar: number): Promise<string | null> {
  try {
    const client = getHederaClient();
    const operatorEvm = `0x${AccountId.fromString(
      process.env.HEDERA_ACCOUNT_ID!
    ).toSolidityAddress()}`;

    logger.info(
      `Native deposit: ${amountHbar} HBAR to Bonzo via WETHGateway depositETH`
    );

    // Associate WHBAR token if not already associated
    try {
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!))
        .setTokenIds([TokenId.fromString("0.0.15058")])
        .execute(client);
      await associateTx.getReceipt(client);
      logger.info("WHBAR token associated successfully");
    } catch (error) {
      logger.warn("WHBAR token already associated or association failed", error);
    }

    const tx = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(BONZO_WETH_GATEWAY_ID))
      .setGas(400_000)
      .setFunction(
        "depositETH",
        new ContractFunctionParameters()
          .addAddress(BONZO_LENDING_POOL_EVM) // lendingPool
          .addAddress(operatorEvm)            // onBehalfOf
          .addUint16(0)                       // referralCode
      )
      .setPayableAmount(new Hbar(amountHbar))
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const txId = tx.transactionId.toString();
    logger.info(`Native deposit success — tx: ${txId} status: ${receipt.status}`);
    return txId;
  } catch (error) {
    logger.error("Native deposit failed", error);
    return null;
  }
}

// ─── Native Hedera SDK withdraw (with aToken approve) ─────────────────────────
/**
 * Full 3-step withdraw:
 *   1. Query DataProvider → get aToken EVM address
 *   2. aToken.approve(WETHGateway, amount)        ← the missing step that caused the revert
 *   3. WETHGateway.withdrawETH(lendingPool, amount, onBehalfOf)
 */
async function withdrawNative(amountHbar: number): Promise<string | null> {
  try {
    const client = getHederaClient();
    const operatorEvm = `0x${AccountId.fromString(
      process.env.HEDERA_ACCOUNT_ID!
    ).toSolidityAddress()}`;

    // Use MaxUint256 when withdrawing whole position, otherwise exact wei
    const amountWei = hbarToWei(amountHbar);

    logger.info(
      `Native withdraw: ${amountHbar} HBAR from Bonzo (${amountWei} wei)`
    );

    // ── Step 1: Get aToken address ──────────────────────────────────────────
    const aTokenEVM = await getATokenAddress();
    const aTokenContractId = evmToContractId(aTokenEVM);

    // ── Step 2: Approve WETHGateway to spend our aTokens ───────────────────
    await approveAToken(aTokenContractId, amountWei);

    // ── Step 3: Call withdrawETH on WETHGateway ─────────────────────────────
    logger.info(
      `Calling WETHGateway.withdrawETH — lendingPool: ${BONZO_LENDING_POOL_EVM}, ` +
      `amount: ${amountWei}, to: ${operatorEvm}`
    );

    const tx = await new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(BONZO_WETH_GATEWAY_ID))
      .setGas(400_000)
      .setFunction(
        "withdrawETH",
        new ContractFunctionParameters()
          .addAddress(BONZO_LENDING_POOL_EVM) // lendingPool (NOT the gateway)
          .addUint256(new BigNumber(amountWei))              // amount in wei
          .addAddress(operatorEvm)            // to — receives the HBAR
      )
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const txId = tx.transactionId.toString();
    logger.info(
      `Native withdraw success — tx: ${txId} status: ${receipt.status}`
    );
    return txId;
  } catch (error) {
    logger.error("Native withdraw failed", error);
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
  return { type: "TIGHTEN", reason: "Force SDK deposit to mint aTokens" };
  
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