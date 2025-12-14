import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, BookOpen, Shield, Cpu, FlaskConical, Lightbulb, 
  AlertTriangle, BarChart3, Zap, Target, Scale, GitBranch,
  CheckCircle2, XCircle, ArrowRight, TrendingUp, Leaf, TreePine, Waves,
  Clock, Users, ArrowLeftRight
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
    <div className="p-3 sm:p-4 rounded-lg my-4 overflow-x-auto" style={{ backgroundColor: 'hsl(var(--score-transition) / 0.1)', border: '1px solid hsl(var(--score-transition) / 0.2)' }} data-testid={testId}>
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
          <FileText className="w-8 h-8 shrink-0" style={{ color: 'hsl(var(--score-transition))' }} />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-whitepaper-title">MaxFlow Whitepaper</h1>
            <p className="text-sm text-muted-foreground">Version 1.6 — December 2025</p>
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
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30" style={{ borderLeft: '4px solid hsl(var(--score-growth))' }}>
              <div className="font-semibold mb-1">LocalHealth (0-100)</div>
              <p className="text-muted-foreground text-sm">
                Personal network quality score computed by an iterative algorithm where each incoming vouch is weighted 
                by the voucher's own score—creating recursive trust propagation. No seeds required.
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/30" style={{ borderLeft: '4px solid hsl(var(--score-dormant))' }}>
              <div className="font-semibold mb-1">STS — Standardized Trust Score (0-100)</div>
              <p className="text-muted-foreground text-sm">
                Community score built on Advogato-style max-flow/min-cut from community-managed seeds, with robust 
                percentile normalization and epoch-lagged capacities to prevent gaming.
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-lg mt-6" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
            <p className="font-semibold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Core Design Properties
            </p>
            <div className="grid gap-2 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                <div><strong>Accountability</strong> — Outgoing vouches incur dilution penalties, creating economic cost for endorsement spam</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                <div><strong>Epoch-lagged capacities</strong> — Distance-based node capacities use the previous epoch's graph to prevent distance inflation attacks</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                <div><strong>Separation of concerns</strong> — Reward layers (e.g., KUDOS tokens) consume scores but never influence them</div>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
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
          <a href="#evaluation" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-evaluation">7. Evaluation Methodology</a>
          <a href="#discussion" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-discussion">8. Discussion & Limitations</a>
          <a href="#implementation" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-implementation">9. Implementation</a>
          <a href="#future-work" className="text-muted-foreground hover:text-foreground transition-colors py-1" data-testid="link-toc-future-work">10. Future Work</a>
        </div>
      </nav>

      <Separator className="my-8" />

      <section id="introduction" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span style={{ color: 'hsl(var(--score-transition))' }}>1.</span> Introduction & Motivation
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
                  <strong>Airdrops & incentives</strong> — Token distributions intended for unique participants get captured by farmers
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
              <Lightbulb className="w-5 h-5" style={{ color: 'hsl(var(--score-transition))' }} />
              The MaxFlow Approach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              MaxFlow takes a different path: instead of trying to verify identity through external attestations, 
              we measure <strong>graph topology and network structure</strong>. The algorithm doesn't care about 
              sincerity—it just makes gaming computationally and economically expensive through network properties:
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--score-growth))' }}>Well-Connected Accounts</div>
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
                  <li>• Few or no high-score endorsers</li>
                  <li>• Shallow endorsement chains</li>
                  <li>• Endorsers are also low-quality Sybils</li>
                  <li>• Single point of failure (controller)</li>
                </ul>
              </div>
            </div>

            <p className="leading-relaxed">
              By weighting vouches recursively—your score depends on the scores of those who vouch for you—we create 
              a system where Sybil accounts cannot bootstrap themselves. A cluster of fake accounts vouching for each 
              other gets low scores because none of them have high-quality endorsers. Well-connected accounts embedded 
              in dense networks accumulate higher scores through multiple independent paths.
            </p>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
              <p className="font-semibold mb-2">Design Principles</p>
              <div className="grid gap-2 text-sm">
                <div className="flex gap-2">
                  <span className="font-mono" style={{ color: 'hsl(var(--score-transition))' }}>1.</span>
                  <div><strong>Neutrality</strong> — Scores are mathematical signals; applications decide their meaning</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono" style={{ color: 'hsl(var(--score-transition))' }}>2.</span>
                  <div><strong>Verifiability</strong> — Deterministic computation from public data with signed attestations</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono" style={{ color: 'hsl(var(--score-transition))' }}>3.</span>
                  <div><strong>Accountability</strong> — Endorsing has costs; spam reduces your own score</div>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono" style={{ color: 'hsl(var(--score-transition))' }}>4.</span>
                  <div><strong>Separation</strong> — Economic rewards never influence graph-based scoring</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="w-5 h-5" style={{ color: 'hsl(var(--score-canopy))' }} />
              Nature-Inspired Design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              MaxFlow deliberately leverages <strong>network dynamics with billions of years of optimization</strong> behind them. 
              Rivers, roots, and ecosystems solve the same problems: maximize flow, build redundancy, prune freeloaders. 
              This isn't coincidence—it's a power feature:
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-river) / 0.05)', borderColor: 'hsl(var(--score-river) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="w-4 h-4" style={{ color: 'hsl(var(--score-river))' }} />
                  <span className="font-semibold text-sm">River Networks</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Rivers find optimal paths to the sea through topology alone—no central planner. Our max-flow 
                  algorithm computes the same: how much "trust" can flow from sources to sinks through the network.
                </p>
                <p className="text-xs font-mono" style={{ color: 'hsl(var(--score-growth) / 0.7)' }}>Graph property: Max-flow capacity</p>
              </div>
              
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-canopy) / 0.05)', borderColor: 'hsl(var(--score-canopy) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TreePine className="w-4 h-4" style={{ color: 'hsl(var(--score-canopy))' }} />
                  <span className="font-semibold text-sm">Root Systems</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Stronger roots get more nutrients, enabling more growth—a recursive feedback loop. Our 
                  iterative algorithm works identically: vouches from high-score users carry more weight.
                </p>
                <p className="text-xs font-mono" style={{ color: 'hsl(var(--score-growth) / 0.7)' }}>Graph property: Recursive trust weighting</p>
              </div>
              
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-dormant) / 0.05)', borderColor: 'hsl(var(--score-dormant) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4" style={{ color: 'hsl(var(--score-transition))' }} />
                  <span className="font-semibold text-sm">Mycorrhizal Networks</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Forest "wood-wide webs" distribute nutrients through redundant paths—no single tree failure 
                  collapses the network. Our min-cut component rewards exactly this: multiple independent 
                  connection paths.
                </p>
                <p className="text-xs font-mono" style={{ color: 'hsl(var(--score-dormant) / 0.7)' }}>Graph property: Path redundancy</p>
              </div>
              
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-soil) / 0.05)', borderColor: 'hsl(var(--score-soil) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4" style={{ color: 'hsl(var(--score-soil))' }} />
                  <span className="font-semibold text-sm">Ecosystem Pruning</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Species that take without contributing eventually get excluded from symbiotic networks. Our 
                  dilution penalty works the same way: over-vouching dilutes your score, creating natural 
                  accountability.
                </p>
                <p className="text-xs font-mono" style={{ color: 'hsl(var(--score-transition) / 0.7)' }}>Graph property: Outgoing vouch penalty</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border-l-4 mt-4" style={{ borderLeftColor: 'hsl(var(--score-canopy) / 0.5)' }}>
              <p className="text-sm italic">
                "Trust, computed naturally. Graph algorithms engineered to leverage the same network dynamics 
                that make rivers find paths, roots grow strong, and ecosystems self-regulate. Proven patterns. 
                Ungameable by design."
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="related-work" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span style={{ color: 'hsl(var(--score-transition))' }}>2.</span> Related Work & Comparison
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
                  The key insight: an attacker can only gain as much trust as they can "flow" through existing 
                  endorsements, naturally limiting Sybil influence.
                </p>
                <div className="text-sm">
                  <span className="font-medium" style={{ color: 'hsl(var(--score-growth))' }}>MaxFlow extends:</span> We add 
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
                  <span className="font-medium" style={{ color: 'hsl(var(--score-growth))' }}>MaxFlow improves:</span> We use 
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
                  <span className="font-medium" style={{ color: 'hsl(var(--score-growth))' }}>MaxFlow incorporates:</span> STS 
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
                    <td className="py-2 px-3 font-medium" style={{ color: 'hsl(var(--score-growth))' }}>MaxFlow</td>
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
          <span style={{ color: 'hsl(var(--score-transition))' }}>3.</span> System Architecture
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
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-growth))' }}>V</span>
                <div>User accounts identified by Ethereum addresses (normalized to lowercase)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-growth))' }}>E</span>
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
                <Zap className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-transition))' }} />
                <div>
                  <strong>Determinism</strong> — Same inputs always produce same outputs, enabling independent verification
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-dormant))' }} />
                <div>
                  <strong>Anti-gaming</strong> — Epoch-lagged capacities prevent "distance inflation" attacks where 
                  adversaries manipulate their hop-distance from seeds within an epoch
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
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
          <Cpu className="w-6 h-6" style={{ color: 'hsl(var(--score-growth))' }} />
          <span style={{ color: 'hsl(var(--score-transition))' }}>4.</span> LocalHealth Algorithm
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
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2">Alice's Vouchers</div>
                <p className="text-sm text-muted-foreground">
                  5 established community members with LocalHealth scores of 70-90. Each vouch carries significant weight.
                </p>
                <p className="text-sm font-medium mt-2" style={{ color: 'hsl(var(--score-growth))' }}>Result: High LocalHealth</p>
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
                  <strong className="text-sm">Direct Flow</strong> — Sum of tiered voucher capacities (v1.5)
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"F_i = \\sum_{j \\in \\mathcal{V}_i} c(s_j)"}</InlineFormula>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Tiered capacity c(s):</strong> s=0 → 0.08, s∈[1,30] → linear 0.08-0.30, s∈[31,100] → sqrt 0.30-1.0
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Flow Score</strong> — Normalized against adaptive baseline
                </div>
                <div className="overflow-x-auto">
                  <InlineFormula>{"\\phi_i = \\min\\!\\big(1, F_i / F_0\\big)"}</InlineFormula>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Adaptive F₀ (v1.2):</strong> 75th percentile of incoming vouch counts, clamped to [4, 15]. Fallback: 8
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="mb-2">
                  <strong className="text-sm">Hub Saturation (v1.6)</strong> — Diminishing returns for excessive vouching
                </div>
                <div className="overflow-x-auto space-y-1">
                  <div className="text-xs text-muted-foreground">1-50 vouches: <InlineFormula>{"W = 1.0"}</InlineFormula> (full weight)</div>
                  <div className="text-xs text-muted-foreground">51-100 vouches: <InlineFormula>{"W = 1.0 - 0.5 \\cdot ((v-50)/50)"}</InlineFormula> (linear decay to 0.5)</div>
                  <div className="text-xs text-muted-foreground">100+ vouches: <InlineFormula>{"W = 0.3"}</InlineFormula> (floor)</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Users giving excessive vouches have their outgoing vouch weight reduced, preventing hub-based gaming.
                </p>
              </div>
            </div>

            <FormulaBox label="LocalHealth Score Formula (v1.5 — Tiered Capacity)" testId="formula-localhealth">
              <BlockFormula>
                {"\\boxed{ \\mathrm{LocalHealth}_i \\;=\\; 60 \\cdot \\phi_i \\;+\\; 40 \\cdot d_i \\cdot D_i }"}
              </BlockFormula>
            </FormulaBox>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">60% Flow Component</div>
                <p className="text-sm text-muted-foreground">
                  Who vouches for you, weighted by tiered capacity (0.08 floor for sockpuppets, sqrt scaling for high scores). High-quality vouchers matter more.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">40% Structure Component</div>
                <p className="text-sm text-muted-foreground">
                  True min-cut (linear) × accountability penalty. Min-cut measures Sybil resistance via Dinic's algorithm, with bonuses for vertex-disjoint paths (up to 10 pts).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">True Min-Cut Redundancy (v1.3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              We measure <strong>structural redundancy</strong> using the <strong>true min-cut</strong>—the minimum 
              number of edges that must be removed to disconnect your trust sources from you. This is the core 
              Sybil resistance metric, computed via Dinic's max-flow algorithm on the ego subgraph.
            </p>
            
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"\\text{minCut}_i"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">True min-cut via Dinic's algorithm</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"u = |U_i| - k"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Additional upstream supporters</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"\\text{vdp}"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Vertex-disjoint path count</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <InlineFormula>{"n = |U_i|"}</InlineFormula>
                <p className="text-xs text-muted-foreground mt-1">Total nodes in ego subgraph</p>
              </div>
            </div>

            <FormulaBox label="Effective Redundancy (v1.5 — True Min-Cut)" testId="formula-redundancy">
              <BlockFormula>
                {"\\rho_i = \\text{minCut}_i + \\lambda_{\\text{depth}} \\cdot u + \\min(10, 2 \\cdot \\max(0, \\text{vdp} - 1))"}
              </BlockFormula>
              <p className="text-sm text-muted-foreground text-center mt-2">
                <InlineFormula>{"\\lambda_{\\text{depth}} = 0.1"}</InlineFormula>, vdp = vertex-disjoint paths, max VDP bonus = 10 pts
              </p>
            </FormulaBox>

            <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', borderColor: 'hsl(var(--score-growth) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="font-semibold text-sm mb-2">Why True Min-Cut? (v1.3 Enhancement)</p>
              <p className="text-sm text-muted-foreground">
                Min-cut directly measures Sybil resistance: it's the number of fake accounts an attacker needs to 
                create to fully disconnect you from the trust network. We compute this using Dinic's algorithm on a 
                multi-hop flow graph built from your ego subgraph. Vertex-disjoint paths (computed via node splitting) 
                add a bonus for having truly independent paths with no shared intermediate nodes.
              </p>
            </div>
            
            <p className="leading-relaxed">
              The redundancy score <InlineFormula>{"d_i = \\min(1, \\rho_i / R_0)"}</InlineFormula> normalizes against 
              an <strong>adaptive baseline</strong>: <InlineFormula>{"R_0 = 18.0"}</InlineFormula> (HEALTHY_REDUNDANCY, computed from network percentiles). 
              Users with high min-cut and diverse paths approach <InlineFormula>{"d_i = 1"}</InlineFormula>; isolated accounts stay near zero.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Iterative Computation (v1.2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Because each user's score depends on their vouchers' scores, we compute LocalHealth iteratively 
              across the entire network:
            </p>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">1. Initialize</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  <InlineFormula>{"s_i^{(0)} = \\min(100, 20\\sqrt{|\\mathcal{V}_i|})"}</InlineFormula> — bootstrap from vouch count
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">2. Compute (network-wide)</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  Compute <InlineFormula>{"s_i^{(t+1)}"}</InlineFormula> for ALL users using current voucher scores
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">3. Replace directly</strong>
                <div className="overflow-x-auto mt-1">
                  <InlineFormula>{"s_i^{(t+1)} = \\text{computed score}"}</InlineFormula>
                  <span className="text-sm text-muted-foreground ml-2">(no damping in v1.2)</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">4. Converge</strong>
                <p className="text-sm text-muted-foreground mt-1">
                  Stop when <InlineFormula>{"\\max_i |s_i^{(t+1)} - s_i^{(t)}| < 0.5"}</InlineFormula> or after 10 rounds
                </p>
              </div>
            </div>
            
            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-river) / 0.05)', borderColor: 'hsl(var(--score-river) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="font-semibold text-sm mb-2">Convergence Note (v1.2)</p>
              <p className="text-sm text-muted-foreground">
                Damping was removed after empirical testing showed stable convergence in 4-6 iterations. The bounded 
                voucher weights (0-1) and quadratic scaling naturally prevent oscillation. Scores are computed 
                network-wide every 6 hours via scheduled batch recalculation.
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
                <strong className="text-sm">Flow Score (with HEALTHY_VOUCH_COUNT=4.0):</strong>{" "}
                <InlineFormula>{"\\phi = \\min(1, 2.60/4.0) = 0.65"}</InlineFormula>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Flow Points (v1.4 linear):</strong>{" "}
                <InlineFormula>{"60 \\times 0.65 = 39.0"}</InlineFormula>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong className="text-sm">Assuming</strong> <InlineFormula>{"d = 0.7"}</InlineFormula> (redundancy), <InlineFormula>{"D = 1.0"}</InlineFormula> (no dilution):
                <br />
                <strong className="text-sm">Structure Points (v1.4 linear):</strong>{" "}
                <InlineFormula>{"40 \\times 0.7 \\times 1.0 = 28.0"}</InlineFormula>
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="font-semibold text-center">
                <InlineFormula>{"\\mathrm{LocalHealth}_{Alice} = 39.0 + 28.0 = 67.0"}</InlineFormula>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Alice has a solid network. More vouchers from high-score users would increase her flow component further.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'hsl(var(--score-dormant))' }} />
              Advanced Sybil Protections (v1.6)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <p className="leading-relaxed">
              Beyond the core recursive trust mechanism, LocalHealth v1.6 introduces four additional protections 
              that make sophisticated Sybil attacks economically unviable:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-river) / 0.05)', borderColor: 'hsl(var(--score-river) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: 'hsl(var(--score-river))' }} />
                  1. Tenure-Gated Scoring
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  New accounts have capped maximum scores based on account age, preventing flash mob attacks 
                  where many new accounts vouch simultaneously:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/30">Week 1: ≤20</div>
                  <div className="p-2 rounded bg-muted/30">Week 2: ≤30</div>
                  <div className="p-2 rounded bg-muted/30">Weeks 3-4: ≤50</div>
                  <div className="p-2 rounded bg-muted/30">Month 1+: uncapped</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Like ecosystems: new species need time to establish before they can dominate.
                </p>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', borderColor: 'hsl(var(--score-growth) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'hsl(var(--score-growth))' }} />
                  2. Hub Saturation Cap
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Users giving excessive outgoing vouches have diminishing vouch weight, preventing 
                  hub-based attacks where one account tries to bootstrap many Sybils:
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span>1-50 vouches:</span>
                    <span className="font-mono">Weight = 1.0 (full)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span>51-100 vouches:</span>
                    <span className="font-mono">Linear decay to 0.5</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span>100+ vouches:</span>
                    <span className="font-mono">Floor at 0.3</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-canopy) / 0.05)', borderColor: 'hsl(var(--score-canopy) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4" style={{ color: 'hsl(var(--score-canopy))' }} />
                  3. Reciprocity Dampening
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Mutual vouches (A vouches for B AND B vouches for A) receive reduced weight:
                </p>
                <div className="p-2 rounded bg-muted/30 text-xs">
                  <InlineFormula>{"\\text{mutualWeight} = 0.5 \\times \\text{normalWeight}"}</InlineFormula>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This prevents collusion rings where small groups exchange vouches to inflate scores. 
                  Genuine trust networks rarely have high reciprocity rates.
                </p>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-dormant) / 0.05)', borderColor: 'hsl(var(--score-dormant) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
                <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" style={{ color: 'hsl(var(--score-dormant))' }} />
                  4. Path Redundancy Gates
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  High scores require multiple independent paths to seed nodes (vertex-disjoint paths), 
                  preventing single-bridge attacks:
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span>Scores above 50:</span>
                    <span className="font-mono">Require 2+ vertex-disjoint paths</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span>Scores above 70:</span>
                    <span className="font-mono">Require 3+ vertex-disjoint paths</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Like mycorrhizal networks: organisms with only one connection path are vulnerable; 
                  robust participants have multiple independent pathways.
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-transition) / 0.05)', borderColor: 'hsl(var(--score-transition) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="font-semibold text-sm mb-2">Combined Effect</p>
              <p className="text-sm text-muted-foreground">
                These four mechanisms work together: a Sybil attacker faces tenure delays, hub limits, 
                reciprocity penalties, AND path redundancy requirements. Achieving a high score through 
                fake accounts becomes prohibitively expensive in both time and resources.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="sts" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span style={{ color: 'hsl(var(--score-transition))' }}>5.</span> STS (Standardized Trust Score)
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
          <Shield className="w-6 h-6" style={{ color: 'hsl(var(--score-dormant))' }} />
          <span style={{ color: 'hsl(var(--score-transition))' }}>6.</span> Threat Model & Security
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
                  bootstrap high scores without external network connections.
                </p>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--score-growth))' }}>Defense</div>
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
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--score-growth))' }}>Defense</div>
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
                  A high-score user is bribed or tricked into vouching for Sybil accounts, acting 
                  as a "bridge" between the established network and the attack cluster.
                </p>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--score-growth))' }}>Defense</div>
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
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--score-growth))' }}>Defense</div>
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
          <BarChart3 className="w-6 h-6" style={{ color: 'hsl(var(--score-transition))' }} />
          <span style={{ color: 'hsl(var(--score-transition))' }}>7.</span> Evaluation Methodology
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Theoretical Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              MaxFlow's security properties derive from fundamental graph-theoretic guarantees:
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Sybil Resistance Bound</div>
                <p className="text-sm text-muted-foreground">
                  The max-flow/min-cut theorem guarantees that an attacker's aggregate trust is bounded by the 
                  capacity of edges connecting their cluster to the established network. Isolated Sybil clusters 
                  receive zero flow; clusters with <InlineFormula>{"k"}</InlineFormula> bridges can gain at 
                  most <InlineFormula>{"k"}</InlineFormula> units of trust.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Recursive Dampening</div>
                <p className="text-sm text-muted-foreground">
                  Because vouch weights depend on voucher scores, Sybil clusters face a bootstrapping problem: 
                  low-quality vouchers contribute low-weight vouches, preventing score inflation even with 
                  dense internal connections.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-1">Convergence Guarantee</div>
                <p className="text-sm text-muted-foreground">
                  With bounded vouch weights (0-1) and tiered capacity weighting, the iterative update 
                  converges to a unique fixed point regardless of initialization. Empirical testing shows 
                  stable convergence in 4-6 iterations with max change &lt;0.5 at termination.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluation Framework</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              To assess MaxFlow's effectiveness, we recommend evaluating against these attack scenarios:
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-transition))' }}>A.</span>
                <div>
                  <strong className="text-sm">Isolated Sybil Cluster</strong>
                  <p className="text-sm text-muted-foreground">N fake accounts vouching only for each other. Expected: all scores near zero.</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-transition))' }}>B.</span>
                <div>
                  <strong className="text-sm">Bridge Attack</strong>
                  <p className="text-sm text-muted-foreground">Sybil cluster with k bridges to established users. Expected: scores bounded by bridge capacity.</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-transition))' }}>C.</span>
                <div>
                  <strong className="text-sm">Seed Capture</strong>
                  <p className="text-sm text-muted-foreground">One seed compromised, vouching for Sybils. Expected: seed quality score degrades, limiting damage.</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex gap-3">
                <span className="font-mono shrink-0" style={{ color: 'hsl(var(--score-transition))' }}>D.</span>
                <div>
                  <strong className="text-sm">Vouch Merchant</strong>
                  <p className="text-sm text-muted-foreground">High-score user sells vouches to many buyers. Expected: dilution penalty reduces their score and vouch value.</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-transition) / 0.05)', borderColor: 'hsl(var(--score-transition) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="font-semibold text-sm mb-2">Metrics to Track</p>
              <p className="text-sm text-muted-foreground">
                For each scenario, measure: (1) AUC for distinguishing Sybils from established users by score, 
                (2) false negative rate at various thresholds, (3) score distribution before/after attack.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: 'hsl(var(--score-growth))' }} />
              Validated Test Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              The algorithm has been validated against <strong>51 test scenarios</strong> covering legitimate networks, 
              attack patterns, cross-network dynamics, and edge cases. Key empirical results:
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--score-growth))' }}>Legitimate Network Scores</div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Healthy Mesh Network (10 users, bidirectional)</span>
                    <span className="font-mono font-medium">82-99</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Large Hub (51 vouchers)</span>
                    <span className="font-mono font-medium">95</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multi-Whale Vouched User (4 quality sources)</span>
                    <span className="font-mono font-medium">91</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gradual Integration (5 quality vouches)</span>
                    <span className="font-mono font-medium">72</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="font-semibold text-sm mb-2 text-destructive">Attack Pattern Scores</div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sybil Ring (6 accounts, circular vouching)</span>
                    <span className="font-mono font-medium">37 max</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sockpuppet Farm (10 fake accounts → 1 target)</span>
                    <span className="font-mono font-medium">55*</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fake Hub (15 sockpuppets vouching)</span>
                    <span className="font-mono font-medium">51</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fake Mesh Pattern (isolated dense cluster)</span>
                    <span className="font-mono font-medium">7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hybrid Attack (ring + fake mesh)</span>
                    <span className="font-mono font-medium">18/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Isolated Newcomer Cluster (no external links)</span>
                    <span className="font-mono font-medium">5-6</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  *Sockpuppet Farm score boosted by legitimate Hub vouch in cross-network test
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm mb-2">Key Sybil Resistance Validation</div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                    <div>
                      <strong>Tiered Capacity:</strong> 6 low-quality vouches (score 0) contribute only 0.48 flow 
                      (6 × 0.08) vs 4.0 healthy baseline—insufficient to boost targets
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                    <div>
                      <strong>Trust Cascade:</strong> 5-hop chain shows proper attenuation (21 → 8 → 5)—trust decays with distance
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                    <div>
                      <strong>Whale Dilution:</strong> Single ultra-voucher's recipients score 33 (diluted), 
                      vs 91 when vouched by 4 separate quality sources (redundancy bonus)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'hsl(var(--score-growth))' }} />
                    <div>
                      <strong>Convergence:</strong> Algorithm converges in 3-5 iterations for typical networks, 
                      with max change &lt;0.5 at termination
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Full test suite: 51 scenarios, 747 vouches, 509 users. Run via <span className="font-mono">/api/admin/validate-algorithm</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: 'hsl(var(--score-transition))' }} />
              Unexpected Attack Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              Additional edge-case scenarios designed to probe potential vulnerabilities:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Compromised Whale</div>
                <p className="text-xs text-muted-foreground mb-2">Hacked high-score account vouches for sockpuppets</p>
                <div className="text-xs font-mono">Whale: 88, Sockpuppets: 31 each</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Parasitic Bridge</div>
                <p className="text-xs text-muted-foreground mb-2">One legit account vouches for 50 sockpuppets</p>
                <div className="text-xs font-mono">Bridge: 76, Each sockpuppet: 34</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Reputation Laundering</div>
                <p className="text-xs text-muted-foreground mb-2">A→B→C→Target chain from legitimate source</p>
                <div className="text-xs font-mono">Target: 13 (proper attenuation)</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Trojan Community</div>
                <p className="text-xs text-muted-foreground mb-2">20-person fake mesh used as vouch factory</p>
                <div className="text-xs font-mono">Members: 10-13 (isolated)</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Dilution Sabotage</div>
                <p className="text-xs text-muted-foreground mb-2">Attacker vouches for victim's vouchers to dilute</p>
                <div className="text-xs font-mono">Victim: 83 (stable), Attacker: 0</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Eclipse Attack</div>
                <p className="text-xs text-muted-foreground mb-2">20 attackers surround target to isolate</p>
                <div className="text-xs font-mono">Target: 85 (stable), Attackers: 5</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Flash Mob Vouch</div>
                <p className="text-xs text-muted-foreground mb-2">100 low-score accounts vouch for one target</p>
                <div className="text-xs font-mono">Target: 52 (threshold &gt;20 triggers cap)</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-semibold text-sm mb-1">Slow-Burn Sybil</div>
                <p className="text-xs text-muted-foreground mb-2">Sleeper accounts activated for coordinated attack</p>
                <div className="text-xs font-mono">Target: 50, Sleepers: 28-38</div>
                <Badge className="mt-1" style={{ backgroundColor: 'hsl(var(--score-growth))', color: 'white' }}>Protected</Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm">
                <strong>Key Finding:</strong> All 8 unexpected attack scenarios properly contained below the 65 "likely human" 
                threshold. Flash Mob protection implemented via capped low-quality flow (max 2.0 from score-&lt;30 sources) 
                and quality-gated min-cut capacity. All sophisticated attacks (compromise, laundering, eclipse, flash mob) 
                are effectively neutralized.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'hsl(var(--score-river))' }} />
              Confidence Tier Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              Based on validated test scenarios, we recommend the following thresholds for human vs bot/attack confidence:
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-canopy) / 0.1)', border: '1px solid hsl(var(--score-canopy) / 0.2)' }}>
                <div className="font-mono font-bold text-lg" style={{ color: 'hsl(var(--score-canopy))' }}>≥75</div>
                <div>
                  <div className="font-semibold text-sm">High Confidence</div>
                  <p className="text-xs text-muted-foreground">Almost certainly human with genuine network ties</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', border: '1px solid hsl(var(--score-growth) / 0.2)' }}>
                <div className="font-mono font-bold text-lg" style={{ color: 'hsl(var(--score-growth))' }}>≥65</div>
                <div>
                  <div className="font-semibold text-sm">Likely Human</div>
                  <p className="text-xs text-muted-foreground">Reasonable confidence with organic network redundancy</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-transition) / 0.1)', border: '1px solid hsl(var(--score-transition) / 0.2)' }}>
                <div className="font-mono font-bold text-lg" style={{ color: 'hsl(var(--score-transition))' }}>50-64</div>
                <div>
                  <div className="font-semibold text-sm">Uncertain</div>
                  <p className="text-xs text-muted-foreground">Could be legitimate newcomer OR sophisticated attack</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="font-mono font-bold text-lg text-destructive">&lt;50</div>
                <div>
                  <div className="font-semibold text-sm">Low Confidence</div>
                  <p className="text-xs text-muted-foreground">Most attack patterns score in this range</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Attack patterns (Sybil rings, fake hubs, sockpuppet farms) cluster below 60, while legitimate 
              integration patterns score 70+. The 65 threshold balances false positives with security.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Algorithmic Complexity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm sm:text-base leading-relaxed">
              Computational costs scale predictably with graph size:
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">LocalHealth (per user)</div>
                <p className="text-sm text-muted-foreground">
                  <InlineFormula>{"O(k \\cdot |E_{ego}|)"}</InlineFormula> where <InlineFormula>{"k"}</InlineFormula> is 
                  iteration count (≤10) and <InlineFormula>{"E_{ego}"}</InlineFormula> is ego subgraph edges
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">STS (per community)</div>
                <p className="text-sm text-muted-foreground">
                  <InlineFormula>{"O(|V|^2 \\cdot |E|)"}</InlineFormula> for Dinic's algorithm on the flow network
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Iteration Bound</div>
                <p className="text-sm text-muted-foreground">
                  Convergence threshold <InlineFormula>{"\\varepsilon = 0.5"}</InlineFormula> with 
                  max 10 iterations ensures bounded compute time
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="font-semibold text-sm">Parallelization</div>
                <p className="text-sm text-muted-foreground">
                  Per-user LocalHealth is embarrassingly parallel; batch computation scales linearly with cores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="discussion" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6" style={{ color: 'hsl(var(--score-transition))' }} />
          <span style={{ color: 'hsl(var(--score-transition))' }}>8.</span> Discussion & Limitations
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
                  friction for newcomers.
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
                  Baseline values (<InlineFormula>{"F_0 = 4.0"}</InlineFormula>, <InlineFormula>{"R_0 = 18.0"}</InlineFormula>) 
                  affect score distributions. Different network densities may need different parameters.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Mitigation:</strong> Adaptive baselines now auto-tune based on 75th percentile of 
                  network vouch counts, clamped to [4, 15].
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
          <span style={{ color: 'hsl(var(--score-transition))' }}>9.</span> Implementation
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
                ≤10 rounds without damping; trivially parallel per node
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>STS:</strong> Reusable residual graphs; Push-Relabel with global relabeling 
                for efficient multi-flow computation
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>Scheduled Recalculation:</strong> Network-wide batch computation every 6 hours 
                via RecalculationScheduler. Scores cached in database with algorithm breakdown.
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <strong>Caching:</strong> Three-tier API: basic cached (sub-second), detailed cached 
                (sub-second with breakdown), on-demand single-user (1-5s fresh computation)
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
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-growth))' }}>GET /api/v1/scores/cached</div>
                <div className="text-muted-foreground mt-1">→ Basic bulk: address, score, timestamp (sub-second)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-growth))' }}>GET /api/v1/scores/cached/detailed</div>
                <div className="text-muted-foreground mt-1">→ Detailed bulk: full algorithm breakdown from 6-hour cache</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-growth))' }}>GET /api/v1/score/:address/details</div>
                <div className="text-muted-foreground mt-1">→ On-demand: fresh computation for single address (1-5s)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-transition))' }}>POST /api/vouch</div>
                <div className="text-muted-foreground mt-1">→ endorsee, signature (vouch recorded, batch recompute)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-transition))' }}>POST /api/vouch/revoke</div>
                <div className="text-muted-foreground mt-1">→ endorsee, signature (revoke existing vouch)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                <div className="whitespace-nowrap" style={{ color: 'hsl(var(--score-dormant))' }}>GET /api/community/:id/sts/:addr</div>
                <div className="text-muted-foreground mt-1">→ sts, F, C, S, D, PR, minCut, depth</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      <section id="future-work" className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6" style={{ color: 'hsl(var(--score-growth))' }} />
          <span style={{ color: 'hsl(var(--score-transition))' }}>10.</span> Future Work
        </h2>

        <Card className="mb-6" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.05)', borderColor: 'hsl(var(--score-growth) / 0.3)', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: 'hsl(var(--score-growth))' }}>
              <CheckCircle2 className="w-5 h-5" />
              Recently Implemented (December 2025)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Vertex-Disjoint Paths</div>
                <p className="text-muted-foreground text-xs">
                  Node-splitting max-flow counts truly independent paths. Bonus redundancy for multiple disjoint paths (up to +10 points, 2 pts per path).
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Piecewise Dilution Curves</div>
                <p className="text-muted-foreground text-xs">
                  Smooth non-linear penalties: 1-10 vouches = no penalty, 11-15 = gentle decay, 16-25 = steeper decay, 25+ = asymptotic floor.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Adaptive Baselines</div>
                <p className="text-muted-foreground text-xs">
                  Dynamic "healthy" thresholds computed from 75th percentile of network. Algorithm adapts as network grows.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Vouch Expiration</div>
                <p className="text-muted-foreground text-xs">
                  90-day validity window. Vouches remain valid if recipient is active (vouched recently). Prevents "set and forget" sockpuppet farms.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Vouch Revocation</div>
                <p className="text-muted-foreground text-xs">
                  EIP-712 signed revocation messages. Endorsers can revoke vouches at any time. Stored in endorsementTombstones table.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Flash Mob Protection</div>
                <p className="text-muted-foreground text-xs">
                  Detects coordinated mass-vouching ({'>'}20 low-score vouchers). Caps low-quality flow at 2.0. Flash mob targets score 52 instead of 99.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Diminishing Returns</div>
                <p className="text-muted-foreground text-xs">
                  Logarithmic scaling makes higher scores progressively harder. Easy entry (0-30), moderate effort (30-50), genuine integration needed (50-65+).
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Quality Gates</div>
                <p className="text-muted-foreground text-xs">
                  Tier unlocks: 50+ requires 1 voucher ≥50, 65+ requires 2 vouchers ≥65, 80+ requires 3 vouchers ≥75 plus vertex-disjoint paths.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)' }}>
                <div className="font-semibold mb-1">Low-Quality Cap</div>
                <p className="text-muted-foreground text-xs">
                  Vouchers with scores {'<'}50 can contribute max 35% of flow component. Prevents Sybil clusters from accumulating score through mass low-quality vouches.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <li className="line-through opacity-50">• Vertex-disjoint path checks ✓</li>
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
                <li className="line-through opacity-50">• Adaptive baselines ✓</li>
                <li>• Percentile-based tiers (display layer)</li>
                <li className="line-through opacity-50">• Piecewise dilution curves ✓</li>
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
                <li className="line-through opacity-50">• Vouch revocation/expiry ✓</li>
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
                <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--score-transition))' }} />
                <span>Allocate capital (microcredit, grants)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--score-transition))' }} />
                <span>Weight governance (DAO voting)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--score-transition))' }} />
                <span>Gate access (communities, features)</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 flex items-center gap-3">
                <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'hsl(var(--score-transition))' }} />
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

      <Separator className="my-8" />

      <section className="space-y-6 mb-12">
        <h2 className="text-xl sm:text-2xl font-bold">Version History</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version 1.5 (December 2025)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Diminishing Returns Curve</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Logarithmic scaling makes higher scores progressively harder: 0-30 (easy entry), 30-50 (growing effort), 
                50-65 (genuine integration), 65-80 (strong compression), 80+ (near-impossible without real network).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Quality Gates</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Tier unlocks based on voucher quality: 50+ requires 1 voucher ≥50, 65+ requires 2 vouchers ≥65, 
                80+ requires 3 vouchers ≥75 plus vertex-disjoint paths.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Low-Quality Contribution Cap</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Vouchers with scores {'<'}50 can contribute max 35% of flow component. Prevents Sybil clusters 
                from accumulating score through mass low-quality vouches.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Quality Bonus System</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Exceptional networks receive up to +20 bonus: +10 for avg voucher quality ≥70, +10 for 4+ 
                vouchers with score ≥75.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Version 1.4 (December 2025)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Adaptive Baselines</strong>
              <p className="text-sm text-muted-foreground mt-1">
                HEALTHY_VOUCH_COUNT = 4.0, HEALTHY_REDUNDANCY = 18.0 (computed from network percentiles). 
                Enables algorithm to scale with network growth.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Iteration Without Damping</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Removed α=0.85 damping factor. Direct score replacement shows stable 4-6 iteration convergence. 
                Network-wide batch recalculation every 6 hours.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Piecewise Dilution Curve</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Smooth 4-zone decay replacing linear penalty. Quality (1-10): 1.0, Warning (11-15): 1.0→0.85, 
                Penalty (16-25): 0.85→0.55, Cap (25+): asymptotic to 0.4.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Vertex-Disjoint Path Bonus</strong>
              <p className="text-sm text-muted-foreground mt-1">
                +2 redundancy per independent path (capped at 10). Computed via max-flow with node splitting 
                for stronger Sybil resistance.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Linear Scaling</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Replaced squared formula with linear 60/40 weighting. Tiered capacity: 0.08 floor for sockpuppets, 
                0.08-0.30 linear for scores 1-30, 0.30-1.0 sqrt for scores 31+.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Vouch Expiration & Revocation</strong>
              <p className="text-sm text-muted-foreground mt-1">
                90-day validity window with activity-based retention. EIP-712 signed revocation support. 
                Expired/revoked vouches excluded from scoring.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Flash Mob Protection</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Threshold-based detection ({'>'}20 low-quality vouchers). Capped flow from sockpuppets (max 2.0). 
                Quality-gated min-cut calculation.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <strong className="text-sm">Three-Tier API</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Basic cached, detailed cached, and on-demand endpoints. 6-hour scheduled batch recalculation 
                with algorithm breakdown caching.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Version 1.2 (November 2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Adaptive baselines, iteration without damping, piecewise dilution curves, vertex-disjoint path bonus.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Version 1.1 (October 2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Initial published specification. Fixed baselines F₀=5, R₀=20. Linear dilution with 50% floor. 
              Damped iteration with α=0.85.
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-12 p-4 rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <p>
          MaxFlow is open infrastructure. This whitepaper describes the implementation as of December 2025. 
          Algorithm parameters may be updated based on empirical performance and community feedback.
        </p>
      </footer>
    </div>
  );
}
