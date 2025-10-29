import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search, Users, Award, TrendingUp, BarChart3, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface BlueskyAnalysisResult {
  identifier: string;
  did: string;
  stats: {
    follows: number;
    followers: number;
    totalUsers: number;
    acceptedUsers: number;
    avgSTS: number;
  };
  networkMetrics: {
    totalAccepted: number;
    avgFlow: number;
    avgMinCut: number;
    p95Flow: number;
  };
  advancedAnalysis: {
    bottlenecks: Array<{
      address: string;
      minCut: number;
      flow: number;
      vulnerabilityScore: number;
      sts: number;
    }>;
    centralization: {
      top10FlowShare: number;
      status: 'low' | 'moderate' | 'high';
    };
    influentialNodes: Array<{
      address: string;
      flow: number;
      depth: number;
      influence: number;
      sts: number;
    }>;
  };
  scores: Array<{
    address: string;
    sts: number;
    tier: string | null;
    flow: number;
    minCut: number;
    depth: number;
    stability: number;
  }>;
}

export default function BlueskyExplorer() {
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<BlueskyAnalysisResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', '/api/bluesky/analyze', { identifier: id });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setResult(data);
      setSearchTerm("");
      setTierFilter("all");
      setCurrentPage(1);
    },
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim()) {
      analyzeMutation.mutate(identifier.trim());
    }
  };

  const getTierColor = (tier: string | null) => {
    switch (tier) {
      case "Master": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Journeyer": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Apprentice": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-muted/10 text-muted-foreground border-border";
    }
  };

  // Filter and search scores
  const filteredScores = useMemo(() => {
    if (!result) return [];
    
    let filtered = result.scores;
    
    // Apply tier filter
    if (tierFilter !== "all") {
      filtered = filtered.filter(s => {
        if (tierFilter === "not-accepted") return s.tier === null;
        return s.tier === tierFilter;
      });
    }
    
    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [result, tierFilter, searchTerm]);

  // Pagination
  const paginatedScores = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredScores.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredScores, currentPage]);

  const totalPages = Math.ceil(filteredScores.length / itemsPerPage);

  // Tier distribution for chart
  const tierCounts = result?.scores.reduce((acc, s) => {
    const tier = s.tier || "Not Accepted";
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tierData = tierCounts ? Object.entries(tierCounts).map(([tier, count]) => ({
    name: tier,
    value: count,
    percentage: ((count / result!.scores.length) * 100).toFixed(1)
  })) : [];

  const TIER_COLORS = {
    "Master": "#f59e0b",
    "Journeyer": "#3b82f6",
    "Apprentice": "#10b981",
    "Not Accepted": "#6b7280"
  };

  // STS distribution histogram
  const stsHistogram = useMemo(() => {
    if (!result) return [];
    
    const bins = [
      { range: "0-10", min: 0, max: 10, count: 0 },
      { range: "10-20", min: 10, max: 20, count: 0 },
      { range: "20-30", min: 20, max: 30, count: 0 },
      { range: "30-40", min: 30, max: 40, count: 0 },
      { range: "40-50", min: 40, max: 50, count: 0 },
      { range: "50-60", min: 50, max: 60, count: 0 },
      { range: "60-70", min: 60, max: 70, count: 0 },
      { range: "70-80", min: 70, max: 80, count: 0 },
      { range: "80-90", min: 80, max: 90, count: 0 },
      { range: "90-100", min: 90, max: 100, count: 0 },
    ];
    
    result.scores.forEach(score => {
      const bin = bins.find(b => score.sts >= b.min && score.sts < b.max);
      if (bin) bin.count++;
    });
    
    return bins.filter(b => b.count > 0);
  }, [result]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold" data-testid="text-title">
            Bluesky Trust Explorer
          </h1>
          <p className="text-lg text-muted-foreground" data-testid="text-description">
            Analyze Bluesky social graphs using TrustFlow's max-flow scoring algorithm
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analyze a Bluesky Account</CardTitle>
            <CardDescription>
              Enter a Bluesky handle (e.g., alice.bsky.social) or DID to analyze their network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Bluesky Handle or DID</Label>
                <div className="flex gap-2">
                  <Input
                    id="identifier"
                    data-testid="input-bluesky-identifier"
                    placeholder="alice.bsky.social or did:plc:..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={analyzeMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    data-testid="button-analyze"
                    disabled={analyzeMutation.isPending || !identifier.trim()}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
              </div>

              {analyzeMutation.isPending && (
                <Alert data-testid="alert-loading">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fetching network data from Bluesky... This may take a moment for large networks.
                  </AlertDescription>
                </Alert>
              )}

              {analyzeMutation.isError && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(analyzeMutation.error as any)?.message || "Failed to analyze Bluesky network"}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Overview</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {result.identifier} ({result.did})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1" data-testid="card-metric-follows">
                    <div className="text-sm text-muted-foreground">Follows</div>
                    <div className="text-2xl font-bold">{result.stats.follows}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-followers">
                    <div className="text-sm text-muted-foreground">Followers</div>
                    <div className="text-2xl font-bold">{result.stats.followers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-total-users">
                    <div className="text-sm text-muted-foreground">Total Users</div>
                    <div className="text-2xl font-bold">{result.stats.totalUsers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-accepted">
                    <div className="text-sm text-muted-foreground">Accepted</div>
                    <div className="text-2xl font-bold text-green-500">{result.stats.acceptedUsers}</div>
                  </div>
                  <div className="space-y-1" data-testid="card-metric-avg-sts">
                    <div className="text-sm text-muted-foreground">Avg STS</div>
                    <div className="text-2xl font-bold">{result.stats.avgSTS}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    STS Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stsHistogram}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Tier Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.name as keyof typeof TIER_COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Network Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center" data-testid="text-avg-flow">
                    <span className="text-sm text-muted-foreground">Average Flow</span>
                    <span className="font-semibold">{result.networkMetrics.avgFlow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center" data-testid="text-avg-mincut">
                    <span className="text-sm text-muted-foreground">Average Min-Cut</span>
                    <span className="font-semibold">{result.networkMetrics.avgMinCut.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center" data-testid="text-p95-flow">
                    <span className="text-sm text-muted-foreground">P95 Flow</span>
                    <span className="font-semibold">{result.networkMetrics.p95Flow.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Tier Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tierData
                    .sort((a, b) => {
                      const order = ["Master", "Journeyer", "Apprentice", "Not Accepted"];
                      return order.indexOf(a.name) - order.indexOf(b.name);
                    })
                    .map((tier) => (
                      <div key={tier.name} className="flex justify-between items-center" data-testid={`tier-${tier.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        <Badge variant="outline" className={getTierColor(tier.name === "Not Accepted" ? null : tier.name)}>
                          {tier.name}
                        </Badge>
                        <span className="font-semibold">{tier.value} ({tier.percentage}%)</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            {result.advancedAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Network Analysis</CardTitle>
                    <CardDescription>Centralization risks and network bottlenecks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Centralization Risk</h4>
                        <Badge 
                          variant="outline" 
                          className={
                            result.advancedAnalysis.centralization.status === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            result.advancedAnalysis.centralization.status === 'moderate' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-green-500/10 text-green-500 border-green-500/20'
                          }
                        >
                          {result.advancedAnalysis.centralization.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Top 10 users control {(result.advancedAnalysis.centralization.top10FlowShare * 100).toFixed(1)}% of total network flow
                      </p>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            result.advancedAnalysis.centralization.status === 'high' ? 'bg-red-500' :
                            result.advancedAnalysis.centralization.status === 'moderate' ? 'bg-amber-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${result.advancedAnalysis.centralization.top10FlowShare * 100}%` }}
                        />
                      </div>
                    </div>

                    {result.advancedAnalysis.bottlenecks.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Network Bottlenecks (Top 5)</h4>
                        <div className="space-y-2">
                          {result.advancedAnalysis.bottlenecks.slice(0, 5).map((bottleneck, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 rounded hover-elevate border">
                              <div className="flex-1 font-mono text-xs">{bottleneck.address}</div>
                              <div className="flex gap-4 items-center">
                                <span className="text-muted-foreground">Min-Cut: {bottleneck.minCut}</span>
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                  Vulnerability: {(bottleneck.vulnerabilityScore * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          * Lower vulnerability score = higher risk of network fragmentation if node is compromised
                        </p>
                      </div>
                    )}

                    {result.advancedAnalysis.influentialNodes.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Most Influential Nodes (Top 5)</h4>
                        <div className="space-y-2">
                          {result.advancedAnalysis.influentialNodes.slice(0, 5).map((node, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 rounded hover-elevate border">
                              <div className="flex-1 font-mono text-xs">{node.address}</div>
                              <div className="flex gap-4 items-center">
                                <span className="text-muted-foreground">Depth: {node.depth}</span>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                  Influence: {node.influence}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          * Influence = flow per hop distance from seed (higher = more direct access to trust)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    All Scores ({filteredScores.length} users)
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Search by DID..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        data-testid="input-search-scores"
                      />
                    </div>
                    <Select value={tierFilter} onValueChange={(value) => {
                      setTierFilter(value);
                      setCurrentPage(1);
                    }}>
                      <SelectTrigger className="w-[180px]" data-testid="select-tier-filter">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Journeyer">Journeyer</SelectItem>
                        <SelectItem value="Apprentice">Apprentice</SelectItem>
                        <SelectItem value="not-accepted">Not Accepted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Rank</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">DID</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">STS</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Tier</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Flow</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Min-Cut</th>
                        <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Depth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedScores.map((score, idx) => {
                        const globalRank = (currentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr key={score.address} className="border-b hover-elevate" data-testid={`row-score-${idx}`}>
                            <td className="py-2 px-2 text-sm">{globalRank}</td>
                            <td className="py-2 px-2 text-sm font-mono text-xs">
                              {score.address.substring(0, 30)}...
                            </td>
                            <td className="py-2 px-2 text-sm font-semibold">{score.sts}</td>
                            <td className="py-2 px-2 text-sm">
                              <Badge variant="outline" className={getTierColor(score.tier)}>
                                {score.tier || "None"}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-sm">{score.flow}</td>
                            <td className="py-2 px-2 text-sm">{score.minCut}</td>
                            <td className="py-2 px-2 text-sm">{score.depth}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredScores.length)} of {filteredScores.length} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2 px-4">
                        <span className="text-sm">Page {currentPage} of {totalPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert data-testid="alert-info">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This analysis runs TrustFlow's Sybil-resistant scoring algorithm on Bluesky's social graph.
                It treats the selected user as the seed and analyzes their complete follow/follower network (up to 5,000 connections).
                Results are computed in real-time and not stored.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
