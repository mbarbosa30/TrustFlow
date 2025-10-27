import { ScoreCard } from '../ScoreCard'

export default function ScoreCardExample() {
  return (
    <div className="max-w-md">
      <ScoreCard
        tier="Master"
        sts={85}
        percentile={92}
        minCutSize={3}
        epochTimestamp="2025-10-27T12:00:00Z"
        onExportAttestation={() => console.log('Export attestation triggered')}
      />
    </div>
  )
}
