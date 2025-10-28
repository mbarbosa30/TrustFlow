import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, Shield, GitBranch, CheckCircle2, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";

const landingNavItems = [
  { path: "/how-it-works", label: "How It Works" },
  { path: "/use-cases", label: "Use Cases" },
  { path: "/faqs", label: "FAQs" },
];

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
      <Header navItems={landingNavItems} variant="landing" />

      <section className="relative py-20 md:py-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-6" data-testid="badge-hero-tag">
            <Network className="w-3 h-3 mr-1" />
            Graph-Based Trust Network
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight max-w-4xl mx-auto" data-testid="text-hero-headline">
            Sybil-Resistant Trust Using{" "}
            <span className="text-primary">Max-Flow/Min-Cut Algorithms</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto mb-10" data-testid="text-hero-subheadline">
            Convert public peer vouches into verifiable trust scores using network flow computation. 
            Not simple vote counting—real graph algorithms with complete transparency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/overview">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-learn-more">
                How It Works
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center" data-testid="stat-users">
              <div className="text-3xl md:text-4xl font-bold">
                {stats?.totalUsers.toLocaleString() || "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Network Users</div>
            </div>
            <div className="text-center" data-testid="stat-endorsements">
              <div className="text-3xl md:text-4xl font-bold">
                {stats?.totalEndorsements.toLocaleString() || "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Vouches</div>
            </div>
            <div className="text-center" data-testid="stat-avg-score">
              <div className="text-3xl md:text-4xl font-bold">
                {stats?.avgSTS ? Math.round(stats.avgSTS) : "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Average STS</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-features-heading">
              Why Max-Flow/Min-Cut?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Traditional reputation systems count votes. TrustFlow uses network flow algorithms 
              from a curated seed set—making Sybil attacks exponentially harder.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card data-testid="card-feature-max-flow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <GitBranch className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Max-Flow Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Uses Dinic's algorithm to compute trust flow from verified seeds through the endorsement graph. 
                  Your score (55% weight) is based on how much flow reaches you—not just who endorsed you.
                </p>
                <div className="mt-4 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  Flow Component = 55% of STS
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-min-cut">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Min-Cut Redundancy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Measures path redundancy—how many independent paths connect you to seeds. 
                  A single endorsement isn't enough; you need multiple disjoint routes (25% weight).
                </p>
                <div className="mt-4 text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  Cut Component = 25% of STS
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-transparency">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Fully Transparent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  All vouches are publicly visible and stored on-chain in a Merkle transparency log. 
                  This enables complete auditability and independent verification of trust scores. 
                  Trust through transparency, not obscurity.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feature-verifiable">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Verifiable & Reproducible</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Every epoch publishes Merkle roots for seeds and graph state, plus scoring parameters. 
                  Anyone can recompute and verify byte-exact results. Trust through transparency.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" data-testid="text-how-heading">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Four simple steps to build portable trust credentials
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex gap-6 items-start" data-testid="step-endorse">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Vouch for People You Trust</h3>
                <p className="text-muted-foreground">
                  Simple binary vouches—you either vouch for someone or you don't. 
                  All vouches are public and permanently recorded on-chain in the Merkle transparency log 
                  for complete auditability.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start" data-testid="step-compute">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">System Runs Flow Algorithms</h3>
                <p className="text-muted-foreground">
                  Each epoch, we construct an Advogato-style graph and run max-flow/min-cut computation 
                  (Dinic/preflow-push). Your score combines Flow (55%), Cut (25%), Stability (10%), and Depth (10%).
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start" data-testid="step-receive">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Receive Your Standardized Trust Score</h3>
                <p className="text-muted-foreground">
                  Get an STS (0-100) and tier badge (Apprentice, Journeyer, Master). 
                  See detailed breakdowns, trust paths, and stability metrics.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start" data-testid="step-export">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Export Portable Credentials</h3>
                <p className="text-muted-foreground">
                  Download signed attestations (JWT/VC format) to prove your trust score to third-party apps. 
                  Verifiable anywhere, anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-heading">
            Ready to Build Your Trust Score?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the transparent trust network and start earning verifiable credentials based on 
            graph algorithms, not popularity contests.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/overview">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-primary">
                Connect Wallet & Start
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/use-cases">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-cta-secondary">
                View Use Cases
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
