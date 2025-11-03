import type { Address } from "viem";
import type { SyntheticGraph, SimulationMetrics, ScenarioType } from "./types";

export class MetricsCalculator {
  computeMetrics(
    algorithmName: string,
    scenario: ScenarioType,
    graph: SyntheticGraph,
    scores: Map<Address, number>,
    runtimeMs: number,
    flowValues?: Map<Address, number>  // Optional: raw flow for Advogato binary threshold
  ): SimulationMetrics {
    // For Advogato supersink: use flow >= 1.0 as binary threshold
    // For per-node scoring: use normalized score >= 30
    const useFlowThreshold = flowValues !== undefined;
    const scoreThreshold = 30;
    const flowThreshold = 1.0;

    const honestScores: number[] = [];
    const sybilScores: number[] = [];
    let honestAccepted = 0;
    let sybilAccepted = 0;

    for (const [addr, score] of Array.from(scores.entries())) {
      const isHonest = graph.honestAddresses.has(addr);
      
      // Determine if accepted based on algorithm type
      const isAccepted = useFlowThreshold
        ? (flowValues!.get(addr) ?? 0) >= flowThreshold
        : score >= scoreThreshold;
      
      if (isHonest) {
        honestScores.push(score);
        if (isAccepted) honestAccepted++;
      } else {
        sybilScores.push(score);
        if (isAccepted) sybilAccepted++;
      }
    }

    const totalHonest = graph.honestAddresses.size;
    const totalSybil = graph.sybilAddresses.size;

    const honestAcceptanceRate = totalHonest > 0 ? honestAccepted / totalHonest : 0;
    const sybilAcceptanceRate = totalSybil > 0 ? sybilAccepted / totalSybil : 0;

    const avgHonestScore = this.average(honestScores);
    const avgSybilScore = this.average(sybilScores);
    const medianHonestScore = this.median(honestScores);
    const medianSybilScore = this.median(sybilScores);

    const allScores = Array.from(scores.values());
    const giniCoefficient = this.calculateGini(allScores);

    // Attack cost: edges required to get Sybils accepted
    const sybilEdgesFromHonest = graph.edges.filter(
      e => graph.honestAddresses.has(e.from) && graph.sybilAddresses.has(e.to)
    ).length;
    const attackCost = sybilEdgesFromHonest;

    // False positive rate: Sybils accepted / Total Sybils
    const falsePositiveRate = sybilAcceptanceRate;

    // False negative rate: Honest rejected / Total Honest
    const falseNegativeRate = totalHonest > 0 
      ? (totalHonest - honestAccepted) / totalHonest 
      : 0;

    return {
      algorithmName,
      scenario,
      runtimeMs,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      honestAccepted,
      sybilAccepted,
      honestAcceptanceRate,
      sybilAcceptanceRate,
      avgHonestScore,
      avgSybilScore,
      medianHonestScore,
      medianSybilScore,
      giniCoefficient,
      attackCost,
      falsePositiveRate,
      falseNegativeRate,
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  private calculateGini(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    
    if (sum === 0) return 0;
    
    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    const gini = numerator / (n * sum);
    return Math.abs(gini);
  }
}
