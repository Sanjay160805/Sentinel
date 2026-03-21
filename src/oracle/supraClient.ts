import { ethers } from 'ethers';

const SUPRA_PUSH_ADDRESS = process.env.SUPRA_ORACLE_ADDRESS || '0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917';
const HEDERA_TESTNET_RPC = process.env.BONZO_RPC_URL || 'https://testnet.hashio.io/api';
const HBAR_USDT_PAIR_INDEX = 800;

const SUPRA_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_pairIndex', type: 'uint256' }],
    name: 'getSvalue',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'round', type: 'uint256' },
          { internalType: 'uint256', name: 'decimals', type: 'uint256' },
          { internalType: 'uint256', name: 'time', type: 'uint256' },
          { internalType: 'uint256', name: 'price', type: 'uint256' },
        ],
        internalType: 'struct ISupraSValueFeed.priceFeed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export interface PriceData {
  price: number;
  decimals: number;
  timestamp: number;
  round: number;
  source: 'supra' | 'rest_api' | 'coingecko' | 'mock';
}

export async function getHBARPrice(): Promise<PriceData> {
  // Try 1: Supra push oracle via EVM
  try {
    const provider = new ethers.JsonRpcProvider(HEDERA_TESTNET_RPC);
    const oracle = new ethers.Contract(SUPRA_PUSH_ADDRESS, SUPRA_ABI, provider);
    const feed = await oracle.getSvalue(HBAR_USDT_PAIR_INDEX);
    const decimals = Number(feed.decimals);
    const rawPrice = Number(feed.price);

    // Zero means oracle has no data — fall through
    if (rawPrice === 0) throw new Error('Supra returned zero price');

    const price = rawPrice / Math.pow(10, decimals);
    console.log(`[SupraOracle] Push oracle: $${price}`);
    return { price, decimals, timestamp: Number(feed.time), round: Number(feed.round), source: 'supra' };
  } catch (err) {
    console.warn('[SupraOracle] Push oracle failed:', (err as Error).message);
  }

  // Try 2: Supra REST API
  try {
    const res = await fetch(
      'https://prod-kline-rest.supra.com/latest?trading_pair=hbar_usdt',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const instrument = data.instruments?.[0];
      if (instrument) {
        const price = parseFloat(instrument.currentPrice);
        if (price > 0) {
          console.log(`[SupraOracle] REST API: $${price}`);
          return { price, decimals: 8, timestamp: parseInt(instrument.time ?? Date.now()), round: 0, source: 'rest_api' };
        }
      }
    }
  } catch (err) {
    console.warn('[SupraOracle] REST API failed:', (err as Error).message);
  }

  // Try 3: CoinGecko free tier
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd',
      { next: { revalidate: 60 } } as RequestInit
    );
    if (res.ok) {
      const data = await res.json();
      const price = data['hedera-hashgraph']?.usd;
      if (price && price > 0) {
        console.log(`[SupraOracle] CoinGecko: $${price}`);
        return { price, decimals: 8, timestamp: Date.now(), round: 0, source: 'coingecko' };
      }
    }
  } catch (err) {
    console.warn('[SupraOracle] CoinGecko failed:', (err as Error).message);
  }

  // Final fallback
  console.warn('[SupraOracle] All sources failed, using mock $0.085');
  return { price: 0.085, decimals: 8, timestamp: Date.now(), round: 0, source: 'mock' };
}