import { keccak256, toHex, bytesToHex } from "viem";

// Celo Mainnet USDC contract (supports EIP-3009)
export const CELO_USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
export const CELO_CHAIN_ID = 42220;

// EIP-712 Domain for Celo USDC
export const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: CELO_CHAIN_ID,
  verifyingContract: CELO_USDC_ADDRESS as `0x${string}`,
} as const;

// EIP-712 Types for transferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

// EIP-712 Types for receiveWithAuthorization (recommended for contracts)
export const RECEIVE_WITH_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
export function generateNonce(): `0x${string}` {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(randomBytes);
}

/**
 * Create a deterministic nonce based on parameters to prevent duplicate auths
 */
export function createDeterministicNonce(
  communityId: number,
  epochId: number,
  userAddress: string,
  toAddress: string,
  amount: number
): `0x${string}` {
  const data = `${communityId}:${epochId}:${userAddress}:${toAddress}:${amount}:${Date.now()}`;
  return keccak256(toHex(data));
}

/**
 * Create transfer authorization message for EIP-712 signing
 */
export function createTransferAuthMessage(params: {
  from: string;
  to: string;
  value: bigint;
  validAfter?: number;
  validBefore?: number;
  nonce?: `0x${string}`;
}) {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = params.validAfter ?? 0;
  const validBefore = params.validBefore ?? now + 3600; // 1 hour default
  const nonce = params.nonce ?? generateNonce();

  return {
    from: params.from as `0x${string}`,
    to: params.to as `0x${string}`,
    value: params.value,
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  };
}

/**
 * Parse USDC amount (6 decimals) to bigint
 */
export function parseUSDC(amount: number | string): bigint {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.floor(numAmount * 1_000_000)); // 6 decimals
}

/**
 * Format USDC bigint to human-readable number
 */
export function formatUSDC(amount: bigint): number {
  return Number(amount) / 1_000_000;
}

/**
 * USDC Contract ABI (minimal for EIP-3009)
 */
export const USDC_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "transferWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "receiveWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "authorizer", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    name: "authorizationState",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface EIP3009Authorization {
  from: string;
  to: string;
  value: string; // USDC amount in smallest units (6 decimals)
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string; // full EIP-712 signature
  // Split signature components for contract call
  v: number;
  r: string;
  s: string;
}
