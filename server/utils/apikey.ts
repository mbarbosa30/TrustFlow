import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure API key for a community
 * Format: mxf_live_xxxxxxxxxxxxx (prefix + 32 hex characters)
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(16).toString('hex');
  return `mxf_live_${randomPart}`;
}
