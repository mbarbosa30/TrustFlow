import { verifyTypedData, type Address, type Hex } from "viem";

export const ENDORSEMENT_TYPES = {
  Endorsement: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "epoch", type: "uint64" },
    { name: "nonce", type: "uint64" },
    { name: "timestamp", type: "uint64" },
  ],
} as const;

// Domain is constructed dynamically with chainId to support multi-chain signatures
export const DOMAIN_BASE = {
  name: "MaxFlow",
  version: "1",
} as const;

export interface EndorsementMessage {
  endorser: Address;
  endorsee: Address;
  epoch: bigint;
  nonce: bigint;
  timestamp: bigint;
}

export interface SignedEndorsement {
  endorser: Address;
  endorsee: Address;
  epoch: bigint;
  nonce: bigint;
  timestamp: bigint;
  sig: Hex;
  chainId?: number; // Optional for backward compatibility
}

export async function verifyEndorsementSignature(
  endorsement: SignedEndorsement
): Promise<boolean> {
  try {
    const message: EndorsementMessage = {
      endorser: endorsement.endorser,
      endorsee: endorsement.endorsee,
      epoch: endorsement.epoch,
      nonce: endorsement.nonce,
      timestamp: endorsement.timestamp,
    };

    // Construct domain with chainId if provided
    // Default to 1 (Ethereum mainnet) for backward compatibility
    const domain = {
      ...DOMAIN_BASE,
      chainId: endorsement.chainId || 1,
    };

    console.log("Verifying signature with domain:", JSON.stringify(domain, null, 2));
    console.log("Message:", JSON.stringify({
      endorser: endorsement.endorser,
      endorsee: endorsement.endorsee,
      epoch: endorsement.epoch.toString(),
      nonce: endorsement.nonce.toString(),
      timestamp: endorsement.timestamp.toString(),
    }, null, 2));

    const valid = await verifyTypedData({
      address: endorsement.endorser,
      domain,
      types: ENDORSEMENT_TYPES,
      primaryType: "Endorsement",
      message,
      signature: endorsement.sig,
    });

    console.log("Signature valid:", valid);

    return valid;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

// Clock skew tolerance: 5 minutes in milliseconds
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export function validateEndorsementFields(endorsement: {
  endorser: string;
  endorsee: string;
  epoch: bigint;
  nonce: bigint;
  timestamp: bigint;
}): { valid: boolean; error?: string } {
  if (endorsement.endorser === endorsement.endorsee) {
    return { valid: false, error: "Cannot endorse yourself" };
  }

  if (endorsement.epoch < 0n) {
    return { valid: false, error: "Invalid epoch" };
  }

  if (endorsement.nonce < 0n) {
    return { valid: false, error: "Invalid nonce" };
  }

  if (!endorsement.endorser.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: "Invalid endorser address" };
  }

  if (!endorsement.endorsee.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: "Invalid endorsee address" };
  }

  // Validate timestamp against server clock
  const serverTime = BigInt(Date.now());
  const clientTime = endorsement.timestamp;
  
  console.log("DEBUG: serverTime type:", typeof serverTime, "value:", serverTime);
  console.log("DEBUG: clientTime type:", typeof clientTime, "value:", clientTime);
  
  // Check for unreasonably large timestamps (prevent DoS via Number overflow)
  const MAX_REASONABLE_TIMESTAMP = BigInt(Date.now()) + BigInt(365 * 24 * 60 * 60 * 1000); // 1 year in future
  const MIN_REASONABLE_TIMESTAMP = BigInt(1609459200000); // Jan 1, 2021 (before MaxFlow existed)
  
  if (clientTime > MAX_REASONABLE_TIMESTAMP || clientTime < MIN_REASONABLE_TIMESTAMP) {
    return { 
      valid: false, 
      error: "Timestamp is unreasonably far from current time" 
    };
  }

  const timeDiff = serverTime > clientTime 
    ? serverTime - clientTime 
    : clientTime - serverTime;

  if (timeDiff > BigInt(CLOCK_SKEW_TOLERANCE_MS)) {
    // Safe to convert to Number now since we've validated range
    const diffSeconds = Number(timeDiff) / 1000;
    return { 
      valid: false, 
      error: `Timestamp out of acceptable range (±5 minutes). Clock skew: ${diffSeconds.toFixed(0)}s` 
    };
  }

  return { valid: true };
}
