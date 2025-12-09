import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Network, Shield, GitBranch, CheckCircle2, Users, ArrowRight, 
  Vote, Banknote, Gift, Building2, Code, Eye, Zap, Lock, Leaf, TreePine,
  Activity, TrendingUp, Heart
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

export default function Landing() {
  const { data: traction } = useQuery<NetworkTraction>({
    queryKey: ['/api/stats/network-traction'],
  });

  return (
    <div className="min-h-screen">

      <section className="relative py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-6" data-testid="badge-hero-tag">
            <Leaf className="w-3 h-3 mr-1" />
            Graph Signal Infrastructure
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight max-w-4xl mx-auto" data-testid="text-hero-headline">
            Trust,{" "}
            <span className="text-primary">Computed Naturally</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8" data-testid="text-hero-subheadline">
            Sybil-resistant graph algorithms measuring flow, redundancy, and resilience — the same patterns that make ecosystems ungameable.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-dashboard">
                Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/whitepaper">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-read-whitepaper">
                Read the Whitepaper
              </Button>
            </Link>
          </div>

          {traction && traction.totalVouchers > 0 && (
            <div className="mt-12 grid grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div className="text-center" data-testid="stat-vouchers">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {traction.totalVouchers.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Vouchers</div>
              </div>
              <div className="text-center" data-testid="stat-vouches">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {traction.totalVouches.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Vouches</div>
              </div>
              <div className="text-center" data-testid="stat-scored-users">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {traction.scoredUsers}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Scored Users</div>
              </div>
              <div className="text-center" data-testid="stat-avg-signal">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {traction.avgLocalHealth}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Avg Signal</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-use-cases-heading">
              What Can You Build?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              MaxFlow provides the signal. Your application decides what it means.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover-elevate" data-testid="card-usecase-governance">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Vote className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">DAO Governance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Weight votes by network trust instead of token holdings. 
                  Reduce plutocracy and Sybil attacks on proposals.
                </p>
                <Link href="/use-cases">
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-learn-governance">
                    Learn More <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-usecase-lending">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Microlending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Assess creditworthiness through social collateral. 
                  Lend to people your network trusts.
                </p>
                <Link href="/credit">
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-learn-lending">
                    Learn More <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-usecase-grants">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Grant Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Run quadratic funding with Sybil-resistant weights. 
                  Prevent fake accounts from diluting allocation.
                </p>
                <Link href="/use-cases">
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-learn-grants">
                    Learn More <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover-elevate" data-testid="card-usecase-access">
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Access Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Gate communities, features, or airdrops by trust score. 
                  Keep out bots and bad actors.
                </p>
                <Link href="/communities">
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-learn-access">
                    Learn More <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-how-heading">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three steps. Graph math. Natural resilience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="step-vouch">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Build Connections</h3>
              <p className="text-muted-foreground text-sm">
                Vouch for people you trust. Each endorsement is public and on-chain. Your reputation is at stake.
              </p>
              <p className="text-xs text-primary/70 italic mt-2">
                Like roots extending through soil — growth has a cost.
              </p>
            </div>

            <div className="text-center" data-testid="step-compute">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Network className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Flow Computes</h3>
              <p className="text-muted-foreground text-sm">
                Max-flow algorithms score your network. Your score depends on the strength of your connections — and theirs. Recursive. Recursive. Recursive.
              </p>
              <p className="text-xs text-primary/70 italic mt-2">
                Like rivers finding paths — flow optimizes naturally.
              </p>
            </div>

            <div className="text-center" data-testid="step-use">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Signal Ships</h3>
              <p className="text-muted-foreground text-sm">
                Export verifiable credentials. Apps interpret your score for governance, lending, access — whatever they need.
              </p>
              <p className="text-xs text-primary/70 italic mt-2">
                Like ecosystems bearing fruit — signals become value.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-why-heading">
              Why MaxFlow?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Proven algorithms. Natural resilience. Ungameable by design.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-feature-recursive">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <TreePine className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Recursive Trust</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  A vouch from a high-score user matters more. Sybil clusters can't bootstrap themselves.
                </p>
                <p className="text-xs text-primary/70 italic">
                  Like root systems: stronger roots get more nutrients, enabling more growth.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-redundancy">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Path Redundancy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  One endorser isn't enough. We measure how many independent paths connect you to trusted seeds.
                </p>
                <p className="text-xs text-primary/70 italic">
                  Like mycorrhizal networks: forests survive because multiple paths carry nutrients.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-accountability">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Natural Pruning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Vouching for too many people dilutes your own score. No free lunch for "vouch merchants."
                </p>
                <p className="text-xs text-primary/70 italic">
                  Like ecosystems: organisms that over-extend get pruned by the network itself.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-transparent">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Fully Transparent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All vouches are public. Anyone can audit the graph and verify scores independently.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-neutral">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Neutral Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We compute signals. You interpret them. MaxFlow doesn't decide who's "good"—your app does.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-verifiable">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Verifiable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Deterministic computation from public data. Recompute any score yourself.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-green-600 border-green-600/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              December 2025 Release
            </Badge>
            <h2 className="text-3xl font-bold mb-3" data-testid="text-security-heading">
              Security Hardened
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The latest algorithm enhancements make MaxFlow even harder to game
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-green-500/20 bg-green-500/5" data-testid="card-security-disjoint">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Vertex-Disjoint Paths</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Not just multiple paths—we count truly independent paths with no shared nodes. 
                  Much harder to fake than edge-disjoint.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-green-500/5" data-testid="card-security-dilution">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <GitBranch className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Piecewise Dilution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Smooth, continuous penalty curve for over-vouching. No sharp cliffs—just 
                  gradual accountability that scales naturally.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-500/20 bg-green-500/5" data-testid="card-security-adaptive">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                  <Network className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Adaptive Baselines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "Healthy" thresholds computed dynamically from network percentiles. 
                  Fair scoring whether the network has 10 or 10,000 users.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {traction && traction.totalVouchers > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Activity className="w-3 h-3 mr-1" />
                Live Signal Stats
              </Badge>
              <h2 className="text-3xl font-bold mb-3" data-testid="text-traction-heading">
                Network Traction
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real-time computed signal indicators showing graph health and evolution
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card data-testid="card-traction-density">
                <CardContent className="pt-6 text-center">
                  <Network className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold mb-1">{traction.graphDensity}%</div>
                  <div className="text-sm text-muted-foreground">Graph Density</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Edge connections vs maximum possible
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-traction-vouches-per-user">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold mb-1">{traction.avgVouchesPerUser}</div>
                  <div className="text-sm text-muted-foreground">Avg Vouches/Scored User</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Network connectivity depth
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-traction-quality">
                <CardContent className="pt-6 text-center">
                  <Shield className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-green-600 mb-1">{traction.dilutionZones.qualityPercent}%</div>
                  <div className="text-sm text-muted-foreground">Quality Vouchers</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vouchers with ≤10 outgoing vouches
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-traction-participants">
                <CardContent className="pt-6 text-center">
                  <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold mb-1">{traction.totalParticipants}</div>
                  <div className="text-sm text-muted-foreground">Graph Participants</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Unique addresses in the graph
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Signal Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-red-600">Critical (&lt;40)</span>
                      <span className="text-sm font-medium">{traction.healthDistribution.critical}</span>
                    </div>
                    <Progress value={traction.scoredUsers > 0 ? (traction.healthDistribution.critical / traction.scoredUsers) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-yellow-600">Warning (40-60)</span>
                      <span className="text-sm font-medium">{traction.healthDistribution.warning}</span>
                    </div>
                    <Progress value={traction.scoredUsers > 0 ? (traction.healthDistribution.warning / traction.scoredUsers) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-blue-600">Healthy (60-80)</span>
                      <span className="text-sm font-medium">{traction.healthDistribution.healthy}</span>
                    </div>
                    <Progress value={traction.scoredUsers > 0 ? (traction.healthDistribution.healthy / traction.scoredUsers) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-green-600">Quality (80-100)</span>
                      <span className="text-sm font-medium">{traction.healthDistribution.quality}</span>
                    </div>
                    <Progress value={traction.scoredUsers > 0 ? (traction.healthDistribution.quality / traction.scoredUsers) * 100 : 0} className="h-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic mt-4 text-center">
                  Like rivers carving paths through terrain — scores flow through the network, strengthening over time.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-audiences-heading">
              Get Started
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're building an app or just exploring, there's a path for you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-primary/30" data-testid="card-audience-builder">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>I'm a Builder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Integrate MaxFlow scores into your app via our REST API. 
                  Get trust signals for users without building your own reputation system.
                </p>
                <Link href="/api-docs">
                  <Button className="w-full" data-testid="button-cta-api">
                    View API Docs
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-primary/30" data-testid="card-audience-community">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>I Run a Community</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a community with your own seeds and policies. 
                  Use scores for access control, lending, or governance.
                </p>
                <Link href="/communities">
                  <Button className="w-full" data-testid="button-cta-community">
                    Create Community
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-primary/30" data-testid="card-audience-curious">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>I'm Curious</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Explore the algorithm with our interactive simulation. 
                  See how Sybil attacks fail against max-flow scoring.
                </p>
                <Link href="/simulation">
                  <Button className="w-full" data-testid="button-cta-simulation">
                    Try Simulation
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-heading">
            Ready to Build Sybil-Resistant Reputation?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Integrate MaxFlow's Sybil-resistant scoring into your application. Access our public API for verifiable reputation signals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/api-docs">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-primary">
                API Documentation
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-cta-secondary">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
