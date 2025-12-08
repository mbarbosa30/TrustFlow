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
  /**
   * Recalculate LocalHealth for a single address using network-wide computation.
   * IMPORTANT: Always computes ALL network participants together for accurate results.
   * Single-user computation produces inflated scores.
   */
  async recalculateLocalHealth(address: string): Promise<number> {
    const normalizedAddress = address.toLowerCase();
    
    try {
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
      
      // CRITICAL: Compute ALL network users together for accurate iterative algorithm
      const allParticipants = new Set<Address>();
      for (const v of globalVouches) {
        allParticipants.add(v.endorser);
        allParticipants.add(v.endorsee);
      }
      
      const egoScorer = new EgoScorer();
      
      // Use network-wide iterative algorithm for accurate voucher weighting
      const results = egoScorer.computeLocalHealthIterative(
        Array.from(allParticipants),
        globalVouches
      );
      
      const result = results.get(normalizedAddress);
      if (!result) {
        // User may have no vouches - return 0
        await storage.updateLocalHealth(normalizedAddress, 0);
        return 0;
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
      
      // CRITICAL: Include ALL participants from vouch graph for accurate iterative computation
      // Single-subset computation produces inflated/deflated scores
      const allParticipants = new Set<Address>();
      for (const v of globalVouches) {
        allParticipants.add(v.endorser);
        allParticipants.add(v.endorsee);
      }
      // Also include requested addresses (may not have vouches yet)
      for (const addr of normalizedAddresses) {
        allParticipants.add(addr);
      }
      
      const egoScorer = new EgoScorer();
      const scoreResults = egoScorer.computeLocalHealthIterative(
        Array.from(allParticipants),
        globalVouches
      );
      
      // Update database and build results map for REQUESTED addresses only
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
      
      // CRITICAL: Compute ALL network users together for accurate iterative algorithm
      // Single-user computation produces inflated scores because voucher weights depend
      // on all peers being computed in the same iteration cycle
      const allParticipants = new Set<Address>();
      for (const v of globalVouches) {
        allParticipants.add(v.endorser);
        allParticipants.add(v.endorsee);
      }
      
      const egoScorer = new EgoScorer();
      
      const results = egoScorer.computeLocalHealthIterative(
        Array.from(allParticipants),
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
   * @param forceRefresh - If true, triggers network-wide recalculation for all users
   *                       (single-user recalculation gives incorrect results due to 
   *                       iterative algorithm requiring all users computed together)
   */
  async getExtendedScoreMetrics(address: string, forceRefresh: boolean = false): Promise<ExtendedScoreMetrics> {
    const normalizedAddress = address.toLowerCase();
    
    let egoContext = await storage.getOrCreateEgoContext(normalizedAddress);
    
    let localHealth = 0;
    let cached = true;
    let cachedAt: string | null = egoContext.updatedAt?.toISOString() || null;
    
    // Force refresh triggers network-wide recalculation (single-user gives wrong results)
    if (forceRefresh) {
      console.log(`Force refresh requested - running network-wide recalculation for accurate scores`);
      try {
        const { NetworkRecalculationService } = await import('./networkRecalculation');
        const recalcService = new NetworkRecalculationService();
        await recalcService.recalculateAllScores();
        
        // Reload the context with fresh score
        egoContext = await storage.getOrCreateEgoContext(normalizedAddress);
        cached = false;
        cachedAt = new Date().toISOString();
      } catch (recalcError) {
        console.error(`Network recalculation failed, using cached value:`, recalcError);
      }
    }
    
    // Always use cached score (computed network-wide for accuracy)
    localHealth = Math.round(egoContext.localHealth ?? 0);
    
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
