import { ethers } from "ethers";
import {
  HEDERA_RPC_URL, HEDERA_PRIVATE_KEY, HEDERA_EVM_ADDRESS,
  SAUCERSWAP_ROUTER_ADDRESS, USDC_TOKEN_ADDRESS, VAULT_UNDERLYING_TOKEN,
} from "./config";
import { logger } from "./logger";

const ROUTER_ABI = [
  `function exactInputSingle(
    (address tokenIn, address tokenOut, uint24 fee, address recipient,
     uint256 deadline, uint256 amountIn, uint256 amountOutMinimum,
     uint160 sqrtPriceLimitX96)
  ) payable returns (uint256 amountOut)`,
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const FEE_TIER = { LOWEST: 500, STANDARD: 3000, HIGH: 10000 } as const;

function getSigner() {
  return new ethers.Wallet(
    HEDERA_PRIVATE_KEY.startsWith("0x") ? HEDERA_PRIVATE_KEY : `0x${HEDERA_PRIVATE_KEY}`,
    new ethers.JsonRpcProvider(HEDERA_RPC_URL)
  );
}

async function ensureApproval(tokenAddress: string, amount: bigint, signer: ethers.Wallet) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const allowance: bigint = await token.allowance(HEDERA_EVM_ADDRESS, SAUCERSWAP_ROUTER_ADDRESS);
  if (allowance < amount) {
    logger.info(`[SaucerSwap] Approving router for token ${tokenAddress} ...`);
    const tx = await token.approve(SAUCERSWAP_ROUTER_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    logger.info(`[SaucerSwap] Approval confirmed.`);
  }
}

export interface SwapResult { txHash: string; amountIn: bigint; amountOut: bigint; }

export async function swapUnderlyingToUSDC(feeTier = FEE_TIER.STANDARD): Promise<SwapResult> {
  const signer     = getSigner();
  const router     = new ethers.Contract(SAUCERSWAP_ROUTER_ADDRESS, ROUTER_ABI, signer);
  const underlying = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, signer);
  const amountIn: bigint = await underlying.balanceOf(HEDERA_EVM_ADDRESS);
  const symbol: string   = await underlying.symbol();

  if (amountIn === 0n) throw new Error("[SaucerSwap] Underlying balance is zero.");
  logger.info(`[SaucerSwap] Swapping ${amountIn.toString()} ${symbol} → USDC ...`);
  await ensureApproval(VAULT_UNDERLYING_TOKEN, amountIn, signer);

  const tx = await router.exactInputSingle({
    tokenIn:           VAULT_UNDERLYING_TOKEN,
    tokenOut:          USDC_TOKEN_ADDRESS,
    fee:               feeTier,
    recipient:         HEDERA_EVM_ADDRESS,
    deadline:          BigInt(Math.floor(Date.now() / 1000) + 300),
    amountIn,
    amountOutMinimum:  0n, // ⚠️ Use quoter contract in production for slippage protection
    sqrtPriceLimitX96: 0n,
  });
  await tx.wait();

  const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
  const amountOut: bigint = await usdc.balanceOf(HEDERA_EVM_ADDRESS);
  logger.info(`[SaucerSwap] Done. Received ~${amountOut.toString()} USDC. tx: ${tx.hash}`);
  return { txHash: tx.hash, amountIn, amountOut };
}

export async function swapUSDCToUnderlying(feeTier = FEE_TIER.STANDARD): Promise<SwapResult> {
  const signer = getSigner();
  const router = new ethers.Contract(SAUCERSWAP_ROUTER_ADDRESS, ROUTER_ABI, signer);
  const usdc   = new ethers.Contract(USDC_TOKEN_ADDRESS, ERC20_ABI, signer);
  const amountIn: bigint = await usdc.balanceOf(HEDERA_EVM_ADDRESS);

  if (amountIn === 0n) throw new Error("[SaucerSwap] USDC balance is zero.");
  logger.info(`[SaucerSwap] Swapping ${amountIn.toString()} USDC → underlying ...`);
  await ensureApproval(USDC_TOKEN_ADDRESS, amountIn, signer);

  const tx = await router.exactInputSingle({
    tokenIn:           USDC_TOKEN_ADDRESS,
    tokenOut:          VAULT_UNDERLYING_TOKEN,
    fee:               feeTier,
    recipient:         HEDERA_EVM_ADDRESS,
    deadline:          BigInt(Math.floor(Date.now() / 1000) + 300),
    amountIn,
    amountOutMinimum:  0n, // ⚠️ Use quoter contract in production for slippage protection
    sqrtPriceLimitX96: 0n,
  });
  await tx.wait();

  const underlying = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, signer);
  const amountOut: bigint = await underlying.balanceOf(HEDERA_EVM_ADDRESS);
  logger.info(`[SaucerSwap] Done. Received ${amountOut.toString()} underlying. tx: ${tx.hash}`);
  return { txHash: tx.hash, amountIn, amountOut };
}
