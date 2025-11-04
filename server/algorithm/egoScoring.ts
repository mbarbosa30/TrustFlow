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
  kudosBoostThreshold?: number; // KUDOS needed for 1x boost (default: 100)
  kudosMaxBoost?: number; // Maximum boost multiplier (default: 2x)
}

const DEFAULT_EGO_CONFIG: EgoScoringConfig = {
  maxDistance: 3,
  minAcceptanceFlow: 0.5,
  minAcceptanceMinCut: 2,
  kudosBoostThreshold: 100,
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
    const cutComponent = seedCount > 0 
      ? 40 * Math.min(1.0, medianMinCut / seedCount)
      : 0;
    
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

    // Build flow graph: SOURCE → [vouchers] → owner
    const SOURCE = "SOURCE";
    const SINK = ownerAddress;
    const graph = new FlowGraph(SOURCE, SINK);

    // Connect source to all vouchers with unit capacity
    for (const voucher of directVouchers) {
      graph.addEdge(SOURCE, voucher, 1.0);
    }

    // Build KUDOS boost map
    const boostMap = new Map<string, number>();
    for (const boost of kudosBoosts) {
      const key = `${boost.fromAddress.toLowerCase()}->${boost.toAddress.toLowerCase()}`;
      boostMap.set(key, boost.weight);
    }

    // Add voucher → owner edges with KUDOS boosts
    let maxInboundCapacity = 0;
    for (const voucher of directVouchers) {
      // Base capacity = 1.0 (no distance decay in pure Option 2)
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
      
      graph.addEdge(voucher, ownerAddress, capacity);
      maxInboundCapacity += capacity;
    }

    // Compute max flow and min cut
    const maxFlowSolver = new DinicMaxFlow(graph);
    const flow = maxFlowSolver.computeMaxFlow();
    const minCutSet = maxFlowSolver.computeMinCut();
    const minCut = this.calculateMinCutCapacity(graph, minCutSet);

    // Calculate residual flow (saturation of incoming capacity)
    const residualFlow = maxInboundCapacity > 0 
      ? Math.min(1.0, flow / maxInboundCapacity)
      : 0;

    // Pure Option 2 scoring: 60% flow saturation + 40% redundancy per voucher
    const flowComponent = 60 * residualFlow;
    const cutComponent = directVouchers.length > 0
      ? 40 * Math.min(1.0, minCut / directVouchers.length)
      : 0;
    
    const localHealth = Math.min(100, Math.max(0, flowComponent + cutComponent));

    return {
      ownerAddress,
      localHealth: Math.round(localHealth * 100) / 100,
      seedAddresses: [],
      metrics: {
        totalNodes: directVouchers.length,
        acceptedUsers: directVouchers.length, // All vouchers are "accepted"
        avgResidualFlow: Math.round(residualFlow * 1000) / 1000,
        medianMinCut: Math.round(minCut * 100) / 100,
        maxPossibleFlow: maxInboundCapacity,
      },
      nodeDetails: directVouchers.map(voucher => ({
        address: voucher,
        distance: 1, // Direct vouchers are distance 1
        capacity: 1.0,
        flow: flow / directVouchers.length, // Approximate per-voucher flow
        residualFlow,
        minCut: minCut / directVouchers.length,
      })),
    };
  }
}
