import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from '@/hooks/useWallet';
import { ComponentsBreakdown } from "@/components/ComponentsBreakdown";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Info, Network, Shield, GitBranch, Leaf, TreePine, Waves } from "lucide-react";

export default function WhyScore() {
  const { isConnected, address } = useWallet();

  const { data: scoreData, isLoading: isLoadingScore } = useQuery<{
    didResolved: string;
    sts: number;
    components: {
      flow: number;
      minCut: number;
      stability: number;
      depth: number;
      pageRank: number;
    };
    normalizedComponents?: {
      flow: number;
      minCut: number;
      stability: number;
      depth: number;
      pageRank: number;
    };
    tier: string | null;
    percentile: number;
    isAccepted: boolean;
  } | null>({
    queryKey: [`/api/score/${address}`],
    enabled: isConnected && !!address,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Why This Score?</h1>
        <p className="text-muted-foreground">
          Understanding neutral graph signal computation and how applications interpret these signals
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Personal Network Score (LocalHealth)
            </CardTitle>
            <CardDescription>
              Neutral graph signal measuring your network quality (0-100)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How LocalHealth Works</h3>
                <p className="text-sm text-muted-foreground">
                  Your <strong>LocalHealth score (0-100)</strong> is a neutral graph signal measuring network connectivity strength based on incoming vouches 
                  and network depth. It uses quadratic exponential scaling (2.0 exponent) for strict score distribution. <strong>This is infrastructure-level computation</strong>—applications interpret the signal based on their context (creditworthiness, governance eligibility, etc.).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="p-3 rounded bg-muted/30">
                  <div className="text-sm font-semibold flex items-center gap-1">
                    <Waves className="w-3 h-3 text-blue-500" />
                    Flow Component (60%)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Direct flow from vouchers to you, normalized by healthy baseline (5 vouches)
                  </div>
                  <div className="text-[0.65rem] mt-1 italic" style={{ color: 'hsl(var(--score-growth) / 0.7)' }}>
                    Like rivers finding paths to the sea through network topology
                  </div>
                </div>
                <div className="p-3 rounded bg-muted/30">
                  <div className="text-sm font-semibold flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Min-Cut Component (40%)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    True min-cut via Dinic's algorithm + depth bonus + vertex-disjoint paths
                  </div>
                  <div className="text-[0.65rem] mt-1 italic" style={{ color: 'hsl(var(--score-dormant) / 0.7)' }}>
                    Like forest mycorrhizal networks—multiple paths = resilience
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm">Score Distribution (Quadratic Scaling)</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">1 vouch, minimal network</span>
                    <Badge variant="outline">~2-3 pts</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">3 vouches, basic network</span>
                    <Badge variant="outline">~18 pts</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">5 vouches, solid depth</span>
                    <Badge variant="outline">~61 pts</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">10 vouches, rich connectivity</span>
                    <Badge variant="outline">~74 pts</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Why Endorsements Stay Meaningful: Built-In Accountability
                </h3>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Your score is influenced by who YOU vouch for
                  </p>
                  <p className="text-xs text-muted-foreground mb-1">
                    This two-way accountability is the core anti-Sybil mechanism. Vouching for {'>'}10 people applies a penalty to your min-cut component (40% of total score), creating economic cost to spam.
                  </p>
                  <p className="text-[0.65rem] text-amber-700/70 dark:text-amber-300/70 mb-3 italic">
                    Like ecosystems: organisms that take without contributing get naturally pruned from symbiotic networks.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Penalty grows linearly:</strong> 10% per vouch beyond 10, capped at 50% on redundancy
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Impact varies by redundancy:</strong> ~10-15% typical score reduction, up to ~20% for high-redundancy networks with 50% penalty
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <strong>Result:</strong> Users vouch selectively to preserve their redundancy score → reliable graph signals
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold mb-2 text-sm">Additional Anti-Gaming Mechanisms</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-xs mb-1">Quadratic Scaling</h4>
                    <p className="text-xs text-muted-foreground">
                      Exponential scaling (2.0) creates wider score discrimination: single vouches yield low scores (~2 pts), 
                      while high scores require dense multi-hop network topology (~74 pts).
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
                      <TreePine className="w-3 h-3" style={{ color: 'hsl(var(--score-canopy))' }} />
                      Recursive Weighting
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Vouches are weighted by voucher's LocalHealth score. A vouch from someone with a high score carries more weight 
                      than one from someone with a low score—making score bootstrapping computationally expensive.
                    </p>
                    <p className="text-[0.65rem] mt-1 italic" style={{ color: 'hsl(var(--score-growth) / 0.7)' }}>
                      Like root systems: stronger roots get more nutrients, enabling more growth
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Understanding Flow vs. STS</CardTitle>
            <CardDescription>
              Two neutral graph signals: raw algorithm output and standardized score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Raw Flow (Pure Algorithm Output)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>flow value</strong> is the actual max-flow capacity from seed nodes to you, 
                  measured in capacity units. This is what the Ford-Fulkerson max-flow algorithm computes 
                  directly, representing the total network capacity that can reach you through independent 
                  paths. <strong>It's a neutral metric</strong>—applications interpret it differently.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li>Unbounded value (can be any positive number)</li>
                  <li>Direct algorithm output (no post-processing)</li>
                  <li>Grows as network size and connectivity increase</li>
                  <li>Comparable across epochs with similar network structure</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Standardized Network Score (STS)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>STS</strong> combines five normalized graph components into a 0-100 scale for easier interpretation. 
                  It's not just flow—it's a weighted combination of multiple network quality metrics. <strong>This is still a neutral signal</strong>; applications assign meaning based on their context.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-xs font-semibold">Flow (55%)</div>
                    <div className="text-xs text-muted-foreground">Max-flow capacity</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-xs font-semibold">Min-Cut (25%)</div>
                    <div className="text-xs text-muted-foreground">Path redundancy</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-xs font-semibold">Stability (5%)</div>
                    <div className="text-xs text-muted-foreground">Network resilience</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-xs font-semibold">Depth (10%)</div>
                    <div className="text-xs text-muted-foreground">Proximity to seeds</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30 col-span-2">
                    <div className="text-xs font-semibold flex items-center gap-1">
                      PageRank (5%) <Badge variant="outline" className="text-[0.6rem]">New</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Network embeddedness</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm">Why Show Both?</h3>
                <p className="text-xs text-muted-foreground">
                  Flow is the pure algorithm output, showing absolute graph capacity. STS makes signals 
                  human-readable and comparable. Together, they provide transparency: you see both the raw 
                  computation and the normalized score. <strong>Both are neutral signals</strong>—your application assigns meaning.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Why Neutral? Infrastructure vs. Application Layer
            </CardTitle>
            <CardDescription>
              MaxFlow computes verifiable graph metrics—applications interpret them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Neutral Signal Computation</h3>
                <p className="text-sm text-muted-foreground">
                  MaxFlow is <strong>graph signal infrastructure</strong>, not an application. The algorithm computes neutral, verifiable metrics:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li><strong>Flow capacity:</strong> How much network strength flows to you</li>
                  <li><strong>Redundancy (min-cut):</strong> How many independent paths connect you</li>
                  <li><strong>Stability:</strong> How resilient your network position is</li>
                  <li><strong>Depth:</strong> Your proximity to trusted nodes</li>
                  <li><strong>Connectivity:</strong> Your overall network embeddedness</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  These are mathematical properties of your graph position—not judgments about trustworthiness, creditworthiness, or reputation.
                </p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Applications Assign Meaning</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The <strong>same neutral score</strong> can mean different things to different applications:
                </p>
                <div className="grid gap-2">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-semibold mb-1">Credit/Lending Application</div>
                    <div className="text-xs text-muted-foreground">
                      Interprets LocalHealth ≥ 60 as "eligible for micro-loan" based on network connectivity
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-semibold mb-1">Governance Application</div>
                    <div className="text-xs text-muted-foreground">
                      Uses STS to weight voting power: STS 80 = 2x vote weight vs. STS 40
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-semibold mb-1">Access Control Application</div>
                    <div className="text-xs text-muted-foreground">
                      Gates premium features at STS ≥ 60 + min-cut ≥ 2 for Sybil resistance
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-sm font-semibold mb-1">Airdrop Application</div>
                    <div className="text-xs text-muted-foreground">
                      Distributes tokens proportionally: 1000 tokens × (STS/100) to prevent bot farming
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t rounded-lg p-4" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <h3 className="font-semibold mb-2 text-sm">Infrastructure Principle</h3>
                <p className="text-xs text-muted-foreground">
                  <strong>MaxFlow provides the "what" (verifiable graph signals), not the "why" (interpretation).</strong> The algorithm computes flow and redundancy; your application decides what those signals mean in your context. This separation keeps the infrastructure neutral, auditable, and reusable across diverse use cases—from credit scoring to governance to content curation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isConnected && scoreData?.normalizedComponents ? (
          <ComponentsBreakdown 
            components={scoreData.normalizedComponents}
            isLoading={isLoadingScore}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Score Components</CardTitle>
              <CardDescription>
                Detailed breakdown of the factors contributing to your STS
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8">
              {!isConnected ? (
                <p className="text-sm text-muted-foreground text-center">
                  Connect your wallet to view your network quality score breakdown
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your score breakdown will appear here after:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>You receive vouches from users in the network</li>
                    <li>An epoch computation runs to calculate max-flow paths</li>
                    <li>Your STS (Standardized Network Score) components are computed</li>
                  </ul>
                  <p className="text-sm text-muted-foreground pt-4">
                    The score breakdown shows five neutral graph components:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li><strong>Flow (55%):</strong> Max-flow capacity from seeds (neutral signal)</li>
                    <li><strong>Min-Cut (25%):</strong> Path redundancy (Sybil resistance metric)</li>
                    <li><strong>Stability (5%):</strong> Network resilience (connectivity strength)</li>
                    <li><strong>Depth (10%):</strong> Proximity to seed nodes (graph distance)</li>
                    <li><strong>PageRank (5%):</strong> Network embeddedness (connectivity metric)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground pt-3">
                    <strong>Remember:</strong> These are neutral graph signals. Applications interpret them differently based on context.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Seed Quality & Network Health</CardTitle>
            <CardDescription>
              Seeds are continuously scored on neutral graph quality metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To prevent a few compromised seeds from polluting the entire network, <strong>seeds themselves receive neutral quality scores</strong> based on graph metrics:
              </p>

              <div className="grid gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Predictive Validity</h4>
                  <p className="text-xs text-muted-foreground">
                    Do users vouched by this seed stay accepted even if the seed is removed? High scores mean resilient, 
                    well-connected communities.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Downstream Quality</h4>
                  <p className="text-xs text-muted-foreground">
                    What's the average network score of users primarily influenced by this seed? Quality seeds build quality networks.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Diversity Lift</h4>
                  <p className="text-xs text-muted-foreground">
                    How many distinct communities does this seed reach? Diverse reach prevents capture by single groups.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm mb-1">Centralization Check</h4>
                  <p className="text-xs text-muted-foreground">
                    Seeds that dominate too much of the total flow get penalized to prevent over-reliance on any single source.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <h4 className="font-semibold text-sm mb-2">How Seed Scores Work</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Each seed gets a score from 0-1. This score:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Multiplies the seed's capacity (0.7x to 1.3x) - better seeds can vouch for more users</li>
                  <li>Determines if it counts toward the "≥2 seeds" acceptance requirement (needs score ≥0.6)</li>
                  <li>Creates a feedback loop: good seeds strengthen the network, weak seeds self-throttle</li>
                </ul>
              </div>

              <div className="pt-3 border-t rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--score-transition) / 0.1)' }}>
                <h4 className="font-semibold text-sm mb-1">Why This Matters for Vulnerable Communities</h4>
                <p className="text-xs text-muted-foreground">
                  Without seed scoring, compromising 1-2 seeds could pollute the entire graph. With it, attackers need to 
                  compromise <strong>multiple high-quality seeds across different communities</strong> - dramatically harder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
