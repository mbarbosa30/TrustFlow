import type { Address } from "viem";
import { FlowGraph } from "./graph";
import { DinicMaxFlow } from "./maxflow";
import type { TrustScoreComponents, UserScore, EpochComputationResult, SeedQualityMetrics, PageRankMetrics } from "./types";
import { SeedScorer } from "./seedScoring";
import { PageRankScorer } from "./pagerank";

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
  pageRankWeight: number; // 0-5%, default 0%
  maxDepth: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  flowWeight: 0.55,
  cutWeight: 0.25,
  stabilityWeight: 0.05,
  depthWeight: 0.10,
  pageRankWeight: 0.05, // 5% weight for PageRank
  maxDepth: 6,
};

export class TrustScorer {
  private config: ScoringConfig;
  private laggedDepths: Map<Address, number> | null = null;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set lagged depths from previous epoch's accepted subgraph
   * SECURITY: Prevents distance-inflation attacks per Levien spec
   */
  setLaggedDepths(depths: Map<Address, number> | null) {
    this.laggedDepths = depths;
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

    // First pass: collect flow and min-cut values for ACCEPTED users only
    // Adaptive acceptance criteria: lenient for small networks, strict Levien spec for larger
    const networkSize = allUsers.size;
    const acceptancePolicy = this.getAcceptancePolicy(networkSize);
    
    console.log(`Network size: ${networkSize} users, using ${acceptancePolicy.name} acceptance policy`);

    for (const user of Array.from(allUsers)) {
      const graph = this.buildUserGraph(user, endorsements, seeds);
      const maxFlow = new DinicMaxFlow(graph);
      
      const flow = maxFlow.computeMaxFlow();
      const minCutSet = maxFlow.computeMinCut();
      const minCut = this.calculateMinCutSize(minCutSet, graph);
      const seedCoverage = this.calculateSeedCoverage(user, endorsements, seeds);
      const hasDisjointPaths = this.hasEdgeDisjointPaths(user, endorsements, seeds, 2);

      // Apply adaptive acceptance policy
      const isAccepted = this.checkAcceptance(
        flow, 
        minCut, 
        seedCoverage, 
        hasDisjointPaths, 
        acceptancePolicy
      );
      
      if (isAccepted) {
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
      const seedCoverage = this.calculateSeedCoverage(user, endorsements, seeds);
      const hasDisjointPaths = this.hasEdgeDisjointPaths(user, endorsements, seeds, 2);

      const components: TrustScoreComponents = {
        flow,
        minCut,
        stability,
        depth,
        pageRank: 0, // Will be computed after identifying accepted users
      };

      const normalizedComponents = this.normalizeComponents(
        components,
        p95Flow,
        p95MinCut
      );

      const sts = this.calculateSTS(normalizedComponents);
      const tier = this.assignTier(sts, minCut, stability);

      // Apply adaptive acceptance policy
      const isAccepted = this.checkAcceptance(
        flow, 
        minCut, 
        seedCoverage, 
        hasDisjointPaths, 
        acceptancePolicy
      );
      
      if (isAccepted) {
        totalAccepted++;
        totalMinCut += minCut;
      }

      userScores.set(user, {
        address: user,
        sts,
        components,
        normalizedComponents,
        tier,
        percentile: 0, // Will calculate after all scores are computed
        isAccepted,
      });
    }

    // Compute PageRank scores (only for accepted users)
    const acceptedUserSet = new Set<Address>(
      Array.from(userScores.entries())
        .filter(([, score]) => score.isAccepted)
        .map(([address]) => address.toLowerCase() as Address)
    );

    let pageRankMetrics: PageRankMetrics | undefined;
    
    if (this.config.pageRankWeight > 0 && acceptedUserSet.size > 0) {
      const pageRankScorer = new PageRankScorer();
      const pageRankResult = pageRankScorer.computeSeedPersonalizedPageRank(
        endorsements,
        seeds,
        acceptedUserSet
      );

      // Update components with PageRank scores and recalculate STS
      for (const [address, userScore] of Array.from(userScores.entries())) {
        const prScore = pageRankResult.scores.get(address) || 0;
        userScore.components.pageRank = prScore;

        // Recalculate STS with PageRank included
        const normalizedComponents = this.normalizeComponents(
          userScore.components,
          p95Flow,
          p95MinCut
        );
        userScore.normalizedComponents = normalizedComponents;
        userScore.sts = this.calculateSTS(normalizedComponents);
        userScore.tier = this.assignTier(userScore.sts, userScore.components.minCut, userScore.components.stability);
      }

      pageRankMetrics = {
        prSkew: pageRankResult.metrics.prSkew,
        seedConcentration: pageRankResult.metrics.seedConcentration,
        maxScore: pageRankResult.metrics.maxScore,
        p95Score: pageRankResult.metrics.p95Score,
        iterations: pageRankResult.iterations,
        converged: pageRankResult.converged,
      };
    }

    this.assignPercentiles(userScores);

    // Compute seed quality scores

    const seedScorer = new SeedScorer();
    const seedScores = seedScorer.computeSeedScores(
      endorsements,
      seeds,
      acceptedUserSet,
      userScores
    );

    // Convert to SeedQualityMetrics format
    const seedQualityMetrics = new Map<Address, SeedQualityMetrics>();
    for (const [seedAddress, seedScore] of Array.from(seedScores.entries())) {
      seedQualityMetrics.set(seedAddress, {
        seedAddress,
        score: seedScore.score,
        components: seedScore.components,
        capacityMultiplier: seedScorer.getSeedCapacityMultiplier(seedScore.score),
        meetsQualityThreshold: seedScorer.seedMeetsQualityThreshold(seedScore.score),
      });
    }

    return {
      epoch,
      scores: userScores,
      networkMetrics: {
        totalAccepted,
        avgFlow,
        avgMinCut: totalAccepted > 0 ? totalMinCut / totalAccepted : 0,
        p95Flow,
      },
      seedQuality: seedQualityMetrics,
      pageRankMetrics,
    };
  }

  /**
   * Build graph for a specific user (user-centric flow network)
   * IMPORTANT: Normalizes all addresses to lowercase for consistency
   */
  private buildUserGraph(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): FlowGraph {
    const SOURCE = "SOURCE";
    const SINK = "SINK";
    const graph = new FlowGraph(SOURCE, SINK);
    
    const normalizedUser = user.toLowerCase() as Address;

    const allUsers = this.extractAllUsers(endorsements, seeds);
    const depths = this.computeDepths(endorsements, seeds);

    for (const u of Array.from(allUsers)) {
      const uMinus = `${u}-`;
      const uPlus = `${u}+`;
      graph.addNode(uMinus);
      graph.addNode(uPlus);

      // Advogato-style node capacity based on distance from seeds
      // SECURITY: Use lagged depths from previous epoch to prevent distance-inflation attacks
      // Using refined gentler decay pattern: 800, 240, 96, 48, 24...
      const depth = this.laggedDepths 
        ? (this.laggedDepths.get(u) ?? this.config.maxDepth)
        : (depths.get(u) ?? this.config.maxDepth);
      
      let capacity: number;
      if (depth === 0) {
        capacity = 800; // Seeds
      } else if (depth === 1) {
        capacity = 240; // 1 hop (800 * 0.3)
      } else if (depth === 2) {
        capacity = 96; // 2 hops (240 * 0.4)
      } else if (depth === 3) {
        capacity = 48; // 3 hops (96 * 0.5)
      } else {
        capacity = 24; // 4+ hops (48 * 0.5)
      }
      
      graph.addEdge(uMinus, uPlus, capacity);
    }

    for (const seed of seeds) {
      const normalizedSeed = seed.toLowerCase() as Address;
      graph.addEdge(SOURCE, `${normalizedSeed}-`, Infinity);
    }

    for (const endorsement of endorsements) {
      const normalizedEndorser = endorsement.endorser.toLowerCase() as Address;
      const normalizedEndorsee = endorsement.endorsee.toLowerCase() as Address;
      graph.addEdge(`${normalizedEndorser}+`, `${normalizedEndorsee}-`, 1.0);
    }

    // Add sink connection with capacity 1 for acceptance threshold
    graph.addEdge(`${normalizedUser}-`, SINK, 1);

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
   * IMPORTANT: Normalizes address to lowercase for lookup
   */
  private calculateDepth(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): number {
    const depths = this.computeDepths(endorsements, seeds);
    return depths.get(user.toLowerCase() as Address) ?? this.config.maxDepth;
  }

  /**
   * Compute depths for all users using BFS from seeds
   * IMPORTANT: Normalizes addresses to lowercase to prevent case-sensitivity bugs
   */
  private computeDepths(
    endorsements: Endorsement[],
    seeds: Address[]
  ): Map<Address, number> {
    const depths = new Map<Address, number>();
    const adjacency = new Map<Address, Address[]>();

    for (const { endorser, endorsee } of endorsements) {
      const normalizedEndorser = endorser.toLowerCase() as Address;
      const normalizedEndorsee = endorsee.toLowerCase() as Address;
      
      if (!adjacency.has(normalizedEndorser)) {
        adjacency.set(normalizedEndorser, []);
      }
      adjacency.get(normalizedEndorser)!.push(normalizedEndorsee);
    }

    const queue: Array<{ user: Address; depth: number }> = [];
    
    for (const seed of seeds) {
      const normalizedSeed = seed.toLowerCase() as Address;
      depths.set(normalizedSeed, 0);
      queue.push({ user: normalizedSeed, depth: 0 });
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
   * IMPORTANT: Normalizes addresses to lowercase for comparison
   */
  private calculateStability(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): number {
    const normalizedUser = user.toLowerCase() as Address;
    const graph = this.buildUserGraph(normalizedUser, endorsements, seeds);
    const maxFlow = new DinicMaxFlow(graph);
    const baseFlow = maxFlow.computeMaxFlow();

    if (baseFlow < 1) return 0;

    const incomingEndorsements = endorsements.filter(
      e => e.endorsee.toLowerCase() === normalizedUser
    );
    
    if (incomingEndorsements.length === 0) return 1; // Perfectly stable if no edges

    let worstDrop = 0; // Δ_i - worst relative drop

    for (const endorsement of incomingEndorsements) {
      const filteredEndorsements = endorsements.filter(
        e => !(e.endorser.toLowerCase() === endorsement.endorser.toLowerCase() && 
               e.endorsee.toLowerCase() === endorsement.endorsee.toLowerCase())
      );
      
      const testGraph = this.buildUserGraph(normalizedUser, filteredEndorsements, seeds);
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

    // PageRank is already normalized to [0,1] by PageRankScorer
    const normalizedPageRank = Math.min(1, components.pageRank);

    return {
      flow: normalizedFlow,
      minCut: normalizedMinCut,
      stability: normalizedStability,
      depth: normalizedDepth,
      pageRank: normalizedPageRank,
    };
  }

  /**
   * Calculate final STS score from normalized components
   * 
   * Current configuration (default):
   *   STS = 100 * (0.55*F + 0.25*C + 0.05*S + 0.10*D + 0.05*PR)
   * 
   * Where:
   *   F = Flow (55%): Max-flow capacity from seeds
   *   C = Min-Cut (25%): Minimum edges to disconnect from seeds
   *   S = Stability (5%): Resilience to seed removal
   *   D = Depth (10%): Shortest path distance from seeds
   *   PR = PageRank (5%): Seed-personalized PageRank score
   * 
   * Weights are auto-normalized to sum to 1.0
   */
  private calculateSTS(normalized: TrustScoreComponents): number {
    const { flowWeight, cutWeight, stabilityWeight, depthWeight, pageRankWeight } = this.config;
    
    // Auto-adjust weights to sum to 1.0 when PageRank is enabled
    const totalWeight = flowWeight + cutWeight + stabilityWeight + depthWeight + pageRankWeight;
    const scale = totalWeight > 0 ? 1.0 / totalWeight : 1.0;

    const sts =
      100 *
      (flowWeight * scale * normalized.flow +
        cutWeight * scale * normalized.minCut +
        stabilityWeight * scale * normalized.stability +
        depthWeight * scale * normalized.depth +
        pageRankWeight * scale * normalized.pageRank);

    return Math.round(sts * 100) / 100;
  }

  /**
   * Assign tier based on STS, min-cut, and stability
   * Per spec: Connected ≥40, Verified ≥60 + cut≥2, Trusted ≥80 + cut≥3 + stability≥0.8
   */
  private assignTier(
    sts: number,
    minCut: number,
    stability: number
  ): "Connected" | "Verified" | "Trusted" | null {
    if (sts < 40 || minCut < 1) return null;
    if (sts >= 80 && minCut >= 3 && stability >= 0.8) return "Trusted";
    if (sts >= 60 && minCut >= 2) return "Verified";
    return "Connected";
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
   * IMPORTANT: Normalizes addresses to lowercase to prevent case-sensitivity bugs
   */
  private extractAllUsers(endorsements: Endorsement[], seeds: Address[]): Set<Address> {
    const users = new Set<Address>(seeds.map(s => s.toLowerCase() as Address));

    for (const { endorser, endorsee } of endorsements) {
      users.add(endorser.toLowerCase() as Address);
      users.add(endorsee.toLowerCase() as Address);
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

  /**
   * Calculate seed coverage: count distinct seeds that can reach this user
   * Per Levien spec: require >= 2 seeds to prevent single-seed blast-radius
   * IMPORTANT: Normalizes addresses to lowercase for comparison
   */
  private calculateSeedCoverage(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[]
  ): number {
    const normalizedUser = user.toLowerCase() as Address;
    const normalizedSeeds = seeds.map(s => s.toLowerCase() as Address);
    const adjacency = new Map<Address, Address[]>();
    
    // Build reverse adjacency (who endorses whom)
    for (const { endorser, endorsee } of endorsements) {
      const normalizedEndorser = endorser.toLowerCase() as Address;
      const normalizedEndorsee = endorsee.toLowerCase() as Address;
      
      if (!adjacency.has(normalizedEndorsee)) {
        adjacency.set(normalizedEndorsee, []);
      }
      adjacency.get(normalizedEndorsee)!.push(normalizedEndorser);
    }

    // BFS backward from user to find which seeds can reach them
    const reachableSeeds = new Set<Address>();
    const visited = new Set<Address>([normalizedUser]);
    const queue: Address[] = [normalizedUser];

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      
      // Check if current node is a seed
      if (normalizedSeeds.includes(current)) {
        reachableSeeds.add(current);
      }

      const predecessors = adjacency.get(current) || [];
      for (const pred of predecessors) {
        if (!visited.has(pred)) {
          visited.add(pred);
          queue.push(pred);
        }
      }
    }

    return reachableSeeds.size;
  }

  /**
   * Check if there are at least k edge-disjoint paths from seeds to user
   * Uses max-flow: by max-flow/min-cut theorem, max number of edge-disjoint 
   * paths equals the min-cut value
   */
  private hasEdgeDisjointPaths(
    user: Address,
    endorsements: Endorsement[],
    seeds: Address[],
    k: number
  ): boolean {
    const graph = this.buildUserGraph(user, endorsements, seeds);
    const maxFlow = new DinicMaxFlow(graph);
    const minCutSet = maxFlow.computeMinCut();
    const minCut = this.calculateMinCutSize(minCutSet, graph);
    
    // By max-flow/min-cut theorem: min-cut value = max number of edge-disjoint paths
    return minCut >= k;
  }

  /**
   * Get adaptive acceptance policy based on network size
   * Small networks: lenient (flow >= 1) to allow growth
   * Medium networks: moderate (flow >= 1 AND min-cut >= 2)
   * Large networks: strict Levien spec (min-cut >= 2 AND seed-coverage >= 2 AND edge-disjoint paths)
   */
  private getAcceptancePolicy(networkSize: number): {
    name: string;
    description: string;
    minFlow: number;
    minCut: number;
    minSeedCoverage: number;
    requireEdgeDisjointPaths: boolean;
  } {
    if (networkSize < 50) {
      return {
        name: "Lenient (Small Network)",
        description: "flow >= 1 (allows early network growth)",
        minFlow: 1,
        minCut: 0,
        minSeedCoverage: 1,
        requireEdgeDisjointPaths: false,
      };
    } else if (networkSize < 200) {
      return {
        name: "Moderate (Medium Network)",
        description: "flow >= 1 AND min-cut >= 1 (basic Sybil resistance)",
        minFlow: 1,
        minCut: 1,
        minSeedCoverage: 1,
        requireEdgeDisjointPaths: false,
      };
    } else {
      return {
        name: "Strict (Large Network - Levien Spec)",
        description: "min-cut >= 2 AND seed-coverage >= 2 AND two edge-disjoint paths",
        minFlow: 0, // Not used in strict mode
        minCut: 2,
        minSeedCoverage: 2,
        requireEdgeDisjointPaths: true,
      };
    }
  }

  /**
   * Check if user meets acceptance criteria based on policy
   */
  private checkAcceptance(
    flow: number,
    minCut: number,
    seedCoverage: number,
    hasDisjointPaths: boolean,
    policy: ReturnType<typeof this.getAcceptancePolicy>
  ): boolean {
    if (policy.requireEdgeDisjointPaths) {
      // Strict Levien spec
      return minCut >= policy.minCut && 
             seedCoverage >= policy.minSeedCoverage && 
             hasDisjointPaths;
    } else {
      // Lenient or moderate
      const meetsFlow = flow >= policy.minFlow;
      const meetsCut = policy.minCut === 0 || minCut >= policy.minCut;
      const meetsSeedCoverage = seedCoverage >= policy.minSeedCoverage;
      
      return meetsFlow && meetsCut && meetsSeedCoverage;
    }
  }
}
