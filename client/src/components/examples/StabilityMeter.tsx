import { StabilityMeter } from '../StabilityMeter'

export default function StabilityMeterExample() {
  return (
    <div className="max-w-md">
      <StabilityMeter
        maxImpact={0.15}
        contributionBreakdown={[
          { region: "Region A (disjoint)", percentage: 62 },
          { region: "Region B (disjoint)", percentage: 38 },
        ]}
      />
    </div>
  )
}
