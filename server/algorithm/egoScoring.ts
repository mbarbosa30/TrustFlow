import type { Address } from "viem";
import { FlowGraph } from "./graph";
import { DinicMaxFlow } from "./maxflow";
import type { EgoScoreResult, EgoNodeMetrics } from "./types";

export interface EgoEndorsement {
  endorser: Address;
  endorsee: Address;
}

export interface EgoScoringConfig {
  maxDistance: number;
  minAcceptanceFlow: number;
  minAcceptanceMinCut: number;
  useAdaptiveBaselines: boolean;
  usePiecewiseDilution: boolean;
  useVertexDisjointPaths: boolean;
}

export const DEFAULT_CONFIG: EgoScoringConfig = {
  maxDistance: 3,
  minAcceptanceFlow: 0.5,
  minAcceptanceMinCut: 2,
  useAdaptiveBaselines: true,
  usePiecewiseDilution: true,
  useVertexDisjointPaths: true,
};

/**
 * Algorithm Enhancement: Diminishing Returns Curve
 * 
 * Applies logarithmic scaling to raw scores so that:
 * - Initial scores (0-30) are relatively easy to achieve
 * - Mid-range scores (30-50) require more effort
 * - High scores (50-65) require genuine network integration
 * - Elite scores (65-80) are very difficult without diverse high-quality connections
 * - Top scores (80+) are economically infeasible to game
 * 
 * Formula: Uses sigmoid + log blend for smooth diminishing returns
 * - Below 30: nearly linear (easy entry)
 * - 30-50: gentle compression (growing effort)
 * - 50-65: moderate compression (genuine integration needed)
 * - 65-80: strong compression (diversity gates kick in)
 * - 80+: extreme compression (near-impossible without real network)
 */
function applyDiminishingReturns(rawScore: number): number {
  // Scores below 30 pass through mostly unchanged (easy entry)
  if (rawScore <= 30) {
    return rawScore;
  }
  
  // Use piecewise logarithmic compression for higher scores
  if (rawScore <= 50) {
    // 30-50 range: gentle compression
    // Map 30-50 raw to ~30-45 output
    const excess = rawScore - 30;
    const compressedExcess = 15 * Math.log1p(excess) / Math.log1p(20);
    return 30 + compressedExcess;
  }
  
  if (rawScore <= 70) {
    // 50-70 range: moderate compression
    // Map 50-70 raw to ~45-58 output
    const baseOutput = 45; // Output at raw=50
    const excess = rawScore - 50;
    const compressedExcess = 13 * Math.log1p(excess) / Math.log1p(20);
    return baseOutput + compressedExcess;
  }
  
  if (rawScore <= 90) {
    // 70-90 range: strong compression
    // Map 70-90 raw to ~58-70 output
    const baseOutput = 58; // Output at raw=70
    const excess = rawScore - 70;
    const compressedExcess = 12 * Math.log1p(excess) / Math.log1p(20);
    return baseOutput + compressedExcess;
  }
  
  // 90-100 range: extreme compression
  // Map 90-100 raw to ~70-80 output (with quality gates, can reach higher)
  const baseOutput = 70; // Output at raw=90
  const excess = rawScore - 90;
  const compressedExcess = 10 * Math.log1p(excess) / Math.log1p(10);
  return baseOutput + compressedExcess;
}

/**
 * Algorithm Enhancement: Quality Gates
 * 
 * Unlocks higher score tiers based on voucher quality distribution.
 * Returns a multiplier that can boost scores ABOVE the diminishing returns curve
 * when genuine high-quality network integration is demonstrated.
 * 
 * Tier thresholds (requires quality vouchers to unlock):
 * - 50+: Need at least 1 voucher with score >= 50 OR 8+ vouchers (hub pattern)
 * - 65+: Need at least 2 vouchers with score >= 65 OR 12+ vouchers (large hub)
 * - 80+: Need at least 3 vouchers with score >= 75, plus vertex-disjoint paths
 * 
 * The voucher count alternative recognizes legitimate hub-spoke patterns
 * where many independent users vouch for a central hub.
 * 
 * @returns Object with: 
 *   - maxUnlockedTier: The highest tier this user can reach
 *   - qualityBonus: Extra points for exceptional quality (0-20)
 */
function computeQualityGates(
  voucherScores: Map<string, number>,
  directVouchers: string[],
  vertexDisjointPaths: number
): { maxUnlockedTier: number; qualityBonus: number } {
  // Count vouchers at each quality level
  let quality50Count = 0;  // >= 50
  let quality65Count = 0;  // >= 65
  let quality75Count = 0;  // >= 75
  let totalQuality = 0;
  
  for (const voucher of directVouchers) {
    const score = voucherScores.get(voucher) ?? 0;
    totalQuality += score;
    if (score >= 50) quality50Count++;
    if (score >= 65) quality65Count++;
    if (score >= 75) quality75Count++;
  }
  
  const voucherCount = directVouchers.length;
  
  // Determine max unlocked tier
  // Two paths to unlock: quality vouchers OR many independent vouchers (hub pattern)
  let maxUnlockedTier = 50; // Everyone can reach up to 50
  
  // Tier 65: quality path OR structural path (hub with many vouchers)
  if (quality50Count >= 1 || voucherCount >= 8) {
    maxUnlockedTier = 65; // Can reach up to 65
  }
  
  // Tier 80: quality path OR large hub path
  if (quality65Count >= 2 || (voucherCount >= 12 && quality50Count >= 1)) {
    maxUnlockedTier = 80; // Can reach up to 80
  }
  
  // Elite tier (80+) requires strong quality AND structural diversity
  if (quality75Count >= 3 && vertexDisjointPaths >= 2) {
    maxUnlockedTier = 100; // Can approach max
  }
  
  // Quality bonus: reward for exceptional network quality
  // Based on average voucher quality and count of high-quality sources
  let qualityBonus = 0;
  const avgQuality = directVouchers.length > 0 
    ? totalQuality / directVouchers.length 
    : 0;
  
  // Bonus for high average quality (up to +10)
  if (avgQuality >= 70) {
    qualityBonus += Math.min(10, (avgQuality - 70) / 3);
  }
  
  // Additional bonus for multiple high-quality vouchers (up to +10)
  if (quality75Count >= 4) {
    qualityBonus += Math.min(10, (quality75Count - 3) * 2);
  }
  
  // Hub pattern bonus: many independent vouchers show real network engagement
  // (smaller bonus, as these are typically low-quality vouches)
  if (voucherCount >= 10 && quality75Count < 3) {
    qualityBonus += Math.min(5, (voucherCount - 8) * 0.5);
  }
  
  return { maxUnlockedTier, qualityBonus };
}

/**
 * Algorithm Enhancement: Piecewise Dilution Curve
 * 
 * Instead of linear 10% penalty per excess vouch, uses smooth continuous decay:
 * - 1-10 vouches: 1.0 (no penalty - quality zone)
 * - 11-15 vouches: 1.0 → 0.85 linear (gentle decay - warning zone)
 * - 16-25 vouches: 0.85 → 0.55 smooth (steeper decay - penalty zone)
 * - 25+ vouches: 0.55 → 0.4 asymptotic (floor approach - cap zone)
 * 
 * This prevents gaming threshold boundaries and creates smoother incentives.
 * All transitions are continuous (no discontinuities at boundaries).
 */
function computePiecewiseDilutionPenalty(vouchCount: number): number {
  const QUALITY_THRESHOLD = 10;
  const WARNING_THRESHOLD = 15;
  const PENALTY_THRESHOLD = 25;
  const MIN_FACTOR = 0.4; // Floor at 40% (was 50% with linear)
  
  if (vouchCount <= QUALITY_THRESHOLD) {
    // Quality zone: no penalty
    return 1.0;
  }
  
  if (vouchCount <= WARNING_THRESHOLD) {
    // Warning zone: linear decay from 1.0 to 0.85 over 5 vouches
    // At 10: 1.0, at 15: 0.85
    const progress = (vouchCount - QUALITY_THRESHOLD) / (WARNING_THRESHOLD - QUALITY_THRESHOLD);
    return 1.0 - (0.15 * progress); // 1.0 → 0.85
  }
  
  if (vouchCount <= PENALTY_THRESHOLD) {
    // Penalty zone: smooth (quadratic) decay from 0.85 to 0.55 over 10 vouches
    // Uses quadratic easing for smooth curve
    const progress = (vouchCount - WARNING_THRESHOLD) / (PENALTY_THRESHOLD - WARNING_THRESHOLD);
    // Quadratic ease-in: starts gentle, gets steeper
    const easedProgress = progress * progress;
    return 0.85 - (0.30 * easedProgress); // 0.85 → 0.55
  }
  
  // Cap zone: asymptotic approach from 0.55 to 0.4 for 25+ vouches
  // Uses exponential decay to prevent sharp floor
  const excess = vouchCount - PENALTY_THRESHOLD;
  const remainingRange = 0.55 - MIN_FACTOR; // 0.15
  const decayRate = 0.1; // Gentle asymptotic approach
  // Exponential decay: 0.55 - (0.15 * (1 - e^(-0.1 * excess)))
  // At 25: 0.55, at 35: ~0.46, at 50: ~0.43, approaches 0.4
  const decay = remainingRange * (1 - Math.exp(-decayRate * excess));
  return 0.55 - decay;
}

/**
 * Algorithm Enhancement: Compute Vertex-Disjoint Path Count
 * 
 * Uses max-flow with node splitting to count truly independent paths.
 * Each node is split into node_in and node_out with capacity 1 between them.
 * This ensures paths don't share intermediate nodes (stronger Sybil resistance).
 * 
 * Key insight: Standard edge-disjoint max-flow allows paths to share nodes,
 * but vertex-disjoint requires paths to have no common intermediate vertices.
 */
export function computeVertexDisjointPaths(
  target: Address,
  vouchers: Address[],
  globalVouches: EgoEndorsement[],
  maxDistance: number = 3
): number {
  // Build a graph with node splitting for vertex-disjoint counting
  // Each node v becomes v_in and v_out with edge (v_in -> v_out, capacity=1)
  const SOURCE = "SOURCE";
  const SINK_IN = target.toLowerCase() + "_in";
  const SINK_OUT = target.toLowerCase() + "_out";
  
  const graph = new FlowGraph(SOURCE, SINK_OUT);
  const addedNodes = new Set<string>();
  
  // Helper to add split node
  const addSplitNode = (nodeId: string) => {
    const nodeLower = nodeId.toLowerCase();
    if (addedNodes.has(nodeLower)) return;
    addedNodes.add(nodeLower);
    
    const nodeIn = nodeLower + "_in";
    const nodeOut = nodeLower + "_out";
    graph.addNode(nodeIn);
    graph.addNode(nodeOut);
    // Internal capacity = 1 (can only be used by one path)
    graph.addEdge(nodeIn, nodeOut, 1);
  };
  
  // Add target node
  addSplitNode(target);
  
  // Connect SOURCE to vouchers (through their _out since flow enters from outside)
  for (const voucher of vouchers) {
    addSplitNode(voucher);
    const voucherOut = voucher.toLowerCase() + "_out";
    graph.addEdge(SOURCE, voucherOut, 1);
  }
  
  // Build reachability within maxDistance hops using BFS
  const reachable = new Set<string>();
  const queue: { addr: string; dist: number }[] = [];
  
  for (const voucher of vouchers) {
    const vLower = voucher.toLowerCase();
    reachable.add(vLower);
    queue.push({ addr: vLower, dist: 0 });
  }
  
  // Build reverse adjacency (endorsee -> endorsers)
  const reverseAdj = new Map<string, string[]>();
  for (const { endorser, endorsee } of globalVouches) {
    const eeL = endorsee.toLowerCase();
    if (!reverseAdj.has(eeL)) reverseAdj.set(eeL, []);
    reverseAdj.get(eeL)!.push(endorser.toLowerCase());
  }
  
  // BFS to find nodes within maxDistance
  let head = 0;
  while (head < queue.length) {
    const { addr, dist } = queue[head++];
    if (dist >= maxDistance) continue;
    
    const upstream = reverseAdj.get(addr) || [];
    for (const neighbor of upstream) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push({ addr: neighbor, dist: dist + 1 });
      }
    }
  }
  
  // Add edges between reachable nodes (using split node model)
  for (const { endorser, endorsee } of globalVouches) {
    const erL = endorser.toLowerCase();
    const eeL = endorsee.toLowerCase();
    
    if (reachable.has(erL) && reachable.has(eeL)) {
      addSplitNode(endorser);
      addSplitNode(endorsee);
      
      // Edge goes from endorser_out to endorsee_in (flow direction)
      const erOut = erL + "_out";
      const eeIn = eeL + "_in";
      graph.addEdge(erOut, eeIn, 1);
    }
  }
  
  // Connect vouchers to target
  for (const voucher of vouchers) {
    const vOut = voucher.toLowerCase() + "_out";
    graph.addEdge(vOut, SINK_IN, 1);
  }
  
  // Max-flow gives vertex-disjoint path count
  const solver = new DinicMaxFlow(graph);
  return solver.computeMaxFlow();
}

/**
 * Algorithm Enhancement: Compute Adaptive Baselines
 * 
 * Instead of fixed HEALTHY_VOUCH_COUNT=8 and HEALTHY_REDUNDANCY=35,
 * computes these from network percentiles so the algorithm adapts
 * as the network grows or changes.
 * 
 * Uses 75th percentile of vouch counts and redundancy scores
 * to define "healthy" - meaning top 25% of users are approaching max score.
 */
export function computeAdaptiveBaselines(
  globalVouches: EgoEndorsement[]
): { healthyVouchCount: number; healthyRedundancy: number } {
  // Default fallbacks if network is too small
  const DEFAULT_HEALTHY_VOUCH_COUNT = 8.0;
  const DEFAULT_HEALTHY_REDUNDANCY = 35.0;
  const MIN_NETWORK_SIZE = 10;
  
  // Extract unique addresses from vouches
  const allAddresses = new Set<string>();
  globalVouches.forEach(v => {
    allAddresses.add(v.endorser.toLowerCase());
    allAddresses.add(v.endorsee.toLowerCase());
  });
  const addresses = Array.from(allAddresses);
  
  if (addresses.length < MIN_NETWORK_SIZE) {
    return {
      healthyVouchCount: DEFAULT_HEALTHY_VOUCH_COUNT,
      healthyRedundancy: DEFAULT_HEALTHY_REDUNDANCY,
    };
  }
  
  // Compute vouch counts for all addresses
  const incomingCounts = new Map<string, number>();
  globalVouches.forEach(v => {
    const endorsee = v.endorsee.toLowerCase();
    incomingCounts.set(endorsee, (incomingCounts.get(endorsee) || 0) + 1);
  });
  
  const vouchCounts: number[] = [];
  for (const addr of addresses) {
    const count = incomingCounts.get(addr) || 0;
    if (count > 0) {
      vouchCounts.push(count);
    }
  }
  
  if (vouchCounts.length < MIN_NETWORK_SIZE) {
    return {
      healthyVouchCount: DEFAULT_HEALTHY_VOUCH_COUNT,
      healthyRedundancy: DEFAULT_HEALTHY_REDUNDANCY,
    };
  }
  
  // Sort and find 75th percentile
  vouchCounts.sort((a, b) => a - b);
  const p75Index = Math.floor(vouchCounts.length * 0.75);
  const p75VouchCount = vouchCounts[p75Index];
  
  // Healthy vouch count: 75th percentile, clamped to reasonable range
  // Min 4 (very small networks), max 15 (very large networks)
  const healthyVouchCount = Math.max(4, Math.min(15, p75VouchCount));
  
  // Estimate healthy redundancy from vouch count
  // Empirically: redundancy ≈ vouchCount * 4.5 for well-connected networks
  // This accounts for depth bonus + connectivity bonus
  const healthyRedundancy = Math.max(15, Math.min(60, healthyVouchCount * 4.5));
  
  return { healthyVouchCount, healthyRedundancy };
}

export class EgoScorer {
  private config: EgoScoringConfig;
  private cachedBaselines: { healthyVouchCount: number; healthyRedundancy: number } | null = null;

  constructor(config: Partial<EgoScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Get healthy baselines, computing adaptively if enabled
   */
  private getHealthyBaselines(
    addresses: Address[],
    globalVouches: EgoEndorsement[]
  ): { healthyVouchCount: number; healthyRedundancy: number } {
    if (!this.config.useAdaptiveBaselines) {
      // Use fixed calibrated baselines
      return {
        healthyVouchCount: 8.0,
        healthyRedundancy: 35.0,
      };
    }
    
    // Compute adaptive baselines (cache for performance)
    if (!this.cachedBaselines) {
      this.cachedBaselines = computeAdaptiveBaselines(globalVouches);
    }
    return this.cachedBaselines;
  }

  /**
   * Compute LocalHealth iteratively for all users to properly weight vouches by voucher strength
   * Uses iterative algorithm similar to PageRank where scores converge over multiple rounds
   * 
   * @param addresses - All user addresses to compute scores for
   * @param globalVouches - All endorsements in the network
   * @param maxIterations - Maximum number of iterations (default 10)
   * @param convergenceThreshold - Stop when max score change < this value (default 0.5)
   * @returns Map of address to EgoScoreResult
   */
  computeLocalHealthIterative(
    addresses: Address[],
    globalVouches: EgoEndorsement[],
    maxIterations: number = 10,
    convergenceThreshold: number = 0.5
  ): Map<string, EgoScoreResult> {
    // Step 0: Compute adaptive baselines if enabled (before scoring)
    // This allows the algorithm to adapt to network size and density
    if (this.config.useAdaptiveBaselines) {
      this.cachedBaselines = computeAdaptiveBaselines(globalVouches);
      console.log(`Adaptive baselines: vouch=${this.cachedBaselines.healthyVouchCount.toFixed(1)}, redundancy=${this.cachedBaselines.healthyRedundancy.toFixed(1)}`);
    }
    
    // Step 1: Initialize scores based on incoming vouch count (simple baseline)
    const currentScores = new Map<string, number>();
    for (const addr of addresses) {
      const addrLower = addr.toLowerCase();
      const incomingCount = globalVouches.filter(
        v => v.endorsee.toLowerCase() === addrLower
      ).length;
      // Initial score: scaled by vouch count with reasonable baseline
      // 0 vouches = 0, 1 vouch = 10, 5 vouches = 50, 10+ vouches = 100
      const initialScore = Math.min(100, Math.sqrt(incomingCount) * 20);
      currentScores.set(addrLower, initialScore);
    }

    // Step 2: Iterate until convergence
    let iteration = 0;
    for (; iteration < maxIterations; iteration++) {
      const newScores = new Map<string, number>();
      let maxChange = 0;

      // Recalculate everyone's score based on current voucher scores
      for (const addr of addresses) {
        const result = this.computePureOption2Score(addr, globalVouches, currentScores);
        const addrLower = addr.toLowerCase();
        newScores.set(addrLower, result.localHealth);
        
        const oldScore = currentScores.get(addrLower) || 0;
        const change = Math.abs(result.localHealth - oldScore);
        maxChange = Math.max(maxChange, change);
      }

      // Update scores for next iteration
      for (const [addr, score] of Array.from(newScores.entries())) {
        currentScores.set(addr, score);
      }

      // Check convergence
      if (maxChange < convergenceThreshold) {
        console.log(`LocalHealth converged after ${iteration + 1} iterations (max change: ${maxChange.toFixed(2)})`);
        break;
      }
    }

    if (iteration === maxIterations) {
      console.log(`LocalHealth reached max iterations (${maxIterations}), final max change may be > ${convergenceThreshold}`);
    }

    // Step 3: Final pass to get complete results with final scores
    const results = new Map<string, EgoScoreResult>();
    for (const addr of addresses) {
      const result = this.computePureOption2Score(addr, globalVouches, currentScores);
      results.set(addr.toLowerCase(), result);
    }

    return results;
  }

  computeLocalHealth(
    ownerAddress: Address,
    seedAddresses: Address[],
    globalVouches: EgoEndorsement[]
  ): EgoScoreResult {
    // Pure Option 2: If no co-seeds, use vouchers as sources
    const isPureOption2 = seedAddresses.length === 0;
    
    if (isPureOption2) {
      return this.computePureOption2Score(ownerAddress, globalVouches);
    }

    const distances = this.computeDistances(seedAddresses, globalVouches);
    const egoSubgraph = this.extractEgoSubgraph(
      seedAddresses,
      globalVouches,
      distances,
      this.config.maxDistance
    );

    const nodeMetrics: EgoNodeMetrics[] = [];
    const residualFlows: number[] = [];
    const minCuts: number[] = [];
    const nodeResiduals = new Map<Address, number>(); // Track residuals for vouch quality
    let acceptedCount = 0;

    for (const node of egoSubgraph) {
      if (seedAddresses.includes(node)) continue;

      const distance = distances.get(node) ?? Infinity;
      const capacity = this.calculateCapacity(distance);
      
      const graph = this.buildNodeGraph(
        node,
        seedAddresses,
        globalVouches,
        distances
      );

      const maxFlowSolver = new DinicMaxFlow(graph);
      const flow = maxFlowSolver.computeMaxFlow();
      const minCutSet = maxFlowSolver.computeMinCut();
      
      const minCut = this.calculateMinCutCapacity(graph, minCutSet);

      const maxPossibleNodeFlow = this.calculateMaxInboundCapacity(
        node,
        globalVouches,
        distances
      );
      
      const residualFlow = maxPossibleNodeFlow > 0 
        ? Math.min(1.0, flow / maxPossibleNodeFlow) 
        : 0;

      const isAccepted = 
        flow >= this.config.minAcceptanceFlow &&
        minCut >= this.config.minAcceptanceMinCut;

      if (isAccepted) {
        acceptedCount++;
      }

      residualFlows.push(residualFlow);
      minCuts.push(minCut);
      nodeResiduals.set(node.toLowerCase() as Address, residualFlow);

      nodeMetrics.push({
        address: node,
        distance,
        capacity,
        flow,
        residualFlow,
        minCut,
      });
    }

    const avgResidualFlow =
      residualFlows.length > 0
        ? residualFlows.reduce((a, b) => a + b, 0) / residualFlows.length
        : 0;

    const medianMinCut = this.calculateMedian(minCuts);
    const seedCount = seedAddresses.length;

    // Flow component: Incoming trust saturation (0-60)
    // avgResidualFlow is already normalized per-node (flow/maxInbound), so scale by 60
    const flowComponent = 60 * avgResidualFlow;
    
    // Cut component: Network redundancy (0-40)
    // Normalize by actual seed count for hybrid mode
    const baseCutComponent = seedCount > 0 
      ? 40 * Math.min(1.0, medianMinCut / seedCount)
      : 0;
    
    // Apply vouch quality factor to cut component (accountability for outgoing vouches)
    const vouchQualityFactor = this.calculateVouchQualityFactor(
      ownerAddress,
      globalVouches,
      nodeResiduals
    );
    const cutComponent = baseCutComponent * vouchQualityFactor;
    
    const localHealth = Math.min(100, Math.max(0, flowComponent + cutComponent));

    return {
      ownerAddress,
      localHealth: Math.round(localHealth * 100) / 100,
      seedAddresses,
      metrics: {
        totalNodes: egoSubgraph.length,
        acceptedUsers: acceptedCount,
        avgResidualFlow: Math.round(avgResidualFlow * 1000) / 1000,
        medianMinCut: Math.round(medianMinCut * 100) / 100,
        maxPossibleFlow: 1.0, // Kept for backward compatibility, but not used in scoring
      },
      nodeDetails: nodeMetrics,
    };
  }

  private calculateCapacity(distance: number): number {
    return 1.0 / Math.pow(2, distance);
  }

  private computeDistances(
    seeds: Address[],
    endorsements: EgoEndorsement[]
  ): Map<Address, number> {
    const distances = new Map<Address, number>();
    const queue: { address: Address; distance: number }[] = [];

    for (const seed of seeds) {
      distances.set(seed, 0);
      queue.push({ address: seed, distance: 0 });
    }

    const adjacency = this.buildAdjacencyList(endorsements);
    let head = 0;

    while (head < queue.length) {
      const { address, distance } = queue[head++];

      const neighbors = adjacency.get(address) || [];
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, distance + 1);
          queue.push({ address: neighbor, distance: distance + 1 });
        }
      }
    }

    return distances;
  }

  private buildAdjacencyList(
    endorsements: EgoEndorsement[]
  ): Map<Address, Address[]> {
    const adj = new Map<Address, Address[]>();

    for (const { endorser, endorsee } of endorsements) {
      if (!adj.has(endorser)) adj.set(endorser, []);
      adj.get(endorser)!.push(endorsee);
    }

    return adj;
  }

  private extractEgoSubgraph(
    seeds: Address[],
    endorsements: EgoEndorsement[],
    distances: Map<Address, number>,
    maxDistance: number
  ): Address[] {
    const subgraph = new Set<Address>();

    for (const [address, distance] of Array.from(distances.entries())) {
      if (distance <= maxDistance) {
        subgraph.add(address);
      }
    }

    return Array.from(subgraph);
  }

  private buildNodeGraph(
    targetNode: Address,
    seeds: Address[],
    endorsements: EgoEndorsement[],
    distances: Map<Address, number>
  ): FlowGraph {
    const SOURCE = "SOURCE";
    const SINK = targetNode;
    const graph = new FlowGraph(SOURCE, SINK);

    for (const seed of seeds) {
      graph.addEdge(SOURCE, seed, Infinity);
    }

    for (const { endorser, endorsee } of endorsements) {
      const endorserDist = distances.get(endorser) ?? Infinity;
      const endorseeDist = distances.get(endorsee) ?? Infinity;

      if (
        endorserDist <= this.config.maxDistance &&
        endorseeDist <= this.config.maxDistance
      ) {
        const capacity = this.calculateCapacity(endorseeDist);
        graph.addEdge(endorser, endorsee, capacity);
      }
    }

    return graph;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate vouch quality factor based on outgoing vouches
   * Rewards vouching for high-quality nodes, penalizes vouching for low-quality or too many nodes
   * Returns a multiplier in range 0.9-1.1 (default 1.0)
   */
  private calculateVouchQualityFactor(
    ownerAddress: Address,
    globalVouches: EgoEndorsement[],
    nodeResiduals: Map<Address, number>
  ): number {
    // Find all nodes that the owner vouches for (outgoing edges)
    const outgoingVouchees = globalVouches
      .filter(v => v.endorser.toLowerCase() === ownerAddress.toLowerCase())
      .map(v => v.endorsee.toLowerCase() as Address);

    // If no outgoing vouches, neutral factor
    if (outgoingVouchees.length === 0) {
      return 1.0;
    }

    // Calculate mean residual flow of vouchees
    // Only include vouchees that have residual data (within ego subgraph)
    // Missing residuals are treated as neutral (not penalized)
    const voucheeResiduals = outgoingVouchees
      .map(addr => nodeResiduals.get(addr))
      .filter(r => r !== undefined) as number[];
    
    const meanVoucheeResidual = voucheeResiduals.length > 0
      ? voucheeResiduals.reduce((sum, r) => sum + r, 0) / voucheeResiduals.length
      : 1.0; // Neutral if no vouchees have residual data

    // Base quality factor: 0.9 to 1.1 based on vouchee quality
    // If vouchees have high residuals (close to 1.0), factor approaches 1.1
    // If vouchees have low residuals (close to 0), factor approaches 0.9
    let qualityFactor = 0.9 + (0.2 * meanVoucheeResidual);
    qualityFactor = Math.max(0.9, Math.min(1.1, qualityFactor));

    // Dilution penalty: If vouching for too many people (>10)
    const DILUTION_THRESHOLD = 10;
    if (outgoingVouchees.length > DILUTION_THRESHOLD) {
      const excess = outgoingVouchees.length - DILUTION_THRESHOLD;
      const dilutionPenalty = 0.1 * excess; // 10% per excess vouch
      qualityFactor *= Math.max(0.5, 1 - dilutionPenalty); // Cap at 50% reduction
    }

    return qualityFactor;
  }

  private calculateMinCutCapacity(
    graph: FlowGraph,
    minCutSet: Set<string>
  ): number {
    let cutCapacity = 0;
    const nodes = graph.getNodes();

    for (const nodeId of Array.from(minCutSet)) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      for (const edge of node.edges) {
        if (!minCutSet.has(edge.to) && edge.capacity > 0) {
          cutCapacity += edge.capacity;
        }
      }
    }

    return cutCapacity;
  }

  private calculateMaxInboundCapacity(
    targetNode: Address,
    endorsements: EgoEndorsement[],
    distances: Map<Address, number>
  ): number {
    let maxInbound = 0;
    const targetDist = distances.get(targetNode) ?? Infinity;

    for (const { endorser, endorsee } of endorsements) {
      if (endorsee === targetNode) {
        const endorserDist = distances.get(endorser) ?? Infinity;
        if (endorserDist <= this.config.maxDistance && targetDist <= this.config.maxDistance) {
          const capacity = this.calculateCapacity(targetDist);
          maxInbound += capacity;
        }
      }
    }

    return maxInbound;
  }

  /**
   * Pure Option 2: Compute score based on incoming vouches only (no co-seeds)
   * Sources = everyone who vouched for the owner
   * Target = owner
   * Measures: "How much does the network trust me?"
   * 
   * Scoring Formula:
   * - Flow component (60%): Incoming trust saturation (weighted by voucher strength)
   * - Cut component (40%): Effective redundancy (multi-hop path diversity)
   * 
   * @param voucherScores - Optional map of current LocalHealth scores for weighting vouches
   */
  private computePureOption2Score(
    ownerAddress: Address,
    globalVouches: EgoEndorsement[],
    voucherScores?: Map<string, number>
  ): EgoScoreResult {
    // CRITICAL: Normalize ownerAddress to lowercase for consistent graph construction
    // This prevents case mismatches between FlowGraph sink and edge destinations
    const normalizedOwner = ownerAddress.toLowerCase() as Address;
    
    // Find everyone who vouched for the owner (direct vouchers)
    const directVouchers = globalVouches
      .filter(v => v.endorsee.toLowerCase() === normalizedOwner)
      .map(v => v.endorser.toLowerCase() as Address);

    if (directVouchers.length === 0) {
      return {
        ownerAddress,
        localHealth: 0,
        seedAddresses: [],
        metrics: {
          totalNodes: 0,
          acceptedUsers: 0,
          avgResidualFlow: 0,
          medianMinCut: 0,
          maxPossibleFlow: 0,
        },
        nodeDetails: [],
      };
    }

    // Step 1: Build extended ego subgraph from vouchers using BFS (captures multi-hop connections)
    const egoSubgraph = this.buildEgoSubgraphFromVouchers(
      directVouchers,
      globalVouches,
      this.config.maxDistance
    );
    
    // Remove owner from ego subgraph (owner shouldn't count toward depth/connectivity metrics)
    egoSubgraph.delete(normalizedOwner);

    // Step 2: Compute direct flow (SOURCE → vouchers → owner) for flow component
    const SOURCE = "SOURCE";
    const directGraph = new FlowGraph(SOURCE, normalizedOwner);
    
    // FLASH MOB PROTECTION: Cap total flow from low-quality (score < 30) sources
    // This prevents coordinated mass-vouching attacks where many sockpuppets vouch for one target
    // Only triggers when there are suspiciously many low-quality vouchers (>20)
    // 100 score-0 accounts × 0.08 = 8.0 flow → would give 99 score without this cap
    // With cap of 2.0: max contribution from low-quality = 2.0 → target scores ~50 instead
    // 
    // IMPORTANT: Small legitimate networks (hub-and-spoke with 15 new users) should NOT be penalized
    // The cap only applies when low-quality voucher count exceeds FLASH_MOB_THRESHOLD
    const LOW_QUALITY_THRESHOLD = 30;
    const LOW_QUALITY_FLOW_CAP = 2.0;
    const FLASH_MOB_THRESHOLD = 20; // Only apply cap if >20 low-quality vouchers
    
    // Track low-quality vs high-quality flow contributions separately
    let lowQualityFlowTotal = 0;
    let highQualityFlowTotal = 0;
    const voucherCapacities: Map<string, { capacity: number; isLowQuality: boolean }> = new Map();

    // Connect source to all direct vouchers with unit capacity
    for (const voucher of directVouchers) {
      directGraph.addEdge(SOURCE, voucher, 1.0);
    }

    // Add direct voucher → owner edges weighted by voucher strength
    // If voucherScores provided, weight by voucher's LocalHealth (normalized to 0-1)
    // Otherwise use unit capacity for initial/single-pass calculation
    // 
    // IMPORTANT: Use TIERED sqrt weighting to prevent feedback loop collapse
    // The sqrt damping counteracts the quadratic scaling in the score formula
    // 
    // SYBIL RESISTANCE: Tiered capacity floors punish sockpuppets aggressively
    // - Zero-score vouchers (fresh accounts, sockpuppets): 0.08 capacity floor
    // - Low-score vouchers (1-30): linear interpolation to 0.30
    // - Normal vouchers (30+): sqrt weighting from 0.30 to 1.0
    for (const voucher of directVouchers) {
      let capacity = 1.0;
      let isLowQuality = false;
      if (voucherScores) {
        // Default to 0 for unknown vouchers (Sybil resistance)
        const voucherScore = voucherScores.get(voucher) ?? 0;
        
        // Tiered capacity floors based on voucher quality
        // Designed for continuity: each tier connects smoothly to the next
        if (voucherScore === 0) {
          // Zero-score: sockpuppets/fresh accounts get minimal capacity
          // 10 sockpuppets × 0.08 = 0.8 flow (well below healthy baseline of 4)
          // This gives puppetmaster max ~12 points from flow (0.8/4 × 60)
          capacity = 0.08;
          isLowQuality = true;
        } else if (voucherScore < LOW_QUALITY_THRESHOLD) {
          // Low-score: emerging accounts get reduced capacity
          // Linearly interpolate from 0.08 to 0.30 as score goes from 1 to 30
          // At score 30: capacity = 0.08 + 0.22 * (30/30) = 0.30
          capacity = 0.08 + (0.22 * voucherScore / 30);
          isLowQuality = true;
        } else {
          // Normal vouchers (30+): sqrt weighting from 0.30 to 1.0
          // Use (score-30)/70 so score=31 gives ~0.31 (continuous from 0.30)
          // score=100→1.0, score=70→0.73, score=50→0.54
          capacity = 0.30 + 0.70 * Math.sqrt((voucherScore - 30) / 70);
          isLowQuality = false;
        }
        
        // Track totals for cap calculation
        if (isLowQuality) {
          lowQualityFlowTotal += capacity;
        } else {
          highQualityFlowTotal += capacity;
        }
      }
      voucherCapacities.set(voucher, { capacity, isLowQuality });
      directGraph.addEdge(voucher, normalizedOwner, capacity);
    }

    const directFlowSolver = new DinicMaxFlow(directGraph);
    let directFlow = directFlowSolver.computeMaxFlow();
    
    // FLASH MOB PROTECTION: Apply low-quality flow cap
    // Only applies when there are suspiciously many (>20) low-quality vouchers
    // This preserves legitimate small networks while catching coordinated attacks
    const lowQualityVoucherCount = Array.from(voucherCapacities.values()).filter(v => v.isLowQuality).length;
    if (voucherScores && lowQualityVoucherCount > FLASH_MOB_THRESHOLD && lowQualityFlowTotal > LOW_QUALITY_FLOW_CAP) {
      const excessLowQuality = lowQualityFlowTotal - LOW_QUALITY_FLOW_CAP;
      directFlow = Math.max(0, directFlow - excessLowQuality);
    }

    // Calculate residual flow as AVERAGE VOUCHER STRENGTH
    // Normalize by unweighted maximum (number of vouchers) to capture voucher quality
    // directFlow = sum of voucher strengths (weighted)
    // residualFlow = average voucher strength (directFlow / number of vouchers)
    const residualFlow = directVouchers.length > 0
      ? Math.min(1.0, directFlow / directVouchers.length)
      : 0;

    // Step 3: Compute TRUE MIN-CUT using max-flow algorithm (Sybil-resistant metric)
    // Min-cut measures the minimum number of edges that must be removed to disconnect
    // the voucher sources from the owner - this is the core Sybil resistance metric
    const egoSize = egoSubgraph.size;
    
    // Build multi-hop flow graph for min-cut computation
    // SOURCE → all upstream nodes in ego subgraph → direct vouchers → OWNER
    const MINCUT_SOURCE = "SOURCE_MINCUT";
    const multiHopGraph = new FlowGraph(MINCUT_SOURCE, normalizedOwner);
    
    // Add all nodes in ego subgraph to the flow graph
    for (const nodeAddr of Array.from(egoSubgraph)) {
      multiHopGraph.addNode(nodeAddr);
    }
    multiHopGraph.addNode(normalizedOwner);
    
    // Find root nodes (nodes with no incoming edges within ego subgraph)
    // These are the ultimate sources of trust
    const hasIncomingEdge = new Set<string>();
    for (const { endorser, endorsee } of globalVouches) {
      const endorserLower = endorser.toLowerCase();
      const endorseeLower = endorsee.toLowerCase();
      if (egoSubgraph.has(endorserLower) && egoSubgraph.has(endorseeLower)) {
        hasIncomingEdge.add(endorseeLower);
      }
    }
    
    // Connect SOURCE to root nodes (nodes with no incoming edges in ego subgraph)
    // These represent the ultimate trust sources in the network
    for (const nodeAddr of Array.from(egoSubgraph)) {
      if (!hasIncomingEdge.has(nodeAddr)) {
        multiHopGraph.addEdge(MINCUT_SOURCE, nodeAddr, 1.0);
      }
    }
    
    // Add all edges within ego subgraph with unit capacity
    let egoEdgeCount = 0;
    for (const { endorser, endorsee } of globalVouches) {
      const endorserLower = endorser.toLowerCase();
      const endorseeLower = endorsee.toLowerCase();
      if (egoSubgraph.has(endorserLower) && egoSubgraph.has(endorseeLower)) {
        multiHopGraph.addEdge(endorserLower, endorseeLower, 1.0);
        egoEdgeCount++;
      }
    }
    
    // Add direct voucher → owner edges with QUALITY-GATED capacity (only for flash mob scenarios)
    // FLASH MOB PROTECTION: Low-quality vouchers contribute reduced capacity to min-cut
    // Only applies when there are suspiciously many (>20) low-quality vouchers
    // This prevents 100 sockpuppets from inflating the min-cut/redundancy score
    // while preserving legitimate small networks
    for (const voucher of directVouchers) {
      let mincutCapacity = 1.0;
      if (voucherScores && lowQualityVoucherCount > FLASH_MOB_THRESHOLD) {
        const voucherScore = voucherScores.get(voucher) ?? 0;
        if (voucherScore < LOW_QUALITY_THRESHOLD) {
          // Low-quality vouchers contribute reduced capacity to min-cut
          // Score 0: 0.1 capacity, Score 29: ~0.39 capacity
          mincutCapacity = 0.1 + 0.9 * (voucherScore / LOW_QUALITY_THRESHOLD);
        }
      }
      multiHopGraph.addEdge(voucher, normalizedOwner, mincutCapacity);
    }
    
    // Compute actual min-cut using Dinic's algorithm
    const minCutSolver = new DinicMaxFlow(multiHopGraph);
    const minCutMaxFlow = minCutSolver.computeMaxFlow();
    const minCutSet = minCutSolver.computeMinCut();
    
    // Calculate min-cut capacity (number of edges crossing the cut)
    let actualMinCut = 0;
    for (const nodeId of Array.from(minCutSet)) {
      const node = multiHopGraph.getNode(nodeId);
      if (node) {
        for (const edge of node.edges) {
          if (!minCutSet.has(edge.to) && edge.capacity > 0) {
            actualMinCut += edge.capacity;
          }
        }
      }
    }
    
    // Edge density for secondary metrics
    const potentialEdges = egoSize > 1 ? egoSize * (egoSize - 1) : 1;
    const edgeDensity = egoEdgeCount / potentialEdges;
    
    // Effective redundancy now uses TRUE min-cut as primary metric
    // Min-cut directly measures Sybil resistance (how many fake accounts needed to attack)
    // Add small bonus for ego network depth (secondary metric)
    const depthBonus = Math.max(0, egoSize - directVouchers.length) * 0.1;
    const effectiveRedundancy = actualMinCut + depthBonus;

    // Step 4: Calculate scoring with calibrated healthy baseline
    // CALIBRATION NOTE (Dec 2025): Raised baselines to prevent score saturation
    // A score of 100 should be mathematically rare, requiring exceptional network quality
    // 
    // ENHANCEMENT: Adaptive baselines (if enabled) compute healthy values from network percentiles
    // This allows the algorithm to adapt as the network grows
    const baselines = this.cachedBaselines || { healthyVouchCount: 8.0, healthyRedundancy: 35.0 };
    const HEALTHY_VOUCH_COUNT = baselines.healthyVouchCount;
    const HEALTHY_REDUNDANCY = baselines.healthyRedundancy;
    
    // Flow component: Normalize by healthy vouch baseline (rewards having more vouchers)
    // directFlow = sum of voucher strengths (weighted by voucher LocalHealth)
    // Linear scaling (1.0) provides direct mapping from flow to score
    // With adaptive: baselines adjust to network, maintaining ~25% of users near max
    // WEIGHT: 60% - flow quality is primary signal
    const flowScore = Math.min(1.0, directFlow / HEALTHY_VOUCH_COUNT);
    const flowComponent = 60 * flowScore;

    // Redundancy score: normalized by healthy redundancy baseline
    // Measures network depth (ego size) and connectivity (edge density)
    // With adaptive: HEALTHY_REDUNDANCY scales with network density
    const redundancy = Math.min(1.0, effectiveRedundancy / HEALTHY_REDUNDANCY);

    // Apply dilution penalty for outgoing vouches
    // Uses piecewise curve if enabled for smoother incentives (prevents gaming thresholds)
    const outgoingVouchees = globalVouches
      .filter(v => v.endorser.toLowerCase() === normalizedOwner);
    
    let vouchQualityFactor: number;
    if (this.config.usePiecewiseDilution) {
      // Piecewise dilution curve: smooth non-linear penalty
      // 1-10 vouches: 1.0 (no penalty)
      // 11-15 vouches: 1.0 → 0.85 (gentle decay)
      // 16-25 vouches: 0.85 → 0.55 (steeper decay)
      // 25+ vouches: asymptotic approach to 0.4
      vouchQualityFactor = computePiecewiseDilutionPenalty(outgoingVouchees.length);
    } else {
      // Legacy linear dilution: 10% per excess vouch beyond 10
      vouchQualityFactor = 1.0;
      const DILUTION_THRESHOLD = 10;
      if (outgoingVouchees.length > DILUTION_THRESHOLD) {
        const excess = outgoingVouchees.length - DILUTION_THRESHOLD;
        const dilutionPenalty = 0.1 * excess;
        vouchQualityFactor = Math.max(0.5, 1 - dilutionPenalty);
      }
    }

    // Apply vertex-disjoint path check if enabled (stronger Sybil resistance)
    // This counts truly independent paths where no intermediate nodes are shared
    let vertexDisjointBonus = 0;
    let disjointPathCount = 0;
    if (this.config.useVertexDisjointPaths && directVouchers.length >= 2) {
      disjointPathCount = computeVertexDisjointPaths(
        ownerAddress,
        directVouchers,
        globalVouches,
        this.config.maxDistance
      );
      // Bonus for having multiple independent paths (harder to Sybil attack)
      // Each disjoint path beyond the first adds a redundancy bonus
      // Capped at 10 bonus points (from 6+ disjoint paths)
      // This rewards users with diverse, independent trust sources
      vertexDisjointBonus = Math.min(10, Math.max(0, (disjointPathCount - 1) * 2));
    }

    // Cut component: 40% based on effective redundancy + vertex-disjoint bonus
    // WEIGHT: 40% - redundancy provides secondary Sybil resistance signal
    // Linear scaling (1.0) for direct mapping from redundancy to score
    const adjustedRedundancy = Math.min(1.0, (effectiveRedundancy + vertexDisjointBonus) / HEALTHY_REDUNDANCY);
    const cutComponent = 40 * adjustedRedundancy * vouchQualityFactor;
    
    // LOW-QUALITY VOUCHER CAP: Limit contribution from <50 score vouchers to 35% of flow
    // This prevents Sybil clusters from gaming by adding fake vouches to boost an already-good score
    // 
    // IMPORTANT: Only applies when there's a MIX of high and low quality vouchers
    // Pure hub-spoke patterns (all low-quality) are already penalized by tiered capacity system
    // The cap prevents: "I have 3 good vouches, let me add 50 sockpuppets to boost my score"
    // The cap does NOT apply to: "I'm a new hub with 15 new users vouching for me"
    let lowQualityPenalty = 0;
    const LOW_QUALITY_CONTRIBUTION_CAP = 0.35; // 35% max from low-quality sources
    if (voucherScores && directVouchers.length > 0) {
      let lowQualityContribution = 0;
      let highQualityContribution = 0;
      let highQualityVoucherCount = 0;
      for (const voucher of directVouchers) {
        const score = voucherScores.get(voucher) ?? 0;
        const contribution = voucherCapacities.get(voucher)?.capacity ?? 1.0;
        if (score < 50) {
          lowQualityContribution += contribution;
        } else {
          highQualityContribution += contribution;
          highQualityVoucherCount++;
        }
      }
      const totalContribution = lowQualityContribution + highQualityContribution;
      const lowQualityRatio = totalContribution > 0 ? lowQualityContribution / totalContribution : 0;
      
      // Only apply cap when there ARE high-quality vouchers (mixed network scenario)
      // This prevents gaming by adding low-quality vouches to boost an already-decent score
      // If no high-quality vouchers exist (pure hub-spoke), tiered capacity is sufficient
      const hasSignificantHighQuality = highQualityVoucherCount >= 2 && highQualityContribution >= 0.5;
      
      if (hasSignificantHighQuality && lowQualityRatio > LOW_QUALITY_CONTRIBUTION_CAP) {
        const excessRatio = lowQualityRatio - LOW_QUALITY_CONTRIBUTION_CAP;
        lowQualityPenalty = flowComponent * excessRatio * 0.5; // 50% of excess is penalized
      }
    }
    
    // Calculate raw score before diminishing returns
    const rawScorePreDiminishing = (flowComponent - lowQualityPenalty) + cutComponent;
    
    // DIMINISHING RETURNS: Apply logarithmic compression to make higher scores harder
    // Easy to get some score (0-30), progressively harder to improve
    const diminishedScore = applyDiminishingReturns(rawScorePreDiminishing);
    
    // QUALITY GATES: Check if user has unlocked higher tiers based on voucher quality
    // Genuine high-quality networks can exceed diminishing returns curve
    let finalScore = diminishedScore;
    let maxUnlockedTier = 50;
    let qualityBonus = 0;
    
    if (voucherScores) {
      const qualityGates = computeQualityGates(
        voucherScores,
        directVouchers,
        disjointPathCount
      );
      maxUnlockedTier = qualityGates.maxUnlockedTier;
      qualityBonus = qualityGates.qualityBonus;
      
      // Cap score at unlocked tier (but allow quality bonus to push slightly above)
      if (diminishedScore > maxUnlockedTier) {
        finalScore = maxUnlockedTier;
      }
      
      // Apply quality bonus (can push above diminished score up to tier cap)
      finalScore = Math.min(maxUnlockedTier, finalScore + qualityBonus);
    }
    
    // Apply score ceiling: subtract epsilon so 100 is mathematically rare
    // Only exceptional networks with >8 quality vouchers AND >35 redundancy points approach 99
    const SCORE_CEILING_EPSILON = 1.0;
    const localHealth = Math.min(100 - SCORE_CEILING_EPSILON, Math.max(0, finalScore));

    return {
      ownerAddress,
      localHealth: Math.round(localHealth * 100) / 100,
      seedAddresses: [],
      metrics: {
        totalNodes: egoSize,
        acceptedUsers: directVouchers.length,
        avgResidualFlow: Math.round(residualFlow * 1000) / 1000,
        medianMinCut: Math.round(effectiveRedundancy * 100) / 100,
        maxPossibleFlow: directFlow,
      },
      nodeDetails: directVouchers.map(voucher => ({
        address: voucher,
        distance: 1,
        capacity: 1.0,
        flow: directFlow / Math.max(1, directVouchers.length),
        residualFlow,
        minCut: effectiveRedundancy / Math.max(1, directVouchers.length),
      })),
      components: {
        flowComponent: Math.round(flowComponent * 100) / 100,
        redundancyComponent: Math.round(cutComponent * 100) / 100,
        directFlow: Math.round(directFlow * 1000) / 1000,
        actualMinCut: Math.round(actualMinCut * 100) / 100,
        effectiveRedundancy: Math.round(effectiveRedundancy * 100) / 100,
        dilutionFactor: Math.round(vouchQualityFactor * 1000) / 1000,
        vertexDisjointPaths: disjointPathCount,
        egoNetworkSize: egoSize,
        edgeDensity: Math.round(edgeDensity * 1000) / 1000,
        healthyVouchCount: Math.round(HEALTHY_VOUCH_COUNT * 10) / 10,
        healthyRedundancy: Math.round(HEALTHY_REDUNDANCY * 10) / 10,
        // Diminishing returns tracking
        rawScorePreDiminishing: Math.round(rawScorePreDiminishing * 100) / 100,
        diminishedScore: Math.round(diminishedScore * 100) / 100,
        maxUnlockedTier,
        qualityBonus: Math.round(qualityBonus * 100) / 100,
        lowQualityPenalty: Math.round(lowQualityPenalty * 100) / 100,
      },
    };
  }

  /**
   * Build extended ego subgraph from vouchers using UPSTREAM-ONLY BFS
   * Finds people who vouch for the vouchers (multi-hop supporters)
   * This measures "how many people support my supporters" for redundancy
   */
  private buildEgoSubgraphFromVouchers(
    vouchers: Address[],
    globalVouches: EgoEndorsement[],
    maxDistance: number
  ): Set<string> {
    const subgraph = new Set<string>();
    const queue: { address: Address; distance: number }[] = [];
    const visited = new Set<string>();

    // Initialize BFS from vouchers
    for (const voucher of vouchers) {
      const voucherLower = voucher.toLowerCase();
      subgraph.add(voucherLower);
      visited.add(voucherLower);
      queue.push({ address: voucher, distance: 0 });
    }

    // Build REVERSE adjacency list (endorsee -> endorsers who vouch for them)
    // This lets us traverse backwards to find upstream supporters
    const reverseAdj = new Map<string, Address[]>();
    for (const { endorser, endorsee } of globalVouches) {
      const endorseeLower = endorsee.toLowerCase();
      if (!reverseAdj.has(endorseeLower)) {
        reverseAdj.set(endorseeLower, []);
      }
      reverseAdj.get(endorseeLower)!.push(endorser);
    }

    // BFS UPSTREAM ONLY to capture multi-hop supporters
    let head = 0;
    while (head < queue.length) {
      const { address, distance } = queue[head++];

      if (distance >= maxDistance) continue;

      // Only traverse UPSTREAM (people who vouch for this node)
      // This finds supporters of supporters, which contributes to redundancy
      const upstream = reverseAdj.get(address.toLowerCase()) || [];
      for (const neighbor of upstream) {
        const neighborLower = neighbor.toLowerCase();
        if (!visited.has(neighborLower)) {
          visited.add(neighborLower);
          subgraph.add(neighborLower);
          queue.push({ address: neighbor, distance: distance + 1 });
        }
      }
    }

    return subgraph;
  }
}
