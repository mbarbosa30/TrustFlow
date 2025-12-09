import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Info, TrendingUp, Users, Network, GitBranch, Shield, Activity, BarChart3, Heart, Zap, Leaf } from "lucide-react";

interface NetworkTraction {
  totalVouchers: number;
  totalVouches: number;
  scoredUsers: number;
  avgLocalHealth: number;
  graphDensity: number;
  avgVouchesPerUser: number;
  totalParticipants: number;
  healthDistribution: {
    critical: number;
    warning: number;
    healthy: number;
    quality: number;
  };
  dilutionZones: {
    quality: number;
    warning: number;
    penalty: number;
    critical: number;
    qualityPercent: number;
  };
}

export default function Status() {
  const { data: traction, isLoading } = useQuery<NetworkTraction>({
    queryKey: ['/api/stats/network-traction'],
  });

  const getHealthStatus = (avgHealth: number) => {
    if (avgHealth >= 60) return { label: "Healthy", color: "bg-green-600 dark:bg-green-400" };
    if (avgHealth >= 40) return { label: "Developing", color: "bg-blue-600 dark:bg-blue-400" };
    if (avgHealth >= 20) return { label: "Early Stage", color: "bg-yellow-600 dark:bg-yellow-400" };
    return { label: "Nascent", color: "bg-orange-600 dark:bg-orange-400" };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading system status...</div>
        </div>
      </div>
    );
  }

  if (!traction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">No status data available</div>
        </div>
      </div>
    );
  }

  const status = getHealthStatus(traction.avgLocalHealth);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Network Status</h1>
        <p className="text-muted-foreground">
          Real-time signal metrics for the MaxFlow graph signal infrastructure
        </p>
      </div>

      <div className="space-y-8">
        <Card data-testid="card-status-hero">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Network Signal Overview
            </CardTitle>
            <CardDescription>
              Aggregate scoring metrics across all users with computed signal scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg">
                <div className="text-6xl font-bold text-foreground mb-2" data-testid="text-avg-signal">
                  {traction.avgLocalHealth}
                </div>
                <div className="text-lg text-muted-foreground mb-4">Average Signal</div>
                <Badge className={`${status.color} text-white`} data-testid="badge-network-status">
                  {status.label}
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-3xl font-bold" data-testid="text-scored-users">
                      {traction.scoredUsers}
                    </div>
                    <div className="text-sm text-muted-foreground">Scored Users</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-3xl font-bold" data-testid="text-total-vouchers">
                      {traction.totalVouchers}
                    </div>
                    <div className="text-sm text-muted-foreground">Vouchers</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-3xl font-bold" data-testid="text-total-vouches">
                      {traction.totalVouches}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Vouches</div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-3xl font-bold" data-testid="text-participants">
                      {traction.totalParticipants}
                    </div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card data-testid="card-score-distribution">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Signal Distribution
              </CardTitle>
              <CardDescription>
                Score breakdown across all users with computed signal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Quality (80-100)
                    </span>
                    <span className="text-sm font-medium">{traction.healthDistribution.quality}</span>
                  </div>
                  <Progress 
                    value={traction.scoredUsers > 0 ? (traction.healthDistribution.quality / traction.scoredUsers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Healthy (60-80)
                    </span>
                    <span className="text-sm font-medium">{traction.healthDistribution.healthy}</span>
                  </div>
                  <Progress 
                    value={traction.scoredUsers > 0 ? (traction.healthDistribution.healthy / traction.scoredUsers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      Warning (40-60)
                    </span>
                    <span className="text-sm font-medium">{traction.healthDistribution.warning}</span>
                  </div>
                  <Progress 
                    value={traction.scoredUsers > 0 ? (traction.healthDistribution.warning / traction.scoredUsers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Critical (&lt;40)
                    </span>
                    <span className="text-sm font-medium">{traction.healthDistribution.critical}</span>
                  </div>
                  <Progress 
                    value={traction.scoredUsers > 0 ? (traction.healthDistribution.critical / traction.scoredUsers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic pt-2">
                Like measuring water quality across a watershed — each tributary contributes to overall ecosystem health.
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-dilution-zones">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Voucher Dilution Zones
              </CardTitle>
              <CardDescription>
                Distribution of vouchers by outgoing vouch count (affects dilution penalty)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Quality Zone (1-10)
                    </span>
                    <span className="text-sm font-medium">{traction.dilutionZones.quality}</span>
                  </div>
                  <Progress 
                    value={traction.totalVouchers > 0 ? (traction.dilutionZones.quality / traction.totalVouchers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      Warning Zone (11-15)
                    </span>
                    <span className="text-sm font-medium">{traction.dilutionZones.warning}</span>
                  </div>
                  <Progress 
                    value={traction.totalVouchers > 0 ? (traction.dilutionZones.warning / traction.totalVouchers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      Penalty Zone (16-25)
                    </span>
                    <span className="text-sm font-medium">{traction.dilutionZones.penalty}</span>
                  </div>
                  <Progress 
                    value={traction.totalVouchers > 0 ? (traction.dilutionZones.penalty / traction.totalVouchers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      Critical Zone (25+)
                    </span>
                    <span className="text-sm font-medium">{traction.dilutionZones.critical}</span>
                  </div>
                  <Progress 
                    value={traction.totalVouchers > 0 ? (traction.dilutionZones.critical / traction.totalVouchers) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quality Voucher Rate:</span>
                <Badge variant={traction.dilutionZones.qualityPercent >= 50 ? "default" : "secondary"}>
                  {traction.dilutionZones.qualityPercent}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card data-testid="card-metric-density">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Graph Density
                </CardTitle>
                <div className="text-2xl font-bold" data-testid="text-graph-density">
                  {traction.graphDensity}%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Ratio of actual edges to maximum possible edges in the network
                </p>
                <Progress value={traction.graphDensity} className="h-2" />
                <p className="text-xs text-muted-foreground italic">
                  Denser graphs have more interconnections, like mycorrhizal networks in healthy forests.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-vouches">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Avg Vouches/User
                </CardTitle>
                <div className="text-2xl font-bold" data-testid="text-avg-vouches">
                  {traction.avgVouchesPerUser}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Average number of vouches received per scored user
                </p>
                <Progress value={Math.min(100, traction.avgVouchesPerUser * 10)} className="h-2" />
                <p className="text-xs text-muted-foreground italic">
                  Higher connectivity provides more redundant paths for trust flow.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-quality">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Quality Rate
                </CardTitle>
                <div className="text-2xl font-bold text-green-600" data-testid="text-quality-rate">
                  {traction.dilutionZones.qualityPercent}%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Percentage of vouchers with ≤10 outgoing vouches (no dilution penalty)
                </p>
                <Progress value={traction.dilutionZones.qualityPercent} className="h-2" />
                <p className="text-xs text-muted-foreground italic">
                  Selective vouching creates stronger, more meaningful endorsements.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-algorithm-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Understanding the Signal
            </CardTitle>
            <CardDescription>
              How the scoring algorithm works and what the metrics mean
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    Flow Component (60%)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Measures trust flow from your vouchers to you, weighted by each voucher's own signal strength. 
                    Stronger vouchers contribute more to your score.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Network className="w-4 h-4 text-muted-foreground" />
                    Redundancy Component (40%)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Rewards having multiple independent paths of support. Includes bonuses for 
                    vertex-disjoint paths and upstream network depth.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    Dilution Penalty
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Users who vouch for too many people face a smooth, piecewise penalty. 
                    Over-vouching dilutes your endorsement power from 100% down to 40%.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    Adaptive Baselines
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    "Healthy" thresholds are computed from network percentiles (75th) rather than 
                    fixed values. Fair scoring whether the network has 10 or 10,000 users.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Leaf className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Nature-Inspired Resilience</p>
                  <p className="text-xs text-muted-foreground">
                    Signal scoring mirrors patterns found in natural systems: flow capacity like watersheds, 
                    recursive weighting like root nutrient distribution, path redundancy like mycorrhizal networks, 
                    and dilution penalties like ecosystem pruning. These aren't metaphors—they're the same 
                    mathematical patterns that make natural networks ungameable.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-design-principles">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Design Principles
            </CardTitle>
            <CardDescription>
              Why MaxFlow computes signals this way
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  Personal Network Focus
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your signal measures your personal network quality—who vouches for you and 
                  how strong their own networks are. It's ego-centric by design.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Sybil Resistance
                </h3>
                <p className="text-sm text-muted-foreground">
                  Iterative scoring means fake accounts can't boost each other—they'd all 
                  have low scores. Vertex-disjoint paths ensure true independence.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Pure Graph Signal
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your signal is computed entirely from the endorsement graph structure. 
                  No economic factors, no external data—just network topology.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Neutral Infrastructure
                </h3>
                <p className="text-sm text-muted-foreground">
                  MaxFlow computes signals; applications decide meaning. The same score might 
                  gate lending, governance, or access—that's up to integrators.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
