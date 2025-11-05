import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Network, Shield, TrendingUp } from "lucide-react";

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
}

function StatCard({ icon: Icon, title, value, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
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
      />
      <StatCard
        icon={Network}
        title="Endorsements"
        value={stats.totalEndorsements.toLocaleString()}
        subtitle="Total network connections"
      />
      <StatCard
        icon={Shield}
        title="High-Tier Users"
        value={stats.trustedUsers.toLocaleString()}
        subtitle="Achieved highest tier"
      />
      <StatCard
        icon={TrendingUp}
        title="Avg Score"
        value={stats.avgScore.toFixed(2)}
        subtitle="Network average"
      />
    </div>
  );
}
