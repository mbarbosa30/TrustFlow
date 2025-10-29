import { storage } from "../storage";
import type { InsertTrustEvent } from "@shared/schema";

export interface TrustEventConfig {
  communityId: number;
  userAddress: string;
  eventType: "LOAN_ON_TIME" | "LOAN_LATE" | "LOAN_DEFAULT" | "ASSIST_SUCCESS" | "ASSIST_LOSS";
  evidenceId: number; // loan_id or assist_id
  evidenceType: "LOAN" | "ASSIST";
}

/**
 * Record a trust event for a user
 * Events are conservative and will be applied at next epoch close
 */
export async function recordTrustEvent(config: TrustEventConfig): Promise<void> {
  const { communityId, userAddress, eventType, evidenceId, evidenceType } = config;

  const normalizedAddress = userAddress.toLowerCase();

  // Get policy to determine delta
  const policyJson = await storage.getLendingPolicy(communityId);
  
  if (!policyJson) {
    console.warn(`No lending policy for community ${communityId}, skipping trust event`);
    return;
  }

  const policy = policyJson as any;
  const trustConfig = policy.trustAdjustment;

  let delta = 0;

  switch (eventType) {
    case "LOAN_ON_TIME":
      delta = trustConfig.onTimePayment;
      break;
    case "LOAN_LATE":
      delta = trustConfig.latePayment;
      break;
    case "LOAN_DEFAULT":
      delta = trustConfig.default;
      break;
    case "ASSIST_SUCCESS":
      delta = trustConfig.assistRepaid;
      break;
    case "ASSIST_LOSS":
      delta = trustConfig.assistLost;
      break;
  }

  const eventRecord: InsertTrustEvent = {
    communityId,
    userAddress: normalizedAddress,
    eventType,
    delta,
    evidenceId,
    evidenceType,
    appliedInEpoch: null, // Will be set when applied during epoch computation
  };

  await storage.createTrustEvent(eventRecord);
}

/**
 * Record on-time payment event
 */
export async function recordOnTimePayment(
  communityId: number,
  userAddress: string,
  loanId: number
): Promise<void> {
  await recordTrustEvent({
    communityId,
    userAddress,
    eventType: "LOAN_ON_TIME",
    evidenceId: loanId,
    evidenceType: "LOAN",
  });
}

/**
 * Record late payment event
 */
export async function recordLatePayment(
  communityId: number,
  userAddress: string,
  loanId: number
): Promise<void> {
  await recordTrustEvent({
    communityId,
    userAddress,
    eventType: "LOAN_LATE",
    evidenceId: loanId,
    evidenceType: "LOAN",
  });
}

/**
 * Record default event
 */
export async function recordDefault(
  communityId: number,
  userAddress: string,
  loanId: number
): Promise<void> {
  await recordTrustEvent({
    communityId,
    userAddress,
    eventType: "LOAN_DEFAULT",
    evidenceId: loanId,
    evidenceType: "LOAN",
  });
}

/**
 * Record assist success (supporter got repaid)
 */
export async function recordAssistSuccess(
  communityId: number,
  supporterAddress: string,
  assistId: number
): Promise<void> {
  await recordTrustEvent({
    communityId,
    userAddress: supporterAddress,
    eventType: "ASSIST_SUCCESS",
    evidenceId: assistId,
    evidenceType: "ASSIST",
  });
}

/**
 * Record assist loss (supporter lost funds)
 */
export async function recordAssistLoss(
  communityId: number,
  supporterAddress: string,
  assistId: number
): Promise<void> {
  await recordTrustEvent({
    communityId,
    userAddress: supporterAddress,
    eventType: "ASSIST_LOSS",
    evidenceId: assistId,
    evidenceType: "ASSIST",
  });
}

/**
 * Get pending trust events for a community
 * These are events that haven't been applied yet
 */
export async function getPendingTrustEvents(
  communityId: number
): Promise<any[]> {
  return storage.getPendingTrustEvents(communityId);
}

/**
 * Apply trust events to user scores during epoch computation
 * Returns aggregate deltas per user with capping applied
 */
export async function aggregateTrustDeltas(
  communityId: number,
  epochId: number
): Promise<Map<string, number>> {
  const pendingEvents = await storage.getPendingTrustEvents(communityId);

  // Get policy for caps
  const policyJson = await storage.getLendingPolicy(communityId);
  
  if (!policyJson) {
    return new Map();
  }

  const policy = policyJson as any;
  const maxPerEpoch = policy.trustAdjustment?.maxPerEpoch || 0.05;

  // Aggregate by user
  const userDeltas = new Map<string, number>();

  for (const event of pendingEvents) {
    const current = userDeltas.get(event.userAddress) || 0;
    userDeltas.set(event.userAddress, current + event.delta);
  }

  // Apply caps
  const cappedDeltas = new Map<string, number>();
  
  for (const [address, delta] of Array.from(userDeltas.entries())) {
    const capped = Math.max(-maxPerEpoch, Math.min(maxPerEpoch, delta));
    cappedDeltas.set(address, capped);
  }

  // Mark events as applied
  for (const event of pendingEvents) {
    await storage.markTrustEventApplied(event.id, epochId);
  }

  return cappedDeltas;
}

/**
 * Get trust event history for a user
 */
export async function getUserTrustEventHistory(
  communityId: number,
  userAddress: string
): Promise<any[]> {
  return storage.getTrustEventsByUser(communityId, userAddress.toLowerCase());
}
