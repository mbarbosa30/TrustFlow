import { Badge } from "@/components/ui/badge";
import { Shield, Award, Crown } from "lucide-react";

export type Tier = "Apprentice" | "Journeyer" | "Master";

interface TierBadgeProps {
  tier: Tier;
  size?: "sm" | "md" | "lg";
}

const tierConfig = {
  Apprentice: {
    icon: Shield,
    variant: "secondary" as const,
    description: "STS ≥ 40",
  },
  Journeyer: {
    icon: Award,
    variant: "default" as const,
    description: "STS ≥ 60, min-cut ≥ 2",
  },
  Master: {
    icon: Crown,
    variant: "default" as const,
    description: "STS ≥ 80, min-cut ≥ 3, stability ≥ 0.8",
  },
};

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const normalizedTier = (tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()) as Tier;
  const config = tierConfig[normalizedTier];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${sizeClasses[size]} gap-1.5`}
      data-testid={`badge-tier-${normalizedTier.toLowerCase()}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
      <span>{normalizedTier}</span>
    </Badge>
  );
}

export function getTierFromSTS(sts: number, minCut: number, stability: number): Tier {
  if (sts >= 80 && minCut >= 3 && stability >= 0.8) {
    return "Master";
  } else if (sts >= 60 && minCut >= 2) {
    return "Journeyer";
  } else {
    return "Apprentice";
  }
}
