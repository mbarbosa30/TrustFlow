import { FlowPathVisualization } from "@/components/FlowPathVisualization";
import { BottleneckAnalysis } from "@/components/BottleneckAnalysis";
import { StabilityMeter } from "@/components/StabilityMeter";

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
      impact: "Limited by 0.4 capacity (Observer level)",
    },
    {
      edgeLabel: "••• → •••",
      impact: "Limited by 0.6 capacity (Apprentice level)",
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
