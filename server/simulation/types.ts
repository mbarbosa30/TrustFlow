import type { Address } from "viem";

export type ScenarioType = 
  | "honest_network"
  | "sybil_linear_chain"
  | "sybil_clique"
  | "whale_attack"
  | "sparse_network";

export interface SimulationConfig {
  numHonestUsers: number;
  numSybilUsers: number;
  numSeeds: number;
  edgeDensity: number;
  scenario: ScenarioType;
}

export interface AlgorithmConfig {
  name: string;
  useNodeCapacities: boolean;
  useSupersink: boolean;
  maxDistance: number;
  nodeCapacity?: number;
}

export interface SimulationMetrics {
  algorithmName: string;
  scenario: ScenarioType;
  runtimeMs: number;
  totalNodes: number;
  totalEdges: number;
  
  // Trust acceptance
  honestAccepted: number;
  sybilAccepted: number;
  honestAcceptanceRate: number;
  sybilAcceptanceRate: number;
  
  // Score distribution
  avgHonestScore: number;
  avgSybilScore: number;
  medianHonestScore: number;
  medianSybilScore: number;
  giniCoefficient: number;
  
  // Attack resistance
  attackCost: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

export interface SimulationResult {
  config: SimulationConfig;
  algorithms: AlgorithmConfig[];
  metrics: SimulationMetrics[];
  timestamp: number;
}

export interface GraphNode {
  address: Address;
  isHonest: boolean;
  isSeed: boolean;
  distance?: number;
}

export interface GraphEdge {
  from: Address;
  to: Address;
  capacity: number;
}

export interface SyntheticGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  seeds: Address[];
  honestAddresses: Set<Address>;
  sybilAddresses: Set<Address>;
}
