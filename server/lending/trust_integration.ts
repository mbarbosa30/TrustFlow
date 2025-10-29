import { storage } from "../storage";
import { aggregateTrustDeltas } from "./trust_events";
import type { Score } from "@shared/schema";

/**
 * Apply trust event deltas to user scores after epoch computation
 * Called after the main scoring algorithm runs
 * 
 * This modifies STS values based on lending behavior:
 * - On-time payments increase trust
 * - Late payments decrease trust
 * - Defaults significantly decrease trust
 * - Successful assists increase supporter trust
 * - Lost assists decrease supporter trust
 */
export async function applyTrustEventsToEpoch(
  communityId: number,
  epochId: number
): Promise<{
  usersAffected: number;
  totalAdjustment: number;
}> {
  console.log(`Applying trust events to epoch ${epochId} for community ${communityId}`);

  // Get aggregated trust deltas (with capping applied)
  const trustDeltas = await aggregateTrustDeltas(communityId, epochId);

  if (trustDeltas.size === 0) {
    console.log("No trust events to apply");
    return { usersAffected: 0, totalAdjustment: 0 };
  }

  // Get all scores for this epoch
  const scores = await storage.getScoresByEpoch(epochId, communityId);

  let usersAffected = 0;
  let totalAdjustment = 0;

  // Apply deltas to each affected user's score
  for (const [userAddress, delta] of Array.from(trustDeltas.entries())) {
    const userScore = scores.find((s) => s.address === userAddress.toLowerCase());

    if (!userScore) {
      console.warn(`User ${userAddress} has trust events but no score in epoch ${epochId}`);
      continue;
    }

    // Calculate new STS (clamped between 0 and 1)
    const newSTS = Math.max(0, Math.min(1, userScore.sts + delta));

    // Update the score in the database
    await storage.updateScore(userScore.id, { sts: newSTS });

    usersAffected++;
    totalAdjustment += Math.abs(delta);

    console.log(
      `Applied trust delta to ${userAddress}: ${userScore.sts.toFixed(4)} → ${newSTS.toFixed(4)} (Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(4)})`
    );
  }

  console.log(`Trust events applied: ${usersAffected} users affected, total adjustment: ${totalAdjustment.toFixed(4)}`);

  return { usersAffected, totalAdjustment };
}

/**
 * Integration point for epoch computation workflow
 * Call this after the main scoring algorithm completes
 * 
 * Example usage in server/algorithm/compute.ts:
 * 
 * async computeEpochScores(epochId: number, communityId: number = 0): Promise<void> {
 *   // ... existing scoring logic ...
 *   
 *   // Apply trust events from lending activity
 *   await applyTrustEventsToEpoch(communityId, epochId);
 * }
 */

// TODO: Add storage.updateScore method to update individual score fields
// For now, this is documented as the integration point
