import { keccak256, toBytes, toHex } from "viem";

/**
 * Creates a keccak256 hash of the given prompt text
 * Returns a 0x-prefixed hex string (66 characters total)
 */
export function createPromptHash(promptText: string): string {
  const bytes = toBytes(promptText);
  const hash = keccak256(bytes);
  return hash; // Already 0x-prefixed
}

/**
 * Verifies that a given prompt text matches the expected hash
 */
export function verifyPromptHash(promptText: string, expectedHash: string): boolean {
  const actualHash = createPromptHash(promptText);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}
