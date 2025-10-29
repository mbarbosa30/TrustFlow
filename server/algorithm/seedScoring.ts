import type { Address } from "viem";
import type { Endorsement } from "./scoring";

export interface SeedScore {
  seedAddress: Address;
  score: number; // S_s ∈ [0,1]
  components: {
    predictiveValidity: number; // Fraction of influenced users who stay accepted when seed removed
    downstreamQuality: number; // Average quality of users primarily influenced by this seed
    diversityLift: number; // Number of distinct communities this seed reaches
    centralizationPenalty: number; // Penalty if seed carries too much of total flow
  };
  metrics: {
    totalInfluencedUsers: number;
    resilientUsers: number;
    flowShare: number; // Fraction of total seed outflow
    communitiesReached: number;
  };
}

export interface SeedScoringConfig {
  minSeedScore: number; // Minimum score for a seed to count toward coverage (default: 0.6)
  centralizationCap: number; // Max flow share before penalty kicks in (default: 0.5)
  seedCapMultiplier: { min: number; max: number }; // Capacity multiplier range (default: 0.7-1.3)
}

const DEFAULT_SEED_CONFIG: SeedScoringConfig = {
  minSeedScore: 0.6,
  centralizationCap: 0.5,
  seedCapMultiplier: { min: 0.7, max: 1.3 },
};

export class SeedScorer {
  private config: SeedScoringConfig;

  constructor(config: Partial<SeedScoringConfig> = {}) {
    this.config = { ...DEFAULT_SEED_CONFIG, ...config };
  }

  /**
   * Compute scores for all seeds based on their influence quality
   */
  computeSeedScores(
    endorsements: Endorsement[],
    seeds: Address[],
    acceptedUsers: Set<Address>,
    userScores: Map<Address, { sts: number; components: any }>
  ): Map<Address, SeedScore> {
    const seedScores = new Map<Address, SeedScore>();

    // Build endorsement graph for analysis
    const endorserMap = new Map<Address, Set<Address>>();
    for (const e of endorsements) {
      if (!endorserMap.has(e.endorser)) {
        endorserMap.set(e.endorser, new Set());
      }
      endorserMap.get(e.endorser)!.add(e.endorsee);
    }

    // Calculate total seed outflow for centralization metrics
    const seedFlowShares = this.calculateSeedFlowShares(seeds, endorserMap, acceptedUsers);
    const totalSeedFlow = Array.from(seedFlowShares.values()).reduce((sum, flow) => sum + flow, 0);

    for (const seed of seeds) {
      const seedLower = seed.toLowerCase() as Address;

      // 1. Predictive Validity: Test resilience without this seed
      const { predictiveValidity, totalInfluenced, resilient } = this.calculatePredictiveValidity(
        seedLower,
        endorsements,
        seeds,
        acceptedUsers
      );

      // 2. Downstream Quality: Average STS of users primarily influenced by this seed
      const downstreamQuality = this.calculateDownstreamQuality(
        seedLower,
        endorserMap,
        acceptedUsers,
        userScores
      );

      // 3. Diversity Lift: Number of distinct communities reached
      const { diversityLift, communitiesReached } = this.calculateDiversityLift(
        seedLower,
        endorserMap,
        acceptedUsers
      );

      // 4. Centralization Penalty: Penalize if seed dominates flow
      const flowShare = totalSeedFlow > 0 ? (seedFlowShares.get(seedLower) || 0) / totalSeedFlow : 0;
      const centralizationPenalty = this.calculateCentralizationPenalty(flowShare);

      // Combine components into overall seed score (weighted average)
      const score = this.combineSeedComponents({
        predictiveValidity,
        downstreamQuality,
        diversityLift,
        centralizationPenalty,
      });

      seedScores.set(seedLower, {
        seedAddress: seedLower,
        score,
        components: {
          predictiveValidity,
          downstreamQuality,
          diversityLift,
          centralizationPenalty,
        },
        metrics: {
          totalInfluencedUsers: totalInfluenced,
          resilientUsers: resilient,
          flowShare,
          communitiesReached,
        },
      });
    }

    return seedScores;
  }

  /**
   * Calculate how many users influenced by this seed stay accepted when seed is removed
   * Uses a conservative heuristic based on multi-seed connectivity
   */
  private calculatePredictiveValidity(
    seed: Address,
    endorsements: Endorsement[],
    allSeeds: Address[],
    acceptedUsers: Set<Address>
  ): { predictiveValidity: number; totalInfluenced: number; resilient: number } {
    const seedLower = seed.toLowerCase();

    // Find users who receive direct endorsements from this seed
    const influencedUsers = new Set<Address>();
    for (const e of endorsements) {
      if (e.endorser.toLowerCase() === seedLower) {
        influencedUsers.add(e.endorsee.toLowerCase() as Address);
      }
    }

    // Conservative approximation of resilience:
    // Count users who have BOTH:
    // 1. Multiple paths from different seeds (not just this one)
    // 2. Strong connectivity to the rest of the network
    let resilientUsers = 0;
    for (const user of influencedUsers) {
      if (!acceptedUsers.has(user)) continue;

      // Count distinct seeds that can reach this user (excluding the target seed)
      const reachingSeeds = new Set<string>();
      const visited = new Set<string>();
      const queue: string[] = [user.toLowerCase()];
      visited.add(user.toLowerCase());

      // BFS backwards through endorsements (up to 3 hops)
      let depth = 0;
      while (queue.length > 0 && depth < 3) {
        const levelSize = queue.length;
        for (let i = 0; i < levelSize; i++) {
          const current = queue.shift()!;

          // Find all endorsers of current user
          for (const e of endorsements) {
            if (e.endorsee.toLowerCase() === current && e.endorser.toLowerCase() !== seedLower) {
              const endorser = e.endorser.toLowerCase();

              // Check if this is a seed
              const isSeed = allSeeds.some((s) => s.toLowerCase() === endorser);
              if (isSeed) {
                reachingSeeds.add(endorser);
              } else if (!visited.has(endorser)) {
                visited.add(endorser);
                queue.push(endorser);
              }
            }
          }
        }
        depth++;
      }

      // User is resilient if reachable from at least 2 other seeds
      if (reachingSeeds.size >= 2) {
        resilientUsers++;
      }
    }

    const totalInfluenced = influencedUsers.size;
    const predictiveValidity = totalInfluenced > 0 ? resilientUsers / totalInfluenced : 0.5;

    return { predictiveValidity, totalInfluenced: totalInfluenced, resilient: resilientUsers };
  }

  /**
   * Calculate average quality (STS) of users primarily influenced by this seed
   */
  private calculateDownstreamQuality(
    seed: Address,
    endorserMap: Map<Address, Set<Address>>,
    acceptedUsers: Set<Address>,
    userScores: Map<Address, { sts: number; components: any }>
  ): number {
    const seedLower = seed.toLowerCase() as Address;
    const directEndorsements = endorserMap.get(seedLower);
    if (!directEndorsements || directEndorsements.size === 0) return 0.5;

    let totalSTS = 0;
    let count = 0;

    for (const endorsee of directEndorsements) {
      const endorseeLower = endorsee.toLowerCase() as Address;
      if (acceptedUsers.has(endorseeLower)) {
        const score = userScores.get(endorseeLower);
        if (score) {
          totalSTS += score.sts / 100; // Normalize to 0-1
          count++;
        }
      }
    }

    return count > 0 ? totalSTS / count : 0.5;
  }

  /**
   * Calculate diversity: number of distinct "communities" this seed reaches
   * Simplified: use depth-based clustering as a proxy for communities
   */
  private calculateDiversityLift(
    seed: Address,
    endorserMap: Map<Address, Set<Address>>,
    acceptedUsers: Set<Address>
  ): { diversityLift: number; communitiesReached: number } {
    const seedLower = seed.toLowerCase() as Address;
    const directEndorsements = endorserMap.get(seedLower);
    if (!directEndorsements || directEndorsements.size === 0) {
      return { diversityLift: 0, communitiesReached: 0 };
    }

    // Simplified community detection: group by "neighborhoods"
    // For now, use a simple heuristic based on common connections
    const communities = this.detectSimpleCommunities(directEndorsements, endorserMap);

    // Normalize: more communities = better diversity
    const maxExpectedCommunities = 5; // Reasonable upper bound
    const diversityLift = Math.min(1.0, communities / maxExpectedCommunities);

    return { diversityLift, communitiesReached: communities };
  }

  /**
   * Simple community detection: count distinct "neighborhoods" in endorsees
   */
  private detectSimpleCommunities(
    endorsees: Set<Address>,
    endorserMap: Map<Address, Set<Address>>
  ): number {
    // Group users by their overlap in who they endorse
    const neighborhoods = new Map<string, Set<Address>>();

    for (const endorsee of endorsees) {
      const endorseeLower = endorsee.toLowerCase() as Address;
      const theirEndorsements = endorserMap.get(endorseeLower);
      if (!theirEndorsements) continue;

      // Create a signature based on their endorsements
      const signature = Array.from(theirEndorsements)
        .sort()
        .slice(0, 5)
        .join(",");

      if (!neighborhoods.has(signature)) {
        neighborhoods.set(signature, new Set());
      }
      neighborhoods.get(signature)!.add(endorseeLower);
    }

    return Math.max(1, neighborhoods.size);
  }

  /**
   * Penalize seeds that dominate too much of the total seed flow
   */
  private calculateCentralizationPenalty(flowShare: number): number {
    if (flowShare <= this.config.centralizationCap) {
      return 1.0; // No penalty
    }

    // Linear penalty above the cap: 1.0 at cap, 0.0 at 100% share
    const excess = flowShare - this.config.centralizationCap;
    const maxExcess = 1.0 - this.config.centralizationCap;
    const penalty = 1.0 - excess / maxExcess;

    return Math.max(0, penalty);
  }

  /**
   * Calculate flow shares for each seed (simplified: based on direct endorsement counts)
   */
  private calculateSeedFlowShares(
    seeds: Address[],
    endorserMap: Map<Address, Set<Address>>,
    acceptedUsers: Set<Address>
  ): Map<Address, number> {
    const flowShares = new Map<Address, number>();

    for (const seed of seeds) {
      const seedLower = seed.toLowerCase() as Address;
      const endorsements = endorserMap.get(seedLower);
      if (!endorsements) {
        flowShares.set(seedLower, 0);
        continue;
      }

      // Count accepted users endorsed by this seed
      let acceptedEndorsements = 0;
      for (const endorsee of endorsements) {
        if (acceptedUsers.has(endorsee.toLowerCase() as Address)) {
          acceptedEndorsements++;
        }
      }

      flowShares.set(seedLower, acceptedEndorsements);
    }

    return flowShares;
  }

  /**
   * Combine seed score components with weights
   */
  private combineSeedComponents(components: {
    predictiveValidity: number;
    downstreamQuality: number;
    diversityLift: number;
    centralizationPenalty: number;
  }): number {
    // Weighted combination (can be adjusted)
    const weights = {
      predictiveValidity: 0.35, // Most important: resilience
      downstreamQuality: 0.30, // Quality of influenced users
      diversityLift: 0.20, // Reach across communities
      centralizationPenalty: 0.15, // Avoid over-concentration
    };

    const score =
      components.predictiveValidity * weights.predictiveValidity +
      components.downstreamQuality * weights.downstreamQuality +
      components.diversityLift * weights.diversityLift +
      components.centralizationPenalty * weights.centralizationPenalty;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get capacity multiplier for a seed based on its score
   * Returns value in range [config.min, config.max] (default: [0.7, 1.3])
   */
  getSeedCapacityMultiplier(seedScore: number): number {
    const { min, max } = this.config.seedCapMultiplier;
    return min + (max - min) * seedScore;
  }

  /**
   * Check if a seed meets the minimum quality threshold for coverage
   */
  seedMeetsQualityThreshold(seedScore: number): boolean {
    return seedScore >= this.config.minSeedScore;
  }
}
