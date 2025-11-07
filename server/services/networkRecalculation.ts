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
   * Uses iterative algorithm to properly weight vouches by voucher strength
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

      // Safety check: refuse to recalculate if no vouches found (prevents data corruption)
      if (allGlobalVouches.length === 0) {
        throw new Error("No global vouches found - refusing to recalculate to prevent data corruption");
      }

      // Convert to EgoEndorsement format
      const globalVouches: EgoEndorsement[] = allGlobalVouches.map(v => ({
        endorser: v.endorser.toLowerCase() as Address,
        endorsee: v.endorsee.toLowerCase() as Address,
      }));

      // Get all user addresses
      const addresses = egoContexts.map(ctx => ctx.ownerAddress!.toLowerCase() as Address);

      console.log(`Starting iterative LocalHealth calculation for ${addresses.length} users...`);

      // Compute all scores iteratively (this properly weights vouches by voucher strength)
      const scoreResults = this.egoScorer.computeLocalHealthIterative(
        addresses,
        globalVouches,
        10, // maxIterations
        0.5 // convergenceThreshold
      );

      // Process results
      for (const context of egoContexts) {
        result.totalProcessed++;
        const ownerAddress = context.ownerAddress!.toLowerCase();

        try {
          const scoreResult = scoreResults.get(ownerAddress);
          
          if (scoreResult) {
            result.scoresUpdated++;
            result.details.push({
              address: ownerAddress,
              localHealth: scoreResult.localHealth,
            });

            console.log(
              `Recalculated ${ownerAddress}: LocalHealth = ${scoreResult.localHealth.toFixed(2)}`
            );
          } else {
            result.errors++;
            result.details.push({
              address: ownerAddress,
              localHealth: 0,
              error: 'Score not computed in iterative algorithm',
            });
          }
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
