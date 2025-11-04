import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from '@/hooks/useWallet';
import { ComponentsBreakdown } from "@/components/ComponentsBreakdown";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Info, Network, Shield, GitBranch } from "lucide-react";

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
          Detailed score breakdowns and explainability are computed during epoch runs
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
              Your personal trust network quality score using quadratic scaling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How LocalHealth Works</h3>
                <p className="text-sm text-muted-foreground">
                  Your <strong>LocalHealth score (0-100)</strong> measures "how much the network trusts you" based on incoming vouches 
                  and network depth. It uses quadratic exponential scaling (2.0 exponent) for strict score distribution.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="p-3 rounded bg-muted/30">
                  <div className="text-sm font-semibold">Flow Component (60%)</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Direct flow from vouchers to you, normalized by healthy baseline (5 vouches)
                  </div>
                </div>
                <div className="p-3 rounded bg-muted/30">
                  <div className="text-sm font-semibold">Redundancy Component (40%)</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Network depth and connectivity: vouch count + upstream supporters + edge density
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
                    <span className="text-muted-foreground">3 vouches, basic trust</span>
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
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Anti-Gaming Mechanisms
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-xs mb-1">Dilution Penalty</h4>
                    <p className="text-xs text-muted-foreground">
                      Vouching for too many people (more than 10) reduces your redundancy component by 10% per excess vouch, 
                      capped at 50% reduction. Prevents vouch spam.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-xs mb-1">KUDOS Integration</h4>
                    <p className="text-xs text-muted-foreground">
                      KUDOS transfers boost edge capacities with exponential decay (180-day halflife). 
                      Threshold: 500 KUDOS for 1x boost, max 2x. Makes KUDOS a subtle nudge, not a scoring lever.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-xs mb-1">Quadratic Scaling</h4>
                    <p className="text-xs text-muted-foreground">
                      Exponential scaling (2.0) creates wider discrimination: single vouches signal "build more trust" (~2 pts), 
                      while top scores require genuine multi-hop network depth (~74 pts).
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
              Two ways to view your trust: raw algorithm output and standardized score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Raw Flow (Honest Algorithm Output)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>flow value</strong> is the actual max-flow capacity from seed nodes to you, 
                  measured in capacity units. This is what the Ford-Fulkerson max-flow algorithm computes 
                  directly, representing the total "trust capacity" that can reach you through independent 
                  paths.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside mt-2">
                  <li>Unbounded value (can be any positive number)</li>
                  <li>Direct algorithm output (no post-processing)</li>
                  <li>Grows as network size and connectivity increase</li>
                  <li>Comparable across epochs with similar network structure</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Standardized Trust Score (STS)</h3>
                <p className="text-sm text-muted-foreground">
                  The <strong>STS</strong> combines five normalized components into a 0-100 scale for easier interpretation. 
                  It's not just flow - it's a weighted combination of multiple security and network quality metrics.
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
                  Flow is the "honest" algorithm output, showing absolute trust strength. STS makes scores 
                  human-readable and comparable. Together, they provide transparency: you see both the raw 
                  computation and the user-friendly interpretation.
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
                  Connect your wallet to view your trust score breakdown
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your score breakdown will appear here after:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>You receive vouches from users in the network</li>
                    <li>An epoch computation runs to calculate max-flow paths</li>
                    <li>Your STS (Standardized Trust Score) components are computed</li>
                  </ul>
                  <p className="text-sm text-muted-foreground pt-4">
                    The score breakdown will show five weighted components:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li><strong>Flow (55%):</strong> Max-flow capacity from seeds</li>
                    <li><strong>Min-Cut (25%):</strong> Path redundancy and attack resistance</li>
                    <li><strong>Stability (5%):</strong> Resilience to seed removal</li>
                    <li><strong>Depth (10%):</strong> Proximity to trust sources</li>
                    <li><strong>PageRank (5%):</strong> Network embeddedness score</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Seed Quality & Network Health</CardTitle>
            <CardDescription>
              Seeds are not static - they're continuously scored on their influence quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                In vulnerable communities lacking identity systems and access to finance, collusion risk is high. To prevent 
                a few compromised seeds from polluting the entire network, <strong>seeds themselves are scored</strong> on multiple metrics:
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
                    What's the average trust score of users primarily influenced by this seed? Quality seeds build quality networks.
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

              <div className="pt-3 border-t bg-primary/10 rounded-lg p-3">
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
