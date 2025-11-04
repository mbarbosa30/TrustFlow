import type { Address } from "viem";
import { FlowGraph } from "./graph";
import { DinicMaxFlow } from "./maxflow";
import type { EgoScoreResult, EgoNodeMetrics } from "./types";

export interface EgoEndorsement {
  endorser: Address;
  endorsee: Address;
}

export interface KudosBoost {
  fromAddress: Address;
  toAddress: Address;
  weight: number; // Exponentially decayed KUDOS weight
}

export interface EgoScoringConfig {
  maxDistance: number;
  minAcceptanceFlow: number;
  minAcceptanceMinCut: number;
  kudosBoostThreshold?: number; // KUDOS needed for 1x boost (default: 500)
  kudosMaxBoost?: number; // Maximum boost multiplier (default: 2x)
}

const DEFAULT_EGO_CONFIG: EgoScoringConfig = {
  maxDistance: 3,
  minAcceptanceFlow: 0.5,
  minAcceptanceMinCut: 2,
  kudosBoostThreshold: 500,
  kudosMaxBoost: 2.0,
};

export class EgoScorer {
  private config: EgoScoringConfig;

  constructor(config: Partial<EgoScoringConfig> = {}) {
    this.config = { ...DEFAULT_EGO_CONFIG, ...config };
  }

  computeLocalHealth(
    ownerAddress: Address,
    seedAddresses: Address[],
    globalVouches: EgoEndorsement[],
    kudosBoosts: KudosBoost[] = []
  ): EgoScoreResult {
    // Pure Option 2: If no co-seeds, use vouchers as sources
    const isPureOption2 = seedAddresses.length === 0;
    
    if (isPureOption2) {
      return this.computePureOption2Score(ownerAddress, globalVouches, kudosBoosts);
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
        distances,
        kudosBoosts
      );

      const maxFlowSolver = new DinicMaxFlow(graph);
      const flow = maxFlowSolver.computeMaxFlow();
      const minCutSet = maxFlowSolver.computeMinCut();
      
      const minCut = this.calculateMinCutCapacity(graph, minCutSet);

      const maxPossibleNodeFlow = this.calculateMaxInboundCapacity(
        node,
        globalVouches,
        distances,
        kudosBoosts
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
    distances: Map<Address, number>,
    kudosBoosts: KudosBoost[] = []
  ): FlowGraph {
    const SOURCE = "SOURCE";
    const SINK = targetNode;
    const graph = new FlowGraph(SOURCE, SINK);

    for (const seed of seeds) {
      graph.addEdge(SOURCE, seed, Infinity);
    }

    // Build KUDOS boost map for quick lookup
    const boostMap = new Map<string, number>();
    for (const boost of kudosBoosts) {
      const key = `${boost.fromAddress.toLowerCase()}->${boost.toAddress.toLowerCase()}`;
      boostMap.set(key, boost.weight);
    }

    for (const { endorser, endorsee } of endorsements) {
      const endorserDist = distances.get(endorser) ?? Infinity;
      const endorseeDist = distances.get(endorsee) ?? Infinity;

      if (
        endorserDist <= this.config.maxDistance &&
        endorseeDist <= this.config.maxDistance
      ) {
        let capacity = this.calculateCapacity(endorseeDist);
        
        // Apply KUDOS boost if exists
        const boostKey = `${endorser.toLowerCase()}->${endorsee.toLowerCase()}`;
        const kudosWeight = boostMap.get(boostKey) || 0;
        
        if (kudosWeight > 0) {
          const threshold = this.config.kudosBoostThreshold || 100;
          const maxBoost = this.config.kudosMaxBoost || 2.0;
          
          // Boost multiplier: 1 + min(maxBoost - 1, kudosWeight / threshold)
          const boostMultiplier = 1 + Math.min(maxBoost - 1, kudosWeight / threshold);
          capacity *= boostMultiplier;
        }
        
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
    distances: Map<Address, number>,
    kudosBoosts: KudosBoost[] = []
  ): number {
    let maxInbound = 0;
    const targetDist = distances.get(targetNode) ?? Infinity;

    // Build KUDOS boost map
    const boostMap = new Map<string, number>();
    for (const boost of kudosBoosts) {
      const key = `${boost.fromAddress.toLowerCase()}->${boost.toAddress.toLowerCase()}`;
      boostMap.set(key, boost.weight);
    }

    for (const { endorser, endorsee } of endorsements) {
      if (endorsee === targetNode) {
        const endorserDist = distances.get(endorser) ?? Infinity;
        if (endorserDist <= this.config.maxDistance && targetDist <= this.config.maxDistance) {
          let capacity = this.calculateCapacity(targetDist);
          
          // Apply KUDOS boost if exists (matching buildNodeGraph logic)
          const boostKey = `${endorser.toLowerCase()}->${endorsee.toLowerCase()}`;
          const kudosWeight = boostMap.get(boostKey) || 0;
          
          if (kudosWeight > 0) {
            const threshold = this.config.kudosBoostThreshold || 100;
            const maxBoost = this.config.kudosMaxBoost || 2.0;
            const boostMultiplier = 1 + Math.min(maxBoost - 1, kudosWeight / threshold);
            capacity *= boostMultiplier;
          }
          
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
   * - Flow component (60%): Incoming trust saturation
   * - Cut component (40%): Effective redundancy (multi-hop path diversity)
   */
  private computePureOption2Score(
    ownerAddress: Address,
    globalVouches: EgoEndorsement[],
    kudosBoosts: KudosBoost[] = []
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

    // Build KUDOS boost map for edge capacity boosting
    const boostMap = new Map<string, number>();
    for (const boost of kudosBoosts) {
      const key = `${boost.fromAddress.toLowerCase()}->${boost.toAddress.toLowerCase()}`;
      boostMap.set(key, boost.weight);
    }

    // Step 2: Compute direct flow (SOURCE → vouchers → owner) for flow component
    const SOURCE = "SOURCE";
    const directGraph = new FlowGraph(SOURCE, ownerAddress);

    // Connect source to all direct vouchers with unit capacity
    for (const voucher of directVouchers) {
      directGraph.addEdge(SOURCE, voucher, 1.0);
    }

    // Add direct voucher → owner edges with KUDOS boosts
    let maxInboundCapacity = 0;
    for (const voucher of directVouchers) {
      let capacity = 1.0;
      
      // Apply KUDOS boost if exists
      const boostKey = `${voucher.toLowerCase()}->${ownerAddress.toLowerCase()}`;
      const kudosWeight = boostMap.get(boostKey) || 0;
      
      if (kudosWeight > 0) {
        const threshold = this.config.kudosBoostThreshold || 100;
        const maxBoost = this.config.kudosMaxBoost || 2.0;
        const boostMultiplier = 1 + Math.min(maxBoost - 1, kudosWeight / threshold);
        capacity *= boostMultiplier;
      }
      
      directGraph.addEdge(voucher, ownerAddress, capacity);
      maxInboundCapacity += capacity;
    }

    const directFlowSolver = new DinicMaxFlow(directGraph);
    const directFlow = directFlowSolver.computeMaxFlow();

    // Calculate residual flow (saturation of incoming capacity)
    const residualFlow = maxInboundCapacity > 0 
      ? Math.min(1.0, directFlow / maxInboundCapacity)
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

    // Step 4: Calculate scoring with fixed healthy baseline
    // Fixed baseline: ~5 vouches with rich depth/connectivity = "healthy" network
    const HEALTHY_VOUCH_COUNT = 5.0;
    // Calibrated for dense networks: accounts for random endorsements creating rich connectivity
    const HEALTHY_REDUNDANCY = 20.0; // Baseline for healthy network in dense graph
    
    // Flow component: Normalize by healthy vouch baseline (rewards having more vouchers)
    // directFlow equals number of vouchers in simple case
    // Exponential scaling (1.2) spreads scores more naturally
    // 1 vouch → (1/5)^1.2 = 0.157 = 9.4 pts, 3 vouches → 0.525 = 31.5 pts, 5+ vouches → 1.0 = 60 pts
    const flowScore = Math.min(1.0, directFlow / HEALTHY_VOUCH_COUNT);
    const flowComponent = 60 * Math.pow(flowScore, 1.2);

    // Redundancy score: normalized by healthy redundancy baseline
    // Measures network depth (ego size) and connectivity (edge density)
    // 1 vouch, no depth → ~1 redundancy / 10 = 10% = 4 pts
    // 3 vouches, some depth → ~5 redundancy / 10 = 50% = 20 pts
    // 5+ vouches, good depth → ~10 redundancy / 10 = 100% = 40 pts
    const redundancy = Math.min(1.0, effectiveRedundancy / HEALTHY_REDUNDANCY);

    // Apply dilution penalty for outgoing vouches
    const outgoingVouchees = globalVouches
      .filter(v => v.endorser.toLowerCase() === ownerAddress.toLowerCase());
    
    let vouchQualityFactor = 1.0;
    const DILUTION_THRESHOLD = 10;
    if (outgoingVouchees.length > DILUTION_THRESHOLD) {
      const excess = outgoingVouchees.length - DILUTION_THRESHOLD;
      const dilutionPenalty = 0.1 * excess; // 10% per excess vouch
      vouchQualityFactor = Math.max(0.5, 1 - dilutionPenalty); // Cap at 50% reduction
    }

    // Cut component: 40% based on effective redundancy
    // Exponential scaling (1.2) spreads scores more naturally
    const cutComponent = 40 * Math.pow(redundancy, 1.2) * vouchQualityFactor;
    
    const localHealth = Math.min(100, Math.max(0, flowComponent + cutComponent));

    return {
      ownerAddress,
      localHealth: Math.round(localHealth * 100) / 100,
      seedAddresses: [],
      metrics: {
        totalNodes: egoSize,
        acceptedUsers: directVouchers.length,
        avgResidualFlow: Math.round(residualFlow * 1000) / 1000,
        medianMinCut: Math.round(effectiveRedundancy * 100) / 100,
        maxPossibleFlow: maxInboundCapacity,
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
