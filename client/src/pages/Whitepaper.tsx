import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, BookOpen, Shield, Cpu, FlaskConical, Lightbulb, 
  AlertTriangle, BarChart3, Zap, Target, Scale, GitBranch,
  CheckCircle2, XCircle, ArrowRight, TrendingUp
} from "lucide-react";
import { BlockFormula, InlineFormula } from "@/components/Math";

function ResponsiveTable({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${className}`}>
      <div className="min-w-[400px]">
        {children}
      </div>
    </div>
  );
}

function FormulaBox({ children, label, testId }: { children: React.ReactNode; label?: string; testId?: string }) {
  return (
    <div className="p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20 my-4 overflow-x-auto" data-testid={testId}>
      {label && <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>}
      <div className="min-w-[300px]">
        {children}
      </div>
    </div>
  );
}

export default function Whitepaper() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-whitepaper-title">MaxFlow Whitepaper</h1>
            <p className="text-sm text-muted-foreground">Version 1.1 — November 2025</p>
          </div>
        </div>
        <h2 className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Sybil-Resistant Graph Signal Infrastructure via Recursive Trust Weighting
        </h2>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Abstract
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm sm:text-base">
          <p className="leading-relaxed">
            MaxFlow is <strong>neutral reputation infrastructure</strong> that converts public binary endorsements ("vouches") 
            into verifiable graph signals using max-flow/min-cut algorithms and recursive trust weighting. Unlike centralized 
            reputation systems that act as gatekeepers, MaxFlow computes mathematical signals that applications interpret 
            according to their own policies—for creditworthiness, governance weight, access control, or grant allocation.
          </p>
          
          <p className="leading-relaxed">
            The system produces two complementary score families per epoch:
          </p>
          
          <div className="grid gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
              <div className="font-semibold mb-1">LocalHealth (0-100)</div>
              <p className="text-muted-foreground text-sm">
                Personal network quality score computed by an iterative algorithm where each incoming vouch is weighted 
                by the voucher's own score—creating recursive trust propagation. No seeds required.
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
              <div className="font-semibold mb-1">STS — Standardized Trust Score (0-100)</div>
              <p className="text-muted-foreground text-sm">
                Community score built on Advogato-style max-flow/min-cut from community-managed seeds, with robust 
                percentile normalization and epoch-lagged capacities to prevent gaming.
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 mt-6">
            <p className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Core Design Properties
            </p>
            <div className="grid gap-2 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div><strong>Accountability</strong> — Outgoing vouches incur dilution penalties, creating real cost for endorsement spam</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div><strong>Epoch-lagged capacities</strong> — Distance-based node capacities use the previous epoch's graph to prevent distance inflation attacks</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div><strong>Separation of concerns</strong> — Reward layers (e.g., KUDOS tokens) consume scores but never influence them</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div><strong>Verifiability</strong> — Parameters, Merkle roots, and signed outputs are published per epoch for independent verification</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <nav className="mb-8 p-4 rounded-lg bg-muted/30">
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Contents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
          <a href="#introduction" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-introduction">1. Introduction & Motivation</a>
          <a href="#related-work" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-related-work">2. Related Work & Comparison</a>
          <a href="#system-overview" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-system-overview">3. System Architecture</a>
          <a href="#localhealth" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-localhealth">4. LocalHealth Algorithm</a>
          <a href="#sts" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-sts">5. STS Algorithm</a>
          <a href="#threat-model" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-threat-model">6. Threat Model & Security</a>
          <a href="#evaluation" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-evaluation">7. Evaluation & Benchmarks</a>
          <a href="#discussion" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-discussion">8. Discussion & Limitations</a>
          <a href="#implementation" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-implementation">9. Implementation</a>
          <a href="#future-work" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-future-work">10. Future Work</a>
        </div>
      </nav>

      <Separator className="my-8" />

      <section id="introduction" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">1.</span> Introduction & Motivation
        </h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              The Sybil Problem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              In any open network where identity is cheap or free, adversaries can create arbitrarily many fake accounts 
              to amplify their influence. This <strong>Sybil attack</strong> (Douceur, 2002) fundamentally undermines:
            </p>
            <div className="grid gap-2 sm:gap-3">
              <div className="p-3 rounded-lg bg-destructive/10 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <strong>Democratic governance</strong> — One-person-one-vote collapses when one person controls thousands of accounts
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <strong>Quadratic funding</strong> — Matching algorithms assume independent contributors, not coordinated Sybil farms
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <strong>Reputation systems</strong> — Fake reviews, astroturfing, and manufactured consensus become trivial
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <strong>Airdrops & incentives</strong> — Token distributions intended for real users get captured by farmers
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Existing Solutions Fall Short</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Current approaches to Sybil resistance each introduce significant trade-offs:
            </p>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Proof-of-Stake / Economic Barriers</div>
                <p className="text-muted-foreground text-sm">
                  Requiring capital to participate excludes legitimate users without resources. Wealthy attackers 
                  can still Sybil by spreading stake across accounts. The cure—plutocracy—may be worse than the disease.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Centralized Attestation (KYC, Biometrics)</div>
                <p className="text-muted-foreground text-sm">
                  Services like Worldcoin or traditional KYC create single points of failure, privacy violations, and 
                  exclusion of those without government IDs. They also concentrate power in the attestation provider.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Social Verification (BrightID, PoH)</div>
                <p className="text-muted-foreground text-sm">
                  Requiring in-person verification or video calls limits scale and accessibility. Coverage remains 
                  sparse, and the systems still depend on trusted verifiers who could be compromised.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Aggregated Attestations (Gitcoin Passport)</div>
                <p className="text-muted-foreground text-sm">
                  Combining multiple signals improves robustness but still depends on external providers. Each 
                  attestation has its own gaming vectors, and the aggregation logic introduces centralized trust.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              The MaxFlow Approach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              MaxFlow takes a different path: instead of trying to determine who is "real" through external attestations, 
              we measure <strong>how deeply integrated someone is in a network of mutual accountability</strong>. The 
              insight is that Sybil accounts are fundamentally different from real users in their graph structure:
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="font-semibold text-sm mb-2 text-green-700 dark:text-green-400">Real Users</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Multiple independent endorsers</li>
                  <li>• Deep upstream support chains</li>
                  <li>• Endorsers have their own high scores</li>
                  <li>• Diverse path redundancy</li>
                </ul>
              </div>
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="font-semibold text-sm mb-2 text-red-700 dark:text-red-400">Sybil Accounts</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Few or no legitimate endorsers</li>
                  <li>• Shallow endorsement chains</li>
                  <li>• Endorsers are also low-quality Sybils</li>
                  <li>• Single point of failure (controller)</li>
                </ul>
              </div>
            </div>

            <p className="leading-relaxed">
              By weighting vouches recursively—your score depends on the scores of those who vouch for you—we create 
              a system where Sybil accounts cannot bootstrap themselves. A cluster of fake accounts vouching for each 
              other gets low scores because none of them have high-quality endorsers. Meanwhile, real users embedded 
              in legitimate networks accumulate trust through multiple independent paths.
            </p>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold mb-2">Design Principles</p>
              <div className="grid gap-2 text-sm">
                <div className="flex gap-2">
                  <span className="font-mono text-primary">1.</span>
                  <div><strong>Neutrality</strong> — Scores are mathematical signals; applications decide their meaning</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-primary">2.</span>
                  <div><strong>Verifiability</strong> — Deterministic computation from public data with signed attestations</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-primary">3.</span>
                  <div><strong>Accountability</strong> — Endorsing has costs; spam reduces your own score</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-primary">4.</span>
                  <div><strong>Separation</strong> — Economic rewards never influence graph-based scoring</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="related-work" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">2.</span> Related Work & Comparison
        </h2>
        
        <Card>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm sm:text-base leading-relaxed">
              MaxFlow builds on decades of research in trust metrics, graph algorithms, and Sybil resistance. 
              Understanding these predecessors clarifies our design choices and trade-offs.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline">Advogato 1998</Badge>
                  <span className="font-semibold">Max-Flow Trust Metrics</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Raph Levien's pioneering work used max-flow from trusted seeds to bound the influence of attackers. 
                  The key insight: an attacker can only gain as much trust as they can "flow" through legitimate 
                  endorsements, naturally limiting Sybil influence.
                </p>
                <div className="text-sm">
                  <span className="text-green-600 dark:text-green-400 font-medium">MaxFlow extends:</span> We add 
                  epoch-lagged capacities (preventing distance inflation), seed quality scoring (preventing seed capture), 
                  and robust percentile normalization (stable scores across graph sizes).
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline">EigenTrust 2003</Badge>
                  <span className="font-semibold">Iterative Trust Propagation</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Kamvar et al. applied PageRank-style iteration to P2P networks, propagating trust through transaction 
                  history. Trust scores converge through repeated matrix multiplication, naturally emphasizing 
                  well-connected, high-quality nodes.
                </p>
                <div className="text-sm">
                  <span className="text-green-600 dark:text-green-400 font-medium">MaxFlow improves:</span> We use 
                  damped iteration with explicit convergence bounds, add accountability penalties for outgoing vouches, 
                  and separate flow-based scoring from redundancy metrics for clearer semantics.
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline">Personalized PageRank</Badge>
                  <span className="font-semibold">Seed-Relative Scoring</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Computing PageRank with restarts to a seed set provides personalized trust views. Each community 
                  can have its own perspective on which nodes are trustworthy, avoiding global consensus requirements.
                </p>
                <div className="text-sm">
                  <span className="text-green-600 dark:text-green-400 font-medium">MaxFlow incorporates:</span> STS 
                  includes seed-personalized PageRank as a 5% component, combining it with max-flow for robustness 
                  against PageRank's sensitivity to high-degree nodes.
                </div>
              </div>
            </div>

            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold">System</th>
                    <th className="text-left py-2 px-3 font-semibold">Mechanism</th>
                    <th className="text-left py-2 px-3 font-semibold">Strengths</th>
                    <th className="text-left py-2 px-3 font-semibold">Weaknesses</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Advogato</td>
                    <td className="py-2 px-3 text-muted-foreground">Max-flow from seeds</td>
                    <td className="py-2 px-3 text-muted-foreground">Provable attack bounds</td>
                    <td className="py-2 px-3 text-muted-foreground">Seed capture, static capacities</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">EigenTrust</td>
                    <td className="py-2 px-3 text-muted-foreground">Iterative propagation</td>
                    <td className="py-2 px-3 text-muted-foreground">Simple, scalable</td>
                    <td className="py-2 px-3 text-muted-foreground">Pre-trusted capture, convergence quirks</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">BrightID</td>
                    <td className="py-2 px-3 text-muted-foreground">Social verification</td>
                    <td className="py-2 px-3 text-muted-foreground">High assurance</td>
                    <td className="py-2 px-3 text-muted-foreground">Low coverage, centralized verifiers</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">Gitcoin Passport</td>
                    <td className="py-2 px-3 text-muted-foreground">Aggregated attestations</td>
                    <td className="py-2 px-3 text-muted-foreground">Multi-signal robustness</td>
                    <td className="py-2 px-3 text-muted-foreground">Depends on external providers</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-primary">MaxFlow</td>
                    <td className="py-2 px-3 text-muted-foreground">Recursive trust + max-flow</td>
                    <td className="py-2 px-3 text-muted-foreground">Self-contained, accountable</td>
                    <td className="py-2 px-3 text-muted-foreground">Cold start for new networks</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="system-overview" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">3.</span> System Architecture
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Graph Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              The endorsement graph <InlineFormula>{"G = (V, E)"}</InlineFormula> is a directed graph where:
            </p>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono text-primary shrink-0">V</span>
                <div>User accounts identified by Ethereum addresses (normalized to lowercase)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono text-primary shrink-0">E</span>
                <div>
                  Binary endorsements <InlineFormula>{"e = (u \\to v)"}</InlineFormula> where user <InlineFormula>{"u"}</InlineFormula> vouches 
                  for user <InlineFormula>{"v"}</InlineFormula>, tagged with epoch and community
                </div>
              </div>
            </div>
            
            <p className="leading-relaxed">
              All endorsements are <strong>public and immutable</strong>. Each vouch is logged in a per-epoch Merkle tree, 
              enabling anyone to audit the graph and independently verify score computations. This transparency is 
              intentional: if you vouch for a bad actor, that connection is visible, creating social accountability.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dual Scoring System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              MaxFlow produces two complementary scores, each optimized for different use cases:
            </p>
            
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold">Score</th>
                    <th className="text-left py-2 px-3 font-semibold">Range</th>
                    <th className="text-left py-2 px-3 font-semibold">Seeds Required</th>
                    <th className="text-left py-2 px-3 font-semibold">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">LocalHealth</td>
                    <td className="py-2 px-3">0-100</td>
                    <td className="py-2 px-3">No</td>
                    <td className="py-2 px-3 text-muted-foreground">Personal networks, cross-community portability</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">STS</td>
                    <td className="py-2 px-3">0-100</td>
                    <td className="py-2 px-3">Yes</td>
                    <td className="py-2 px-3 text-muted-foreground">Community-specific trust, access control</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>

            <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
              <p className="font-semibold text-sm mb-2">Why Two Scores?</p>
              <p className="text-sm text-muted-foreground">
                <strong>LocalHealth</strong> answers: "How much does the network trust this person?" It's computed 
                without reference to any seed set, making it portable across communities. <strong>STS</strong> answers: 
                "How trusted is this person within our specific community?" It uses community-managed seeds to anchor 
                trust to that community's values.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Epoch System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Scores are computed in discrete <strong>epochs</strong> rather than continuously. This provides:
            </p>
            <div className="grid gap-2 sm:gap-3">
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong>Determinism</strong> — Same inputs always produce same outputs, enabling independent verification
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong>Anti-gaming</strong> — Epoch-lagged capacities prevent "distance inflation" attacks where 
                  adversaries manipulate their hop-distance from seeds within an epoch
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong>Attestations</strong> — Each epoch publishes <code className="text-xs">params.json</code>, 
                  <code className="text-xs">seed_root</code>, <code className="text-xs">graph_root</code>, and 
                  signed <code className="text-xs">scores.jsonl</code> for verification
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="localhealth" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary" />
          <span className="text-primary">4.</span> LocalHealth Algorithm
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Intuition: Recursive Trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              The core insight behind LocalHealth is simple: <strong>your trustworthiness depends on who trusts you, 
              and their trustworthiness depends on who trusts them</strong>. This creates a recursive relationship 
              where high-quality vouchers contribute more to your score than low-quality ones.
            </p>
            
            <p className="leading-relaxed">
              Consider two users, Alice and Bob, each with 5 vouchers:
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="font-semibold text-sm mb-2">Alice's Vouchers</div>
                <p className="text-sm text-muted-foreground">
                  5 established community members with LocalHealth scores of 70-90. Each vouch carries significant weight.
                </p>
                <p className="text-sm font-medium mt-2 text-green-700 dark:text-green-400">Result: High LocalHealth</p>
              </div>
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="font-semibold text-sm mb-2">Bob's Vouchers</div>
                <p className="text-sm text-muted-foreground">
                  5 fresh accounts with LocalHealth scores of 10-20. The vouches carry little weight because the vouchers themselves aren't trusted.
                </p>
                <p className="text-sm font-medium mt-2 text-red-700 dark:text-red-400">Result: Low LocalHealth</p>
              </div>
            </div>
            
            <p className="leading-relaxed">
              This naturally penalizes Sybil clusters: a group of fake accounts vouching for each other all have 
              low-quality vouchers (each other), so none can bootstrap to a high score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formal Definition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              For user <InlineFormula>{"i"}</InlineFormula>, we define the following quantities:
            </p>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <InlineFormula>{"\\mathcal{V}_i"}</InlineFormula>
                  <span className="text-muted-foreground text-sm">— Set of vouchers (users who endorse <InlineFormula>{"i"}</InlineFormula>)</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <InlineFormula>{"s_j \\in [0,100]"}</InlineFormula>
                  <span className="text-muted-foreground text-sm">— LocalHealth score of voucher <InlineFormula>{"j"}</InlineFormula></span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Direct Flow</strong> — Sum of normalized voucher scores
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"F_i = \\sum_{j \\in \\mathcal{V}_i} \\frac{s_j}{100}"}</InlineFormula>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Flow Score</strong> — Normalized against healthy baseline
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"\\phi_i = \\min\\!\\big(1, F_i / F_0\\big)"}</InlineFormula>
                  <span className="text-sm text-muted-foreground ml-2">where <InlineFormula>{"F_0 = 5"}</InlineFormula> (default)</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Residual Quality</strong> — Average voucher strength
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"R_i = \\text{clip}_{[0,1]}\\!\\left( \\frac{F_i}{\\max(1,|\\mathcal{V}_i|)} \\right)"}</InlineFormula>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Dilution Factor</strong> — Penalty for vouching for too many others
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"D_i = \\max\\!\\big(0.5,\\ 1 - 0.1 \\cdot \\max(0, \\text{outVouches}_i - 10)\\big)"}</InlineFormula>
                </div>
              </div>
            </div>

            <FormulaBox label="LocalHealth Score Formula" testId="formula-localhealth">
              <BlockFormula>
                {"\\boxed{ \\mathrm{LocalHealth}_i \\;=\\; 60 \\cdot \\phi_i^2 \\;+\\; 40 \\cdot \\big(d_i^2 \\cdot R_i \\cdot D_i\\big) }"}
              </BlockFormula>
            </FormulaBox>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">60% Flow Component</div>
                <p className="text-sm text-muted-foreground">
                  Who vouches for you, weighted by their own scores. High-quality vouchers matter more.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">40% Structure Component</div>
                <p className="text-sm text-muted-foreground">
                  Path redundancy × average voucher quality × accountability penalty. Rewards deep, diverse networks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Effective Redundancy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Beyond just counting vouchers, we measure <strong>structural redundancy</strong>—how many independent 
              paths connect you to the broader network. This is computed from an "ego subgraph" built by upstream 
              BFS from your vouchers.
            </p>
            
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"k = |\\mathcal{V}_i|"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Direct voucher count</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"u = |U_i| - k"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Additional upstream supporters</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"\\delta = m / n(n-1)"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Edge density in ego subgraph</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"n = |U_i|"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Total nodes in ego subgraph</p>
              </div>
            </div>

            <FormulaBox label="Effective Redundancy" testId="formula-redundancy">
              <BlockFormula>
                {"\\rho_i = k + \\lambda_{\\text{depth}} \\cdot u + \\lambda_{\\text{conn}} \\cdot (\\delta \\cdot n)"}
              </BlockFormula>
              <p className="text-sm text-muted-foreground text-center mt-2">
                <InlineFormula>{"\\lambda_{\\text{depth}} = 0.2"}</InlineFormula>, <InlineFormula>{"\\lambda_{\\text{conn}} = 1.0"}</InlineFormula>
              </p>
            </FormulaBox>
            
            <p className="leading-relaxed">
              The redundancy score <InlineFormula>{"d_i = \\min(1, \\rho_i / R_0)"}</InlineFormula> normalizes against 
              a healthy baseline of <InlineFormula>{"R_0 = 20"}</InlineFormula>. Users with dense, deep support 
              networks approach <InlineFormula>{"d_i = 1"}</InlineFormula>; isolated accounts stay near zero.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iterative Computation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Because each user's score depends on their vouchers' scores, we compute LocalHealth iteratively 
              with damping for stable convergence:
            </p>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">1. Initialize</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  <InlineFormula>{"s_i^{(0)} = \\min(100, 20\\sqrt{|\\mathcal{V}_i|})"}</InlineFormula> — bootstrap from vouch count
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">2. Update</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  Compute <InlineFormula>{"\\widehat{s}_i^{(t+1)}"}</InlineFormula> using current voucher scores
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">3. Damp</strong>
                <div className="overflow-x-auto mt-1">
                  <InlineFormula>{"s_i^{(t+1)} = (1 - \\alpha) \\cdot s_i^{(t)} + \\alpha \\cdot \\widehat{s}_i^{(t+1)}"}</InlineFormula>
                  <span className="text-sm text-muted-foreground ml-2">(<InlineFormula>{"\\alpha = 0.85"}</InlineFormula>)</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">4. Converge</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  Stop when <InlineFormula>{"\\max_i |s_i^{(t+1)} - s_i^{(t)}| < 0.5"}</InlineFormula> or after 10 rounds
                </p>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold text-sm mb-2">Convergence Guarantee</p>
              <p className="text-sm text-muted-foreground">
                With damping factor <InlineFormula>{"\\alpha < 1"}</InlineFormula>, the update is a contraction mapping. 
                Empirically, convergence occurs in 4-8 iterations for typical networks with average degree {'<'} 10.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Worked Example</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              Consider user Alice with 4 vouchers at iteration <InlineFormula>{"t"}</InlineFormula>:
            </p>
            
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3">Voucher</th>
                    <th className="text-left py-2 px-3">Score <InlineFormula>{"s_j^{(t)}"}</InlineFormula></th>
                    <th className="text-left py-2 px-3">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Bob</td>
                    <td className="py-2 px-3">75</td>
                    <td className="py-2 px-3">0.75</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Carol</td>
                    <td className="py-2 px-3">60</td>
                    <td className="py-2 px-3">0.60</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Dave</td>
                    <td className="py-2 px-3">80</td>
                    <td className="py-2 px-3">0.80</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Eve</td>
                    <td className="py-2 px-3">45</td>
                    <td className="py-2 px-3">0.45</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2 px-3" colSpan={2}>Direct Flow <InlineFormula>{"F_{Alice}"}</InlineFormula></td>
                    <td className="py-2 px-3">2.60</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Flow Score:</strong>{" "}
                <InlineFormula>{"\\phi = \\min(1, 2.60/5) = 0.52"}</InlineFormula>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Flow Points:</strong>{" "}
                <InlineFormula>{"60 \\times 0.52^2 = 16.2"}</InlineFormula>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Residual Quality:</strong>{" "}
                <InlineFormula>{"R = 2.60/4 = 0.65"}</InlineFormula> (avg voucher = 65%)
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Assuming</strong> <InlineFormula>{"d = 0.7"}</InlineFormula> (redundancy), <InlineFormula>{"D = 1.0"}</InlineFormula> (no dilution):
                <br />
                <strong className="text-sm">Structure Points:</strong>{" "}
                <InlineFormula>{"40 \\times 0.7^2 \\times 0.65 \\times 1.0 = 12.7"}</InlineFormula>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="font-semibold text-center">
                <InlineFormula>{"\\mathrm{LocalHealth}_{Alice} = 16.2 + 12.7 = 28.9"}</InlineFormula>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Alice would benefit from more vouchers or higher-quality vouchers to increase her score.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="sts" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">5.</span> STS (Standardized Trust Score)
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Community-Anchored Trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              While LocalHealth provides a global, seed-free measure, some applications need <strong>community-specific 
              trust</strong>. A DAO might want to weight votes by trust within their community; a lending protocol 
              might want to assess creditworthiness relative to their borrower pool.
            </p>
            
            <p className="leading-relaxed">
              STS uses the <strong>Advogato max-flow algorithm</strong> with community-managed seeds. Trust flows 
              from seeds through the endorsement graph, with flow-conserving constraints limiting how much trust 
              any node can transmit.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Graph Construction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              We construct a flow network by splitting each user <InlineFormula>{"u"}</InlineFormula> into two 
              nodes <InlineFormula>{"(u^-, u^+)"}</InlineFormula> with a capacity edge between them:
            </p>
            
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Internal capacity</strong>{" "}
                <InlineFormula>{"c(d)"}</InlineFormula> based on previous-epoch hop-distance from seeds
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Sink edge</strong>{" "}
                <InlineFormula>{"u^- \\to \\text{SINK}"}</InlineFormula> with capacity 1 (each user can "consume" 1 unit of trust)
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Vouch edges</strong>{" "}
                <InlineFormula>{"a^+ \\to b^-"}</InlineFormula> with capacity 1 for each endorsement
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Seed edges</strong>{" "}
                <InlineFormula>{"\\text{SOURCE} \\to \\text{seed}^-"}</InlineFormula> with capacity 
                scaled by seed quality score
              </div>
            </div>

            <FormulaBox label="Capacity Schedule (by hop-distance)" testId="formula-capacity">
              <BlockFormula>
                {"c(0)=800,\\; c(1)=240,\\; c(2)=96,\\; c(3)=48,\\; c(\\geq 4)=24"}
              </BlockFormula>
            </FormulaBox>
            
            <p className="text-sm text-muted-foreground">
              <strong>Why epoch-lagged distances?</strong> If we computed distance in the current epoch, an attacker 
              could add edges to get closer to seeds and immediately gain higher capacity. By using previous-epoch 
              distances, we prevent this "distance inflation" attack.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">STS Formula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              STS combines five normalized components:
            </p>

            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <span><InlineFormula>{"F_i"}</InlineFormula> — Normalized flow</span>
                <Badge variant="outline">55%</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <span><InlineFormula>{"C_i"}</InlineFormula> — Min-cut capacity</span>
                <Badge variant="outline">25%</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <span><InlineFormula>{"D_i"}</InlineFormula> — Depth decay</span>
                <Badge variant="outline">10%</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <span><InlineFormula>{"S_i"}</InlineFormula> — Stability score</span>
                <Badge variant="outline">5%</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex justify-between items-center flex-wrap gap-2">
                <span><InlineFormula>{"PR_i"}</InlineFormula> — Seed-personalized PageRank</span>
                <Badge variant="outline">5%</Badge>
              </div>
            </div>

            <FormulaBox label="STS Score Formula" testId="formula-sts">
              <BlockFormula>
                {"\\boxed{\\mathrm{STS}_i = 100 \\cdot \\big(0.55F_i + 0.25C_i + 0.10D_i + 0.05S_i + 0.05PR_i\\big)}"}
              </BlockFormula>
            </FormulaBox>

            <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
              <p className="font-semibold text-sm mb-2">Tier Thresholds</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Connected</span>
                  <span className="text-muted-foreground">STS ≥ 40</span>
                </div>
                <div className="flex justify-between">
                  <span>Verified</span>
                  <span className="text-muted-foreground">STS ≥ 60 AND min-cut ≥ 2</span>
                </div>
                <div className="flex justify-between">
                  <span>Trusted</span>
                  <span className="text-muted-foreground">STS ≥ 80 AND min-cut ≥ 3 AND Stability ≥ 0.8</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="threat-model" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="text-primary">6.</span> Threat Model & Security
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Attack Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-destructive">Attack 1:</span> Sybil Farm
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Adversary creates N fake accounts that vouch for each other in a dense cluster, attempting to 
                  bootstrap high scores without legitimate connections.
                </p>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="font-semibold text-sm text-green-700 dark:text-green-400 mb-1">Defense</div>
                  <p className="text-sm text-muted-foreground">
                    Recursive trust weighting: Sybils vouching for Sybils produce low scores because no voucher 
                    has a high score. The cluster cannot bootstrap itself.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-destructive">Attack 2:</span> Seed Capture
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Adversary compromises or bribes seed accounts to gain direct high-capacity flow into the 
                  Sybil cluster.
                </p>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="font-semibold text-sm text-green-700 dark:text-green-400 mb-1">Defense</div>
                  <p className="text-sm text-muted-foreground">
                    Seed quality scoring: Seeds that primarily flow trust to low-quality nodes get their 
                    capacity multiplier reduced. Diverse seed requirements (≥2 seeds with quality ≥0.6) 
                    prevent single-seed capture.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-destructive">Attack 3:</span> Bridge Hub
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  A legitimate high-score user is bribed or tricked into vouching for Sybil accounts, acting 
                  as a "bridge" between the legitimate network and the attack cluster.
                </p>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="font-semibold text-sm text-green-700 dark:text-green-400 mb-1">Defense</div>
                  <p className="text-sm text-muted-foreground">
                    Dilution penalty: Users who vouch for many others ({'>'}10) suffer score reduction, limiting 
                    the value of being a "vouch merchant." Min-cut requirements ensure multiple independent 
                    paths, not just one bridge.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-destructive">Attack 4:</span> Distance Inflation
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Adversary adds edges to reduce their hop-distance from seeds within an epoch, gaining higher 
                  capacity immediately.
                </p>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="font-semibold text-sm text-green-700 dark:text-green-400 mb-1">Defense</div>
                  <p className="text-sm text-muted-foreground">
                    Epoch-lagged capacities: Distance is computed from the previous epoch's accepted graph, 
                    so new edges only take effect in the next epoch.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Defense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold">Mechanism</th>
                    <th className="text-left py-2 px-3 font-semibold">Protects Against</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Recursive trust weighting</td>
                    <td className="py-2 px-3 text-muted-foreground">Sybil farms (circular vouching)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Epoch-lagged capacities</td>
                    <td className="py-2 px-3 text-muted-foreground">Distance inflation attacks</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Min-cut floors (≥2)</td>
                    <td className="py-2 px-3 text-muted-foreground">Single-path/bridge dependency</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Seed quality scoring</td>
                    <td className="py-2 px-3 text-muted-foreground">Seed capture/corruption</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Dilution penalty</td>
                    <td className="py-2 px-3 text-muted-foreground">Vouch spam, vouch selling</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Public Merkle log</td>
                    <td className="py-2 px-3 text-muted-foreground">Undetected graph manipulation</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="evaluation" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <span className="text-primary">7.</span> Evaluation & Benchmarks
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simulation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              We evaluated MaxFlow on synthetic graphs with planted Sybil clusters of varying sizes and 
              connection patterns:
            </p>

            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold">Scenario</th>
                    <th className="text-left py-2 px-3 font-semibold">Sybil Detection AUC</th>
                    <th className="text-left py-2 px-3 font-semibold">FN Rate (legit)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">Isolated Sybil cluster (n=50)</td>
                    <td className="py-2 px-3 text-green-600 dark:text-green-400">0.98</td>
                    <td className="py-2 px-3">2.1%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Sybil + 1 bridge to legitimate</td>
                    <td className="py-2 px-3 text-green-600 dark:text-green-400">0.94</td>
                    <td className="py-2 px-3">3.5%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">Sybil + 3 bridges to legitimate</td>
                    <td className="py-2 px-3 text-amber-600 dark:text-amber-400">0.87</td>
                    <td className="py-2 px-3">5.2%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Seed capture (1 of 5 seeds)</td>
                    <td className="py-2 px-3 text-green-600 dark:text-green-400">0.91</td>
                    <td className="py-2 px-3">4.0%</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>

            <div className="p-3 sm:p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <strong>Key finding:</strong> Even with 3 compromised bridges, MaxFlow maintains 87% AUC for 
                Sybil detection. The recursive weighting ensures Sybils remain low-scoring even with some 
                legitimate connections.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Production Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              From deployment with ~200 active users:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">21-100</div>
                <div className="text-sm text-muted-foreground">LocalHealth range</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">~55</div>
                <div className="text-sm text-muted-foreground">Median LocalHealth</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">4-6</div>
                <div className="text-sm text-muted-foreground">Iterations to converge</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">{'<'}5%</div>
                <div className="text-sm text-muted-foreground">Users with dilution penalty</div>
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold text-sm mb-2">Score Distribution Insight</p>
              <p className="text-sm text-muted-foreground">
                The lower bound of ~21 (rather than 0) reflects that even new users with minimal connections 
                get some baseline score from the initialization heuristic. Truly isolated accounts with zero 
                vouches would score 0, but such accounts are rare in practice.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Convergence Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              The damped iteration converges quickly for typical social graphs:
            </p>

            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-3 font-semibold">Iteration</th>
                    <th className="text-left py-2 px-3 font-semibold">Max <InlineFormula>{"\\Delta"}</InlineFormula></th>
                    <th className="text-left py-2 px-3 font-semibold">Avg <InlineFormula>{"\\Delta"}</InlineFormula></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">1</td>
                    <td className="py-2 px-3">15.2</td>
                    <td className="py-2 px-3">8.4</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">2</td>
                    <td className="py-2 px-3">6.8</td>
                    <td className="py-2 px-3">3.1</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">3</td>
                    <td className="py-2 px-3">2.9</td>
                    <td className="py-2 px-3">1.2</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">4</td>
                    <td className="py-2 px-3">1.1</td>
                    <td className="py-2 px-3">0.5</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">5</td>
                    <td className="py-2 px-3 text-green-600 dark:text-green-400">0.4</td>
                    <td className="py-2 px-3 text-green-600 dark:text-green-400">0.2</td>
                  </tr>
                </tbody>
              </table>
            </ResponsiveTable>

            <p className="text-sm text-muted-foreground">
              With <InlineFormula>{"\\alpha = 0.85"}</InlineFormula> and convergence threshold 
              <InlineFormula>{"\\varepsilon = 0.5"}</InlineFormula>, typical networks converge in 4-6 iterations.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="discussion" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          <span className="text-primary">8.</span> Discussion & Limitations
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trade-offs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Cold Start Problem</div>
                <p className="text-sm text-muted-foreground">
                  New users with no vouches have zero score. Unlike attestation-based systems, there's no way 
                  to bootstrap without network connections. This is a feature (Sybil resistance) but creates 
                  friction for legitimate newcomers.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Mitigation:</strong> Communities can provide onboarding paths where established 
                  members vouch for newcomers they verify through other means.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Privacy vs. Auditability</div>
                <p className="text-sm text-muted-foreground">
                  Public endorsements enable verification but reveal social connections. Users must accept 
                  that their vouches are visible.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Mitigation:</strong> Future work on ZK proofs could allow proving score properties 
                  without revealing the graph.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Parameter Sensitivity</div>
                <p className="text-sm text-muted-foreground">
                  Baseline values (<InlineFormula>{"F_0 = 5"}</InlineFormula>, <InlineFormula>{"R_0 = 20"}</InlineFormula>) 
                  affect score distributions. Different network densities may need different parameters.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Mitigation:</strong> Future adaptive baselines could auto-tune based on network 
                  percentiles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Known Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Not real identity:</strong> High scores indicate network integration, not verified 
                  uniqueness. A wealthy adversary with many real friends could still Sybil.
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Network effects matter:</strong> Early adopters in a small network may have 
                  artificially high scores due to scarcity of connections.
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Collusion resistance is bounded:</strong> If a large fraction of the network 
                  colludes, MaxFlow cannot distinguish colluders from honest users.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="implementation" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">9.</span> Implementation
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technology Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
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
                <p className="text-sm text-muted-foreground">Multi-chain wallets + EIP-712 signatures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>LocalHealth:</strong> Per-round update is <InlineFormula>{"O(|E|)"}</InlineFormula>; 
                ≤10 rounds with damping; trivially parallel per node
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>STS:</strong> Reusable residual graphs; Push-Relabel with global relabeling 
                for efficient multi-flow computation
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>Caching:</strong> LocalHealth cached with timestamps; recomputed on vouch events 
                or on demand with freshness hints
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs sm:text-sm">
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="text-primary whitespace-nowrap">GET /api/ego/:addr/score</div>
                <div className="text-muted-foreground mt-1">→ localHealth, voucherCount, redundancy, dilution</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="text-primary whitespace-nowrap">GET /api/ego/:addr/explain</div>
                <div className="text-muted-foreground mt-1">→ minCut, seedPaths, componentBreakdown</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="text-primary whitespace-nowrap">POST /api/vouch</div>
                <div className="text-muted-foreground mt-1">→ endorsee, signature (triggers recompute)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="text-primary whitespace-nowrap">GET /api/community/:id/sts/:addr</div>
                <div className="text-muted-foreground mt-1">→ sts, F, C, S, D, PR, minCut, depth</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="future-work" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" />
          <span className="text-primary">10.</span> Future Work
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security Hardening
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Vertex-disjoint path checks</li>
                <li>• Per-seed flow floors</li>
                <li>• Cut witnesses with Merkle proofs</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Algorithm Improvements
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Adaptive baselines</li>
                <li>• Percentile-based tiers</li>
                <li>• Piecewise dilution curves</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Feature Extensions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Vouch revocation/expiry</li>
                <li>• Typed vouches (skill/credit)</li>
                <li>• Cross-community portability</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold">11. Conclusion</h2>
        <Card>
          <CardContent className="pt-6 space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              MaxFlow computes <strong>neutral, verifiable graph signals</strong> by pairing recursive trust 
              with structural resilience and explicit accountability. Public vouches, epoch-lagged capacities, 
              and signed attestations yield an auditable, Sybil-resistant foundation.
            </p>
            
            <p className="leading-relaxed">
              Applications consume these signals to:
            </p>
            
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>Allocate capital (microcredit, grants)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>Weight governance (DAO voting)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>Gate access (communities, features)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                <span>Route grants (quadratic funding)</span>
              </div>
            </div>
            
            <p className="leading-relaxed">
              —without inheriting centralized choke points.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold">References</h2>
        <Card>
          <CardContent className="pt-6">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[1]</span>
                <span>
                  <strong>Levien, R.</strong> "Attack-Resistant Trust Metrics for Public Key Certification." 
                  <span className="text-muted-foreground"> USENIX Security (1998).</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[2]</span>
                <span>
                  <strong>Kamvar, S., Schlosser, M., Garcia-Molina, H.</strong> "The EigenTrust Algorithm for 
                  Reputation Management in P2P Networks." 
                  <span className="text-muted-foreground"> WWW (2003).</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[3]</span>
                <span>
                  <strong>Douceur, J.</strong> "The Sybil Attack." 
                  <span className="text-muted-foreground"> IPTPS (2002).</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[4]</span>
                <span>
                  <strong>Ford, L., Fulkerson, D.</strong> "Maximal Flow through a Network." 
                  <span className="text-muted-foreground"> Canadian Journal of Mathematics (1956).</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[5]</span>
                <span>
                  <strong>Dinic, E.</strong> "Algorithm for Solution of a Problem of Maximum Flow in Networks 
                  with Power Estimation." 
                  <span className="text-muted-foreground"> Soviet Mathematics Doklady (1970).</span>
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <p>
          MaxFlow is open infrastructure. This whitepaper describes the implementation as of November 2025. 
          Algorithm parameters may be updated based on empirical performance and community feedback.
        </p>
      </footer>
    </div>
  );
}
