import { db } from "../db";
import { contexts, publicEndorsements, coSeeds } from "@shared/schema";
import { eq, isNull, or, and } from "drizzle-orm";
import { EgoScorer, type EgoEndorsement } from "../algorithm/egoScoring";
import type { Address } from "viem";
import { filterValidEndorsements } from "./vouchExpiration";
import { externalSybilService } from "./externalSybilService";

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

      // Build tenure data map (address -> account age in days)
      // For tenure gating to work correctly, we need to distinguish truly new accounts
      // from existing network participants who may have recently created contexts
      // 
      // Strategy:
      // 1. If account has endorsed or been endorsed, they're an established participant → 365 days
      // 2. If context.createdAt is > 28 days old, use actual age
      // 3. Otherwise, treat as established account (365 days) to avoid false capping
      // 
      // This ensures tenure gates only apply to genuinely new accounts, not seeded data
      const tenureData = new Map<string, number>();
      const now = new Date();
      const MATURE_AGE_DAYS = 365;
      const TENURE_THRESHOLD_DAYS = 28;
      
      // Build set of all addresses that have participated in endorsements
      const participatedAddresses = new Set<string>();
      for (const v of globalVouches) {
        participatedAddresses.add(v.endorser);
        participatedAddresses.add(v.endorsee);
      }
      
      let matureCount = 0;
      let ageBasedCount = 0;
      
      for (const ctx of egoContexts) {
        if (ctx.ownerAddress) {
          const addrLower = ctx.ownerAddress.toLowerCase();
          
          // If address has participated in endorsements, treat as established
          if (participatedAddresses.has(addrLower)) {
            tenureData.set(addrLower, MATURE_AGE_DAYS);
            matureCount++;
            continue;
          }
          
          // For non-participants, use actual context age if > threshold
          if (ctx.createdAt) {
            const ageMs = now.getTime() - new Date(ctx.createdAt).getTime();
            const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
            if (ageDays >= TENURE_THRESHOLD_DAYS) {
              tenureData.set(addrLower, ageDays);
              ageBasedCount++;
            } else {
              // Recent context but no endorsements yet - apply tenure cap
              tenureData.set(addrLower, ageDays);
              ageBasedCount++;
            }
          } else {
            // No createdAt - treat as established
            tenureData.set(addrLower, MATURE_AGE_DAYS);
            matureCount++;
          }
        }
      }
      console.log(`Built tenure data for ${tenureData.size} contexts (${matureCount} mature, ${ageBasedCount} age-based)`);

      // Fetch external Sybil flags from NanoPay wallet API
      const externalFlags = await externalSybilService.fetchFlaggedWallets();
      const externalSybilScores = new Map<string, number>();
      for (const entry of Array.from(externalFlags.entries())) {
        const [addr, flag] = entry;
        externalSybilScores.set(addr, flag.score);
      }
      console.log(`Loaded ${externalSybilScores.size} external Sybil flags from NanoPay`);

      // Compute all scores iteratively (this properly weights vouches by voucher strength)
      const scoreResults = this.egoScorer.computeLocalHealthIterative(
        addresses,
        globalVouches,
        10, // maxIterations
        0.5, // convergenceThreshold
        tenureData, // tenure data for tenure-gated scoring
        externalSybilScores // external Sybil flags for device fingerprint penalty
      );

      // Build set of existing context addresses for quick lookup
      const existingContextAddresses = new Set<string>();
      for (const ctx of egoContexts) {
        if (ctx.ownerAddress) {
          existingContextAddresses.add(ctx.ownerAddress.toLowerCase());
        }
      }

      // Process ALL score results (not just existing contexts)
      // This ensures newly vouched users get their scores persisted
      for (const [ownerAddress, scoreResult] of Array.from(scoreResults.entries())) {
        result.totalProcessed++;

        try {
          const roundedScore = Math.round(scoreResult.localHealth);
          
          // Extract algorithm breakdown components if available
          const components = scoreResult.components;
          
          // Count incoming/outgoing vouches for this user
          const incomingActive = globalVouches.filter(v => v.endorsee === ownerAddress).length;
          const outgoingTotal = globalVouches.filter(v => v.endorser === ownerAddress).length;
          
          // Check if context exists, create if not
          if (!existingContextAddresses.has(ownerAddress)) {
            // Create ego context for this address
            await db.insert(contexts).values({
              ownerAddress: ownerAddress,
              type: 'ego',
              communityId: null,
              localHealth: roundedScore,
              localHealthUpdatedAt: new Date(),
              flowComponent: components?.flowComponent ?? null,
              redundancyComponent: components?.redundancyComponent ?? null,
              actualMinCut: components?.actualMinCut ?? null,
              effectiveRedundancy: components?.effectiveRedundancy ?? null,
              vertexDisjointPaths: components?.vertexDisjointPaths ?? null,
              dilutionFactor: components?.dilutionFactor ?? null,
              incomingActive,
              outgoingTotal,
              createdAt: new Date(),
            });
            console.log(`Created new context for ${ownerAddress}: LocalHealth = ${roundedScore}`);
          } else {
            // Update existing context
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
          }
          
          result.scoresUpdated++;
          result.details.push({
            address: ownerAddress,
            localHealth: roundedScore,
          });

          console.log(
            `Recalculated and saved ${ownerAddress}: LocalHealth = ${roundedScore}, flow=${components?.flowComponent?.toFixed(1) ?? 'N/A'}, redundancy=${components?.redundancyComponent?.toFixed(1) ?? 'N/A'}`
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
