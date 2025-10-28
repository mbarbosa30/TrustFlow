import { verifyTypedData, type Address, type Hex } from "viem";

export const ENDORSEMENT_TYPES = {
  Endorsement: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "epoch", type: "uint64" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

export const DOMAIN = {
  name: "TrustFlow",
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

    const valid = await verifyTypedData({
      address: endorsement.endorser,
      domain: DOMAIN,
      types: ENDORSEMENT_TYPES,
      primaryType: "Endorsement",
      message,
      signature: endorsement.sig,
    });

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
}): { valid: boolean; error?: string } {
  if (endorsement.endorser === endorsement.endorsee) {
    return { valid: false, error: "Cannot endorse yourself" };
  }

  if (endorsement.epoch < 0) {
    return { valid: false, error: "Invalid epoch" };
  }

  if (endorsement.nonce < 0) {
    return { valid: false, error: "Invalid nonce" };
  }

  if (!endorsement.endorser.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: "Invalid endorser address" };
  }

  if (!endorsement.endorsee.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { valid: false, error: "Invalid endorsee address" };
  }

  return { valid: true };
}
