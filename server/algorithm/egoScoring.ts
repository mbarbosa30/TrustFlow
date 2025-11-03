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
}

const DEFAULT_EGO_CONFIG: EgoScoringConfig = {
  maxDistance: 3,
  minAcceptanceFlow: 0.5,
  minAcceptanceMinCut: 2,
};

export class EgoScorer {
  private config: EgoScoringConfig;

  constructor(config: Partial<EgoScoringConfig> = {}) {
    this.config = { ...DEFAULT_EGO_CONFIG, ...config };
  }

  computeLocalHealth(
    ownerAddress: Address,
    seedAddresses: Address[],
    globalVouches: EgoEndorsement[]
  ): EgoScoreResult {
    if (seedAddresses.length === 0) {
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

      nodeMetrics.push({
        address: node,
        distance,
        capacity,
        flow,
        residualFlow,
        minCut,
      });
    }

    const maxPossibleFlow = 1.0;
    const avgResidualFlow =
      residualFlows.length > 0
        ? residualFlows.reduce((a, b) => a + b, 0) / residualFlows.length
        : 0;

    const medianMinCut = this.calculateMedian(minCuts);

    const flowComponent = 50 * (avgResidualFlow / maxPossibleFlow);
    const cutComponent = 50 * (medianMinCut / seedAddresses.length);
    
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
        maxPossibleFlow,
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
}
