import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, BookOpen, Shield, Cpu, FlaskConical, Lightbulb } from "lucide-react";

export default function Whitepaper() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-whitepaper-title">Whitepaper</h1>
            <p className="text-muted-foreground">Version 1.1 — November 2025</p>
          </div>
        </div>
        <h2 className="text-xl text-muted-foreground">
          MaxFlow: Sybil-Resistant Graph Signal Infrastructure via Recursive Trust Weighting
        </h2>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Abstract
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            MaxFlow is neutral reputation infrastructure that converts public binary endorsements ("vouches") into 
            verifiable graph signals using max-flow/min-cut and recursive trust weighting. Two complementary score 
            families are produced per epoch:
          </p>
          <ul>
            <li><strong>LocalHealth (0-100)</strong>: A personal network quality score computed by an iterative algorithm that weights each incoming vouch by the voucher's score</li>
            <li><strong>STS (Standardized Trust Score, 0-100)</strong>: A community score built on Advogato-style max-flow/min-cut from community-managed seeds, with robust percentile normalization</li>
          </ul>
          
          <div className="my-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="font-semibold mb-2">Core Properties:</p>
            <ol className="text-sm space-y-1">
              <li><strong>Accountability</strong> — Outgoing vouches incur a dilution penalty, creating real cost for endorsement spam</li>
              <li><strong>Epoch-lagged capacities</strong> — Distance-based node capacities use the previous accepted graph to prevent distance inflation</li>
              <li><strong>Separation of concerns</strong> — Reward layers (e.g., KUDOS) consume scores but never influence them</li>
              <li><strong>Verifiability</strong> — Parameters, roots, and signed outputs are published per epoch</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 mb-8">
        <h3 className="font-semibold text-lg">Table of Contents</h3>
        <nav className="grid grid-cols-2 gap-2 text-sm">
          <a href="#introduction" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-introduction">1. Introduction</a>
          <a href="#related-work" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-related-work">2. Related Work</a>
          <a href="#system-overview" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-system-overview">3. System Overview</a>
          <a href="#localhealth" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-localhealth">4. LocalHealth Algorithm</a>
          <a href="#sts" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-sts">5. STS Algorithm</a>
          <a href="#security" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-security">6. Security Model</a>
          <a href="#parameters" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-parameters">7. Parameterization</a>
          <a href="#implementation" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-implementation">8. Implementation</a>
          <a href="#evaluation" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-evaluation">9. Evaluation</a>
          <a href="#future-work" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-toc-future-work">10. Future Work</a>
        </nav>
      </div>

      <Separator className="my-8" />

      <section id="introduction" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">1.</span> Introduction
        </h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1.1 Problem</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Sybil attacks—mass creation of fake identities—distort decentralized decision-making, grants, and 
              access control. Attestation-heavy approaches centralize trust; purely economic ones exclude users 
              without capital. Graph-based approaches are promising but historically vulnerable to seed capture, 
              bridge hubs, and endorsement spam.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1.2 Design Principles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">1. Neutrality</div>
                <p className="text-sm text-muted-foreground">Scores are signals; applications decide what they mean (credit, governance, access, allocation)</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">2. Verifiability</div>
                <p className="text-sm text-muted-foreground">Public endorsements + epoch-pinned, deterministic computation + signed attestations</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">3. Accountability</div>
                <p className="text-sm text-muted-foreground">Endorsing has costs; spamming or endorsing low-quality nodes reduces your own score</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">4. Separation</div>
                <p className="text-sm text-muted-foreground">Rewards never influence scoring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1.3 Contributions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li>Recursive trust weighting (personal networks) with bounded, damped iteration</li>
              <li>Effective redundancy metric (count + depth + connectivity) with explicit formula & bounds</li>
              <li>Dilution penalty that specifically hits the redundancy term (structural resilience), capped to protect legitimate connectors</li>
              <li>Advogato-style STS with epoch-lagged capacities, robust normalization, and seed quality scoring</li>
              <li>Attestations: per-epoch params, Merkle roots, signed scores</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="related-work" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">2.</span> Related Work
        </h2>
        
        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Badge variant="outline">Advogato 1998</Badge>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Max-flow trust bounded by disjoint paths from seeds. MaxFlow extends it with epoch-lagged capacities, 
                    seed quality scoring, and robust STS normalization.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Badge variant="outline">EigenTrust / PageRank</Badge>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Iterative trust propagation; prone to convergence quirks & pre-trusted capture. MaxFlow uses 
                    bounded, damped iteration plus an explicit accountability penalty.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Badge variant="outline">Web3 Identity</Badge>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Gitcoin Passport, BrightID, PoH provide useful attestations but are centralized or require in-person 
                    verification. MaxFlow remains permissionless and can consume such signals without depending on them.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      <section id="system-overview" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">3.</span> System Overview
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3.1 Graph Model</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Directed graph G = (V, E):</p>
            <ul>
              <li><strong>Nodes</strong>: User accounts (addresses)</li>
              <li><strong>Edges</strong>: Binary endorsements e = (u → v) with (epoch, community)</li>
              <li>All endorsements are public and logged in a per-epoch Merkle tree</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3.2 Dual Scores (per epoch)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Score</th>
                    <th className="text-left py-2 pr-4 font-semibold">Range</th>
                    <th className="text-left py-2 pr-4 font-semibold">Scope</th>
                    <th className="text-left py-2 font-semibold">Algorithm</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">LocalHealth</td>
                    <td className="py-2 pr-4">0-100</td>
                    <td className="py-2 pr-4">Personal network</td>
                    <td className="py-2">Iterative recursive trust weighting</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">STS</td>
                    <td className="py-2 pr-4">0-100</td>
                    <td className="py-2 pr-4">Community</td>
                    <td className="py-2">Advogato-style max-flow from seeds</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3.3 Epochs & Attestations</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Discrete epochs ensure determinism, anti-gaming via lagged capacities, and verifiability:</p>
            <ul>
              <li>Publish <code>params.json</code>, <code>seed_root</code>, <code>graph_root</code>, <code>scores.jsonl</code> (+ signature)</li>
              <li>Anyone can recompute and verify hash-exact outputs</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="localhealth" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary" />
          <span className="text-primary">4.</span> LocalHealth (Personal Networks)
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.1 Notation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">For user i:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Symbol</th>
                    <th className="text-left py-2 font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b">
                    <td className="py-2 pr-4">V_i</td>
                    <td className="py-2 font-sans text-sm">Set of vouchers (incoming endorsers)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">s_j</td>
                    <td className="py-2 font-sans text-sm">LocalHealth of voucher j in [0, 100]</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">F_i</td>
                    <td className="py-2 font-sans text-sm">directFlow = sum(s_j / 100) for j in V_i</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">phi_i</td>
                    <td className="py-2 font-sans text-sm">flowScore = min(1, F_i / F_0), baseline F_0 = 5</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">R_i</td>
                    <td className="py-2 font-sans text-sm">ResidualQuality = clip[0,1](F_i / max(1, |V_i|))</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">rho_i</td>
                    <td className="py-2 font-sans text-sm">effectiveRedundancy from ego upstream</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">d_i</td>
                    <td className="py-2 font-sans text-sm">redundancy = min(1, rho_i / R_0), baseline R_0 = 20</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">D_i</td>
                    <td className="py-2 font-sans text-sm">DilutionFactor = max(0.5, 1 - 0.1 x max(0, outVouches - 10))</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.2 Score Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              We separate average voucher quality from accountability and apply the penalty only to the structural term:
            </p>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 font-mono text-center text-lg mb-4">
              LocalHealth_i = 60 x phi_i^2 + 40 x (d_i^2 x R_i x D_i)
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">60% Flow</div>
                <p className="text-xs text-muted-foreground">Who vouches for you, recursively weighted</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">40% Structure x Quality x Accountability</div>
                <p className="text-xs text-muted-foreground">Path diversity (redundancy), average voucher strength (ResidualQuality), and dilution penalty (DilutionFactor)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.3 Effective Redundancy (Explicit Definition)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Build an upstream ego subgraph from V_i by BFS on incoming edges (who vouches for my vouchers, etc.), excluding i. Let:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Variable</th>
                    <th className="text-left py-2 font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">k</td>
                    <td className="py-2">|V_i| (direct voucher count)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">u</td>
                    <td className="py-2">max(0, |U_i| - k) (additional upstream supporters)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">m</td>
                    <td className="py-2">Internal edges in ego subgraph</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">n</td>
                    <td className="py-2">|U_i| nodes in ego subgraph</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">delta</td>
                    <td className="py-2">Edge density = m / max(1, n(n-1))</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm">
              <div className="mb-2">rho_i = k + lambda_depth x u + lambda_conn x (delta x n)</div>
              <div className="text-muted-foreground">lambda_depth = 0.2, lambda_conn = 1.0 (defaults)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.4 Iterative Computation (Damped)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Initialize s_i^(0) from |V_i| (e.g., min(100, 20 x sqrt(|V_i|))). At each round:</p>
            <ol>
              <li>Compute s_hat_i^(t+1) via the formula above using s^(t) for vouchers</li>
              <li>Apply damped update:</li>
            </ol>
            <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm my-4">
              <div className="mb-2">s_i^(t+1) = (1 - alpha) x s_i^(t) + alpha x s_hat_i^(t+1)</div>
              <div className="text-muted-foreground">alpha = 0.85 (default damping factor)</div>
            </div>
            <p><strong>Stopping criteria:</strong> max|s_i^(t+1) - s_i^(t)| {'<'} epsilon (default 0.5) or at 10 rounds.</p>
            <div className="p-3 rounded-lg bg-muted/30 mt-4">
              <p className="text-sm mb-0">
                <strong>Convergence note:</strong> With damping, the update is a convex combination of the previous state and a 1-Lipschitz transform. 
                Choosing alpha {'<'} 1 yields a contraction in practice; empirically {'<='} 8 rounds for avg degree {'<'} 10.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.5 Worked Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-sm mb-3">Flow Component Calculations:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-3 font-semibold">Vouchers</th>
                        <th className="text-left py-2 px-3 font-semibold">Avg Strength</th>
                        <th className="text-left py-2 px-3 font-semibold">directFlow (F)</th>
                        <th className="text-left py-2 px-3 font-semibold">flowScore (phi)</th>
                        <th className="text-left py-2 px-3 font-semibold">Flow Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">1</td>
                        <td className="py-2 px-3">50%</td>
                        <td className="py-2 px-3 font-mono">0.5</td>
                        <td className="py-2 px-3 font-mono">0.10</td>
                        <td className="py-2 px-3 font-mono">0.6</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">3</td>
                        <td className="py-2 px-3">70%</td>
                        <td className="py-2 px-3 font-mono">2.1</td>
                        <td className="py-2 px-3 font-mono">0.42</td>
                        <td className="py-2 px-3 font-mono">10.6</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">5</td>
                        <td className="py-2 px-3">80%</td>
                        <td className="py-2 px-3 font-mono">4.0</td>
                        <td className="py-2 px-3 font-mono">0.80</td>
                        <td className="py-2 px-3 font-mono">38.4</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">8</td>
                        <td className="py-2 px-3">90%</td>
                        <td className="py-2 px-3 font-mono">7.2</td>
                        <td className="py-2 px-3 font-mono">1.00</td>
                        <td className="py-2 px-3 font-mono">60.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-3">Dilution Penalty Impact:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-3 font-semibold">Outgoing Vouches</th>
                        <th className="text-left py-2 px-3 font-semibold">Excess</th>
                        <th className="text-left py-2 px-3 font-semibold">Penalty</th>
                        <th className="text-left py-2 px-3 font-semibold">D Factor</th>
                        <th className="text-left py-2 px-3 font-semibold">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">{'<='} 10</td>
                        <td className="py-2 px-3">0</td>
                        <td className="py-2 px-3">0%</td>
                        <td className="py-2 px-3 font-mono">1.00</td>
                        <td className="py-2 px-3 text-green-600">None</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">12</td>
                        <td className="py-2 px-3">2</td>
                        <td className="py-2 px-3">20%</td>
                        <td className="py-2 px-3 font-mono">0.80</td>
                        <td className="py-2 px-3 text-amber-600">-8 pts max</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">15</td>
                        <td className="py-2 px-3">5</td>
                        <td className="py-2 px-3">50%</td>
                        <td className="py-2 px-3 font-mono">0.50</td>
                        <td className="py-2 px-3 text-red-600">-20 pts max</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">20+</td>
                        <td className="py-2 px-3">10+</td>
                        <td className="py-2 px-3">50% (cap)</td>
                        <td className="py-2 px-3 font-mono">0.50</td>
                        <td className="py-2 px-3 text-red-600">-20 pts max</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="sts" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">5.</span> STS (Community Score)
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.1 Graph Construction (Advogato-style)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li>Split each user u into (u-, u+) with internal capacity c(d) based on prev-epoch hop-distance d from any seed</li>
              <li>Add u- → SINK with cap = 1</li>
              <li>For each vouch a → b: add a+ → b- with cap = 1</li>
              <li>SOURCE → seed- capacity = BASE x (0.7 + 0.6 x S_s) where S_s in [0,1] is the SeedScore</li>
            </ul>
            
            <h4 className="font-semibold mt-4 mb-2">Default Capacity Schedule:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Distance d</th>
                    <th className="text-left py-2">Capacity c(d)</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b"><td className="py-2 pr-4">0 (seed)</td><td className="py-2">800</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">1</td><td className="py-2">240</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">2</td><td className="py-2">96</td></tr>
                  <tr className="border-b"><td className="py-2 pr-4">3</td><td className="py-2">48</td></tr>
                  <tr><td className="py-2 pr-4">{'>='} 4</td><td className="py-2">24</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.2 Score Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 font-mono text-center mb-4">
              STS_i = 100 x (0.55 x F + 0.25 x C + 0.05 x S + 0.10 x D + 0.05 x PR)
            </div>
            <div className="grid md:grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/30"><strong>F</strong>: Log-normalized max-flow</div>
              <div className="p-2 rounded bg-muted/30"><strong>C</strong>: Min-cut capacity</div>
              <div className="p-2 rounded bg-muted/30"><strong>S</strong>: Stability score</div>
              <div className="p-2 rounded bg-muted/30"><strong>D</strong>: Depth decay</div>
              <div className="p-2 rounded bg-muted/30"><strong>PR</strong>: Seed-personalized PageRank</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.3 Acceptance & Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-2">Acceptance (neutral defaults):</div>
                <code className="text-sm">flow {'>='} 0.5 AND min-cut {'>='} 2</code>
              </div>
              
              <div>
                <div className="font-semibold text-sm mb-2">STS Tiers:</div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Connected</span>
                    <span className="font-mono">STS {'>='} 40</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Verified</span>
                    <span className="font-mono">STS {'>='} 60 AND min-cut {'>='} 2</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Trusted</span>
                    <span className="font-mono">STS {'>='} 80 AND min-cut {'>='} 3 AND Stability {'>='} 0.8</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="security" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-primary">6.</span> Security Model
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6.1 Current Defenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Defense</th>
                    <th className="text-left py-2 font-semibold">Mechanism</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Epoch-lagged capacities</td>
                    <td className="py-2 text-muted-foreground">Prev-epoch distances prevent distance inflation</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Min-cut floors</td>
                    <td className="py-2 text-muted-foreground">Require {'>='} 2 edge-disjoint paths</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Seed coverage {'>='} 2</td>
                    <td className="py-2 text-muted-foreground">Dust-flow mitigated via floors</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Public vouches</td>
                    <td className="py-2 text-muted-foreground">Merkle log enables community auditing</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Dilution penalty</td>
                    <td className="py-2 text-muted-foreground">Prices endorsement spam</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6.2 Planned Enhancements</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li><strong>Vertex-disjoint paths</strong>: Not just edge-disjoint for true independence</li>
              <li><strong>Per-seed flow floors</strong>: Require {'>='} 30% flow from each of {'>='} 2 seeds to avoid dust-coverage</li>
              <li><strong>Seed saturation throttles</strong>: Monitor and damp seeds exceeding 40-50% of total outflow</li>
              <li><strong>Cut witnesses</strong>: Publish minimal vertex-cut witness sets with Merkle proofs</li>
              <li><strong>SeedScore smoothing</strong>: EMA across epochs to avoid oscillations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">6.3 Seed Quality Scoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Seed s gets S_s in [0,1] from:</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Component</th>
                    <th className="text-left py-2 pr-4 font-semibold">Weight</th>
                    <th className="text-left py-2 font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Predictive validity</td>
                    <td className="py-2 pr-4">35%</td>
                    <td className="py-2 text-muted-foreground">Influence persists without seed's edges</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Downstream quality</td>
                    <td className="py-2 pr-4">30%</td>
                    <td className="py-2 text-muted-foreground">STS of influenced users</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Diversity lift</td>
                    <td className="py-2 pr-4">20%</td>
                    <td className="py-2 text-muted-foreground">Distinct neighborhoods reached</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Centralization penalty</td>
                    <td className="py-2 pr-4">15%</td>
                    <td className="py-2 text-muted-foreground">Damp if seed carries {'>'}50% of outflow</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <strong>SOURCE capacity multiplier:</strong> 0.7 + 0.6 x S_s in [0.7, 1.3]
              <br />
              Only seeds with S_s {'>='} 0.6 count toward "{'>='} 2 seeds" requirement.
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="parameters" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          <span className="text-primary">7.</span> Parameterization & Learning
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7.1 Default Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Parameter</th>
                    <th className="text-left py-2 pr-4 font-semibold">Value</th>
                    <th className="text-left py-2 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b">
                    <td className="py-2 pr-4">F_0</td>
                    <td className="py-2 pr-4">5</td>
                    <td className="py-2 font-sans text-muted-foreground">Healthy vouch count baseline</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">R_0</td>
                    <td className="py-2 pr-4">20</td>
                    <td className="py-2 font-sans text-muted-foreground">Healthy redundancy baseline</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">lambda_depth</td>
                    <td className="py-2 pr-4">0.2</td>
                    <td className="py-2 font-sans text-muted-foreground">Depth bonus weight</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">lambda_conn</td>
                    <td className="py-2 pr-4">1.0</td>
                    <td className="py-2 font-sans text-muted-foreground">Connectivity bonus weight</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">alpha</td>
                    <td className="py-2 pr-4">0.85</td>
                    <td className="py-2 font-sans text-muted-foreground">Iteration damping factor</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">epsilon</td>
                    <td className="py-2 pr-4">0.5</td>
                    <td className="py-2 font-sans text-muted-foreground">Convergence threshold</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">max_iter</td>
                    <td className="py-2 pr-4">10</td>
                    <td className="py-2 font-sans text-muted-foreground">Maximum iterations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7.2 Data-Driven Refinement</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>Learn component weights and baselines from simulated and labeled graphs using constrained (monotone) models:</p>
            <div className="my-4 p-4 rounded-lg bg-muted/30">
              <p className="font-semibold mb-2">Targets:</p>
              <ul className="text-sm space-y-1 mb-0">
                <li>High Sybil detection AUC</li>
                <li>Low false-negative rate on under-connected legitimate users</li>
                <li>Score stability across epochs</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Method: Logistic regression or monotone gradient boosting over {'{'}F, C, S, D, PR{'}'}. 
              Monotonicity constraints ensure interpretability. Calibration via Platt/Isotonic scaling.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">7.3 Sensitivity Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">F_0 Changes:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-mono">5 → 3</span>: +15-25% for users with 3-4 vouchers
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-mono">5 → 7</span>: -10-15% for users with 5-6 vouchers
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">R_0 Changes:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-mono">20 → 15</span>: +8-12% for sparse networks
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="font-mono">20 → 25</span>: -5-10% for most users
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="implementation" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">8.</span> Implementation
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8.1 Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Backend</div>
                <p className="text-sm text-muted-foreground">Node.js / TypeScript (Express)</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Database</div>
                <p className="text-sm text-muted-foreground">PostgreSQL (Drizzle ORM)</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Frontend</div>
                <p className="text-sm text-muted-foreground">React / Vite / Tailwind CSS</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Auth</div>
                <p className="text-sm text-muted-foreground">Multi-chain wallets; EIP-712 signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8.2 API Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 font-mono text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-primary">GET /api/ego/:addr/score</div>
                <div className="text-xs text-muted-foreground mt-1">→ {'{'}localHealth, voucherCount, residualQuality, redundancy, dilution{'}'}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-primary">GET /api/ego/:addr/explain</div>
                <div className="text-xs text-muted-foreground mt-1">→ {'{'}minCut, seedPaths, componentBreakdown, egoSubgraphSize{'}'}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-primary">POST /api/vouch</div>
                <div className="text-xs text-muted-foreground mt-1">→ {'{'}endorsee, signature{'}'} // triggers recomputes</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-primary">GET /api/community/:id/sts/:addr</div>
                <div className="text-xs text-muted-foreground mt-1">→ {'{'}sts, F, C, S, D, PR, minCut, depth{'}'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="evaluation" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">9.</span> Evaluation
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">9.1 Deployment Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-semibold">Metric</th>
                    <th className="text-left py-2 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">LocalHealth range</td>
                    <td className="py-2 font-mono">~21 - 100</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Median LocalHealth</td>
                    <td className="py-2 font-mono">~55</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Typical convergence</td>
                    <td className="py-2 font-mono">4-6 iterations</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Users with dilution penalty</td>
                    <td className="py-2 font-mono">{'<'}5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="future-work" className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <span className="text-primary">10.</span> Future Work
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Hardening</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>Vertex-disjoint checks</li>
                <li>Per-seed flow floors</li>
                <li>Cut witnesses with Merkle proofs</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Algorithm Improvements</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>Adaptive baselines</li>
                <li>Percentile-based tiers</li>
                <li>Piecewise dilution curve</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Extensions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>Vouch revocation/expiry</li>
                <li>Typed vouches</li>
                <li>Cross-community portability</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold">11. Conclusion</h2>
        <Card>
          <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
            <p>
              MaxFlow computes neutral, verifiable graph signals by pairing recursive trust with structural resilience 
              and explicit accountability. Public vouches, epoch-lagged capacities, and signed attestations yield an 
              auditable, Sybil-resistant foundation.
            </p>
            <p>Applications consume these signals to:</p>
            <ul>
              <li>Allocate capital (microcredit, grants)</li>
              <li>Weight governance (DAO voting)</li>
              <li>Gate access (communities, features)</li>
              <li>Route grants (quadratic funding)</li>
            </ul>
            <p>—without inheriting centralized choke points.</p>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">References</h2>
        <Card>
          <CardContent className="pt-6">
            <ol className="space-y-3 text-sm">
              <li>
                <span className="font-semibold">Levien, R.</span> "Attack-Resistant Trust Metrics for Public Key Certification." 
                <span className="text-muted-foreground"> USENIX Security (1998).</span>
              </li>
              <li>
                <span className="font-semibold">Kamvar, S., Schlosser, M., Garcia-Molina, H.</span> "The EigenTrust Algorithm for Reputation Management in P2P Networks." 
                <span className="text-muted-foreground"> WWW (2003).</span>
              </li>
              <li>
                <span className="font-semibold">Douceur, J.</span> "The Sybil Attack." 
                <span className="text-muted-foreground"> IPTPS (2002).</span>
              </li>
              <li>
                <span className="font-semibold">Ford, L., Fulkerson, D.</span> "Maximal Flow through a Network." 
                <span className="text-muted-foreground"> Canadian Journal of Mathematics (1956).</span>
              </li>
              <li>
                <span className="font-semibold">Dinic, E.</span> "Algorithm for Solution of a Problem of Maximum Flow in Networks with Power Estimation." 
                <span className="text-muted-foreground"> Soviet Mathematics Doklady (1970).</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <div className="mt-12 p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <p>
          MaxFlow is open infrastructure. This whitepaper describes the implementation as of November 2025. 
          Algorithm parameters may be updated based on empirical performance and community feedback.
        </p>
      </div>
    </div>
  );
}
