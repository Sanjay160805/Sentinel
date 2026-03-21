import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getHBARUSDPrice } from "@/oracle/priceFeeds";
import { scoreThreat } from "@/analysis/threatScorer";
import { getVaultPosition } from "@/bonzo/keeper";

export const oraclePriceTool = tool(
  async () => JSON.stringify(await getHBARUSDPrice()),
  { name: "get_oracle_price", description: "Get current HBAR/USDC price from Supra Oracle", schema: z.object({}) }
);

export const threatAnalysisTool = tool(
  async () => JSON.stringify(await scoreThreat()),
  { name: "analyze_threat", description: "Analyze current geopolitical and market threat level from recent tweets", schema: z.object({}) }
);

export const vaultPositionTool = tool(
  async () => JSON.stringify(await getVaultPosition()),
  { name: "get_vault_position", description: "Get current Bonzo vault position including deposits, borrows and health factor", schema: z.object({}) }
);

export const agentTools = [oraclePriceTool, threatAnalysisTool, vaultPositionTool];
