import { TierBadge } from '../TierBadge'

export default function TierBadgeExample() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <TierBadge tier="Connected" size="sm" />
        <TierBadge tier="Connected" size="md" />
        <TierBadge tier="Connected" size="lg" />
      </div>
      <div className="flex items-center gap-4">
        <TierBadge tier="Verified" size="sm" />
        <TierBadge tier="Verified" size="md" />
        <TierBadge tier="Verified" size="lg" />
      </div>
      <div className="flex items-center gap-4">
        <TierBadge tier="Trusted" size="sm" />
        <TierBadge tier="Trusted" size="md" />
        <TierBadge tier="Trusted" size="lg" />
      </div>
    </div>
  )
}
