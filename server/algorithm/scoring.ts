import type { Address } from "viem";
import { FlowGraph } from "./graph";
import { DinicMaxFlow } from "./maxflow";
import type { TrustScoreComponents, UserScore, EpochComputationResult } from "./types";

export interface Endorsement {
  endorser: Address;
  endorsee: Address;
  epoch: number;
}

export interface ScoringConfig {
  flowWeight: number;
  cutWeight: number;
  stabilityWeight: number;
  depthWeight: number;
  maxDepth: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  flowWeight: 0.55,
  cutWeight: 0.25,
  stabilityWeight: 0.10,
  depthWeight: 0.10,
  maxDepth: 6,
};

export class TrustScorer {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute trust scores for all users in the network
   */
  computeScores(
    endorsements: Endorsement[],
    seeds: Address[],
    epoch: number
  ): EpochComputationResult {
    // Edge case: no seeds configured
    if (seeds.length === 0) {
      return {
        epoch,
        scores: new Map(),
        networkMetrics: {
          totalAccepted: 0,
          avgFlow: 0,
          avgMinCut: 0,
          p95Flow: 0,
        },
      };
    }

    const allUsers = this.extractAllUsers(endorsements, seeds);
    const userScores = new Map<Address, UserScore>();
    const flowValues: number[] = [];
    const minCutValues: number[] = [];

    // First pass: collect flow and min-cut values for ACCEPTED users only (flow ≥ 1)
    for (const user of Array.from(allUsers)) {
      const graph = this.buildUserGraph(user, endorsements, seeds);
      const maxFlow = new DinicMaxFlow(graph);
      
      const flow = maxFlow.computeMaxFlow();
      const minCutSet = maxFlow.computeMinCut();
      const minCut = this.calculateMinCutSize(minCutSet, graph);

      // Only include accepted users in percentile calculations
      if (flow >= 1) {
        flowValues.push(flow);
        minCutValues.push(minCut);
      }
    }

    // Historical baseline anchors (for cross-epoch stability)
    const historicalFlowP95 = 10; // F̃₉₅ - adjust based on historical data
    const historicalMinCutP95 = 3; // C̃₉₅ - adjust based on historical data
    
    const p95Flow = Math.max(
      this.calculatePercentile(flowValues, 0.95),
      historicalFlowP95
    );
    const p95MinCut = Math.max(
      this.calculatePercentile(minCutValues, 0.95),
      historicalMinCutP95
    );
    
    const avgFlow = flowValues.length > 0 
      ? flowValues.reduce((a, b) => a + b, 0) / flowValues.length 
      : 0;
    let totalAccepted = 0;
    let totalMinCut = 0;

    // Second pass: compute normalized scores
    for (const user of Array.from(allUsers)) {
      const graph = this.buildUserGraph(user, endorsements, seeds);
      const maxFlow = new DinicMaxFlow(graph);
      
      const flow = maxFlow.computeMaxFlow();
      const minCutSet = maxFlow.computeMinCut();
      const minCut = this.calculateMinCutSize(minCutSet, graph);
      const depth = this.calculateDepth(user, endorsements, seeds);
      const stability = this.calculateStability(user, endorsements, seeds);

      const components: TrustScoreComponents = {
        flow,
        minCut,
        stability,
        depth,
      };

      const normalizedComponents = this.normalizeComponents(
        components,
        p95Flow,
        p95MinCut
      );

      const sts = this.calculateSTS(normalizedComponents);
      const tier = this.assignTier(sts, minCut, stability);

      if (flow >= 1) {
        totalAccepted++;
        totalMinCut += minCut;
      }

      userScores.set(user, {
        address: user,
        sts,
        components,
        tier,
        percentile: 0, // Will calculate after all scores are computed
      });
    }

    this.assignPercentiles(userScores);

    return {
      epoch,
      scores: userScores,
      networkMetrics: {
        totalAccepted,
        avgFlow,
        avgMinCut: totalAccepted > 0 ? totalMinCut / totalAccepted : 0,
        p95Flow,
      },
    };
  }

  /**
   * Build graph for a specific user (user-centric flow network)
   */
  private buildUserGraph(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): FlowGraph {
    const SOURCE = "SOURCE";
    const SINK = "SINK";
    const graph = new FlowGraph(SOURCE, SINK);

    const allUsers = this.extractAllUsers(endorsements, seeds);
    const depths = this.computeDepths(endorsements, seeds);

    for (const u of Array.from(allUsers)) {
      const uMinus = `${u}-`;
      const uPlus = `${u}+`;
      graph.addNode(uMinus);
      graph.addNode(uPlus);

      // Advogato-style node capacity based on distance from seeds
      const depth = depths.get(u) ?? this.config.maxDepth;
      let capacity: number;
      if (depth === 0) {
        capacity = 800; // Seeds
      } else if (depth === 1) {
        capacity = 200; // 1 hop
      } else if (depth === 2) {
        capacity = 50; // 2 hops
      } else {
        capacity = 20; // 3+ hops
      }
      
      graph.addEdge(uMinus, uPlus, capacity);
    }

    for (const seed of seeds) {
      graph.addEdge(SOURCE, `${seed}-`, Infinity);
    }

    for (const endorsement of endorsements) {
      const { endorser, endorsee } = endorsement;
      graph.addEdge(`${endorser}+`, `${endorsee}-`, 1.0);
    }

    // Add sink connection with capacity 1 for acceptance threshold
    graph.addEdge(`${user}-`, SINK, 1);

    return graph;
  }

  /**
   * Calculate min-cut size from the reachable set
   */
  private calculateMinCutSize(reachableSet: Set<string>, graph: FlowGraph): number {
    let cutSize = 0;
    const nodes = graph.getNodes();

    for (const nodeId of Array.from(reachableSet)) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      for (const edge of node.edges) {
        if (!reachableSet.has(edge.to)) {
          if (edge.capacity === Infinity) {
            continue;
          }
          if (edge.flow > 0) {
            cutSize++;
          }
        }
      }
    }

    return Math.max(1, Math.floor(cutSize / 2));
  }

  /**
   * Calculate depth (distance from seeds) using BFS
   */
  private calculateDepth(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): number {
    const depths = this.computeDepths(endorsements, seeds);
    return depths.get(user) ?? this.config.maxDepth;
  }

  /**
   * Compute depths for all users using BFS from seeds
   */
  private computeDepths(
    endorsements: Endorsement[],
    seeds: Address[]
  ): Map<Address, number> {
    const depths = new Map<Address, number>();
    const adjacency = new Map<Address, Address[]>();

    for (const { endorser, endorsee } of endorsements) {
      if (!adjacency.has(endorser)) {
        adjacency.set(endorser, []);
      }
      adjacency.get(endorser)!.push(endorsee);
    }

    const queue: Array<{ user: Address; depth: number }> = [];
    
    for (const seed of seeds) {
      depths.set(seed, 0);
      queue.push({ user: seed, depth: 0 });
    }

    let head = 0;
    while (head < queue.length) {
      const { user, depth } = queue[head++];
      const neighbors = adjacency.get(user) || [];

      for (const neighbor of neighbors) {
        if (!depths.has(neighbor)) {
          depths.set(neighbor, depth + 1);
          queue.push({ user: neighbor, depth: depth + 1 });
        }
      }
    }

    return depths;
  }

  /**
   * Calculate stability (resistance to edge removal)
   * Per spec: S_i = 1 - min(1, Δ_i) where Δ_i is worst relative drop
   */
  private calculateStability(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): number {
    const graph = this.buildUserGraph(user, endorsements, seeds);
    const maxFlow = new DinicMaxFlow(graph);
    const baseFlow = maxFlow.computeMaxFlow();

    if (baseFlow < 1) return 0;

    const incomingEndorsements = endorsements.filter(e => e.endorsee === user);
    
    if (incomingEndorsements.length === 0) return 1; // Perfectly stable if no edges

    let worstDrop = 0; // Δ_i - worst relative drop

    for (const endorsement of incomingEndorsements) {
      const filteredEndorsements = endorsements.filter(
        e => !(e.endorser === endorsement.endorser && e.endorsee === endorsement.endorsee)
      );
      
      const testGraph = this.buildUserGraph(user, filteredEndorsements, seeds);
      const testMaxFlow = new DinicMaxFlow(testGraph);
      const flowWithout = testMaxFlow.computeMaxFlow();
      
      // Calculate relative drop from removing this edge
      const relativeDrop = (baseFlow - flowWithout) / baseFlow;
      worstDrop = Math.max(worstDrop, relativeDrop);
    }

    // S_i = 1 - min(1, Δ_i)
    const stability = 1 - Math.min(1, worstDrop);

    return stability;
  }

  /**
   * Normalize score components to 0-1 range per spec
   * F_i = min(1, log(1+f_i) / log(1+F_95))
   * C_i = min(1, c_i / max(3, C_95))
   * D_i = e^(-λd_i) where λ ≈ 0.35
   * S_i = stability (already in [0,1])
   */
  private normalizeComponents(
    components: TrustScoreComponents,
    p95Flow: number,
    p95MinCut: number
  ): TrustScoreComponents {
    const lambda = 0.35; // Depth decay parameter
    
    // Logarithmic flow normalization
    const flowAnchor = Math.max(1, p95Flow);
    const normalizedFlow = Math.min(
      1,
      Math.log(1 + components.flow) / Math.log(1 + flowAnchor)
    );

    // Min-cut normalization with floor of 3
    const cutAnchor = Math.max(3, p95MinCut);
    const normalizedMinCut = Math.min(1, components.minCut / cutAnchor);

    // Exponential depth decay
    const normalizedDepth = Math.exp(-lambda * components.depth);

    // Stability is already normalized
    const normalizedStability = Math.min(1, components.stability);

    return {
      flow: normalizedFlow,
      minCut: normalizedMinCut,
      stability: normalizedStability,
      depth: normalizedDepth,
    };
  }

  /**
   * Calculate final STS score from normalized components
   */
  private calculateSTS(normalized: TrustScoreComponents): number {
    const { flowWeight, cutWeight, stabilityWeight, depthWeight } = this.config;

    const sts =
      100 *
      (flowWeight * normalized.flow +
        cutWeight * normalized.minCut +
        stabilityWeight * normalized.stability +
        depthWeight * normalized.depth);

    return Math.round(sts * 100) / 100;
  }

  /**
   * Assign tier based on STS, min-cut, and stability
   * Per spec: Apprentice ≥40, Journeyer ≥60 + cut≥2, Master ≥80 + cut≥3 + stability≥0.8
   */
  private assignTier(
    sts: number,
    minCut: number,
    stability: number
  ): "Apprentice" | "Journeyer" | "Master" | null {
    if (sts < 40 || minCut < 1) return null;
    if (sts >= 80 && minCut >= 3 && stability >= 0.8) return "Master";
    if (sts >= 60 && minCut >= 2) return "Journeyer";
    return "Apprentice";
  }

  /**
   * Calculate percentile rankings for all scores
   */
  private assignPercentiles(scores: Map<Address, UserScore>): void {
    // Edge case: no scores to rank
    if (scores.size === 0) return;

    const sortedScores = Array.from(scores.values())
      .map(s => s.sts)
      .sort((a, b) => a - b);

    for (const [address, userScore] of Array.from(scores.entries())) {
      const rank = sortedScores.findIndex(s => s >= userScore.sts);
      const percentile = sortedScores.length > 0 
        ? ((rank + 1) / sortedScores.length) * 100 
        : 0;
      userScore.percentile = Math.round(percentile * 100) / 100;
    }
  }

  /**
   * Extract all unique users from endorsements and seeds
   */
  private extractAllUsers(endorsements: Endorsement[], seeds: Address[]): Set<Address> {
    const users = new Set<Address>(seeds);

    for (const { endorser, endorsee } of endorsements) {
      users.add(endorser);
      users.add(endorsee);
    }

    return users;
  }

  /**
   * Calculate percentile value from array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    
    return sorted[Math.max(0, index)];
  }
}
