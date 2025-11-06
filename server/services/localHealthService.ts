import type { Address } from "viem";
import { storage } from "../storage";
import { EgoScorer } from "../algorithm/egoScoring";
import type { EgoEndorsement, KudosBoost } from "../algorithm/egoScoring";
import { kudosService } from "../kudos/kudosService";

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
      
      const globalVouches: EgoEndorsement[] = globalEndorsements.map((e: any) => ({
        endorser: e.endorser.toLowerCase() as Address,
        endorsee: e.endorsee.toLowerCase() as Address,
      }));
      
      const uniqueEdges = Array.from(
        new Set(globalVouches.map(e => `${e.endorser}->${e.endorsee}`))
      ).map(edgeKey => {
        const [from, to] = edgeKey.split('->');
        return { fromAddress: from, toAddress: to };
      });

      const edgeWeights = await kudosService.calculateBatchEdgeWeights(uniqueEdges);
      
      const kudosBoosts: KudosBoost[] = [];
      for (const [edgeKey, weight] of Array.from(edgeWeights.entries())) {
        if (weight > 0) {
          const [from, to] = edgeKey.split('->');
          kudosBoosts.push({ 
            fromAddress: from as Address, 
            toAddress: to as Address, 
            weight 
          });
        }
      }
      
      const egoScorer = new EgoScorer();
      const result = egoScorer.computeLocalHealth(
        normalizedAddress as Address,
        seedAddresses,
        globalVouches,
        kudosBoosts
      );
      
      const localHealth = Math.round(result.localHealth);
      
      await storage.updateLocalHealth(normalizedAddress, localHealth);
      
      return localHealth;
    } catch (error) {
      console.error(`Error recalculating LocalHealth for ${normalizedAddress}:`, error);
      throw error;
    }
  }

  async recalculateMultipleLocalHealth(addresses: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
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
