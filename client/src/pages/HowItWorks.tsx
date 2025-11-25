import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HowItWorks() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
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
              We convert public vouches into verifiable network quality scores using max-flow/min-cut algorithms with recursive trust weighting. MaxFlow supports two scoring models: <strong>Personal Networks (LocalHealth 0-100)</strong> computed from incoming vouches weighted by voucher strength using an iterative algorithm, and <strong>Community Networks (STS 0-100)</strong> for community-based graph signals with community-managed seeds. LocalHealth uses recursive weighting where vouch capacity = voucherScore / 100, creating trust propagation through the network. Everything is reproducible per epoch; all vouches are publicly visible in the Merkle transparency log.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm mb-0">
                <strong>These scores are neutral signals</strong>—MaxFlow computes verifiable graph metrics (flow, redundancy, connectivity). Your application chooses their meaning: creditworthiness, governance weight, access control, grant allocation, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vouch-Based Scoring</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Each vouch is a simple binary endorsement from your perspective—you either vouch for someone or you don't. No complicated trust levels. However, the iterative algorithm automatically weights these vouches based on the voucher's network strength (capacity = voucherScore / 100), creating recursive trust propagation.
            </p>
            <div className="mt-3 p-3 rounded-lg bg-muted/30">
              <p className="text-sm mb-0">
                <strong>Binary input, recursive weighting:</strong> You give a simple yes/no vouch, but the algorithm weights it by your LocalHealth score during computation. This keeps the user experience simple while achieving sophisticated Sybil resistance through recursive trust. Scores converge iteratively (max 10 rounds, threshold 0.5).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why Endorsements Stay Meaningful: Accountability Mechanism</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              <strong className="text-primary">Your score is influenced by who YOU vouch for.</strong> This creates economic cost to vouch spam and makes endorsements selective—the core anti-Sybil mechanism.
            </p>
            
            <div className="my-4 space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-semibold mb-2 text-amber-600 dark:text-amber-400">Dilution Penalty (Vouch Spam Prevention)</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Vouching for {'>'}10 people applies a penalty factor to your redundancy component (40% of total score). The penalty grows linearly at 10% per excess vouch, capped at 50% reduction.
                </p>
                <div className="text-sm font-mono bg-muted/50 p-3 rounded-lg">
                  cutComponent = 40 × (redundancy²) × max(0.5, 1 - 0.1 × excess)
                </div>
                <ul className="text-sm text-muted-foreground mt-3 space-y-1 pl-4">
                  <li><strong>≤10 vouches:</strong> No penalty (factor = 1.0)</li>
                  <li><strong>12 vouches:</strong> 20% redundancy penalty → ~3-8% total score impact</li>
                  <li><strong>15 vouches:</strong> 50% redundancy penalty (capped) → ~10-20% total score impact depending on redundancy level</li>
                  <li><strong>Worked example:</strong> User with 5 direct vouches, redundancy 0.7, gets 15 total vouches → redundancy drops 19.6pts → 9.8pts, total score 79.6 → 69.8 (12.3% reduction)</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-semibold mb-2">Game Theory: Why This Works</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Attack cost:</strong> Creating fake networks requires vouching for many Sybil accounts → dilution penalty reduces attacker's own score</li>
                  <li><strong>Selectivity incentive:</strong> To maintain your redundancy score, vouch selectively for genuinely connected people</li>
                  <li><strong>Graph quality:</strong> When endorsements are selective, the resulting graph signals (flow, redundancy) are reliable</li>
                  <li><strong>Neutral enforcement:</strong> The system penalizes graph spam; applications interpret the cleaned signal</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>Key insight:</strong> You can't game the system by creating fake vouches without hurting your own score. This two-way accountability makes the graph signal Sybil-resistant without requiring identity verification or stake.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Graph Construction (Advogato-style)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-sm mb-3">
              <strong>Note:</strong> This section describes the traditional <strong>Community STS</strong> scoring system. For <strong>Personal Networks (Ego Score)</strong>, see the dedicated section below which uses simpler capacity decay: <span className="font-mono">1.0 / 2<sup>distance</sup></span>.
            </p>
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
            <CardTitle>Personal Networks (Ego Score)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-sm mb-3">
              <strong>LocalHealth (Ego Score)</strong> is your personal network quality score (0-100) that measures graph connectivity strength based on incoming vouches. Unlike Community STS which uses a fixed seed set, LocalHealth can operate in two modes:
            </p>
            
            <div className="space-y-4 my-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>Default</Badge>
                  <span className="font-semibold">Pure Option 2: Recursive Trust Weighting</span>
                </div>
                <p className="text-sm mb-2">
                  <strong>No co-seeds required.</strong> Uses <strong>iterative PageRank-style algorithm</strong> where vouches are weighted by voucher's LocalHealth score. Your score depends on the strength of who vouches for you.
                </p>
                <ul className="text-sm space-y-1 pl-4">
                  <li><strong>Iterative computation:</strong> Scores calculated in rounds until convergence (max 10 iterations, threshold 0.5)</li>
                  <li><strong>Weighted vouches:</strong> Each vouch capacity = voucherScore / 100 (0-1 range)</li>
                  <li><strong>Recursive trust:</strong> Your vouchers' scores depend on their vouchers, creating trust propagation</li>
                  <li><strong>Average voucher strength:</strong> ResidualFlow = directFlow / voucherCount captures voucher quality</li>
                  <li><strong>Score distribution:</strong> Depends on both vouch COUNT and voucher QUALITY (strong vouchers {'>'}  weak vouchers)</li>
                </ul>
              </div>
            </div>

            <div className="my-6 p-6 rounded-lg bg-primary/10 border-2 border-primary/20">
              <p className="text-center text-lg font-bold font-mono mb-2">
                Ego Score = 60 × (flowScore²) + 40 × (redundancy²) × vouchQuality
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Flow (60%) + Redundancy (40%) × Vouch Accountability, with quadratic scaling (exponent 2.0)
              </p>
            </div>

            <div className="my-4 p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">
                <strong>API vs Formula:</strong> The graph visualization displays <span className="font-mono">voucherCount</span> (number of people vouching for you) and <span className="font-mono">avgVoucherStrength</span> (average quality of vouches, shown as %). These map to the formula's <span className="font-mono">flowScore</span> = weighted incoming flow normalized by healthy baseline.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">Flow Component (60%):</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures <strong>weighted incoming trust</strong> from vouchers. Each vouch capacity weighted by voucher's LocalHealth (0-100 normalized to 0-1).
                  Formula: <span className="font-mono">60 × (flowScore)²</span> where flowScore = directFlow / HEALTHY_VOUCH_COUNT.
                </p>
                <div className="p-2 rounded bg-muted/50 text-xs font-mono space-y-1">
                  <p><strong>directFlow</strong> = Σ(voucherScore<sub>j</sub> / 100) for each voucher j</p>
                  <p><strong>flowScore</strong> = directFlow / 5 (HEALTHY_VOUCH_COUNT), capped at 1.0</p>
                  <p><strong>vouchQuality</strong> = directFlow / voucherCount (ResidualFlow = avg voucher strength)</p>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-1">Redundancy Component (40%):</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Measures effective redundancy normalized by healthy baseline (20 points), with quadratic scaling.
                  Formula: <span className="font-mono">40 × (redundancy)²</span> where redundancy = min(1.0, effectiveRedundancy / HEALTHY_REDUNDANCY).
                  Higher redundancy = more multi-hop support, harder to isolate you.
                </p>
                <div className="p-2 rounded bg-muted/50 text-xs font-mono space-y-1">
                  <p className="font-semibold text-foreground">effectiveRedundancy computation:</p>
                  <p>• <strong>Base count:</strong> Number of direct vouchers (each vouch = 1 point)</p>
                  <p>• <strong>Depth bonus:</strong> upstream_supporter_count × 0.2 (rewards multi-hop chains)</p>
                  <p>• <strong>Connectivity bonus:</strong> (edge_count / potential_edges) × ego_size (rewards network density)</p>
                  <p className="pt-1 border-t border-muted">effectiveRedundancy = base + depthBonus + connectivityBonus</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="font-semibold mb-1 text-amber-600 dark:text-amber-400">Outgoing Vouch Adjustment (Accountability):</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Your redundancy score is influenced by <strong>who YOU vouch for</strong>, preventing vouch spam:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                  <li><strong>Dilution penalty:</strong> 10% per vouch beyond 10 vouches (doubled from 5%)</li>
                  <li><strong>Caps at 50% reduction:</strong> Prevents complete score destruction while deterring spam</li>
                  <li><strong>Impact:</strong> ~10-20% typical score swing, keeps incoming trust as primary driver</li>
                  <li><strong>Formula:</strong> dilutionFactor = max(0.5, 1 - 0.1 × excessVouches)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold mb-1">Distance Decay:</p>
                <p className="text-sm text-muted-foreground">
                  Edge capacities use simple distance decay: <span className="font-mono">1.0 / 2<sup>distance</sup></span>. 
                  This ensures closer connections (fewer hops) have stronger influence on your score.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="font-semibold mb-1">KUDOS: Pure Rewards Layer</p>
                <p className="text-sm text-muted-foreground">
                  <strong>KUDOS does NOT influence LocalHealth scores.</strong> It's a one-way relationship: your LocalHealth determines KUDOS rewards, but KUDOS never affects scoring. This preserves LocalHealth as a pure graph-based signal and maintains MaxFlow's identity as neutral infrastructure.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parameters & Rationale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Design rationale for key algorithm parameters. These values are calibrated for dense endorsement networks and may be tuned per-community.
            </p>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Weight Split: 60% Flow / 40% Redundancy</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Flow measures <em>quality</em> of incoming trust (who vouches for you); redundancy measures <em>structural resilience</em> (how hard to isolate you). 
                  60/40 prioritizes quality while ensuring Sybil resistance through min-cut requirements. 
                  <span className="text-muted-foreground/70 italic"> Future: weights may be learned from labeled Sybil detection data.</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">HEALTHY_VOUCH_COUNT = 5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Baseline for "healthy" incoming flow. Users with 5 strong vouchers (avg strength 80%+) achieve flowScore ≈ 0.8 → 38 pts from flow component.
                  Set to 5 based on power-law distribution of endorsements in social graphs (median active users have 3-7 vouchers).
                  <span className="text-muted-foreground/70 italic"> Could become global_avg_vouches for adaptive scaling.</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">HEALTHY_REDUNDANCY = 20</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Baseline for "healthy" redundancy score (5 vouchers + 10 depth bonus + 5 connectivity). 
                  Users at this level have multiple independent paths, making single-edge attacks ineffective.
                  Calibrated for dense networks where upstream supporters multiply quickly.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Quadratic Scaling (exponent = 2.0)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Both flow and redundancy use x² scaling to spread the 0-100 range across active users.
                  Without quadratic: scores cluster near extremes (very low or maxed).
                  With quadratic: mid-range users (flowScore 0.5-0.8) get meaningful differentiation (15-40 pts from flow).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Dilution: 10% per excess vouch, min 50%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prevents vouch spam while allowing legitimate bridging nodes. 10 vouches = no penalty; 15 = 50% cap hit.
                  Linear curve chosen over exponential to avoid punishing connectors too harshly.
                  <span className="text-muted-foreground/70 italic"> Planned: piecewise curve + retroactive relief for vouchees who later reach acceptance threshold.</span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Convergence: max 10 iterations, Δ threshold 0.5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Iterative algorithm typically converges in 3-5 rounds for sparse graphs, 6-8 for dense.
                  Threshold 0.5 ensures stability without over-computing.
                  <span className="text-muted-foreground/70 italic"> Bounds proven for contractive map (spectral radius &lt; 1 via recursive weight damping).</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance & Score Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2">Acceptance Policy</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Acceptance criteria for personal networks (neutral thresholds):
                </p>
                
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Personal Networks</span>
                      <Badge>Current Policy</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono space-y-0.5">
                      <span className="block">flow ≥ 0.5 (minAcceptanceFlow)</span>
                      <span className="block">AND min-cut ≥ 2 (minAcceptanceMinCut)</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ensures basic Sybil resistance through redundant paths
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Community Networks (STS)</span>
                      <Badge variant="outline">Planned</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adaptive policy based on network size with stricter Levien spec for large communities
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <div className="font-semibold mb-3">Score Tiers (Neutral Signal Thresholds):</div>
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
                <p className="text-xs text-muted-foreground mt-3">
                  Note: These tier labels (Connected, Verified, Trusted) are interpretive. Applications may use the underlying STS scores differently.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standardized Network Score (STS)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>We normalize graph components into a standardized 0-100 score that's comparable across epochs and network sizes. This is a neutral signal—applications interpret it based on their context.</p>
            
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
              <li><strong>Node Capacity Constraints:</strong> each person has a fixed capacity budget that decays with distance from seeds, preventing spam endorsements from diluting the graph</li>
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
              <li>Complete auditability of the network graph</li>
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
            <CardTitle>Verifiability & Score Attestations</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Each epoch publishes verifiable score attestations:</p>
            <ul>
              <li><span className="font-mono text-sm">params.json</span> (policy id, node capacity schedule, algorithm parameters)</li>
              <li><span className="font-mono text-sm">seed_root</span>, <span className="font-mono text-sm">graph_root</span> (Merkle roots)</li>
              <li><span className="font-mono text-sm">scores.jsonl</span> (flow, min-cut, STS) + cryptographic signature</li>
            </ul>
            <p>Anyone can recompute and confirm byte-exact results. Score attestations are portable verifiable credentials—applications interpret the neutral signals within their own context.</p>
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
                <strong>Downstream Quality (30% weight):</strong> Average network score (STS) of users primarily influenced by this seed. Quality seeds build quality networks.
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
            <CardTitle>Personal Networks (Ego Contexts)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              MaxFlow supports <strong>personal networks</strong> alongside traditional community-based scoring. Every user has a LocalHealth score computed from incoming vouches weighted by voucher strength using the iterative algorithm.
            </p>

            <div className="mt-4">
              <h4 className="font-semibold text-base mb-2">Hybrid Architecture</h4>
              <ul className="space-y-2">
                <li>
                  <strong>Personal Networks:</strong> LocalHealth computed from incoming vouches weighted by voucher strength. No co-seeds required. Global vouches (no community restriction) contribute to LocalHealth scores across the network through recursive trust weighting.
                </li>
                <li>
                  <strong>Community Networks:</strong> Participate in lending, hiring, or governance communities with community-managed seeds and context-specific vouches (with prompts).
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-semibold text-base mb-3">Ego Score (0-100)</h4>
              <p className="text-sm mb-3">
                Your personal network quality is measured by <strong>Ego Score</strong>, computed using max-flow/min-cut on your ego subgraph (nodes within distance K from your seed set).
              </p>
              
              <div className="my-3 p-3 rounded-lg bg-muted/30 font-mono text-sm">
                EgoScore = 50 × avgResidualFlow + 50 × min(medianMinCut / 10, 1)
              </div>

              <div className="text-sm space-y-2">
                <div>
                  <strong>Components:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 ml-2">
                    <li><strong>Flow Component (50%):</strong> Average residual flow across accepted users (max flow / node capacity)</li>
                    <li><strong>Cut Component (50%):</strong> Median min-cut normalized against expected max of 10 edges for resilience</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-base mb-2">Distance-Based Node Capacity</h4>
              <p className="mb-2">
                Node capacities decay with distance from your seed set (you + co-seeds), preventing spam endorsements from diluting your network:
              </p>
              <ul className="font-mono text-xs space-y-1 ml-4">
                <li>Distance 0 (self + co-seeds): capacity = 1.0</li>
                <li>Distance 1 (direct vouches): capacity = 0.5</li>
                <li>Distance 2+: capacity = 0.25</li>
                <li>Formula: capacity = 1.0 / (2<sup>distance</sup>)</li>
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-base mb-2">Computation Steps</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-sm">
                <li>Build ego subgraph: all nodes within distance ≤ K from your seed set</li>
                <li>Assign distance-based capacities to each node</li>
                <li>Run max-flow from SOURCE to each non-seed node</li>
                <li>Calculate residual flow (max flow / node capacity) for each user</li>
                <li>Compute min-cut for accepted users (those with flow ≥ threshold)</li>
                <li>Aggregate: avg residual flow (50%) + median min-cut (50%)</li>
              </ol>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h4 className="font-semibold text-sm mb-2 text-amber-600 dark:text-amber-400">
                🚧 Sprint 2: Planned Features
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>
                  <strong className="text-foreground">Ego Scoring Engine:</strong> Full implementation of Ego Score calculation with distance-based capacities and min-cut computation.
                </div>
                <div>
                  <strong className="text-foreground">Anti-Gaming Rules:</strong> Per-epoch vouch cap (5), warm-up period (50% capacity first epoch), reciprocality brake (mutual vouches = 0.5x capacity).
                </div>
                <div>
                  <strong className="text-foreground">Global Trust Score:</strong> Cross-network reputation combining Ego Score (60%) + IncomingFlow from other ego networks (40%).
                </div>
                <div>
                  <strong className="text-foreground">Score Explanations:</strong> "Why" strings showing min-cut, seed paths, and acceptance reasoning.
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <strong>Current Status:</strong> Personal network infrastructure (database schema, API endpoints, UI) is complete. Visit <a href="/network" className="text-primary hover:underline">My Network</a> to view your LocalHealth score computed using the iterative recursive trust algorithm.
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
