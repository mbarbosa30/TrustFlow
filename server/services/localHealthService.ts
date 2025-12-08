import type { Address } from "viem";
import { storage } from "../storage";
import { EgoScorer } from "../algorithm/egoScoring";
import type { EgoEndorsement } from "../algorithm/egoScoring";
import { filterValidEndorsements, buildVouchFilter, isVouchValid } from "./vouchExpiration";

export interface AlgorithmBreakdown {
  flow_component: number;
  redundancy_component: number;
  direct_flow: number;
  effective_redundancy: number;
  dilution_factor: number;
  vertex_disjoint_paths: number;
  ego_network_size: number;
  edge_density: number;
  baselines: {
    healthy_vouch_count: number;
    healthy_redundancy: number;
  };
}

export interface ExtendedScoreMetrics {
  address: string;
  local_health: number;
  cached: boolean;
  cached_at: string | null;
  
  vouch_counts: {
    incoming_total: number;
    incoming_active: number;
    outgoing_total: number;
    unique_vouchers: number;
  };
  
  activity: {
    last_vouch_given_at: string | null;
  };
  
  algorithm_breakdown: AlgorithmBreakdown | null;
}

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
      return Math.round(egoContext.localHealth);
    }
    
    return null;
  }

  async computeAlgorithmBreakdown(address: string): Promise<AlgorithmBreakdown | null> {
    const normalizedAddress = address.toLowerCase() as Address;
    
    try {
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 100000
      });
      
      const validEndorsements = await filterValidEndorsements(globalEndorsements);
      
      const globalVouches: EgoEndorsement[] = validEndorsements.map((e: any) => ({
        endorser: e.endorser.toLowerCase() as Address,
        endorsee: e.endorsee.toLowerCase() as Address,
      }));
      
      if (globalVouches.length === 0) {
        return null;
      }
      
      const egoScorer = new EgoScorer();
      
      const results = egoScorer.computeLocalHealthIterative(
        [normalizedAddress],
        globalVouches
      );
      
      const result = results.get(normalizedAddress);
      if (!result || !result.components) {
        return {
          flow_component: 0,
          redundancy_component: 0,
          direct_flow: 0,
          effective_redundancy: 0,
          dilution_factor: 1.0,
          vertex_disjoint_paths: 0,
          ego_network_size: 0,
          edge_density: 0,
          baselines: {
            healthy_vouch_count: 8.0,
            healthy_redundancy: 36.0,
          },
        };
      }
      
      const c = result.components;
      return {
        flow_component: c.flowComponent,
        redundancy_component: c.redundancyComponent,
        direct_flow: c.directFlow,
        effective_redundancy: c.effectiveRedundancy,
        dilution_factor: c.dilutionFactor,
        vertex_disjoint_paths: c.vertexDisjointPaths,
        ego_network_size: c.egoNetworkSize,
        edge_density: c.edgeDensity,
        baselines: {
          healthy_vouch_count: c.healthyVouchCount,
          healthy_redundancy: c.healthyRedundancy,
        },
      };
    } catch (error) {
      console.error(`Error computing algorithm breakdown for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get extended score metrics for an address
   * @param address - The address to get metrics for
   * @param forceRefresh - If true, bypasses cache and recomputes score from scratch
   */
  async getExtendedScoreMetrics(address: string, forceRefresh: boolean = false): Promise<ExtendedScoreMetrics> {
    const normalizedAddress = address.toLowerCase();
    
    const egoContext = await storage.getOrCreateEgoContext(normalizedAddress);
    
    let localHealth = 0;
    let cached = false;
    let cachedAt: string | null = null;
    
    // Check cache validity (5 minute TTL) unless force refresh requested
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    const cacheAge = egoContext.updatedAt 
      ? now.getTime() - egoContext.updatedAt.getTime() 
      : Infinity;
    const cacheValid = !forceRefresh && cacheAge < CACHE_TTL_MS;
    
    if (cacheValid && egoContext.localHealth !== null && egoContext.localHealth !== undefined) {
      localHealth = Math.round(egoContext.localHealth);
      cached = true;
      cachedAt = egoContext.updatedAt?.toISOString() || null;
    } else {
      // Force recalculation - compute fresh score with fallback to stale cache
      console.log(`${forceRefresh ? 'Force refreshing' : 'Cache expired - recalculating'} LocalHealth for ${normalizedAddress}`);
      try {
        localHealth = await this.recalculateLocalHealth(normalizedAddress);
        cached = false;
        cachedAt = new Date().toISOString();
      } catch (computeError) {
        console.error(`Recomputation failed for ${normalizedAddress}, falling back to cached value:`, computeError);
        // Fall back to stale cached value if available
        if (egoContext.localHealth !== null && egoContext.localHealth !== undefined) {
          localHealth = Math.round(egoContext.localHealth);
          cached = true;
          cachedAt = egoContext.updatedAt?.toISOString() || null;
        } else {
          throw computeError;
        }
      }
    }
    
    const [incomingTotal, outgoingTotal, incomingEndorsements, algorithmBreakdown] = await Promise.all([
      storage.countEndorsements({ endorsee: normalizedAddress, communityId: 0 }),
      storage.countEndorsements({ endorser: normalizedAddress, communityId: 0 }),
      storage.getEndorsements({ endorsee: normalizedAddress, communityId: 0, limit: 1000 }),
      this.computeAlgorithmBreakdown(normalizedAddress),
    ]);
    
    const filter = await buildVouchFilter();
    const filterNow = new Date();
    
    const incomingActive = incomingEndorsements.filter(e => isVouchValid(e, filter, filterNow));
    
    const uniqueVouchers = new Set(
      incomingActive.map(e => e.endorser.toLowerCase())
    ).size;
    
    const lastVouchGivenAt = egoContext.lastSignalActivityAt?.toISOString() || null;
    
    return {
      address: normalizedAddress,
      local_health: localHealth,
      cached,
      cached_at: cachedAt,
      
      vouch_counts: {
        incoming_total: incomingTotal,
        incoming_active: incomingActive.length,
        outgoing_total: outgoingTotal,
        unique_vouchers: uniqueVouchers,
      },
      
      activity: {
        last_vouch_given_at: lastVouchGivenAt,
      },
      
      algorithm_breakdown: algorithmBreakdown,
    };
  }
}

export const localHealthService = new LocalHealthService();
