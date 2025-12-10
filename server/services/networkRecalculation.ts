import { db } from "../db";
import { contexts, publicEndorsements, coSeeds } from "@shared/schema";
import { eq, isNull, or, and } from "drizzle-orm";
import { EgoScorer, type EgoEndorsement } from "../algorithm/egoScoring";
import type { Address } from "viem";
import { filterValidEndorsements } from "./vouchExpiration";

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

      // Filter out revoked and expired vouches
      const validVouches = await filterValidEndorsements(allGlobalVouches);
      console.log(`After filtering: ${validVouches.length} valid vouches (${allGlobalVouches.length - validVouches.length} expired/revoked)`);

      // Safety check: refuse to recalculate if no vouches found (prevents data corruption)
      if (validVouches.length === 0) {
        throw new Error("No valid vouches found - refusing to recalculate to prevent data corruption");
      }

      // Convert to EgoEndorsement format
      const globalVouches: EgoEndorsement[] = validVouches.map(v => ({
        endorser: v.endorser.toLowerCase() as Address,
        endorsee: v.endorsee.toLowerCase() as Address,
      }));

      // CRITICAL: Include ALL participants from vouch graph, not just ego contexts
      // The iterative algorithm requires all nodes to be computed together for accurate
      // voucher score weighting. Missing participants causes inflated/deflated scores.
      const allParticipants = new Set<Address>();
      for (const v of globalVouches) {
        allParticipants.add(v.endorser);
        allParticipants.add(v.endorsee);
      }
      
      // Also include existing ego contexts (may have no vouches yet)
      for (const ctx of egoContexts) {
        allParticipants.add(ctx.ownerAddress!.toLowerCase() as Address);
      }
      
      const addresses = Array.from(allParticipants);

      console.log(`Starting iterative LocalHealth calculation for ${addresses.length} participants (${egoContexts.length} with ego contexts)...`);

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
            const roundedScore = Math.round(scoreResult.localHealth);
            
            // Extract algorithm breakdown components if available
            const components = scoreResult.components;
            
            // Count incoming/outgoing vouches for this user
            const incomingActive = globalVouches.filter(v => v.endorsee === ownerAddress).length;
            const outgoingTotal = globalVouches.filter(v => v.endorser === ownerAddress).length;
            
            // Persist the score and breakdown data to the database
            await db
              .update(contexts)
              .set({ 
                localHealth: roundedScore,
                localHealthUpdatedAt: new Date(),
                // Algorithm breakdown fields
                flowComponent: components?.flowComponent ?? null,
                redundancyComponent: components?.redundancyComponent ?? null,
                actualMinCut: components?.actualMinCut ?? null,
                effectiveRedundancy: components?.effectiveRedundancy ?? null,
                vertexDisjointPaths: components?.vertexDisjointPaths ?? null,
                dilutionFactor: components?.dilutionFactor ?? null,
                incomingActive,
                outgoingTotal,
              })
              .where(
                and(
                  eq(contexts.ownerAddress, ownerAddress),
                  eq(contexts.type, 'ego')
                )
              );
            
            result.scoresUpdated++;
            result.details.push({
              address: ownerAddress,
              localHealth: roundedScore,
            });

            console.log(
              `Recalculated and saved ${ownerAddress}: LocalHealth = ${roundedScore}, flow=${components?.flowComponent?.toFixed(1) ?? 'N/A'}, redundancy=${components?.redundancyComponent?.toFixed(1) ?? 'N/A'}`
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
