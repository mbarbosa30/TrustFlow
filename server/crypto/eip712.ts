import { verifyTypedData, type Address, type Hex } from "viem";

export const ENDORSEMENT_TYPES = {
  Endorsement: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "epoch", type: "uint64" },
    { name: "nonce", type: "uint64" },
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
}

export interface SignedEndorsement {
  endorser: Address;
  endorsee: Address;
  epoch: bigint;
  nonce: bigint;
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

export function validateEndorsementFields(endorsement: {
  endorser: string;
  endorsee: string;
  epoch: bigint;
  nonce: bigint;
  chainNamespace?: string;
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

  // Chain-specific address validation
  const chainNamespace = endorsement.chainNamespace || "eip155";
  
  if (chainNamespace === "eip155") {
    // EVM chains: require 0x-prefixed 40-hex address
    if (!endorsement.endorser.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { valid: false, error: "Invalid endorser address (EVM format required: 0x + 40 hex chars)" };
    }
    if (!endorsement.endorsee.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { valid: false, error: "Invalid endorsee address (EVM format required: 0x + 40 hex chars)" };
    }
  } else {
    // Non-EVM chains: basic validation - non-empty strings, reasonable length
    if (!endorsement.endorser || endorsement.endorser.length < 10 || endorsement.endorser.length > 256) {
      return { valid: false, error: "Invalid endorser address (must be 10-256 characters)" };
    }
    if (!endorsement.endorsee || endorsement.endorsee.length < 10 || endorsement.endorsee.length > 256) {
      return { valid: false, error: "Invalid endorsee address (must be 10-256 characters)" };
    }
  }

  return { valid: true };
}
