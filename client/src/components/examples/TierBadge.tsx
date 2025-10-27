import { TierBadge } from '../TierBadge'

export default function TierBadgeExample() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <TierBadge tier="Apprentice" size="sm" />
        <TierBadge tier="Apprentice" size="md" />
        <TierBadge tier="Apprentice" size="lg" />
      </div>
      <div className="flex items-center gap-4">
        <TierBadge tier="Journeyer" size="sm" />
        <TierBadge tier="Journeyer" size="md" />
        <TierBadge tier="Journeyer" size="lg" />
      </div>
      <div className="flex items-center gap-4">
        <TierBadge tier="Master" size="sm" />
        <TierBadge tier="Master" size="md" />
        <TierBadge tier="Master" size="lg" />
      </div>
    </div>
  )
}
