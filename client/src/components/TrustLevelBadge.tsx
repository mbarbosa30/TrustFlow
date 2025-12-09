import { Badge } from "@/components/ui/badge";
import { User, Users, Shield } from "lucide-react";

export type ScoreLevel = "Human" | "Known" | "Trusted";
export type TrustLevel = ScoreLevel;

interface ScoreLevelBadgeProps {
  level: ScoreLevel;
  showIcon?: boolean;
}

interface TrustLevelBadgeProps {
  level: TrustLevel;
  showIcon?: boolean;
}

const levelConfig = {
  Human: {
    icon: User,
    style: { backgroundColor: 'hsl(var(--score-stone) / 0.2)', color: 'hsl(var(--score-stone))' },
  },
  Known: {
    icon: Users,
    style: { backgroundColor: 'hsl(var(--score-growth) / 0.2)', color: 'hsl(var(--score-growth))' },
  },
  Trusted: {
    icon: Shield,
    style: { backgroundColor: 'hsl(var(--score-canopy) / 0.2)', color: 'hsl(var(--score-canopy))' },
  },
};

export function ScoreLevelBadge({ level, showIcon = true }: ScoreLevelBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Badge
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full"
      style={config.style}
      data-testid={`badge-score-level-${level.toLowerCase()}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{level}</span>
    </Badge>
  );
}

export const TrustLevelBadge = ScoreLevelBadge;
