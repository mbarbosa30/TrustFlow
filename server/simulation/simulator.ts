import type { Address } from "viem";
import { GraphGenerator } from "./graphGenerator";
import { SupersinkScorer } from "./supersinkScorer";
import { EgoScorer } from "../algorithm/egoScoring";
import { MetricsCalculator } from "./metrics";
import type {
  SimulationConfig,
  AlgorithmConfig,
  SimulationResult,
  SimulationMetrics,
  SyntheticGraph,
} from "./types";

/**
 * TrustMetricSimulator - Orchestrates comparison of trust scoring algorithms
 * 
 * Tests both:
 * 1. Advogato-style: Supersink + node capacities (O(n) single max-flow)
 * 2. MaxFlow current: Per-node scoring (O(n²) multiple max-flows)
 * 
 * Against scenarios:
 * - Honest network
 * - Sybil linear chain attack
 * - Sybil clique attack  
 * - Whale attack (high-capacity funder)
 * - Sparse network
 */
export class TrustMetricSimulator {
  private graphGenerator: GraphGenerator;
  private metricsCalculator: MetricsCalculator;

  constructor() {
    this.graphGenerator = new GraphGenerator();
    this.metricsCalculator = new MetricsCalculator();
  }

  async run(
    config: SimulationConfig,
    algorithms: AlgorithmConfig[]
  ): Promise<SimulationResult> {
    // 1. Generate synthetic graph
    const graph = this.graphGenerator.generate(config);

    // 2. Run each algorithm
    const allMetrics: SimulationMetrics[] = [];

    for (const algoConfig of algorithms) {
      const scores = await this.runAlgorithm(algoConfig, graph);
      
      const metrics = this.metricsCalculator.computeMetrics(
        algoConfig.name,
        config.scenario,
        graph,
        scores.scoreMap,
        scores.runtimeMs
      );

      allMetrics.push(metrics);
    }

    return {
      config,
      algorithms,
      metrics: allMetrics,
      timestamp: Date.now(),
    };
  }

  private async runAlgorithm(
    config: AlgorithmConfig,
    graph: SyntheticGraph
  ): Promise<{ scoreMap: Map<Address, number>; runtimeMs: number }> {
    if (config.useSupersink) {
      return this.runSupersinkAlgorithm(config, graph);
    } else {
      return this.runEgoAlgorithm(config, graph);
    }
  }

  private async runSupersinkAlgorithm(
    config: AlgorithmConfig,
    graph: SyntheticGraph
  ): Promise<{ scoreMap: Map<Address, number>; runtimeMs: number }> {
    const scorer = new SupersinkScorer(config);
    const result = scorer.computeTrust(graph);
    const scores = scorer.computeScores(result.flowPerNode);

    return {
      scoreMap: scores,
      runtimeMs: result.runtimeMs,
    };
  }

  private async runEgoAlgorithm(
    config: AlgorithmConfig,
    graph: SyntheticGraph
  ): Promise<{ scoreMap: Map<Address, number>; runtimeMs: number }> {
    const startTime = Date.now();
    const scorer = new EgoScorer({
      maxDistance: config.maxDistance,
      minAcceptanceFlow: 0.5,
      minAcceptanceMinCut: 2,
    });

    const scoreMap = new Map<Address, number>();

    // Convert graph edges to endorsements
    const endorsements = graph.edges.map(e => ({
      endorser: e.from,
      endorsee: e.to,
    }));

    // Run ego scoring for each non-seed node
    for (const node of graph.nodes) {
      if (node.isSeed) {
        scoreMap.set(node.address, 100); // Seeds get max score
        continue;
      }

      // For ego scoring, we treat each node as having its own ego context
      // with the global seeds as their seed set
      const result = scorer.computeLocalHealth(
        node.address,
        graph.seeds,
        endorsements
      );

      scoreMap.set(node.address, result.localHealth);
    }

    const runtimeMs = Date.now() - startTime;

    return { scoreMap, runtimeMs };
  }

  /**
   * Run a quick benchmark comparing algorithms
   */
  async benchmark(): Promise<SimulationResult[]> {
    const scenarios: SimulationConfig[] = [
      {
        numHonestUsers: 50,
        numSybilUsers: 0,
        numSeeds: 3,
        edgeDensity: 0.2,
        scenario: "honest_network",
      },
      {
        numHonestUsers: 50,
        numSybilUsers: 20,
        numSeeds: 3,
        edgeDensity: 0.2,
        scenario: "sybil_linear_chain",
      },
      {
        numHonestUsers: 50,
        numSybilUsers: 20,
        numSeeds: 3,
        edgeDensity: 0.2,
        scenario: "sybil_clique",
      },
      {
        numHonestUsers: 50,
        numSybilUsers: 30,
        numSeeds: 3,
        edgeDensity: 0.2,
        scenario: "whale_attack",
      },
    ];

    const algorithms: AlgorithmConfig[] = [
      {
        name: "Advogato (Supersink + Node Cap)",
        useNodeCapacities: true,
        useSupersink: true,
        maxDistance: 3,
        nodeCapacity: 1.0,
      },
      {
        name: "MaxFlow Current (Per-Node)",
        useNodeCapacities: false,
        useSupersink: false,
        maxDistance: 3,
      },
    ];

    const results: SimulationResult[] = [];

    for (const scenario of scenarios) {
      const result = await this.run(scenario, algorithms);
      results.push(result);
    }

    return results;
  }
}
