import type { Address } from "viem";
import { storage } from "../storage";
import { EgoScorer } from "../algorithm/egoScoring";
import type { EgoEndorsement } from "../algorithm/egoScoring";
import { filterValidEndorsements } from "./vouchExpiration";

export class LocalHealthService {
  async recalculateLocalHealth(address: string): Promise<number> {
    const normalizedAddress = address.toLowerCase();
    
    try {
      const egoContext = await storage.getOrCreateEgoContext(normalizedAddress);
      const coSeeds = await storage.getCoSeeds(egoContext.id);
      const seedAddresses = coSeeds.map(cs => cs.address.toLowerCase() as Address);
      
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 100000
      });
      
      // Filter out revoked and expired vouches
      const validEndorsements = await filterValidEndorsements(globalEndorsements);
      
      const globalVouches: EgoEndorsement[] = validEndorsements.map((e: any) => ({
        endorser: e.endorser.toLowerCase() as Address,
        endorsee: e.endorsee.toLowerCase() as Address,
      }));
      
      const egoScorer = new EgoScorer();
      
      // Use iterative algorithm for recursive trust weighting (co-seeds not used for LocalHealth)
      const results = egoScorer.computeLocalHealthIterative(
        [normalizedAddress as Address],
        globalVouches
      );
      
      const result = results.get(normalizedAddress);
      if (!result) {
        throw new Error(`Failed to compute LocalHealth for ${normalizedAddress}`);
      }
      
      const localHealth = Math.round(result.localHealth);
      
      await storage.updateLocalHealth(normalizedAddress, localHealth);
      
      return localHealth;
    } catch (error) {
      console.error(`Error recalculating LocalHealth for ${normalizedAddress}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate LocalHealth for multiple users using iterative algorithm
   * This properly weights vouches by voucher strength through iterative convergence
   * 
   * @param addresses - Array of addresses to recalculate scores for
   * @param useIterative - Whether to use iterative algorithm (default true for accuracy)
   * @returns Map of address to LocalHealth score
   */
  async recalculateMultipleLocalHealth(
    addresses: string[], 
    useIterative: boolean = true
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    if (!useIterative) {
      // Legacy single-pass calculation
      for (const address of addresses) {
        try {
          const localHealth = await this.recalculateLocalHealth(address);
          results.set(address.toLowerCase(), localHealth);
        } catch (error) {
          console.error(`Failed to recalculate LocalHealth for ${address}:`, error);
          results.set(address.toLowerCase(), 0);
        }
      }
      return results;
    }

    // Iterative calculation: compute all scores together with proper weighting
    try {
      const normalizedAddresses = addresses.map(a => a.toLowerCase() as Address);
      
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 100000
      });
      
      // Filter out revoked and expired vouches
      const validEndorsements = await filterValidEndorsements(globalEndorsements);
      
      const globalVouches: EgoEndorsement[] = validEndorsements.map((e: any) => ({
        endorser: e.endorser.toLowerCase() as Address,
        endorsee: e.endorsee.toLowerCase() as Address,
      }));
      
      const egoScorer = new EgoScorer();
      const scoreResults = egoScorer.computeLocalHealthIterative(
        normalizedAddresses,
        globalVouches
      );
      
      // Update database and build results map
      for (const address of normalizedAddresses) {
        const scoreResult = scoreResults.get(address.toLowerCase());
        if (scoreResult) {
          const localHealth = Math.round(scoreResult.localHealth);
          await storage.updateLocalHealth(address, localHealth);
          results.set(address, localHealth);
        } else {
          results.set(address, 0);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to recalculate LocalHealth iteratively:', error);
      // Fallback to single-pass for each address
      for (const address of addresses) {
        try {
          const localHealth = await this.recalculateLocalHealth(address);
          results.set(address.toLowerCase(), localHealth);
        } catch (err) {
          console.error(`Failed to recalculate LocalHealth for ${address}:`, err);
          results.set(address.toLowerCase(), 0);
        }
      }
      return results;
    }
  }

  async getCachedLocalHealth(address: string): Promise<number | null> {
    const normalizedAddress = address.toLowerCase();
    const egoContext = await storage.getOrCreateEgoContext(normalizedAddress);
    
    if (egoContext.localHealth !== null && egoContext.localHealth !== undefined) {
      return egoContext.localHealth;
    }
    
    return null;
  }
}

export const localHealthService = new LocalHealthService();
