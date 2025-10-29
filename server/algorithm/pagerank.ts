import type { Address } from "viem";
import type { Endorsement } from "./scoring";

export interface PageRankConfig {
  dampingFactor: number; // α, typically 0.85
  convergenceThreshold: number; // L1 norm threshold for stopping
  maxIterations: number; // Maximum iterations before forcing stop
  normalizationPercentile: number; // Percentile for log-normalization (e.g., 0.95)
}

export interface PageRankResult {
  scores: Map<Address, number>; // Normalized PR scores [0,1]
  rawScores: Map<Address, number>; // Raw PR values before normalization
  iterations: number;
  converged: boolean;
  metrics: {
    prSkew: number; // 1 - Gini coefficient (higher = less skewed)
    seedConcentration: number; // Sum of PR in seeds (lower = better distribution)
    maxScore: number;
    p95Score: number;
  };
}

const DEFAULT_CONFIG: PageRankConfig = {
  dampingFactor: 0.85,
  convergenceThreshold: 1e-8,
  maxIterations: 100,
  normalizationPercentile: 0.95,
};

export class PageRankScorer {
  private config: PageRankConfig;

  constructor(config: Partial<PageRankConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute seed-personalized PageRank (PPR) on the vouch graph
   * 
   * Algorithm:
   * r = (1-α)·v + α·P^T·r
   * 
   * Where:
   * - v = teleport vector (uniform over seeds)
   * - P = column-normalized adjacency matrix
   * - α = damping factor (0.85)
   * 
   * Returns normalized scores [0,1] using log-scale
   */
  computeSeedPersonalizedPageRank(
    endorsements: Endorsement[],
    seeds: Address[],
    acceptedUsers: Set<Address>
  ): PageRankResult {
    if (seeds.length === 0 || acceptedUsers.size === 0) {
      return {
        scores: new Map(),
        rawScores: new Map(),
        iterations: 0,
        converged: true,
        metrics: {
          prSkew: 0,
          seedConcentration: 0,
          maxScore: 0,
          p95Score: 0,
        },
      };
    }

    // Normalize addresses
    const normalizedSeeds = new Set(seeds.map(s => s.toLowerCase() as Address));
    const allNodes = new Set<string>();
    
    // Build adjacency list (directed graph)
    const outLinks = new Map<string, Set<string>>();
    const inLinks = new Map<string, Set<string>>();
    
    for (const e of endorsements) {
      const endorser = e.endorser.toLowerCase();
      const endorsee = e.endorsee.toLowerCase();
      
      allNodes.add(endorser);
      allNodes.add(endorsee);
      
      if (!outLinks.has(endorser)) outLinks.set(endorser, new Set());
      if (!inLinks.has(endorsee)) inLinks.set(endorsee, new Set());
      
      outLinks.get(endorser)!.add(endorsee);
      inLinks.get(endorsee)!.add(endorser);
    }

    // Initialize PageRank vector (uniform distribution)
    const numNodes = allNodes.size;
    const rank = new Map<string, number>();
    const newRank = new Map<string, number>();
    
    for (const node of Array.from(allNodes)) {
      rank.set(node, 1.0 / numNodes);
      newRank.set(node, 0);
    }

    // Teleport vector (uniform over seeds)
    const teleportProb = 1.0 / seeds.length;
    const teleportVector = new Map<string, number>();
    for (const seed of Array.from(normalizedSeeds)) {
      teleportVector.set(seed, teleportProb);
    }
    
    const alpha = this.config.dampingFactor;
    const beta = 1.0 - alpha;
    
    let iteration = 0;
    let converged = false;

    // Power iteration
    while (iteration < this.config.maxIterations && !converged) {
      // Reset new rank
      for (const node of Array.from(allNodes)) {
        newRank.set(node, 0);
      }

      // Distribute rank: r_new = α·P^T·r + (1-α)·v
      for (const node of Array.from(allNodes)) {
        const currentRank = rank.get(node) || 0;
        const outDegree = outLinks.get(node)?.size || 0;
        
        if (outDegree > 0) {
          // Distribute rank to outgoing neighbors
          const contribution = currentRank / outDegree;
          for (const neighbor of Array.from(outLinks.get(node)!)) {
            newRank.set(neighbor, (newRank.get(neighbor) || 0) + alpha * contribution);
          }
        } else {
          // Dangling node: distribute to all seeds
          const contribution = currentRank / seeds.length;
          for (const seed of Array.from(normalizedSeeds)) {
            newRank.set(seed, (newRank.get(seed) || 0) + alpha * contribution);
          }
        }
      }

      // Add teleport contribution
      for (const node of Array.from(allNodes)) {
        const teleport = teleportVector.get(node) || 0;
        newRank.set(node, (newRank.get(node) || 0) + beta * teleport);
      }

      // Check convergence (L1 norm)
      let l1Diff = 0;
      for (const node of Array.from(allNodes)) {
        l1Diff += Math.abs((newRank.get(node) || 0) - (rank.get(node) || 0));
      }

      converged = l1Diff < this.config.convergenceThreshold;

      // Swap rank vectors
      for (const node of Array.from(allNodes)) {
        rank.set(node, newRank.get(node) || 0);
      }

      iteration++;
    }

    // Extract scores for accepted users only
    const rawScores = new Map<Address, number>();
    const acceptedScores: number[] = [];
    
    for (const user of Array.from(acceptedUsers)) {
      const userLower = user.toLowerCase();
      const score = rank.get(userLower) || 0;
      rawScores.set(user, score);
      acceptedScores.push(score);
    }

    // Normalize using log-scale and percentile
    const normalizedScores = this.normalizeScores(
      rawScores,
      acceptedScores,
      this.config.normalizationPercentile
    );

    // Calculate metrics
    const metrics = this.calculateMetrics(normalizedScores, rawScores, normalizedSeeds, acceptedScores);

    return {
      scores: normalizedScores,
      rawScores,
      iterations: iteration,
      converged,
      metrics,
    };
  }

  /**
   * Normalize raw PageRank scores to [0,1] using log-scale
   * PR_i = min(1, log(1 + r_i) / log(1 + r_95))
   */
  private normalizeScores(
    rawScores: Map<Address, number>,
    acceptedScores: number[],
    percentile: number
  ): Map<Address, number> {
    if (acceptedScores.length === 0) {
      return new Map();
    }

    // Calculate percentile
    const sorted = [...acceptedScores].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    const p95 = sorted[Math.min(index, sorted.length - 1)];
    
    const denominator = Math.log(1 + p95);
    
    const normalized = new Map<Address, number>();
    for (const [address, rawScore] of Array.from(rawScores.entries())) {
      const logScore = Math.log(1 + rawScore);
      const normalizedScore = denominator > 0 ? Math.min(1, logScore / denominator) : 0;
      normalized.set(address, normalizedScore);
    }

    return normalized;
  }

  /**
   * Calculate PageRank health metrics
   */
  private calculateMetrics(
    normalizedScores: Map<Address, number>,
    rawScores: Map<Address, number>,
    seeds: Set<string>,
    acceptedScores: number[]
  ): PageRankResult["metrics"] {
    if (acceptedScores.length === 0) {
      return {
        prSkew: 0,
        seedConcentration: 0,
        maxScore: 0,
        p95Score: 0,
      };
    }

    // Calculate Gini coefficient (measure of inequality)
    const sorted = [...acceptedScores].sort((a, b) => a - b);
    let gini = 0;
    let sum = 0;
    const n = sorted.length;
    
    for (let i = 0; i < n; i++) {
      sum += sorted[i];
      gini += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    const giniCoefficient = sum > 0 ? gini / (n * sum) : 0;
    const prSkew = 1 - giniCoefficient; // Higher = less skewed = healthier

    // Calculate seed concentration (what fraction of total PR is held by seeds)
    let totalRawPR = 0;
    let seedRawPR = 0;
    
    for (const [address, score] of Array.from(rawScores.entries())) {
      totalRawPR += score;
      if (seeds.has(address.toLowerCase())) {
        seedRawPR += score;
      }
    }
    
    const seedConcentration = totalRawPR > 0 ? seedRawPR / totalRawPR : 0;

    // Max and p95 scores
    const maxScore = Math.max(...Array.from(normalizedScores.values()));
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95Score = sorted[Math.min(p95Index, sorted.length - 1)];

    return {
      prSkew,
      seedConcentration,
      maxScore,
      p95Score,
    };
  }

  /**
   * Compute global PageRank (non-personalized)
   * Useful for comparing against seed-personalized PR to detect anomalies
   */
  computeGlobalPageRank(
    endorsements: Endorsement[],
    acceptedUsers: Set<Address>
  ): Map<Address, number> {
    // Similar to seed-personalized, but with uniform teleport vector
    // Implementation omitted for now - can add if needed for attack detection
    return new Map();
  }
}
