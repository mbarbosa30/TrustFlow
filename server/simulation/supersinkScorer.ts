import type { Address } from "viem";
import { FlowGraph } from "../algorithm/graph";
import { DinicMaxFlow } from "../algorithm/maxflow";
import type { SyntheticGraph, AlgorithmConfig } from "./types";

export interface SupersinkScoreResult {
  trustedAddresses: Set<Address>;
  flowPerNode: Map<Address, number>;
  totalFlow: number;
  runtimeMs: number;
}

/**
 * Advogato-style max-flow scorer using node-splitting and supersink.
 * 
 * Key differences from ego scoring:
 * 1. Single max-flow computation to shared supersink (not per-node)
 * 2. Node capacities enforced via node-splitting: user_in -> user_out
 * 3. Binary trust decision: flow >= threshold = trusted
 * 4. O(n) instead of O(n²) - one flow computation for all nodes
 */
export class SupersinkScorer {
  private config: AlgorithmConfig;

  constructor(config: AlgorithmConfig) {
    this.config = config;
  }

  computeTrust(graph: SyntheticGraph): SupersinkScoreResult {
    const startTime = Date.now();

    const SOURCE = "SUPERSOURCE";
    const SINK = "SUPERSINK";
    const flowGraph = new FlowGraph(SOURCE, SINK);

    // Node-splitting technique for node capacities (Advogato-style):
    // Each user becomes two nodes: user_in and user_out
    // - user_in -> user_out with capacity = nodeCapacity (limits flow through node)
    // - user_out -> SUPERSINK with capacity = nodeCapacity (enforces binary threshold at min-cut)
    // This ensures the min-cut respects node capacities

    const nodeCapacity = this.config.nodeCapacity ?? 1.0;

    // 1. Connect SOURCE to all seeds with infinite capacity
    for (const seed of graph.seeds) {
      const seedIn = `${seed}_in`;
      const seedOut = `${seed}_out`;
      
      flowGraph.addEdge(SOURCE, seedIn, Infinity);
      
      // Seed node-split with capacity constraint
      flowGraph.addEdge(seedIn, seedOut, nodeCapacity);
      
      // Seeds also connect to sink with same capacity (for min-cut enforcement)
      flowGraph.addEdge(seedOut, SINK, nodeCapacity);
    }

    // 2. Add all nodes with node-splitting
    const allAddresses = graph.nodes.map(n => n.address);
    for (const addr of allAddresses) {
      if (graph.seeds.includes(addr)) continue; // Already added
      
      const nodeIn = `${addr}_in`;
      const nodeOut = `${addr}_out`;
      
      // Node capacity edge (limits total flow through the node)
      flowGraph.addEdge(nodeIn, nodeOut, nodeCapacity);
      
      // Connect to sink with same capacity (enforces binary threshold)
      // This is key: min-cut will enforce that flow to sink ≤ nodeCapacity
      flowGraph.addEdge(nodeOut, SINK, nodeCapacity);
    }

    // 3. Add endorsement edges (from_out -> to_in)
    for (const edge of graph.edges) {
      const fromOut = `${edge.from}_out`;
      const toIn = `${edge.to}_in`;
      
      // Edge capacity from original graph
      flowGraph.addEdge(fromOut, toIn, edge.capacity);
    }

    // 5. Run max-flow
    const solver = new DinicMaxFlow(flowGraph);
    const totalFlow = solver.computeMaxFlow();

    // 6. Determine who is trusted (received >= threshold flow)
    const trustedAddresses = new Set<Address>();
    const flowPerNode = new Map<Address, number>();

    for (const addr of allAddresses) {
      if (graph.seeds.includes(addr)) {
        // Seeds are always trusted
        trustedAddresses.add(addr);
        flowPerNode.set(addr, nodeCapacity);
        continue;
      }

      // Flow through user = flow on node-split edge (user_in -> user_out)
      const nodeIn = `${addr}_in`;
      const nodeOut = `${addr}_out`;
      
      const nodeInData = flowGraph.getNode(nodeIn);
      if (!nodeInData) {
        flowPerNode.set(addr, 0);
        continue;
      }

      // Find the edge from nodeIn to nodeOut
      let flowThrough = 0;
      for (const edge of nodeInData.edges) {
        if (edge.to === nodeOut) {
          flowThrough = edge.flow;
          break;
        }
      }

      flowPerNode.set(addr, flowThrough);

      // Trusted if flow >= threshold (typically 1.0 for binary trust)
      if (flowThrough >= 1.0) {
        trustedAddresses.add(addr);
      }
    }

    const runtimeMs = Date.now() - startTime;

    return {
      trustedAddresses,
      flowPerNode,
      totalFlow,
      runtimeMs,
    };
  }

  /**
   * Compute normalized scores (0-100) from flow values
   */
  computeScores(flowPerNode: Map<Address, number>): Map<Address, number> {
    const scores = new Map<Address, number>();
    const maxFlow = Math.max(...Array.from(flowPerNode.values()), 0.01);

    for (const [addr, flow] of Array.from(flowPerNode.entries())) {
      // Normalize to 0-100 scale
      const normalizedScore = (flow / maxFlow) * 100;
      scores.set(addr, Math.min(100, normalizedScore));
    }

    return scores;
  }
}
