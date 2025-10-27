import { TrustLevelBadge } from '../TrustLevelBadge'

export default function TrustLevelBadgeExample() {
  return (
    <div className="flex gap-3 flex-wrap p-4">
      <TrustLevelBadge level="Observer" />
      <TrustLevelBadge level="Apprentice" />
      <TrustLevelBadge level="Journeyer" />
      <TrustLevelBadge level="Master" />
    </div>
  )
}
