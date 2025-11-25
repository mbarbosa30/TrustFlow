import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Network, Shield, GitBranch, CheckCircle2, Users, ArrowRight, 
  Vote, Banknote, Gift, Building2, Code, Eye, Zap, Lock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  const { data: stats } = useQuery<{
    totalUsers: number;
    totalEndorsements: number;
    totalEndorsers: number;
    totalEndorsees: number;
    avgSTS: number;
  }>({
    queryKey: ['/api/stats'],
  });

  return (
    <div className="min-h-screen">

      <section className="relative py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-6" data-testid="badge-hero-tag">
            <Shield className="w-3 h-3 mr-1" />
            Reputation Infrastructure
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight max-w-4xl mx-auto" data-testid="text-hero-headline">
            Trust Scores That{" "}
            <span className="text-primary">Can't Be Gamed</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10" data-testid="text-hero-subheadline">
            MaxFlow turns "who vouches for you" into verifiable scores. 
            Use them for governance, lending, grants, or access control—you decide what they mean.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Link href="/simulation">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-try-demo">
                Try the Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/whitepaper">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-read-whitepaper">
                Read the Whitepaper
              </Button>
            </Link>
          </div>

          {stats && stats.totalUsers > 0 && (
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div className="text-center" data-testid="stat-users">
                <div className="text-2xl md:text-3xl font-bold">
                  {stats.totalUsers.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Users</div>
              </div>
              <div className="text-center" data-testid="stat-endorsements">
                <div className="text-2xl md:text-3xl font-bold">
                  {stats.totalEndorsements.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Vouches</div>
              </div>
              <div className="text-center" data-testid="stat-avg-score">
                <div className="text-2xl md:text-3xl font-bold">
                  {Math.round(stats.avgSTS)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Avg Score</div>
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
                  Ensure grants go to real contributors.
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
              Simple endorsements become powerful, Sybil-resistant signals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="step-vouch">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Vouch for People</h3>
              <p className="text-muted-foreground text-sm">
                Endorse people you trust. Each vouch is public and permanent—creating real accountability.
              </p>
            </div>

            <div className="text-center" data-testid="step-compute">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Scores Are Computed</h3>
              <p className="text-muted-foreground text-sm">
                Your score depends on who vouches for you—and their scores depend on who vouches for them. Recursive trust.
              </p>
            </div>

            <div className="text-center" data-testid="step-use">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Use Your Score</h3>
              <p className="text-muted-foreground text-sm">
                Export verifiable credentials. Apps use your score for voting, lending, access—whatever they need.
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
              Fake accounts vouching for each other can't bootstrap high scores
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-feature-recursive">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Network className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Recursive Trust</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A vouch from a high-score user matters more than one from a low-score user. 
                  Sybil clusters can't bootstrap themselves.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-redundancy">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Path Redundancy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  One endorser isn't enough. We measure how many independent paths connect you to trusted seeds.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-accountability">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">Vouch Accountability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Vouching for too many people dilutes your own score. No free lunch for "vouch merchants."
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
            Connect your wallet to get started. Build your network, earn your score, and export verifiable credentials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/overview">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-primary">
                Connect Wallet
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
