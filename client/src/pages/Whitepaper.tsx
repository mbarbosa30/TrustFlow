import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, BookOpen, Shield, Cpu, FlaskConical, Lightbulb } from "lucide-react";
import { Math, BlockFormula, InlineFormula } from "@/components/Math";

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
            <p>Directed graph <InlineFormula>{"G = (V, E)"}</InlineFormula>:</p>
            <ul>
              <li><strong>Nodes</strong>: User accounts (addresses)</li>
              <li><strong>Edges</strong>: Binary endorsements <InlineFormula>{"e = (u \\to v)"}</InlineFormula> with (epoch, community)</li>
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
                    <td className="py-2 pr-4">LocalHealth</td>
                    <td className="py-2 pr-4">0-100</td>
                    <td className="py-2 pr-4">Personal network</td>
                    <td className="py-2">Iterative recursive trust weighting</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">STS</td>
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
            <p className="text-sm text-muted-foreground mb-4">For user <InlineFormula>{"i"}</InlineFormula>:</p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"\\mathcal{V}_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">Set of vouchers (incoming endorsers)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"s_j \\in [0,100]"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">LocalHealth of voucher <InlineFormula>{"j"}</InlineFormula></div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"F_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">directFlow <InlineFormula>{"= \\sum_{j \\in \\mathcal{V}_i} (s_j / 100)"}</InlineFormula></div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"\\phi_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">flowScore <InlineFormula>{"= \\min\\!\\big(1, F_i / F_0\\big)"}</InlineFormula>, baseline <InlineFormula>{"F_0"}</InlineFormula> (default 5)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"R_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">ResidualQuality <InlineFormula>{"= \\text{clip}_{[0,1]}\\!\\left( \\frac{F_i}{\\max(1,|\\mathcal{V}_i|)} \\right)"}</InlineFormula></div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"\\rho_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">effectiveRedundancy from ego upstream (defined below)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"d_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">redundancy <InlineFormula>{"= \\min\\!\\big(1, \\rho_i / R_0\\big)"}</InlineFormula>, baseline <InlineFormula>{"R_0"}</InlineFormula> (default 20)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[120px]"><InlineFormula>{"D_i"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">DilutionFactor <InlineFormula>{"= \\max\\!\\big(0.5,\\ 1 - 0.1 \\cdot \\max(0, \\text{outVouches}_i - 10)\\big)"}</InlineFormula></div>
              </div>
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
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <BlockFormula data-testid="formula-localhealth">
                {"\\boxed{ \\mathrm{LocalHealth}_i \\;=\\; 60 \\cdot \\phi_i^2 \\;+\\; 40 \\cdot \\big(d_i^2 \\cdot R_i \\cdot D_i\\big) }"}
              </BlockFormula>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">60% Flow</div>
                <p className="text-xs text-muted-foreground">Who vouches for you, recursively weighted</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">40% Structure × Quality × Accountability</div>
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
              Build an upstream ego subgraph from <InlineFormula>{"\\mathcal{V}_i"}</InlineFormula> by BFS on incoming edges (who vouches for my vouchers, etc.), excluding <InlineFormula>{"i"}</InlineFormula>. Let:
            </p>
            <div className="space-y-2 mb-4">
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[80px]"><InlineFormula>{"k"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground"><InlineFormula>{"|\\mathcal{V}_i|"}</InlineFormula> (direct voucher count)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[80px]"><InlineFormula>{"u"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground"><InlineFormula>{"\\max(0, |U_i| - k)"}</InlineFormula> (additional upstream supporters)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[80px]"><InlineFormula>{"m"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">Internal edges in ego subgraph</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[80px]"><InlineFormula>{"n"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground"><InlineFormula>{"|U_i|"}</InlineFormula> nodes in ego subgraph</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-4">
                <div className="min-w-[80px]"><InlineFormula>{"\\delta"}</InlineFormula></div>
                <div className="text-sm text-muted-foreground">Edge density <InlineFormula>{"= \\frac{m}{\\max(1, n(n-1))}"}</InlineFormula></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <BlockFormula data-testid="formula-redundancy">
                {"\\rho_i = k + \\lambda_{\\text{depth}} \\cdot u + \\lambda_{\\text{conn}} \\cdot (\\delta \\cdot n)"}
              </BlockFormula>
              <p className="text-sm text-muted-foreground text-center mt-2">
                <InlineFormula>{"\\lambda_{\\text{depth}} = 0.2"}</InlineFormula>, <InlineFormula>{"\\lambda_{\\text{conn}} = 1.0"}</InlineFormula> (defaults)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4.4 Iterative Computation (Damped)</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              Initialize <InlineFormula>{"s_i^{(0)}"}</InlineFormula> from <InlineFormula>{"|\\mathcal{V}_i|"}</InlineFormula> (e.g., <InlineFormula>{"\\min(100, 20\\sqrt{|\\mathcal{V}_i|})"}</InlineFormula>). At each round:
            </p>
            <ol>
              <li>Compute <InlineFormula>{"\\widehat{s}_i^{(t+1)}"}</InlineFormula> via the formula above using <InlineFormula>{"s^{(t)}"}</InlineFormula> for vouchers</li>
              <li>Apply damped update:</li>
            </ol>
            <div className="p-4 rounded-lg bg-muted/50 my-4">
              <BlockFormula data-testid="formula-damped-update">
                {"s_i^{(t+1)} = (1 - \\alpha) \\cdot s_i^{(t)} + \\alpha \\cdot \\widehat{s}_i^{(t+1)}, \\quad \\alpha \\in (0,1) \\ \\ (\\text{default } 0.85)"}
              </BlockFormula>
            </div>
            <p>
              <strong>Stopping criteria:</strong> <InlineFormula>{"\\max_i |s_i^{(t+1)} - s_i^{(t)}| < \\varepsilon"}</InlineFormula> (default 0.5) or at 10 rounds.
            </p>
            <div className="p-3 rounded-lg bg-muted/30 mt-4">
              <p className="text-sm mb-0">
                <strong>Convergence note:</strong> With damping, the update is a convex combination of the previous state and a 1-Lipschitz transform. 
                Choosing <InlineFormula>{"\\alpha < 1"}</InlineFormula> yields a contraction in practice; empirically ≤8 rounds for <InlineFormula>{"d_{\\text{avg}} < 10"}</InlineFormula>.
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
                        <th className="text-left py-2 px-3 font-semibold"><InlineFormula>{"F_i"}</InlineFormula></th>
                        <th className="text-left py-2 px-3 font-semibold"><InlineFormula>{"\\phi_i"}</InlineFormula></th>
                        <th className="text-left py-2 px-3 font-semibold">Flow Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">1</td>
                        <td className="py-2 px-3">50%</td>
                        <td className="py-2 px-3">0.5</td>
                        <td className="py-2 px-3">0.10</td>
                        <td className="py-2 px-3">0.6</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">3</td>
                        <td className="py-2 px-3">70%</td>
                        <td className="py-2 px-3">2.1</td>
                        <td className="py-2 px-3">0.42</td>
                        <td className="py-2 px-3">10.6</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">5</td>
                        <td className="py-2 px-3">80%</td>
                        <td className="py-2 px-3">4.0</td>
                        <td className="py-2 px-3">0.80</td>
                        <td className="py-2 px-3">38.4</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">8</td>
                        <td className="py-2 px-3">90%</td>
                        <td className="py-2 px-3">7.2</td>
                        <td className="py-2 px-3">1.00</td>
                        <td className="py-2 px-3">60.0</td>
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
                        <th className="text-left py-2 px-3 font-semibold"><InlineFormula>{"D_i"}</InlineFormula></th>
                        <th className="text-left py-2 px-3 font-semibold">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 px-3">≤ 10</td>
                        <td className="py-2 px-3">0</td>
                        <td className="py-2 px-3">0%</td>
                        <td className="py-2 px-3">1.00</td>
                        <td className="py-2 px-3 text-green-600 dark:text-green-400">None</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">12</td>
                        <td className="py-2 px-3">2</td>
                        <td className="py-2 px-3">20%</td>
                        <td className="py-2 px-3">0.80</td>
                        <td className="py-2 px-3 text-amber-600 dark:text-amber-400">-8 pts max</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-3">15</td>
                        <td className="py-2 px-3">5</td>
                        <td className="py-2 px-3">50%</td>
                        <td className="py-2 px-3">0.50</td>
                        <td className="py-2 px-3 text-red-600 dark:text-red-400">-20 pts max</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3">20+</td>
                        <td className="py-2 px-3">10+</td>
                        <td className="py-2 px-3">50% (cap)</td>
                        <td className="py-2 px-3">0.50</td>
                        <td className="py-2 px-3 text-red-600 dark:text-red-400">-20 pts max</td>
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
              <li>Split each user <InlineFormula>{"u"}</InlineFormula> into <InlineFormula>{"(u^-, u^+)"}</InlineFormula> with internal capacity <InlineFormula>{"c(d)"}</InlineFormula> based on prev-epoch hop-distance <InlineFormula>{"d"}</InlineFormula> from any seed</li>
              <li>Add <InlineFormula>{"u^- \\to \\text{SINK}"}</InlineFormula> with cap = 1</li>
              <li>For each vouch <InlineFormula>{"a \\to b"}</InlineFormula>: add <InlineFormula>{"a^+ \\to b^-"}</InlineFormula> with cap = 1</li>
              <li>SOURCE → seed<sup>-</sup> capacity = BASE × <InlineFormula>{"(0.7 + 0.6 \\cdot S_s)"}</InlineFormula> where <InlineFormula>{"S_s \\in [0,1]"}</InlineFormula> is the SeedScore</li>
            </ul>
            
            <h4 className="font-semibold mt-4 mb-2">Default Capacity Schedule:</h4>
            <div className="p-4 rounded-lg bg-muted/50 my-4">
              <BlockFormula data-testid="formula-capacity">
                {"c(0)=800,\\; c(1)=240,\\; c(2)=96,\\; c(3)=48,\\; c(\\geq 4)=24"}
              </BlockFormula>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.2 Components & Normalization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For user <InlineFormula>{"i"}</InlineFormula> in the accepted set:
            </p>
            <div className="grid md:grid-cols-2 gap-2 mb-4 text-sm">
              <div className="p-2 rounded bg-muted/30"><InlineFormula>{"f_i"}</InlineFormula>: Flow (max-flow from SOURCE)</div>
              <div className="p-2 rounded bg-muted/30"><InlineFormula>{"c_i"}</InlineFormula>: Min-cut capacity</div>
              <div className="p-2 rounded bg-muted/30"><InlineFormula>{"d_i"}</InlineFormula>: Depth (prev-epoch distance)</div>
              <div className="p-2 rounded bg-muted/30"><InlineFormula>{"S_i"}</InlineFormula>: Stability score</div>
              <div className="p-2 rounded bg-muted/30"><InlineFormula>{"pr_i"}</InlineFormula>: Seed-personalized PageRank</div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 my-4">
              <BlockFormula data-testid="formula-normalization">
                {`\\begin{aligned}
F_i &= \\min\\!\\left(1,\\ \\frac{\\log(1+f_i)}{\\log(1+\\max(F_{95},\\tilde{F}_{95}))}\\right) \\\\
C_i &= \\min\\!\\left(1,\\ \\frac{c_i}{\\max(3,\\max(C_{95},\\tilde{C}_{95}))}\\right) \\\\
D_i &= e^{-\\lambda d_i} \\ (\\lambda \\approx 0.35) \\\\
PR_i &= \\frac{\\log(1+pr_i)}{\\log(1+\\max pr)}
\\end{aligned}`}
              </BlockFormula>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.3 STS Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
              <BlockFormula data-testid="formula-sts">
                {"\\boxed{\\mathrm{STS}_i = 100 \\cdot \\big(0.55F_i + 0.25C_i + 0.05S_i + 0.10D_i + 0.05PR_i\\big)}"}
              </BlockFormula>
            </div>
            <div className="grid md:grid-cols-5 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/30 text-center"><strong>55%</strong><br/>Flow</div>
              <div className="p-2 rounded bg-muted/30 text-center"><strong>25%</strong><br/>Min-cut</div>
              <div className="p-2 rounded bg-muted/30 text-center"><strong>5%</strong><br/>Stability</div>
              <div className="p-2 rounded bg-muted/30 text-center"><strong>10%</strong><br/>Depth</div>
              <div className="p-2 rounded bg-muted/30 text-center"><strong>5%</strong><br/>PageRank</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">5.4 Acceptance & Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-2">Acceptance (neutral defaults):</div>
                <p className="text-sm"><InlineFormula>{"\\text{flow} \\geq 0.5 \\text{ AND min-cut} \\geq 2"}</InlineFormula></p>
              </div>
              
              <div>
                <div className="font-semibold text-sm mb-2">STS Tiers:</div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Connected</span>
                    <span><InlineFormula>{"\\text{STS} \\geq 40"}</InlineFormula></span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Verified</span>
                    <span><InlineFormula>{"\\text{STS} \\geq 60 \\text{ AND min-cut} \\geq 2"}</InlineFormula></span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30 text-sm">
                    <span>Trusted</span>
                    <span><InlineFormula>{"\\text{STS} \\geq 80 \\text{ AND min-cut} \\geq 3 \\text{ AND Stability} \\geq 0.8"}</InlineFormula></span>
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
                    <td className="py-2 text-muted-foreground">Require ≥ 2 edge-disjoint paths</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Seed coverage ≥ 2</td>
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
              <li><strong>Per-seed flow floors</strong>: Require ≥30% flow from each of ≥2 seeds to avoid dust-coverage</li>
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
            <p className="text-sm text-muted-foreground mb-4">Seed <InlineFormula>{"s"}</InlineFormula> gets <InlineFormula>{"S_s \\in [0,1]"}</InlineFormula> from:</p>
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
              <strong>SOURCE capacity multiplier:</strong> <InlineFormula>{"0.7 + 0.6 \\cdot S_s \\in [0.7, 1.3]"}</InlineFormula>
              <br />
              Only seeds with <InlineFormula>{"S_s \\geq 0.6"}</InlineFormula> count toward "≥2 seeds" requirement.
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
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"F_0"}</InlineFormula></td>
                    <td className="py-2 pr-4">5</td>
                    <td className="py-2 text-muted-foreground">Healthy vouch count baseline</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"R_0"}</InlineFormula></td>
                    <td className="py-2 pr-4">20</td>
                    <td className="py-2 text-muted-foreground">Healthy redundancy baseline</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"\\lambda_{\\text{depth}}"}</InlineFormula></td>
                    <td className="py-2 pr-4">0.2</td>
                    <td className="py-2 text-muted-foreground">Depth bonus weight</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"\\lambda_{\\text{conn}}"}</InlineFormula></td>
                    <td className="py-2 pr-4">1.0</td>
                    <td className="py-2 text-muted-foreground">Connectivity bonus weight</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"\\alpha"}</InlineFormula></td>
                    <td className="py-2 pr-4">0.85</td>
                    <td className="py-2 text-muted-foreground">Iteration damping factor</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4"><InlineFormula>{"\\varepsilon"}</InlineFormula></td>
                    <td className="py-2 pr-4">0.5</td>
                    <td className="py-2 text-muted-foreground">Convergence threshold</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">max_iter</td>
                    <td className="py-2 pr-4">10</td>
                    <td className="py-2 text-muted-foreground">Maximum iterations</td>
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
                <h4 className="font-semibold text-sm mb-2"><InlineFormula>{"F_0"}</InlineFormula> Changes:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/30">
                    <InlineFormula>{"5 \\to 3"}</InlineFormula>: +15-25% for users with 3-4 vouchers
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <InlineFormula>{"5 \\to 7"}</InlineFormula>: -10-15% for users with 5-6 vouchers
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2"><InlineFormula>{"R_0"}</InlineFormula> Changes:</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-muted/30">
                    <InlineFormula>{"20 \\to 15"}</InlineFormula>: +8-12% for sparse networks
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <InlineFormula>{"20 \\to 25"}</InlineFormula>: -5-10% for most users
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
            <CardTitle className="text-lg">8.2 Performance</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li><strong>LocalHealth</strong>: Per-round update is <InlineFormula>{"O(|E|)"}</InlineFormula>; ≤10 rounds with damping; trivially parallel per node</li>
              <li><strong>STS</strong>: Reusable residual graphs; Push-Relabel with global relabeling works well when computing many max-flows per epoch</li>
              <li><strong>Caching</strong>: Cache LocalHealth with timestamps; recompute on vouch events or on demand with freshness hints</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">8.3 API Reference</CardTitle>
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
                    <td className="py-2">~21 - 100</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Median LocalHealth</td>
                    <td className="py-2">~55</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Typical convergence</td>
                    <td className="py-2">4-6 iterations</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Users with dilution penalty</td>
                    <td className="py-2">{'<'}5%</td>
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
                <li>Adaptive baselines (<InlineFormula>{"F_0"}</InlineFormula>, <InlineFormula>{"R_0"}</InlineFormula>)</li>
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
                <li>Typed vouches (skill/credit)</li>
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
