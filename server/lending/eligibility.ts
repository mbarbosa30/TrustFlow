import { storage } from "../storage";
import type { LendingPolicy } from "./policy";

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  availableLoanAmounts?: number[]; // USDC amounts user can borrow
  communityHealth?: {
    ghi: number;
    threshold: number;
    healthy: boolean;
  };
  userTrust?: {
    minCut: number;
    vertexDisjointPaths: number;
    perSeedShare: number;
    sts: number;
    tier: string;
  };
}

export async function checkLoanEligibility(
  communityId: number,
  userAddress: string
): Promise<EligibilityResult> {
  const reasons: string[] = [];
  
  // 1. Check if lending is enabled for this community
  const policyJson = await storage.getLendingPolicy(communityId);
  
  if (!policyJson || !policyJson.enabled) {
    return {
      eligible: false,
      reasons: ["Lending is not enabled for this community"],
    };
  }
  
  const policy = policyJson as LendingPolicy;
  
  // IMPORTANT: Lending policy eligibility thresholds MUST match or be lower than
  // the community's scoring policy thresholds. The scoring algorithm enforces:
  //   - min-cut ≥ 2
  //   - vertex-disjoint paths ≥ 2
  //   - per-seed share ≥ 0.30 for at least 2 seeds
  // Users who pass these checks are marked isAccepted=true.
  // 
  // Since vertex-disjoint paths and per-seed share are not stored in the scores table,
  // we cannot enforce stricter lending thresholds than the scoring thresholds.
  // 
  // TODO: To enable per-user enforcement of vertex-disjoint and per-seed metrics,
  // add these fields to the scores table and compute them during scoring.
  
  if (policy.eligibility.vertexDisjoint > 2 || policy.eligibility.perSeedMinShare > 0.30 || policy.eligibility.minSeedCount > 2) {
    console.warn(
      `Warning: Community ${communityId} lending policy has stricter requirements than scoring policy. ` +
      `This may incorrectly reject eligible users. Lending thresholds should match scoring thresholds.`
    );
  }
  
  // 2. Check community health (GHI threshold)
  const latestHealth = await storage.getLatestEpochHealth(communityId);
  
  if (!latestHealth) {
    return {
      eligible: false,
      reasons: ["Community health data not available"],
    };
  }
  
  const communityHealthy = latestHealth.ghi >= policy.eligibility.minGHI;
  
  if (!communityHealthy) {
    reasons.push(
      `Community health (GHI ${latestHealth.ghi}) is below threshold (${policy.eligibility.minGHI})`
    );
  }
  
  // 3. Check user's trust score
  const userScore = await storage.getLatestScore(userAddress.toLowerCase(), communityId);
  
  if (!userScore) {
    return {
      eligible: false,
      reasons: ["User has no trust score in this community"],
      communityHealth: {
        ghi: latestHealth.ghi,
        threshold: policy.eligibility.minGHI,
        healthy: communityHealthy,
      },
    };
  }
  
  // 4. Verify trust requirements
  // Note: isAccepted=true already implies the user passed ALL Sybil-resistance checks during scoring:
  //   - min-cut ≥ 2
  //   - vertex-disjoint paths ≥ 2  
  //   - per-seed share ≥ 0.30 for at least 2 seeds
  // These checks are enforced in the scoring algorithm (server/algorithm/compute.ts)
  
  const isAccepted = userScore.isAccepted;
  const meetsMinCut = (userScore.minCut ?? 0) >= policy.eligibility.minCut;
  
  if (!isAccepted) {
    reasons.push(
      `User is not accepted in this community's trust network (failed Sybil-resistance checks: min-cut ≥${policy.eligibility.minCut}, vertex-disjoint paths ≥${policy.eligibility.vertexDisjoint}, per-seed share ≥${policy.eligibility.perSeedMinShare})`
    );
  }
  
  // Additional min-cut check in case policy requires higher threshold than scoring algorithm
  if (!meetsMinCut) {
    reasons.push(
      `Min-cut (${userScore.minCut}) is below lending requirement (${policy.eligibility.minCut})`
    );
  }
  
  // TODO: If we need explicit vertex-disjoint-paths or per-seed-share checks beyond what isAccepted guarantees,
  // we should add these fields to the scores table and compute them during scoring.
  // For now, isAccepted is sufficient since it already enforces these requirements.
  
  const userTrust = {
    minCut: userScore.minCut ?? 0,
    vertexDisjointPaths: policy.eligibility.vertexDisjoint, // Implied by isAccepted
    perSeedShare: policy.eligibility.perSeedMinShare, // Implied by isAccepted
    sts: userScore.sts,
    tier: userScore.tier ?? "Connected",
  };
  
  // 5. Determine eligibility
  const eligible = communityHealthy && meetsMinCut && isAccepted;
  
  if (!eligible) {
    return {
      eligible: false,
      reasons,
      communityHealth: {
        ghi: latestHealth.ghi,
        threshold: policy.eligibility.minGHI,
        healthy: communityHealthy,
      },
      userTrust,
    };
  }
  
  // 6. Determine available loan amounts based on STS tier
  const availableLoanAmounts = getAvailableLoanAmounts(
    userScore.tier ?? "Connected",
    userScore.sts,
    policy.loanButtonsUsdc
  );
  
  return {
    eligible: true,
    reasons: [],
    availableLoanAmounts,
    communityHealth: {
      ghi: latestHealth.ghi,
      threshold: policy.eligibility.minGHI,
      healthy: communityHealthy,
    },
    userTrust,
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
