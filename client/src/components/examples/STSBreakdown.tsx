import { STSBreakdown } from '../STSBreakdown'

export default function STSBreakdownExample() {
  const mockComponents = [
    {
      name: "Flow (F)",
      value: 0.92,
      weight: 0.55,
      contribution: 50.6,
      description: "Max-flow reaching you from seeds, normalized with log scaling against the 95th percentile to handle graph growth",
      formula: "F = min(1, log(1+flow) / log(1+F₉₅))",
    },
    {
      name: "Cut (C)",
      value: 0.75,
      weight: 0.25,
      contribution: 18.8,
      description: "Min-cut size (path redundancy) normalized against the 95th percentile. Higher = more resilient to edge loss",
      formula: "C = min(1, minCut / max(3, C₉₅))",
    },
    {
      name: "Stability (S)",
      value: 0.85,
      weight: 0.10,
      contribution: 8.5,
      description: "Resistance to single-edge removal. 1 minus the worst relative flow drop if any single inbound edge is removed",
      formula: "S = 1 - max(Δᵢ) where Δ = (f - f⁻ᵉ) / f",
    },
    {
      name: "Depth (D)",
      value: 0.70,
      weight: 0.10,
      contribution: 7.0,
      description: "Proximity to seeds with exponential decay. Rewards being closer to the seed nodes without dominating the score",
      formula: "D = e^(-0.35 × hops)",
    },
  ];

  return (
    <div className="max-w-2xl">
      <STSBreakdown components={mockComponents} totalSTS={85} />
    </div>
  )
}
