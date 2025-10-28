import type { Address } from "viem";
import { TrustScorer } from "./scoring";
import { storage } from "../storage";
import type { InsertScore } from "@shared/schema";

export class EpochComputation {
  private scorer: TrustScorer;

  constructor() {
    this.scorer = new TrustScorer();
  }

  /**
   * Run trust score computation for a specific epoch
   */
  async computeEpochScores(epochId: number): Promise<void> {
    console.log(`Starting epoch ${epochId} computation...`);

    const startTime = Date.now();

    const [endorsements, seedsData] = await Promise.all([
      storage.getEndorsements({ epoch: epochId, limit: 100000 }),
      storage.getSeeds(),
    ]);

    console.log(`Loaded ${endorsements.length} endorsements and ${seedsData.length} seeds`);

    if (seedsData.length === 0) {
      throw new Error("Cannot compute scores: No seeds defined in the network");
    }

    const seeds = seedsData.map(s => s.address as Address);

    // SECURITY: Compute lagged depths from previous epoch's accepted subgraph
    // This prevents distance-inflation attacks per Levien/Ruderman
    const laggedDepths = await this.computeLaggedDepths(epochId, seeds);
    this.scorer.setLaggedDepths(laggedDepths);
    console.log(`Using lagged depths from previous epoch (${laggedDepths ? laggedDepths.size : 0} users)`);

    const formattedEndorsements = endorsements.map(e => ({
      endorser: e.endorser as Address,
      endorsee: e.endorsee as Address,
      epoch: Number(e.epoch),
    }));

    const result = this.scorer.computeScores(formattedEndorsements, seeds, epochId);

    console.log(`Computed scores for ${result.scores.size} users`);

    await storage.deleteScoresByEpoch(epochId);

    const scoreInserts: InsertScore[] = [];
    for (const [address, userScore] of Array.from(result.scores.entries())) {
      scoreInserts.push({
        address,
        epochId,
        sts: userScore.sts,
        flow: userScore.components.flow,
        minCut: userScore.components.minCut,
        stability: userScore.components.stability,
        depth: userScore.components.depth,
        tier: userScore.tier,
        percentile: userScore.percentile,
        isAccepted: userScore.isAccepted,
      });
    }

    for (const scoreData of scoreInserts) {
      await storage.createScore(scoreData);
    }

    console.log(`Stored ${scoreInserts.length} scores in database`);

    const { totalAccepted, avgMinCut, avgFlow } = result.networkMetrics;
    
    const computeSizeN = (count: number): number => {
      if (count < 10) return 0;
      if (count < 50) return 40;
      if (count < 200) return 60;
      if (count < 500) return 80;
      return 100;
    };

    const computeCutN = (avgCut: number): number => {
      if (avgCut < 1.5) return 0;
      if (avgCut < 2) return 50;
      if (avgCut < 3) return 75;
      return 100;
    };

    const sizeN = computeSizeN(totalAccepted);
    const cutN = computeCutN(avgMinCut);
    const churnN = 100;
    const ghi = Math.round(0.30 * sizeN + 0.50 * cutN + 0.20 * churnN);

    const existingHealth = await storage.getEpochHealth(epochId);
    
    if (!existingHealth) {
      await storage.createEpochHealth({
        epochId,
        ghi,
        sizeN,
        cutN,
        churnN,
        rawAcceptedCount: totalAccepted,
        rawAvgMinCut: avgMinCut,
        rawChurnStability: 1.0,
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
    seeds: Address[]
  ): Promise<Map<Address, number> | null> {
    // For epoch 0, no previous epoch exists
    if (currentEpochId === 0) {
      console.log('Epoch 0: No lagged depths available (first epoch)');
      return null;
    }

    const previousEpochId = currentEpochId - 1;
    
    // Get previous epoch's accepted users and their endorsements
    const [previousScores, previousEndorsements] = await Promise.all([
      storage.getScoresByEpoch(previousEpochId),
      storage.getEndorsements({ epoch: previousEpochId, limit: 100000 }),
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
   * Check if scores exist for an epoch
   */
  async hasComputedScores(epochId: number): Promise<boolean> {
    const scores = await storage.getScoresByEpoch(epochId);
    return scores.length > 0;
  }

  /**
   * Get computation summary for an epoch
   */
  async getComputationSummary(epochId: number) {
    const [scores, health, endorsements, seeds] = await Promise.all([
      storage.getScoresByEpoch(epochId),
      storage.getEpochHealth(epochId),
      storage.getEndorsements({ epoch: epochId }),
      storage.getSeeds(),
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
