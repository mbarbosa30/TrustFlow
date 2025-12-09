import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Network, Shield, TrendingUp } from "lucide-react";

type BiomeColor = 'canopy' | 'growth' | 'sun' | 'stone' | 'soil';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
  biome: BiomeColor;
}

const biomeVars: Record<BiomeColor, string> = {
  canopy: '--score-canopy',
  growth: '--score-growth',
  sun: '--score-sun',
  stone: '--score-stone',
  soil: '--score-soil',
};

function StatCard({ icon: Icon, title, value, subtitle, biome }: StatCardProps) {
  const colorVar = biomeVars[biome];
  
  return (
    <Card 
      className="card-biome overflow-hidden relative"
      style={{ 
        borderColor: `hsl(var(${colorVar}) / 0.3)`,
        borderWidth: '1px'
      }}
    >
      <div 
        className="absolute inset-0 opacity-[0.04]"
        style={{ background: `linear-gradient(135deg, hsl(var(${colorVar})) 0%, transparent 60%)` }}
      />
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3 relative">
        <CardTitle className="text-sm font-medium tracking-tight">{title}</CardTitle>
        <div 
          className="p-2.5 rounded-xl" 
          style={{ 
            backgroundColor: `hsl(var(${colorVar}) / 0.15)`, 
            color: `hsl(var(${colorVar}))`,
            boxShadow: `0 0 20px hsl(var(${colorVar}) / 0.1)`
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div 
          className="text-3xl font-bold tabular-nums" 
          style={{ color: `hsl(var(${colorVar}))` }}
          data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

interface GlobalStatsProps {
  stats: {
    totalUsers: number;
    totalEndorsements: number;
    totalEndorsers: number;
    totalEndorsees: number;
    trustedUsers: number;
    avgScore: number;
  };
}

export function GlobalStats({ stats }: GlobalStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="global-stats">
      <StatCard
        icon={Users}
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        subtitle="Active participants"
        biome="growth"
      />
      <StatCard
        icon={Network}
        title="Endorsements"
        value={stats.totalEndorsements.toLocaleString()}
        subtitle="Total network connections"
        biome="sun"
      />
      <StatCard
        icon={Shield}
        title="High-Tier Users"
        value={stats.trustedUsers.toLocaleString()}
        subtitle="Achieved highest tier"
        biome="canopy"
      />
      <StatCard
        icon={TrendingUp}
        title="Avg Score"
        value={stats.avgScore.toFixed(2)}
        subtitle="Network average"
        biome="stone"
      />
    </div>
  );
}
