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
              We convert public vouches into flow from seeds to users. Your acceptance is binary (≥1 unit of flow or min-cut ≥ 1). Your published score is a <strong>Standardized Trust Score (STS)</strong> in [0,100], built from flow, redundancy, stability, and proximity. Everything is reproducible per epoch; all vouches are publicly visible in the Merkle transparency log.
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
                  <li>c(1) = 200 (1 hop)</li>
                  <li>c(2) = 50 (2 hops)</li>
                  <li>c(≥3) = 20 (3+ hops)</li>
                </ul>
              </li>
              <li>Add <span className="font-mono">u<sup>−</sup> → SINK</span> with capacity 1 (first unit = acceptance)</li>
              <li>A vouch <span className="font-mono">a → b</span> becomes <span className="font-mono">a<sup>+</sup> → b<sup>−</sup></span> with capacity 1.0</li>
              <li>Connect <span className="font-mono">SOURCE → seed_in</span> with large capacity</li>
              <li>Run Dinic / preflow-push to compute max-flow and min-cut</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance & Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="font-semibold mb-2">Accepted</div>
                <p className="text-sm text-muted-foreground font-mono">
                  flow to u<sup>−</sup> ≥ 1 (or min-cut ≥ 1)
                </p>
              </div>
              
              <div className="border-t pt-3">
                <div className="font-semibold mb-3">Suggested Tiers:</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Apprentice</span>
                    <span className="text-sm text-muted-foreground">STS ≥ 40</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Journeyer</span>
                    <span className="text-sm text-muted-foreground">STS ≥ 60 and min-cut ≥ 2</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">Master</span>
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
            </div>

            <div className="my-6 p-6 rounded-lg bg-primary/10 border-2 border-primary/20">
              <p className="text-center text-lg font-bold font-mono mb-2">
                STS<sub>i</sub> = 100 × (0.55F<sub>i</sub> + 0.25C<sub>i</sub> + 0.10S<sub>i</sub> + 0.10D<sub>i</sub>)
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Flow (55%) + Cut (25%) + Stability (10%) + Depth (10%)
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
      </div>
    </div>
  );
}
