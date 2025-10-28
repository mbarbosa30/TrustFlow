import type { Edge, GraphNode, FlowNetwork } from "./types";

export class FlowGraph {
  private nodes: Map<string, GraphNode>;
  private source: string;
  private sink: string;

  constructor(source: string, sink: string) {
    this.nodes = new Map();
    this.source = source;
    this.sink = sink;
    this.addNode(source);
    this.addNode(sink);
  }

  addNode(id: string): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        edges: [],
        level: -1,
        iter: 0,
      });
    }
  }

  addEdge(from: string, to: string, capacity: number): void {
    this.addNode(from);
    this.addNode(to);

    const fromNode = this.nodes.get(from)!;
    const toNode = this.nodes.get(to)!;

    const forwardEdge: Edge = {
      to,
      capacity,
      flow: 0,
      reverseIndex: toNode.edges.length,
    };

    const backwardEdge: Edge = {
      to: from,
      capacity: 0,
      flow: 0,
      reverseIndex: fromNode.edges.length,
    };

    fromNode.edges.push(forwardEdge);
    toNode.edges.push(backwardEdge);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): Map<string, GraphNode> {
    return this.nodes;
  }

  getSource(): string {
    return this.source;
  }

  getSink(): string {
    return this.sink;
  }

  getNetwork(): FlowNetwork {
    return {
      nodes: this.nodes,
      source: this.source,
      sink: this.sink,
    };
  }

  resetFlow(): void {
    for (const node of Array.from(this.nodes.values())) {
      for (const edge of node.edges) {
        edge.flow = 0;
      }
    }
  }
}
