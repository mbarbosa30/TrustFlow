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
}

export interface UserScore {
  address: Address;
  sts: number;
  components: TrustScoreComponents;
  tier: "Apprentice" | "Journeyer" | "Master" | null;
  percentile: number;
  isAccepted: boolean;
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
}
