import type { Address } from "viem";
import { TrustScorer } from "./scoring";
import { storage } from "../storage";
import type { InsertScore } from "@shared/schema";
import { computeHealthMetrics } from "../health/metrics";
import { computeGHI } from "../health/ghi";

export class EpochComputation {
  private scorer: TrustScorer;

  constructor() {
    this.scorer = new TrustScorer();
  }

  /**
   * Run trust score computation for a specific epoch and community
   * @param epochId - The epoch to compute scores for
   * @param communityId - The community to compute scores for (defaults to 0 for global network)
   */
  async computeEpochScores(epochId: number, communityId: number = 0): Promise<void> {
    console.log(`Starting epoch ${epochId} computation for community ${communityId}...`);

    const startTime = Date.now();

    const [endorsements, seedsData] = await Promise.all([
      storage.getEndorsements({ epoch: epochId, limit: 100000, communityId }),
      storage.getSeeds(communityId),
    ]);

    console.log(`Loaded ${endorsements.length} endorsements and ${seedsData.length} seeds for community ${communityId}`);

    if (seedsData.length === 0) {
      throw new Error("Cannot compute scores: No seeds defined in the network");
    }

    const seeds = seedsData.map(s => s.address as Address);

    // SECURITY: Compute lagged depths from previous epoch's accepted subgraph
    // This prevents distance-inflation attacks per Levien/Ruderman
    const laggedDepths = await this.computeLaggedDepths(epochId, seeds, communityId);
    this.scorer.setLaggedDepths(laggedDepths);
    console.log(`Using lagged depths from previous epoch (${laggedDepths ? laggedDepths.size : 0} users)`);

    const formattedEndorsements = endorsements.map(e => ({
      endorser: e.endorser as Address,
      endorsee: e.endorsee as Address,
      epoch: Number(e.epoch),
    }));

    const result = this.scorer.computeScores(formattedEndorsements, seeds, epochId);

    console.log(`Computed scores for ${result.scores.size} users`);

    await storage.deleteScoresByEpoch(epochId, communityId);

    const scoreInserts: InsertScore[] = [];
    for (const [address, userScore] of Array.from(result.scores.entries())) {
      scoreInserts.push({
        address,
        epochId,
        communityId,
        sts: userScore.sts,
        flow: userScore.components.flow,
        minCut: userScore.components.minCut,
        stability: userScore.components.stability,
        depth: userScore.components.depth,
        pageRank: userScore.components.pageRank,
        normalizedFlow: userScore.normalizedComponents?.flow,
        normalizedMinCut: userScore.normalizedComponents?.minCut,
        normalizedStability: userScore.normalizedComponents?.stability,
        normalizedDepth: userScore.normalizedComponents?.depth,
        normalizedPageRank: userScore.normalizedComponents?.pageRank,
        tier: userScore.tier,
        percentile: userScore.percentile,
        isAccepted: userScore.isAccepted,
      });
    }

    for (const scoreData of scoreInserts) {
      await storage.createScore(scoreData);
    }

    console.log(`Stored ${scoreInserts.length} scores in database`);

    const { totalAccepted, avgMinCut, avgFlow, seedSaturation } = result.networkMetrics;
    
    // Get current epoch's accepted users
    const currentAcceptedUsers = scoreInserts
      .filter(s => s.isAccepted)
      .map(s => s.address.toLowerCase());
    
    // Get previous epoch's accepted users for churn calculation
    let previousAcceptedUsers: string[] | null = null;
    if (epochId > 0) {
      const previousScores = await storage.getScoresByEpoch(epochId - 1, communityId);
      if (previousScores.length > 0) {
        previousAcceptedUsers = previousScores
          .filter(s => s.isAccepted)
          .map(s => (s.address as string).toLowerCase());
        console.log(`Previous epoch ${epochId - 1} had ${previousAcceptedUsers.length} accepted users`);
      }
    }
    
    // Compute health metrics using real churn calculation
    const metrics = computeHealthMetrics(
      currentAcceptedUsers,
      avgMinCut,
      previousAcceptedUsers
    );
    
    const ghi = computeGHI(metrics);

    const existingHealth = await storage.getEpochHealth(epochId, communityId);
    
    if (!existingHealth) {
      await storage.createEpochHealth({
        epochId,
        communityId,
        ghi,
        sizeN: metrics.sizeN,
        cutN: metrics.cutN,
        churnN: metrics.churnN,
        rawAcceptedCount: metrics.rawAcceptedCount,
        rawAvgMinCut: metrics.rawAvgMinCut,
        rawChurnStability: metrics.rawChurnStability,
        maxSeedShare: seedSaturation?.maxSeedShare || null,
        maxSeedAddress: seedSaturation?.maxSeedAddress || null,
      });
    }

    const duration = Date.now() - startTime;
    console.log(`Epoch ${epochId} computation completed in ${duration}ms`);
    console.log(`Network health: GHI=${ghi}, Size=${totalAccepted}, AvgMinCut=${avgMinCut.toFixed(2)}`);
  }

  /**
   * Compute lagged depths from previous epoch's accepted subgraph
   * SECURITY: Prevents distance-inflation attacks per Levien/Ruderman
   * Only includes ACCEPTED users from previous epoch to prevent unaccepted nodes from shortening paths
   */
  private async computeLaggedDepths(
    currentEpochId: number,
    seeds: Address[],
    communityId: number = 0
  ): Promise<Map<Address, number> | null> {
    // For epoch 0, no previous epoch exists
    if (currentEpochId === 0) {
      console.log('Epoch 0: No lagged depths available (first epoch)');
      return null;
    }

    const previousEpochId = currentEpochId - 1;
    
    // Get previous epoch's accepted users and their endorsements
    const [previousScores, previousEndorsements] = await Promise.all([
      storage.getScoresByEpoch(previousEpochId, communityId),
      storage.getEndorsements({ epoch: previousEpochId, limit: 100000, communityId }),
    ]);

    if (previousScores.length === 0) {
      console.log(`No scores from previous epoch ${previousEpochId}, using current graph depths`);
      return null;
    }

    // CRITICAL: Only use ACCEPTED users from previous epoch
    // IMPORTANT: Normalize all addresses to lowercase to prevent case-sensitivity bugs
    const acceptedAddresses = new Set(
      previousScores.filter(s => s.isAccepted).map(s => (s.address as string).toLowerCase() as Address)
    );

    console.log(`Previous epoch had ${acceptedAddresses.size} accepted users out of ${previousScores.length} total`);

    // Build adjacency list ONLY from endorsements between accepted users
    const adjacency = new Map<Address, Address[]>();
    for (const e of previousEndorsements) {
      const endorser = (e.endorser as string).toLowerCase() as Address;
      const endorsee = (e.endorsee as string).toLowerCase() as Address;
      
      // Only include edge if BOTH endpoints were accepted in previous epoch
      if (acceptedAddresses.has(endorser) && acceptedAddresses.has(endorsee)) {
        if (!adjacency.has(endorser)) {
          adjacency.set(endorser, []);
        }
        adjacency.get(endorser)!.push(endorsee);
      }
    }

    // Compute depths via BFS from seeds in the ACCEPTED subgraph only
    const depths = new Map<Address, number>();
    const queue: Array<{ user: Address; depth: number }> = [];

    for (const seed of seeds) {
      const normalizedSeed = seed.toLowerCase() as Address;
      if (acceptedAddresses.has(normalizedSeed)) {
        depths.set(normalizedSeed, 0);
        queue.push({ user: normalizedSeed, depth: 0 });
      }
    }

    let head = 0;
    while (head < queue.length) {
      const { user, depth } = queue[head++];
      const neighbors = adjacency.get(user) || [];

      for (const neighbor of neighbors) {
        if (!depths.has(neighbor) && acceptedAddresses.has(neighbor)) {
          depths.set(neighbor, depth + 1);
          queue.push({ user: neighbor, depth: depth + 1 });
        }
      }
    }

    console.log(`Computed lagged depths for ${depths.size} users from accepted subgraph of epoch ${previousEpochId}`);
    return depths;
  }

  /**
   * Check if scores exist for an epoch in a specific community
   */
  async hasComputedScores(epochId: number, communityId: number = 0): Promise<boolean> {
    const scores = await storage.getScoresByEpoch(epochId, communityId);
    return scores.length > 0;
  }

  /**
   * Get computation summary for an epoch in a specific community
   */
  async getComputationSummary(epochId: number, communityId: number = 0) {
    const [scores, health, endorsements, seeds] = await Promise.all([
      storage.getScoresByEpoch(epochId, communityId),
      storage.getEpochHealth(epochId, communityId),
      storage.getEndorsements({ epoch: epochId, communityId }),
      storage.getSeeds(communityId),
    ]);

    // Calculate network metrics from scores (using Levien acceptance criteria)
    const acceptedScores = scores.filter(s => s.isAccepted);
    const flowValues = acceptedScores.map(s => s.flow);
    const minCutValues = acceptedScores.map(s => s.minCut);

    const totalAccepted = acceptedScores.length;
    const avgFlow = flowValues.length > 0 
      ? flowValues.reduce((a, b) => a + b, 0) / flowValues.length 
      : 0;
    const avgMinCut = minCutValues.length > 0
      ? minCutValues.reduce((a, b) => a + b, 0) / minCutValues.length
      : 0;
    
    // Calculate p95 flow
    const sortedFlows = [...flowValues].sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedFlows.length * 0.95) - 1;
    const p95Flow = sortedFlows.length > 0 ? sortedFlows[Math.max(0, p95Index)] : 0;

    return {
      epochId,
      scoresComputed: scores.length,
      networkMetrics: {
        totalAccepted,
        avgFlow,
        avgMinCut,
        p95Flow,
      },
      health: health
        ? {
            ghi: health.ghi,
            sizeN: health.sizeN,
            cutN: health.cutN,
            churnN: health.churnN,
          }
        : null,
      duration: 0, // Will be set by the actual computation call
    };
  }
}

export const epochComputation = new EpochComputation();
