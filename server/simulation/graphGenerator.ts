import type { Address } from "viem";
import type { 
  SimulationConfig, 
  SyntheticGraph, 
  GraphNode, 
  GraphEdge,
  ScenarioType
} from "./types";

export class GraphGenerator {
  private addressCounter = 0;

  private generateAddress(): Address {
    const hex = this.addressCounter.toString(16).padStart(40, '0');
    this.addressCounter++;
    return `0x${hex}` as Address;
  }

  generate(config: SimulationConfig): SyntheticGraph {
    this.addressCounter = 0;
    
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seeds: Address[] = [];
    const honestAddresses = new Set<Address>();
    const sybilAddresses = new Set<Address>();

    // Create seed nodes
    for (let i = 0; i < config.numSeeds; i++) {
      const addr = this.generateAddress();
      nodes.push({ address: addr, isHonest: true, isSeed: true, distance: 0 });
      seeds.push(addr);
      honestAddresses.add(addr);
    }

    // Create honest users
    for (let i = 0; i < config.numHonestUsers; i++) {
      const addr = this.generateAddress();
      nodes.push({ address: addr, isHonest: true, isSeed: false });
      honestAddresses.add(addr);
    }

    // Create Sybil users
    for (let i = 0; i < config.numSybilUsers; i++) {
      const addr = this.generateAddress();
      nodes.push({ address: addr, isHonest: false, isSeed: false });
      sybilAddresses.add(addr);
    }

    // Generate edges based on scenario
    switch (config.scenario) {
      case "honest_network":
        this.generateHonestNetwork(nodes, edges, seeds, honestAddresses, config.edgeDensity);
        break;
      case "sybil_linear_chain":
        this.generateSybilLinearChain(nodes, edges, seeds, honestAddresses, sybilAddresses, config.edgeDensity);
        break;
      case "sybil_clique":
        this.generateSybilClique(nodes, edges, seeds, honestAddresses, sybilAddresses, config.edgeDensity);
        break;
      case "whale_attack":
        this.generateWhaleAttack(nodes, edges, seeds, honestAddresses, sybilAddresses, config.edgeDensity);
        break;
      case "sparse_network":
        this.generateSparseNetwork(nodes, edges, seeds, honestAddresses, config.edgeDensity);
        break;
    }

    return { nodes, edges, seeds, honestAddresses, sybilAddresses };
  }

  private generateHonestNetwork(
    nodes: GraphNode[],
    edges: GraphEdge[],
    seeds: Address[],
    honestAddresses: Set<Address>,
    density: number
  ): void {
    const honestNodes = nodes.filter(n => n.isHonest);
    
    // Connect seeds to random honest users
    for (const seed of seeds) {
      const numConnections = Math.max(3, Math.floor(honestNodes.length * density));
      const targets = this.selectRandomNodes(honestNodes.filter(n => n.address !== seed), numConnections);
      
      for (const target of targets) {
        edges.push({ from: seed, to: target.address, capacity: 1.0 });
      }
    }

    // Create random connections among honest users
    for (const node of honestNodes) {
      if (node.isSeed) continue;
      
      const numConnections = Math.max(1, Math.floor(honestNodes.length * density * 0.3));
      const targets = this.selectRandomNodes(
        honestNodes.filter(n => n.address !== node.address && !n.isSeed),
        numConnections
      );
      
      for (const target of targets) {
        edges.push({ from: node.address, to: target.address, capacity: 1.0 });
      }
    }
  }

  private generateSybilLinearChain(
    nodes: GraphNode[],
    edges: GraphEdge[],
    seeds: Address[],
    honestAddresses: Set<Address>,
    sybilAddresses: Set<Address>,
    density: number
  ): void {
    // First create honest network
    this.generateHonestNetwork(nodes, edges, seeds, honestAddresses, density);
    
    // Create linear chain of Sybils
    const sybilNodes = nodes.filter(n => !n.isHonest);
    const honestNodes = nodes.filter(n => n.isHonest && !n.isSeed);
    
    if (sybilNodes.length > 0 && honestNodes.length > 0) {
      // One honest user connects to first Sybil (attack entry point)
      const entryPoint = this.selectRandomNodes(honestNodes, 1)[0];
      edges.push({ from: entryPoint.address, to: sybilNodes[0].address, capacity: 1.0 });
      
      // Chain Sybils together
      for (let i = 0; i < sybilNodes.length - 1; i++) {
        edges.push({ 
          from: sybilNodes[i].address, 
          to: sybilNodes[i + 1].address, 
          capacity: 1.0 
        });
      }
    }
  }

  private generateSybilClique(
    nodes: GraphNode[],
    edges: GraphEdge[],
    seeds: Address[],
    honestAddresses: Set<Address>,
    sybilAddresses: Set<Address>,
    density: number
  ): void {
    // Create honest network
    this.generateHonestNetwork(nodes, edges, seeds, honestAddresses, density);
    
    const sybilNodes = nodes.filter(n => !n.isHonest);
    const honestNodes = nodes.filter(n => n.isHonest && !n.isSeed);
    
    if (sybilNodes.length > 0 && honestNodes.length > 0) {
      // Multiple entry points from honest network
      const numEntryPoints = Math.min(3, honestNodes.length);
      const entryPoints = this.selectRandomNodes(honestNodes, numEntryPoints);
      
      for (const entry of entryPoints) {
        const target = this.selectRandomNodes(sybilNodes, 1)[0];
        edges.push({ from: entry.address, to: target.address, capacity: 1.0 });
      }
      
      // Create dense clique among Sybils (full mesh)
      for (let i = 0; i < sybilNodes.length; i++) {
        for (let j = 0; j < sybilNodes.length; j++) {
          if (i !== j) {
            edges.push({ 
              from: sybilNodes[i].address, 
              to: sybilNodes[j].address, 
              capacity: 1.0 
            });
          }
        }
      }
    }
  }

  private generateWhaleAttack(
    nodes: GraphNode[],
    edges: GraphEdge[],
    seeds: Address[],
    honestAddresses: Set<Address>,
    sybilAddresses: Set<Address>,
    density: number
  ): void {
    // Create honest network
    this.generateHonestNetwork(nodes, edges, seeds, honestAddresses, density);
    
    const sybilNodes = nodes.filter(n => !n.isHonest);
    const honestNodes = nodes.filter(n => n.isHonest && !n.isSeed);
    
    if (sybilNodes.length > 0) {
      // Whale = first Sybil with high-capacity edges to all other Sybils
      const whale = sybilNodes[0];
      
      // Whale connects to honest network via multiple entry points
      const numEntries = Math.min(5, honestNodes.length);
      const entries = this.selectRandomNodes(honestNodes, numEntries);
      
      for (const entry of entries) {
        edges.push({ from: entry.address, to: whale.address, capacity: 1.0 });
      }
      
      // Whale funds all other Sybils with high capacity
      for (let i = 1; i < sybilNodes.length; i++) {
        edges.push({ 
          from: whale.address, 
          to: sybilNodes[i].address, 
          capacity: 10.0 // High capacity
        });
      }
    }
  }

  private generateSparseNetwork(
    nodes: GraphNode[],
    edges: GraphEdge[],
    seeds: Address[],
    honestAddresses: Set<Address>,
    density: number
  ): void {
    const honestNodes = nodes.filter(n => n.isHonest);
    
    // Very sparse connections - only 1-2 edges per node
    for (const seed of seeds) {
      const targets = this.selectRandomNodes(
        honestNodes.filter(n => n.address !== seed), 
        2
      );
      
      for (const target of targets) {
        edges.push({ from: seed, to: target.address, capacity: 1.0 });
      }
    }

    for (const node of honestNodes) {
      if (node.isSeed) continue;
      
      const targets = this.selectRandomNodes(
        honestNodes.filter(n => n.address !== node.address),
        1
      );
      
      for (const target of targets) {
        edges.push({ from: node.address, to: target.address, capacity: 1.0 });
      }
    }
  }

  private selectRandomNodes(nodes: GraphNode[], count: number): GraphNode[] {
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, nodes.length));
  }
}
