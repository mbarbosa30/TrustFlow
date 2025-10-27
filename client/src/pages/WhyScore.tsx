import { FlowPathVisualization } from "@/components/FlowPathVisualization";
import { BottleneckAnalysis } from "@/components/BottleneckAnalysis";
import { StabilityMeter } from "@/components/StabilityMeter";
import { STSBreakdown } from "@/components/STSBreakdown";

export default function WhyScore() {
  // TODO: remove mock functionality
  const mockPaths = [
    {
      nodes: [
        { id: "seed1", label: "Seed", isAnonymous: false },
        { id: "anon1", label: "0x1234", isAnonymous: true },
        { id: "anon2", label: "0x5678", isAnonymous: true },
        { id: "you", label: "You", isAnonymous: false },
      ],
    },
    {
      nodes: [
        { id: "seed2", label: "Seed", isAnonymous: false },
        { id: "anon3", label: "0xabcd", isAnonymous: true },
        { id: "you2", label: "You", isAnonymous: false },
      ],
    },
    {
      nodes: [
        { id: "seed3", label: "Seed", isAnonymous: false },
        { id: "known1", label: "0x9abc", isAnonymous: false },
        { id: "you3", label: "You", isAnonymous: false },
      ],
    },
  ];

  const mockBottlenecks = [
    {
      edgeLabel: "••• → •••",
      impact: "Limited by 0.4 capacity (Human level)",
    },
    {
      edgeLabel: "••• → •••",
      impact: "Limited by 0.7 capacity (Known level)",
    },
  ];

  const mockSTSComponents = [
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
      description: "Proximity to seeds with exponential decay. Rewards being closer to the trust roots without dominating the score",
      formula: "D = e^(-0.35 × hops)",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Why This Score?</h1>
        <p className="text-muted-foreground">
          Your score is the max flow from community seeds to you. The min-cut (size 3) is the
          smallest number of endorsements that would need to disappear for you to lose your badge.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <STSBreakdown components={mockSTSComponents} totalSTS={85} />
        </div>

        <div className="lg:col-span-2">
          <FlowPathVisualization paths={mockPaths} />
        </div>
        
        <BottleneckAnalysis bottlenecks={mockBottlenecks} />
        
        <StabilityMeter
          maxImpact={0.15}
          contributionBreakdown={[
            { region: "Region A (disjoint)", percentage: 62 },
            { region: "Region B (disjoint)", percentage: 38 },
          ]}
        />
      </div>
    </div>
  );
}
