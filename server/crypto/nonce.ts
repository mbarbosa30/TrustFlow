import { db } from "../db";
import { publicEndorsements } from "@shared/schema";
import { and, eq, desc } from "drizzle-orm";
import type { Address } from "viem";

export async function getNextNonce(
  endorser: Address,
  epoch: number
): Promise<bigint> {
  const normalizedEndorser = endorser.toLowerCase();
  const lastEndorsement = await db
    .select({ nonce: publicEndorsements.nonce })
    .from(publicEndorsements)
    .where(
      and(
        eq(publicEndorsements.endorser, normalizedEndorser),
        eq(publicEndorsements.epoch, epoch)
      )
    )
    .orderBy(desc(publicEndorsements.nonce))
    .limit(1);

  if (lastEndorsement.length === 0) {
    return BigInt(0);
  }

  return BigInt(lastEndorsement[0].nonce) + BigInt(1);
}

export async function validateNonce(
  endorser: Address,
  epoch: number,
  nonce: bigint
): Promise<{ valid: boolean; error?: string; expectedNonce?: bigint }> {
  const normalizedEndorser = endorser.toLowerCase() as Address;
  const expectedNonce = await getNextNonce(normalizedEndorser, epoch);

  if (nonce !== expectedNonce) {
    return {
      valid: false,
      error: `Invalid nonce. Expected ${expectedNonce}, got ${nonce}`,
      expectedNonce,
    };
  }

  return { valid: true };
}
