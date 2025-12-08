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

const DEFAULT_EGO_CONFIG: EgoScoringConfig = {
  maxDistance: 3,
  minAcceptanceFlow: 0.5,
  minAcceptanceMinCut: 2,
  useAdaptiveBaselines: true,
  usePiecewiseDilution: true,
  useVertexDisjointPaths: true,
};

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
function computeVertexDisjointPaths(
  vouchers: Address[],
  target: Address,
  globalVouches: EgoEndorsement[],
  maxDistance: number
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
function computeAdaptiveBaselines(
  addresses: Address[],
  globalVouches: EgoEndorsement[]
): { healthyVouchCount: number; healthyRedundancy: number } {
  // Default fallbacks if network is too small
  const DEFAULT_HEALTHY_VOUCH_COUNT = 8.0;
  const DEFAULT_HEALTHY_REDUNDANCY = 35.0;
  const MIN_NETWORK_SIZE = 10;
  
  if (addresses.length < MIN_NETWORK_SIZE) {
    return {
      healthyVouchCount: DEFAULT_HEALTHY_VOUCH_COUNT,
      healthyRedundancy: DEFAULT_HEALTHY_REDUNDANCY,
    };
  }
  
  // Compute vouch counts for all addresses
  const vouchCounts: number[] = [];
  for (const addr of addresses) {
    const addrLower = addr.toLowerCase();
    const count = globalVouches.filter(
      v => v.endorsee.toLowerCase() === addrLower
    ).length;
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
    this.config = { ...DEFAULT_EGO_CONFIG, ...config };
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
      this.cachedBaselines = computeAdaptiveBaselines(addresses, globalVouches);
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
      this.cachedBaselines = computeAdaptiveBaselines(addresses, globalVouches);
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
    // Find everyone who vouched for the owner (direct vouchers)
    const directVouchers = globalVouches
      .filter(v => v.endorsee.toLowerCase() === ownerAddress.toLowerCase())
      .map(v => v.endorser);

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
    egoSubgraph.delete(ownerAddress.toLowerCase());

    // Step 2: Compute direct flow (SOURCE → vouchers → owner) for flow component
    const SOURCE = "SOURCE";
    const directGraph = new FlowGraph(SOURCE, ownerAddress);

    // Connect source to all direct vouchers with unit capacity
    for (const voucher of directVouchers) {
      directGraph.addEdge(SOURCE, voucher, 1.0);
    }

    // Add direct voucher → owner edges weighted by voucher strength
    // If voucherScores provided, weight by voucher's LocalHealth (normalized to 0-1)
    // Otherwise use unit capacity for initial/single-pass calculation
    for (const voucher of directVouchers) {
      let capacity = 1.0;
      if (voucherScores) {
        const voucherScore = voucherScores.get(voucher.toLowerCase()) ?? 50; // Default to mid-range
        capacity = voucherScore / 100; // Normalize 0-100 score to 0-1 capacity
      }
      directGraph.addEdge(voucher, ownerAddress, capacity);
    }

    const directFlowSolver = new DinicMaxFlow(directGraph);
    const directFlow = directFlowSolver.computeMaxFlow();

    // Calculate residual flow as AVERAGE VOUCHER STRENGTH
    // Normalize by unweighted maximum (number of vouchers) to capture voucher quality
    // directFlow = sum of voucher strengths (weighted)
    // residualFlow = average voucher strength (directFlow / number of vouchers)
    const residualFlow = directVouchers.length > 0
      ? Math.min(1.0, directFlow / directVouchers.length)
      : 0;

    // Step 3: Compute effective redundancy using network metrics (simpler & more accurate)
    // Redundancy = combination of vouch count + network depth + connectivity
    const egoSize = egoSubgraph.size;
    
    // Count edges in ego subgraph (measures connectivity/redundancy)
    let egoEdgeCount = 0;
    for (const { endorser, endorsee } of globalVouches) {
      const endorserLower = endorser.toLowerCase();
      const endorseeLower = endorsee.toLowerCase();
      if (egoSubgraph.has(endorserLower) && egoSubgraph.has(endorseeLower)) {
        egoEdgeCount++;
      }
    }
    
    // Effective redundancy metric:
    // - Base: number of direct vouchers (each vouch = 1 redundancy point)
    // - Depth bonus: ego size beyond vouchers (each extra node = 0.2 points)
    // - Connectivity bonus: edge density (edges / potential_edges) * ego_size
    const baseRedundancy = directVouchers.length;
    const depthBonus = Math.max(0, egoSize - directVouchers.length) * 0.2;
    
    // Edge density: actual edges / potential edges in ego subgraph
    const potentialEdges = egoSize > 1 ? egoSize * (egoSize - 1) : 1;
    const edgeDensity = egoEdgeCount / potentialEdges;
    const connectivityBonus = edgeDensity * egoSize;
    
    const effectiveRedundancy = baseRedundancy + depthBonus + connectivityBonus;

    // Step 4: Calculate scoring with calibrated healthy baseline
    // CALIBRATION NOTE (Dec 2025): Raised baselines to prevent score saturation
    // A score of 100 should be mathematically rare, requiring exceptional network quality
    // 
    // ENHANCEMENT: Adaptive baselines (if enabled) compute healthy values from network percentiles
    // This allows the algorithm to adapt as the network grows
    const baselines = this.cachedBaselines || { healthyVouchCount: 8.0, healthyRedundancy: 35.0 };
    const HEALTHY_VOUCH_COUNT = baselines.healthyVouchCount;
    const HEALTHY_REDUNDANCY = baselines.healthyRedundancy;
    // Score ceiling: subtract epsilon so 100 is mathematically rare
    const SCORE_CEILING_EPSILON = 1.0;
    
    // Flow component: Normalize by healthy vouch baseline (rewards having more vouchers)
    // directFlow = sum of voucher strengths (weighted by voucher LocalHealth)
    // Exponential scaling (2.0) spreads scores more naturally with quadratic scaling
    // With adaptive: baselines adjust to network, maintaining ~25% of users near max
    const flowScore = Math.min(1.0, directFlow / HEALTHY_VOUCH_COUNT);
    const flowComponent = 60 * Math.pow(flowScore, 2.0);

    // Redundancy score: normalized by healthy redundancy baseline
    // Measures network depth (ego size) and connectivity (edge density)
    // With adaptive: HEALTHY_REDUNDANCY scales with network density
    const redundancy = Math.min(1.0, effectiveRedundancy / HEALTHY_REDUNDANCY);

    // Apply dilution penalty for outgoing vouches
    // Uses piecewise curve if enabled for smoother incentives (prevents gaming thresholds)
    const outgoingVouchees = globalVouches
      .filter(v => v.endorser.toLowerCase() === ownerAddress.toLowerCase());
    
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
    if (this.config.useVertexDisjointPaths && directVouchers.length >= 2) {
      const disjointPaths = computeVertexDisjointPaths(
        directVouchers,
        ownerAddress,
        globalVouches,
        this.config.maxDistance
      );
      // Bonus for having multiple independent paths (harder to Sybil attack)
      // Each disjoint path beyond the first adds a small redundancy bonus
      // Capped at 5 bonus points (from 5+ disjoint paths)
      vertexDisjointBonus = Math.min(5, Math.max(0, disjointPaths - 1));
    }

    // Cut component: 40% based on effective redundancy + vertex-disjoint bonus
    // Exponential scaling (2.0) spreads scores more naturally with quadratic scaling
    const adjustedRedundancy = Math.min(1.0, (effectiveRedundancy + vertexDisjointBonus) / HEALTHY_REDUNDANCY);
    const cutComponent = 40 * Math.pow(adjustedRedundancy, 2.0) * vouchQualityFactor;
    
    // Apply score ceiling: subtract epsilon so 100 is mathematically rare
    // Only exceptional networks with >8 quality vouchers AND >35 redundancy points approach 99
    const rawScore = flowComponent + cutComponent;
    const localHealth = Math.min(100 - SCORE_CEILING_EPSILON, Math.max(0, rawScore));

    return {
      ownerAddress,
      localHealth: Math.round(localHealth * 100) / 100,
      seedAddresses: [],
      metrics: {
        totalNodes: egoSize,
        acceptedUsers: directVouchers.length,
        avgResidualFlow: Math.round(residualFlow * 1000) / 1000,
        medianMinCut: Math.round(effectiveRedundancy * 100) / 100,
        maxPossibleFlow: directFlow, // Weighted max flow (sum of voucher strengths)
      },
      nodeDetails: directVouchers.map(voucher => ({
        address: voucher,
        distance: 1,
        capacity: 1.0,
        flow: directFlow / Math.max(1, directVouchers.length),
        residualFlow,
        minCut: effectiveRedundancy / Math.max(1, directVouchers.length),
      })),
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
