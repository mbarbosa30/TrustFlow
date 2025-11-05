import { ScoreLevelBadge } from '../TrustLevelBadge'

export default function ScoreLevelBadgeExample() {
  return (
    <div className="flex gap-3 flex-wrap p-4">
      <ScoreLevelBadge level="Human" />
      <ScoreLevelBadge level="Known" />
      <ScoreLevelBadge level="Trusted" />
    </div>
  )
}
