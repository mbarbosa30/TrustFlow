import type { FlowGraph } from "./graph";
import type { GraphNode, Edge } from "./types";

export class DinicMaxFlow {
  private graph: FlowGraph;

  constructor(graph: FlowGraph) {
    this.graph = graph;
  }

  private bfs(source: string, sink: string): boolean {
    const nodes = this.graph.getNodes();
    
    for (const node of Array.from(nodes.values())) {
      node.level = -1;
    }

    const sourceNode = nodes.get(source);
    if (!sourceNode) return false;

    sourceNode.level = 0;
    const queue: string[] = [source];
    let head = 0;

    while (head < queue.length) {
      const currentId = queue[head++];
      const current = nodes.get(currentId)!;

      for (const edge of current.edges) {
        const next = nodes.get(edge.to);
        if (next && next.level < 0 && edge.capacity > edge.flow) {
          next.level = current.level + 1;
          queue.push(edge.to);
        }
      }
    }

    const sinkNode = nodes.get(sink);
    return sinkNode ? sinkNode.level >= 0 : false;
  }

  private dfs(
    nodeId: string,
    sink: string,
    flow: number,
    nodes: Map<string, GraphNode>
  ): number {
    if (nodeId === sink) return flow;

    const node = nodes.get(nodeId);
    if (!node) return 0;

    for (let i = node.iter; i < node.edges.length; i++) {
      const edge = node.edges[i];
      const next = nodes.get(edge.to);

      if (next && next.level === node.level + 1 && edge.capacity > edge.flow) {
        const minFlow = Math.min(flow, edge.capacity - edge.flow);
        const pushed = this.dfs(edge.to, sink, minFlow, nodes);

        if (pushed > 0) {
          edge.flow += pushed;
          const reverseEdge = next.edges[edge.reverseIndex];
          reverseEdge.flow -= pushed;
          return pushed;
        }
      }

      node.iter++;
    }

    return 0;
  }

  computeMaxFlow(): number {
    const source = this.graph.getSource();
    const sink = this.graph.getSink();
    let totalFlow = 0;

    while (this.bfs(source, sink)) {
      const nodes = this.graph.getNodes();
      
      for (const node of Array.from(nodes.values())) {
        node.iter = 0;
      }

      let flow: number;
      do {
        flow = this.dfs(source, sink, Infinity, nodes);
        totalFlow += flow;
      } while (flow > 0);
    }

    return totalFlow;
  }

  computeMinCut(): Set<string> {
    const source = this.graph.getSource();
    this.bfs(source, this.graph.getSink());

    const reachable = new Set<string>();
    const nodes = this.graph.getNodes();

    for (const [id, node] of Array.from(nodes.entries())) {
      if (node.level >= 0) {
        reachable.add(id);
      }
    }

    return reachable;
  }

  getFlowTo(nodeId: string): number {
    const node = this.graph.getNode(nodeId);
    if (!node) return 0;

    let incomingFlow = 0;
    for (const edge of node.edges) {
      if (edge.flow < 0) {
        incomingFlow += Math.abs(edge.flow);
      }
    }

    return incomingFlow;
  }
}
