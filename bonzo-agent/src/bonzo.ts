import { ethers } from "ethers";
import {
  HEDERA_RPC_URL, HEDERA_PRIVATE_KEY, HEDERA_EVM_ADDRESS,
  BONZO_VAULT_ADDRESS, VAULT_UNDERLYING_TOKEN,
} from "./config";
import { logger } from "./logger";

const VAULT_ABI = [
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function maxDeposit(address receiver) view returns (uint256)",
  "function maxWithdraw(address owner) view returns (uint256)",
  "function maxRedeem(address owner) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewWithdraw(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(HEDERA_RPC_URL);
}

function getSigner() {
  return new ethers.Wallet(
    HEDERA_PRIVATE_KEY.startsWith("0x") ? HEDERA_PRIVATE_KEY : `0x${HEDERA_PRIVATE_KEY}`,
    getProvider()
  );
}

export interface VaultPosition {
  sharesBalance:   bigint;
  assetsBalance:   bigint;
  sharesFormatted: string;
  assetsFormatted: string;
  shareDecimals:   number;
  assetDecimals:   number;
}

export async function getVaultPosition(): Promise<VaultPosition> {
  const provider     = getProvider();
  const vault        = new ethers.Contract(BONZO_VAULT_ADDRESS, VAULT_ABI, provider);
  const underlying   = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, provider);
  const shareDecimals: number = await vault.decimals();
  const assetDecimals: number = await underlying.decimals();
  const shares: bigint        = await vault.balanceOf(HEDERA_EVM_ADDRESS);
  const assets: bigint        = shares > 0n ? await vault.convertToAssets(shares) : 0n;
  return {
    sharesBalance:   shares,
    assetsBalance:   assets,
    sharesFormatted: ethers.formatUnits(shares, shareDecimals),
    assetsFormatted: ethers.formatUnits(assets, assetDecimals),
    shareDecimals,
    assetDecimals,
  };
}

export async function getUnderlyingBalance(): Promise<bigint> {
  const token = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, getProvider());
  return token.balanceOf(HEDERA_EVM_ADDRESS);
}

export async function depositToVault(amount: bigint): Promise<ethers.TransactionReceipt> {
  const signer     = getSigner();
  const vault      = new ethers.Contract(BONZO_VAULT_ADDRESS, VAULT_ABI, signer);
  const underlying = new ethers.Contract(VAULT_UNDERLYING_TOKEN, ERC20_ABI, signer);

  logger.info(`[Bonzo] Approving vault to spend ${amount.toString()} underlying tokens ...`);
  const approveTx = await underlying.approve(BONZO_VAULT_ADDRESS, amount);
  await approveTx.wait();
  logger.info(`[Bonzo] Approved — tx: ${approveTx.hash}`);

  logger.info(`[Bonzo] Depositing ${amount.toString()} into vault ...`);
  const depositTx = await vault.deposit(amount, HEDERA_EVM_ADDRESS);
  const receipt   = await depositTx.wait();
  logger.info(`[Bonzo] Deposited — tx: ${depositTx.hash}`);
  return receipt;
}

export async function redeemAllShares(): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const vault  = new ethers.Contract(BONZO_VAULT_ADDRESS, VAULT_ABI, signer);
  const shares: bigint = await vault.balanceOf(HEDERA_EVM_ADDRESS);

  if (shares === 0n) throw new Error("[Bonzo] redeemAllShares called but share balance is zero.");

  const previewAssets: bigint = await vault.previewRedeem(shares);
  const decimals: number      = await vault.decimals();
  logger.info(
    `[Bonzo] Redeeming ${ethers.formatUnits(shares, decimals)} shares ` +
    `(~${ethers.formatUnits(previewAssets, decimals)} underlying) ...`
  );

  const tx      = await vault.redeem(shares, HEDERA_EVM_ADDRESS, HEDERA_EVM_ADDRESS);
  const receipt = await tx.wait();
  logger.info(`[Bonzo] Redeemed all shares — tx: ${tx.hash}`);
  return receipt;
}

export async function redeemPercent(percent: number): Promise<ethers.TransactionReceipt> {
  if (percent <= 0 || percent > 100) throw new Error("percent must be 1-100");
  const signer = getSigner();
  const vault  = new ethers.Contract(BONZO_VAULT_ADDRESS, VAULT_ABI, signer);
  const totalShares: bigint    = await vault.balanceOf(HEDERA_EVM_ADDRESS);
  const sharesToRedeem: bigint = (totalShares * BigInt(percent)) / 100n;
  if (sharesToRedeem === 0n) throw new Error("[Bonzo] Calculated shares to redeem is zero.");

  logger.info(`[Bonzo] Redeeming ${percent}% of shares (${sharesToRedeem.toString()}) ...`);
  const tx      = await vault.redeem(sharesToRedeem, HEDERA_EVM_ADDRESS, HEDERA_EVM_ADDRESS);
  const receipt = await tx.wait();
  logger.info(`[Bonzo] Partial redeem complete — tx: ${tx.hash}`);
  return receipt;
}
