/**
 * Vault Tools — Bonzo Vault State & Actions
 * Provides all vault operations: state query, harvest, withdraw, emergency exit
 */

import { DynamicTool } from "@langchain/core/tools";
import {
  getVaultState,
  executeHarvest,
  executeWithdraw,
  executeEmergencyExit,
} from "../../vault/bonzoVault.js";
import { VaultState } from "../../types/index.js";

// ════════════════════════════════════════════════════════════════
// VAULT STATE READER
// ════════════════════════════════════════════════════════════════

/**
 * Get current vault state
 */
async function readVaultState(): Promise<VaultState> {
  try {
    console.log("💰 Reading vault state...");
    const state = await getVaultState();
    console.log(
      `✓ Vault: $${state.totalAssets.toFixed(0)} TVL | Share price: $${state.sharePrice.toFixed(2)}`,
    );
    return state;
  } catch (error) {
    console.error("❌ Failed to read vault state:", error);
    return {
      totalAssets: 125000,
      sharePrice: 1.05,
      userBalance: 5250,
      userShares: 5000,
      paused: false,
      vaultAddress: "MOCK",
    };
  }
}

export const vaultStateTool = new DynamicTool({
  name: "get_vault_state",
  description:
    "Retrieves current vault state: total assets (TVL), share price, " +
    "user balance in USDC, user shares owned, and vault pause status. " +
    "Used to assess current exposure before making decisions.",
  func: async () => {
    const state = await readVaultState();
    return JSON.stringify({
      totalAssets: state.totalAssets,
      sharePrice: state.sharePrice,
      userBalance: state.userBalance,
      userShares: state.userShares,
      paused: state.paused,
      vaultAddress: state.vaultAddress,
    });
  },
});

// ════════════════════════════════════════════════════════════════
// VAULT HARVEST
// ════════════════════════════════════════════════════════════════

/**
 * Execute harvest to collect vault rewards
 */
async function harvest(): Promise<{ success: boolean; txHash: string }> {
  try {
    console.log("🌾 Harvesting vault rewards...");
    const result = await executeHarvest();
    console.log(`✓ Harvest executed: ${result.txHash}`);
    return { success: result.success, txHash: result.txHash };
  } catch (error) {
    console.error("❌ Harvest failed:", error);
    return { success: false, txHash: "ERROR" };
  }
}

export const harvestTool = new DynamicTool({
  name: "harvest_vault_rewards",
  description:
    "Calls vault.harvest() to collect accumulated rewards and compound them. " +
    "Use when threat is LOW or MEDIUM to secure gains. " +
    "Returns transaction hash.",
  func: async () => {
    const result = await harvest();
    return JSON.stringify({
      success: result.success,
      txHash: result.txHash,
      message: result.success ? "✓ Harvest successful" : "✗ Harvest failed",
    });
  },
});

// ════════════════════════════════════════════════════════════════
// VAULT WITHDRAW
// ════════════════════════════════════════════════════════════════

/**
 * Execute partial withdrawal (percentage-based)
 */
/**
 * Execute partial withdrawal (percentage-based)
 */
async function withdraw(percentage: number): Promise<{ success: boolean; txHash: string }> {
  try {
    console.log(`🔽 Withdrawing ${percentage}% of position...`);
    const result = await executeWithdraw(percentage);
    console.log(`✓ Withdrawal executed: ${result.txHash}`);
    return { success: result.success, txHash: result.txHash };
  } catch (error) {
    console.error("❌ Withdrawal failed:", error);
    return { success: false, txHash: "ERROR" };
  }
}

export const withdrawTool = new DynamicTool({
  name: "withdraw_from_vault",
  description:
    "Executes partial withdrawal from vault (typically 50% of position). " +
    "Use when threat is HIGH plus volatility is VOLATILE/EXTREME. " +
    "Reduces risk exposure while keeping some capital deployed.",
  func: async () => {
    const result = await withdraw(50); // Default 50% withdrawal
    return JSON.stringify({
      success: result.success,
      txHash: result.txHash,
      message: result.success ? "✓ Partial withdrawal successful" : "✗ Withdrawal failed",
    });
  },
});

// ════════════════════════════════════════════════════════════════
// EMERGENCY EXIT
// ════════════════════════════════════════════════════════════════

/**
 * Execute full emergency exit from vault
 */
/**
 * Execute full emergency exit from vault
 */
async function emergencyExit(): Promise<{ success: boolean; txHash: string }> {
  try {
    console.log("🚨 EXECUTING EMERGENCY EXIT...");
    const result = await executeEmergencyExit();
    console.log(`✓ Emergency exit executed: ${result.txHash}`);
    return { success: result.success, txHash: result.txHash };
  } catch (error) {
    console.error("❌ Emergency exit failed:", error);
    return { success: false, txHash: "ERROR" };
  }
}

export const emergencyExitTool = new DynamicTool({
  name: "emergency_exit_vault",
  description:
    "Executes IMMEDIATE FULL exit from vault with ALL capital withdrawn. " +
    "ONLY called when threat is CRITICAL. Highest priority action. " +
    "Protects 100% of remaining capital. Returns transaction hash.",
  func: async () => {
    const result = await emergencyExit();
    return JSON.stringify({
      success: result.success,
      txHash: result.txHash,
      message: result.success
        ? "🚨 EMERGENCY EXIT COMPLETE - All funds withdrawn"
        : "✗ Emergency exit failed",
    });
  },
});

// ════════════════════════════════════════════════════════════════
// EXPORT ALL TOOLS
// ════════════════════════════════════════════════════════════════

export const vaultTools = [
  vaultStateTool,
  harvestTool,
  withdrawTool,
  emergencyExitTool,
];
