import { Badge } from "@/components/ui/badge";
import { Shield, Star, Award, Eye } from "lucide-react";

export type TrustLevel = "Observer" | "Apprentice" | "Journeyer" | "Master";

interface TrustLevelBadgeProps {
  level: TrustLevel;
  showIcon?: boolean;
}

const levelConfig = {
  Observer: {
    icon: Eye,
    className: "bg-muted text-muted-foreground border-muted-border",
  },
  Apprentice: {
    icon: Shield,
    className: "bg-accent text-accent-foreground border-accent-border",
  },
  Journeyer: {
    icon: Star,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  Master: {
    icon: Award,
    className: "bg-primary text-primary-foreground border-primary-border",
  },
};

export function TrustLevelBadge({ level, showIcon = true }: TrustLevelBadgeProps) {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}
      data-testid={`badge-trust-level-${level.toLowerCase()}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{level}</span>
    </Badge>
  );
}
