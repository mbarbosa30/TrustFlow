import { BottleneckAnalysis } from '../BottleneckAnalysis'

export default function BottleneckAnalysisExample() {
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
    <div className="max-w-md">
      <BottleneckAnalysis bottlenecks={mockBottlenecks} />
    </div>
  )
}
