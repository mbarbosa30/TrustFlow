import { storage } from "../storage";
import type { PublicEndorsement, Context } from "@shared/schema";

const VOUCH_EXPIRATION_DAYS = 90;
const VOUCH_EXPIRATION_MS = VOUCH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

export interface ValidVouchFilter {
  revokedIds: Set<number>;
  activityMap: Map<string, Date | null>;
}

export async function buildVouchFilter(): Promise<ValidVouchFilter> {
  const revokedIds = new Set(await storage.getRevokedEndorsementIds());
  
  const allContexts = await storage.getAllContexts();
  const activityMap = new Map<string, Date | null>();
  
  for (const ctx of allContexts) {
    if (ctx.ownerAddress) {
      activityMap.set(
        ctx.ownerAddress.toLowerCase(),
        ctx.lastSignalActivityAt || null
      );
    }
  }
  
  return { revokedIds, activityMap };
}

export function isVouchValid(
  endorsement: PublicEndorsement,
  filter: ValidVouchFilter,
  now: Date = new Date()
): boolean {
  if (filter.revokedIds.has(endorsement.id)) {
    return false;
  }
  
  const endorseeAddress = endorsement.endorsee.toLowerCase();
  const lastActivity = filter.activityMap.get(endorseeAddress);
  const vouchCreatedAt = endorsement.createdAt;
  
  const nowMs = now.getTime();
  const vouchAgeMs = nowMs - vouchCreatedAt.getTime();
  
  // Rule 1: Vouch is valid if it's less than 90 days old
  if (vouchAgeMs < VOUCH_EXPIRATION_MS) {
    return true;
  }
  
  // Rule 2: Vouch is valid if recipient has been active (vouched for someone) within last 90 days
  // Note: If recipient has no context or no lastSignalActivityAt, they haven't vouched for anyone
  // In that case, the vouch expires after 90 days (handled by Rule 1 above)
  if (lastActivity) {
    const activityAgeMs = nowMs - lastActivity.getTime();
    if (activityAgeMs < VOUCH_EXPIRATION_MS) {
      return true;
    }
  }
  
  // Vouch is expired: older than 90 days AND recipient hasn't been active within 90 days
  return false;
}

export async function filterValidEndorsements(
  endorsements: PublicEndorsement[]
): Promise<PublicEndorsement[]> {
  if (endorsements.length === 0) {
    return [];
  }
  
  const filter = await buildVouchFilter();
  const now = new Date();
  
  return endorsements.filter(e => isVouchValid(e, filter, now));
}

export function getVouchExpirationStatus(
  endorsement: PublicEndorsement,
  filter: ValidVouchFilter,
  now: Date = new Date()
): {
  isValid: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
} {
  const isRevoked = filter.revokedIds.has(endorsement.id);
  
  if (isRevoked) {
    return {
      isValid: false,
      isRevoked: true,
      isExpired: false,
      expiresAt: null,
      daysUntilExpiration: null,
    };
  }
  
  const endorseeAddress = endorsement.endorsee.toLowerCase();
  const lastActivity = filter.activityMap.get(endorseeAddress);
  const vouchCreatedAt = endorsement.createdAt;
  
  const nowMs = now.getTime();
  
  const referenceDate = lastActivity && lastActivity > vouchCreatedAt 
    ? lastActivity 
    : vouchCreatedAt;
  
  const expiresAt = new Date(referenceDate.getTime() + VOUCH_EXPIRATION_MS);
  const msUntilExpiration = expiresAt.getTime() - nowMs;
  
  if (msUntilExpiration <= 0) {
    return {
      isValid: false,
      isRevoked: false,
      isExpired: true,
      expiresAt,
      daysUntilExpiration: 0,
    };
  }
  
  const daysUntilExpiration = Math.ceil(msUntilExpiration / (24 * 60 * 60 * 1000));
  
  return {
    isValid: true,
    isRevoked: false,
    isExpired: false,
    expiresAt,
    daysUntilExpiration,
  };
}

export { VOUCH_EXPIRATION_DAYS, VOUCH_EXPIRATION_MS };
