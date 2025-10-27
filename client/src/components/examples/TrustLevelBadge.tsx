import { TrustLevelBadge } from '../TrustLevelBadge'

export default function TrustLevelBadgeExample() {
  return (
    <div className="flex gap-3 flex-wrap p-4">
      <TrustLevelBadge level="Human" />
      <TrustLevelBadge level="Known" />
      <TrustLevelBadge level="Trusted" />
    </div>
  )
}
