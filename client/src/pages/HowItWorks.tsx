import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">How It Works</h1>
        <p className="text-muted-foreground">
          Algorithms, formulas, and technical implementation details
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              We convert public vouches into flow from seeds to users using the Levien/Advogato trust metric with an <strong>adaptive acceptance policy</strong>. Small networks use lenient criteria (flow ≥ 1) to enable early growth, while larger networks (≥200 users) enforce the strict Levien spec (min-cut ≥ 2, seed-coverage ≥ 2, and two edge-disjoint paths) for full Sybil resistance. Your published score is a <strong>Standardized Trust Score (STS)</strong> in [0,100], built from flow, redundancy, stability, and proximity. Everything is reproducible per epoch; all vouches are publicly visible in the Merkle transparency log.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vouch-Based Trust</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Each vouch is a simple binary endorsement representing your personal trust. There are no weighted levels—just vouch for people you trust. The max-flow/min-cut algorithm determines trust scores based on network topology (path redundancy, distance from seeds) rather than explicit edge weights.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-muted/30">
              <p className="text-sm mb-0">
                <strong>Why binary vouches?</strong> Transparent weighted levels (e.g., "Known" vs. "Trusted") can create social friction when visible to others. A single vouch level keeps it simple while letting graph structure do the work.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Graph Construction (Advogato-style)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li>Split each user <span className="font-mono">u</span> into <span className="font-mono">u<sup>−</sup> → u<sup>+</sup></span> with node capacity <span className="font-mono">c(d)</span> based on BFS distance <span className="font-mono">d</span> from any seed:
                <ul className="font-mono text-xs mt-2 space-y-1">
                  <li>c(0) = 800 (seeds)</li>
                  <li>c(1) = 240 (1 hop, 30% decay)</li>
                  <li>c(2) = 96 (2 hops, 40% decay)</li>
                  <li>c(3) = 48 (3 hops, 50% decay)</li>
                  <li>c(≥4) = 24 (4+ hops)</li>
                </ul>
              </li>
              <li>Add <span className="font-mono">u<sup>−</sup> → SINK</span> with capacity 1 (first unit = acceptance)</li>
              <li>A vouch <span className="font-mono">a → b</span> becomes <span className="font-mono">a<sup>+</sup> → b<sup>−</sup></span> with capacity 1.0</li>
              <li>Connect <span className="font-mono">SOURCE → seed_in</span> with large capacity</li>
              <li>Run Dinic / preflow-push to compute max-flow and min-cut</li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm mb-2">
                <strong className="text-amber-600 dark:text-amber-400">🔒 Security: Epoch-Lagged Capacities</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Node capacities <span className="font-mono">c(d)</span> are computed from each user's distance in the <strong>previous epoch's accepted subgraph</strong>, not the current live graph. This prevents distance-inflation attacks where attackers manipulate their proximity to seeds to gain inflated capacity. Policy: <span className="font-mono">nodeCap = c(prevEpochDistance)</span>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance & Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2">Adaptive Acceptance Policy</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Acceptance criteria adapt to network size to balance early growth with Sybil resistance:
                </p>
                
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Small Network (&lt;50 users)</span>
                      <Badge variant="outline">Lenient</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">flow ≥ 1</p>
                    <p className="text-xs text-muted-foreground mt-1">Allows early network growth</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Medium Network (50-200 users)</span>
                      <Badge variant="outline">Moderate</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">flow ≥ 1 AND min-cut ≥ 2</p>
                    <p className="text-xs text-muted-foreground mt-1">Basic Sybil resistance</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Large Network (≥200 users)</span>
                      <Badge>Strict (Levien Spec)</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono space-y-0.5">
                      <span className="block">min-cut ≥ 2</span>
                      <span className="block">AND seed-coverage ≥ 2</span>
                      <span className="block">AND two edge-disjoint paths</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Full Sybil resistance per Levien/Advogato
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <div className="font-semibold mb-3">Trust Tiers:</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Connected</span>
                    <span className="text-sm text-muted-foreground">STS ≥ 40</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Verified</span>
                    <span className="text-sm text-muted-foreground">STS ≥ 60 and min-cut ≥ 2</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Trusted</span>
                    <span className="text-sm text-muted-foreground">STS ≥ 80 and min-cut ≥ 3 and Stability ≥ 0.8</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standardized Trust Score (STS)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We normalize components so scores are comparable across epochs and network sizes.</p>
            
            <div className="my-4 p-4 rounded-lg bg-muted/30 font-mono text-sm">
              <div className="mb-2"><strong>Let:</strong></div>
              <ul className="list-none space-y-1 pl-4">
                <li>f<sub>i</sub> = flow to user i</li>
                <li>c<sub>i</sub> = min-cut for i</li>
                <li>d<sub>i</sub> = hop distance from seeds</li>
                <li>Δ<sub>i</sub> = worst relative drop removing most-influential edge</li>
                <li>pr<sub>i</sub> = seed-personalized PageRank score</li>
              </ul>
            </div>

            <p><strong>Per epoch</strong> (accepted set only), compute anchors:</p>
            <ul className="font-mono text-sm pl-4">
              <li>F<sub>95</sub> = 95th percentile of flow</li>
              <li>C<sub>95</sub> = 95th percentile of min-cut (min 3)</li>
            </ul>

            <p><strong>Normalize</strong> (bounded, robust):</p>
            <div className="my-4 p-4 rounded-lg bg-muted/30 font-mono text-sm overflow-x-auto space-y-1">
              <div>F<sub>i</sub> = min(1, log(1+f<sub>i</sub>) / log(1+max(F<sub>95</sub>, F̃<sub>95</sub>)))</div>
              <div>C<sub>i</sub> = min(1, c<sub>i</sub> / max(3, max(C<sub>95</sub>, C̃<sub>95</sub>)))</div>
              <div>D<sub>i</sub> = e<sup>−λd<sub>i</sub></sup> (λ ≈ 0.35)</div>
              <div>S<sub>i</sub> = 1 − min(1, Δ<sub>i</sub>)</div>
              <div>PR<sub>i</sub> = log(1 + pr<sub>i</sub>) / log(1 + max_pr) (log-normalized)</div>
            </div>

            <div className="my-6 p-6 rounded-lg bg-primary/10 border-2 border-primary/20">
              <p className="text-center text-lg font-bold font-mono mb-2">
                STS<sub>i</sub> = 100 × (0.55F<sub>i</sub> + 0.25C<sub>i</sub> + 0.05S<sub>i</sub> + 0.10D<sub>i</sub> + 0.05PR<sub>i</sub>)
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Flow (55%) + Cut (25%) + Stability (5%) + Depth (10%) + PageRank (5%)
              </p>
            </div>

            <p>We also publish <strong>Percentile Rank</strong> within the epoch for quick comparison.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stability & Diversity</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li><strong>Stability:</strong> we approximate the single-edge influence with fast local recomputes on the residual graph</li>
              <li><strong>Diversity:</strong> the system rewards multiple disjoint regions delivering flow through min-cut measurements</li>
              <li><strong>Node Capacity Constraints:</strong> each person has a fixed trust budget that decays with distance from seeds, preventing spam endorsements from diluting the graph</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Vouches</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Unlike privacy-preserving systems with hidden endorsements, TrustFlow uses <strong>fully public, verifiable vouches</strong>. All vouches are visible on-chain and included in the epoch's Merkle transparency log. This enables:
            </p>
            <ul>
              <li>Complete auditability of the trust graph</li>
              <li>Independent verification of score computations</li>
              <li>Transparency about who vouches for whom</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">
              <strong>Note:</strong> Profiles and identity metadata remain optional and are never used in scoring.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verifiability</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Each epoch publishes:</p>
            <ul>
              <li><span className="font-mono text-sm">params.json</span> (policy id, node capacity schedule, algorithm parameters)</li>
              <li><span className="font-mono text-sm">seed_root</span>, <span className="font-mono text-sm">graph_root</span> (Merkle roots)</li>
              <li><span className="font-mono text-sm">scores.jsonl</span> (flow, min-cut, STS) + signature</li>
            </ul>
            <p>Anyone can recompute and confirm byte-exact results.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seed Quality Scoring</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Seeds are not static—they're continuously scored on the quality of their influence. Each seed receives a <strong>Seed Score (S<sub>s</sub>) ∈ [0,1]</strong> based on four components:
            </p>

            <ul className="space-y-3">
              <li>
                <strong>Predictive Validity (35% weight):</strong> Fraction of users influenced by this seed who remain accepted when the seed's edges are removed. Measures network resilience.
              </li>
              <li>
                <strong>Downstream Quality (30% weight):</strong> Average trust score (STS) of users primarily influenced by this seed. Quality seeds build quality networks.
              </li>
              <li>
                <strong>Diversity Lift (20% weight):</strong> Number of distinct communities/neighborhoods reached by this seed. Prevents single-group capture.
              </li>
              <li>
                <strong>Centralization Penalty (15% weight):</strong> Penalty applied when a seed carries &gt;50% of total seed outflow. Reduces over-reliance risk.
              </li>
            </ul>

            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm mb-2">
                <strong>How Seed Scores Affect the Graph</strong>
              </p>
              <ul className="text-sm space-y-1.5 mb-0">
                <li><strong>Capacity Multiplier:</strong> SOURCE→seed capacity = base_capacity × (0.7 + 0.6 × S<sub>s</sub>) ∈ [0.7x, 1.3x]</li>
                <li><strong>Coverage Threshold:</strong> Only seeds with S<sub>s</sub> ≥ 0.6 count toward the "≥2 seeds" acceptance requirement</li>
                <li><strong>Feedback Loop:</strong> Good seeds strengthen their capacity; weak seeds self-throttle</li>
              </ul>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold mb-2">
                🔒 Why This Matters for Vulnerable Communities
              </p>
              <p className="text-sm text-muted-foreground mb-0">
                In communities lacking identity systems and facing high collusion risk, seed scoring prevents a few compromised seeds from polluting the entire graph. Attackers must now compromise <strong>multiple high-quality seeds across diverse communities</strong>—dramatically harder than capturing 1-2 traditional seeds.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Model & Attack Resistance</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              TrustFlow's max-flow/min-cut algorithm is grounded in the Levien & Aiken (USENIX '98) trust metric model, which provides formal resistance against Sybil attacks. Understanding the security model helps explain both current defenses and planned enhancements.
            </p>

            <div className="mt-4">
              <h4 className="font-semibold text-base mb-2">Current Defenses</h4>
              <ul className="space-y-2">
                <li>
                  <strong>Epoch-Lagged Capacities:</strong> Node capacities are computed from the previous epoch's accepted subgraph, preventing distance-inflation attacks where attackers manipulate their proximity to seeds within a single scoring run.
                </li>
                <li>
                  <strong>Min-Cut ≥ 2 Requirement:</strong> In medium/large networks, users must have at least 2 units of min-cut, ensuring some redundancy in trust paths.
                </li>
                <li>
                  <strong>Seed Coverage ≥ 2:</strong> For large networks, flow must originate from at least 2 distinct seeds, reducing single-seed blast radius.
                </li>
                <li>
                  <strong>Edge-Disjoint Paths:</strong> Large networks require two edge-disjoint paths from seeds to user, providing path independence.
                </li>
                <li>
                  <strong>Public Vouches:</strong> Full transparency in the Merkle log enables community detection of suspicious vouch patterns.
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">
                Known Attack Vectors & Planned Enhancements
              </h4>
              <div className="text-sm text-muted-foreground space-y-3">
                <div>
                  <strong className="text-foreground">1. Bridge Hub Amplification</strong>
                  <p className="mt-1">
                    Current edge-disjoint requirement can be satisfied by two paths through the same high-capacity intermediary (one articulation vertex). 
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> Planned fix:</span> Upgrade to vertex-disjoint path checking, requiring paths that don't share intermediate nodes.
                  </p>
                </div>

                <div>
                  <strong className="text-foreground">2. Dust-Flow Seed Coverage</strong>
                  <p className="mt-1">
                    Current "coverage ≥ 2 seeds" can be satisfied with tiny flows (e.g., 0.01 from seed A, 0.99 from seed B). 
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> Planned fix:</span> Require minimum flow share per seed (≥30% from each of ≥2 seeds).
                  </p>
                </div>

                <div>
                  <strong className="text-foreground">3. Seed Saturation</strong>
                  <p className="mt-1">
                    Over-reliance on a single seed's outflow creates large blast radius if that seed is compromised. 
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> Planned fix:</span> Monitor max seed outflow share; throttle seeds exceeding 40-50% of total network flow.
                  </p>
                </div>

                <div>
                  <strong className="text-foreground">4. Cut Witness Auditability</strong>
                  <p className="mt-1">
                    Currently, verifiers must recompute entire max-flow to validate scores. 
                    <span className="text-amber-600 dark:text-amber-400 font-medium"> Planned enhancement:</span> Publish vertex-cut witnesses per accepted user (small set of nodes whose removal separates user from seeds) with Merkle proofs for efficient verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-semibold text-sm mb-2 text-blue-600 dark:text-blue-400">
                Why These Defenses Matter
              </h4>
              <p className="text-sm text-muted-foreground">
                Per Levien & Aiken's analysis, the max-flow metric's security bound is proportional to the number of "confused" (mislabeling) certifiers an attacker can control near the target. Our defenses—vertex-disjoint paths, seed-coverage floors, saturation limits, and lagged capacities—make these attacks expensive by requiring attackers to compromise multiple independent, well-positioned nodes across different network regions.
              </p>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <strong>Current Security Health:</strong> Check the Dashboard's Network Security Health metrics to monitor seed saturation, path diversity, and other indicators of Sybil resistance in real-time.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
