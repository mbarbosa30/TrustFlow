import type { Address } from "viem";

export interface Edge {
  to: string;
  capacity: number;
  flow: number;
  reverseIndex: number;
}

export interface GraphNode {
  id: string;
  edges: Edge[];
  level: number;
  iter: number;
}

export interface FlowNetwork {
  nodes: Map<string, GraphNode>;
  source: string;
  sink: string;
}

export interface TrustScoreComponents {
  flow: number;
  minCut: number;
  stability: number;
  depth: number;
  pageRank: number;
}

export interface UserScore {
  address: Address;
  sts: number;
  components: TrustScoreComponents;
  tier: "Connected" | "Verified" | "Trusted" | null;
  percentile: number;
  isAccepted: boolean;
}

export interface SeedScoreComponents {
  predictiveValidity: number;
  downstreamQuality: number;
  diversityLift: number;
  centralizationPenalty: number;
}

export interface SeedQualityMetrics {
  seedAddress: Address;
  score: number;
  components: SeedScoreComponents;
  capacityMultiplier: number;
  meetsQualityThreshold: boolean;
}

export interface PageRankMetrics {
  prSkew: number; // 1 - Gini coefficient (higher = less skewed = healthier)
  seedConcentration: number; // Fraction of PR held by seeds (lower = better distribution)
  maxScore: number; // Maximum normalized PR score
  p95Score: number; // 95th percentile PR score
  iterations: number; // Number of iterations until convergence
  converged: boolean; // Whether algorithm converged
}

export interface EpochComputationResult {
  epoch: number;
  scores: Map<Address, UserScore>;
  networkMetrics: {
    totalAccepted: number;
    avgFlow: number;
    avgMinCut: number;
    p95Flow: number;
    seedSaturation?: {
      maxSeedShare: number;
      maxSeedAddress: Address | null;
      seedFlowDistribution: Map<Address, number>;
    };
  };
  seedQuality?: Map<Address, SeedQualityMetrics>;
  pageRankMetrics?: PageRankMetrics;
}
