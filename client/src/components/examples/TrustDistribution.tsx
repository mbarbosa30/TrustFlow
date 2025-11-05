import { ScoreDistribution } from '../TrustDistribution'

export default function ScoreDistributionExample() {
  const mockDistribution = [
    { level: "Trusted" as const, count: 1842, percentage: 15 },
    { level: "Verified" as const, count: 4361, percentage: 35 },
    { level: "Connected" as const, count: 6250, percentage: 50 },
  ];

  return (
    <div className="max-w-md">
      <ScoreDistribution distribution={mockDistribution} />
    </div>
  )
}
