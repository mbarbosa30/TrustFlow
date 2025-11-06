import { db } from "../db";
import { contexts, publicEndorsements, coSeeds } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { EgoScorer, type EgoEndorsement } from "../algorithm/egoScoring";
import type { Address } from "viem";

export interface RecalculationResult {
  totalProcessed: number;
  scoresUpdated: number;
  errors: number;
  duration: number;
  details: {
    address: string;
    localHealth: number;
    error?: string;
  }[];
}

export class NetworkRecalculationService {
  private egoScorer: EgoScorer;

  constructor() {
    this.egoScorer = new EgoScorer();
  }

  /**
   * Recalculate all LocalHealth scores across the entire network
   * This recomputes scores using the current algorithm parameters
   */
  async recalculateAllScores(): Promise<RecalculationResult> {
    const startTime = Date.now();
    const result: RecalculationResult = {
      totalProcessed: 0,
      scoresUpdated: 0,
      errors: 0,
      duration: 0,
      details: [],
    };

    try {
      // Get all ego contexts (users with personal networks)
      const egoContexts = await db
        .select()
        .from(contexts)
        .where(isNull(contexts.communityId));

      console.log(`Found ${egoContexts.length} ego contexts to recalculate`);

      // Get all global vouches (communityId = 0 or null)
      const allGlobalVouches = await db
        .select()
        .from(publicEndorsements)
        .where(
          or(
            eq(publicEndorsements.communityId, 0),
            isNull(publicEndorsements.communityId)
          )
        );

      console.log(`Found ${allGlobalVouches.length} global vouches`);

      // Safety check: refuse to persist if no vouches found (prevents data corruption)
      if (allGlobalVouches.length === 0) {
        throw new Error("No global vouches found - refusing to recalculate to prevent data corruption");
      }

      // Process each ego context
      for (const context of egoContexts) {
        result.totalProcessed++;
        const ownerAddress = context.ownerAddress!.toLowerCase() as Address;

        try {
          // Get co-seeds for this context
          const userCoSeeds = await db
            .select()
            .from(coSeeds)
            .where(eq(coSeeds.contextId, context.id));

          const seedAddresses = userCoSeeds.map(cs => cs.address.toLowerCase() as Address);

          // Convert to EgoEndorsement format
          const globalVouches: EgoEndorsement[] = allGlobalVouches.map(v => ({
            endorser: v.endorser.toLowerCase() as Address,
            endorsee: v.endorsee.toLowerCase() as Address,
          }));

          // Compute LocalHealth score with current algorithm (pure graph-based)
          // Note: LocalHealth scores are computed on-the-fly via /api/ego/:address/score
          // This recalculation is for verification/dashboard purposes only
          const scoreResult = this.egoScorer.computeLocalHealth(
            ownerAddress,
            seedAddresses,
            globalVouches
          );

          result.scoresUpdated++;
          result.details.push({
            address: ownerAddress,
            localHealth: scoreResult.localHealth,
          });

          console.log(
            `Recalculated ${ownerAddress}: LocalHealth = ${scoreResult.localHealth.toFixed(2)}`
          );
        } catch (error) {
          result.errors++;
          result.details.push({
            address: ownerAddress,
            localHealth: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`Error processing ${ownerAddress}:`, error);
        }
      }
    } catch (error) {
      console.error('Fatal error during recalculation:', error);
      throw error;
    }

    result.duration = Date.now() - startTime;
    return result;
  }
}
