import { storage } from "../storage";
import type { LendingPolicy } from "./policy";

export interface EligibilityResult {
  eligible: boolean; // Always true in pilot mode (advisory only)
  reasons: string[]; // Advisory warnings, not blockers
  trustMetrics?: {
    minCut: number;
    ghi: number;
    sts: number;
    tier: string;
    isAccepted: boolean;
  };
  amounts?: number[]; // Available loan amounts
}

export async function checkLoanEligibility(
  communityId: number,
  userAddress: string
): Promise<EligibilityResult> {
  // PILOT MODE: Trust scores are ADVISORY ONLY, not blockers
  // All users can apply for loans regardless of trust metrics
  // This enables maximum flexibility for experimentation
  
  const reasons: string[] = [];
  
  // 1. Check if lending is enabled for this community
  const policyJson = await storage.getLendingPolicy(communityId);
  
  if (!policyJson || !policyJson.enabled) {
    return {
      eligible: false, // Only hard block if lending completely disabled
      reasons: ["Lending is not enabled for this community"],
    };
  }
  
  // 2. Get user's trust score (if exists)
  const userScore = await storage.getLatestScore(userAddress.toLowerCase(), communityId);
  
  // 3. Get community health (if exists)
  const latestHealth = await storage.getLatestEpochHealth(communityId);
  
  // Build trust metrics for display (but don't use them to block)
  const trustMetrics = userScore ? {
    minCut: userScore.minCut ?? 0,
    ghi: latestHealth?.ghi ?? 0,
    sts: userScore.sts,
    tier: userScore.tier ?? "Connected",
    isAccepted: userScore.isAccepted ?? false,
  } : undefined;
  
  // Advisory warnings (not blockers)
  if (!userScore) {
    reasons.push("No trust score yet - consider getting vouched to build your profile");
  } else if (!userScore.isAccepted) {
    reasons.push("Not yet accepted in trust network - additional vouches may help");
  }
  
  if (latestHealth && latestHealth.ghi < 60) {
    reasons.push("Community health index is low - proceed with caution");
  }
  
  // PILOT MODE: Always return eligible=true (unless lending completely disabled)
  // Trust metrics are shown but don't block applications
  return {
    eligible: true,
    reasons, // Advisory only
    trustMetrics,
    amounts: [160, 240, 320, 400, 480, 560, 640, 720, 800], // All amounts available
  };
}

function getAvailableLoanAmounts(
  tier: string,
  sts: number,
  allAmounts: number[]
): number[] {
  // Tier-based loan caps:
  // Connected (STS < 0.33): Up to 2nd amount (e.g., $160-$240)
  // Verified (0.33 ≤ STS < 0.67): Up to 4th amount (e.g., $160-$600)
  // Trusted (STS ≥ 0.67): All amounts (e.g., $160-$800)
  
  if (tier === "Trusted") {
    return allAmounts; // All loan amounts available
  } else if (tier === "Verified") {
    return allAmounts.slice(0, 4); // First 4 amounts
  } else {
    return allAmounts.slice(0, 2); // First 2 amounts (smallest)
  }
}

export async function checkActiveLoans(
  communityId: number,
  userAddress: string
): Promise<boolean> {
  // TODO: Implement once loan storage methods are ready
  // For now, return false (no active loans)
  return false;
}
