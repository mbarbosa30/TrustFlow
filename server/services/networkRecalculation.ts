import { db } from "../db";
import { contexts, publicEndorsements, coSeeds } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { EgoScorer, type EgoEndorsement, type KudosBoost } from "../algorithm/egoScoring";
import { KudosService } from "../kudos/kudosService";
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
  private kudosService: KudosService;
  private egoScorer: EgoScorer;

  constructor() {
    this.kudosService = new KudosService();
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

      // Get all global vouches (not community-specific)
      const allGlobalVouches = await db
        .select()
        .from(publicEndorsements)
        .where(isNull(publicEndorsements.communityId));

      console.log(`Found ${allGlobalVouches.length} global vouches`);

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

          // Get KUDOS boosts for this user
          const kudosBoosts = await this.getKudosBoosts(ownerAddress);

          // Compute LocalHealth score with current algorithm
          const scoreResult = this.egoScorer.computeLocalHealth(
            ownerAddress,
            seedAddresses,
            globalVouches,
            kudosBoosts
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

  /**
   * Get KUDOS boosts for a specific address
   * Computes edge capacity boosts from KUDOS transfers
   */
  private async getKudosBoosts(address: Address): Promise<KudosBoost[]> {
    const normalized = address.toLowerCase();
    
    // Get all KUDOS transfers for this address
    const allTransfers = await this.kudosService.getTransferHistory({
      address: normalized,
      limit: 1000,
    });

    // Filter to only incoming transfers
    const incomingTransfers = allTransfers.filter(
      t => t.toAddress.toLowerCase() === normalized
    );

    const boosts: KudosBoost[] = [];
    const now = Date.now();
    const HALFLIFE_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

    for (const transfer of incomingTransfers) {
      // Calculate exponential decay
      const ageMs = now - new Date(transfer.createdAt).getTime();
      const decayFactor = Math.pow(0.5, ageMs / HALFLIFE_MS);
      
      // Use the actual amount transferred (after fees)
      const netAmount = transfer.amount - transfer.feeBurned - transfer.feeToPool;
      const decayedAmount = netAmount * decayFactor;

      if (decayedAmount > 0.01) {
        // Only include non-negligible boosts
        boosts.push({
          fromAddress: transfer.fromAddress.toLowerCase() as Address,
          toAddress: normalized as Address,
          weight: decayedAmount,
        });
      }
    }

    return boosts;
  }
}
