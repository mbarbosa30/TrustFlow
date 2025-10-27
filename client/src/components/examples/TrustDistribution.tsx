import { TrustDistribution } from '../TrustDistribution'

export default function TrustDistributionExample() {
  const mockDistribution = [
    { level: "Trusted" as const, count: 1842, percentage: 15 },
    { level: "Known" as const, count: 4361, percentage: 35 },
    { level: "Human" as const, count: 6250, percentage: 50 },
  ];

  return (
    <div className="max-w-md">
      <TrustDistribution distribution={mockDistribution} />
    </div>
  )
}
