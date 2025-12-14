import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQs() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Everything you need to know about MaxFlow
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="what-is" data-testid="faq-what-is">
          <AccordionTrigger className="text-left">
            What is MaxFlow?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            MaxFlow is neutral graph signal infrastructure that turns public vouches into Sybil-resistant network quality scores (LocalHealth 0-100, STS 0-100) using max-flow/min-cut algorithms. You receive portable score attestations (verifiable credentials) that applications can interpret based on their needs—creditworthiness, governance weight, access control, etc. The scores are neutral signals; your application assigns meaning.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vouching" data-testid="faq-vouching">
          <AccordionTrigger className="text-left">
            How does vouching work?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              MaxFlow uses a simple binary vouch system—you either vouch for someone or you don't. There are no weighted levels like "Known" vs. "Trusted."
            </p>
            <p className="mb-2">
              <strong>Why no levels?</strong> Vouches are binary (yes/no) to keep the user action simple and avoid social friction from visible trust rankings. However, the algorithm applies tiered capacity based on voucher score: fresh accounts (score 0) have 0.08 capacity, scores 1-30 scale to 0.30, and scores 30+ scale up to 1.0.
            </p>
            <p>
              You give a simple binary vouch, but the iterative algorithm uses a <strong>tiered capacity system</strong>: fresh accounts (score 0) have minimal capacity (0.08), emerging accounts (1-30) scale to 0.30, and established accounts (30+) scale up to 1.0. This tiered weighting is what prevents Sybil attacks.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy" data-testid="faq-privacy">
          <AccordionTrigger className="text-left">
            Are vouches public or private?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Vouches are fully public.</strong> All vouches are visible on-chain and included in the epoch's Merkle transparency log. This enables complete auditability and independent verification of scores.
            </p>
            <p>
              Anyone can see who vouched for whom, making the system transparent and verifiable. However, your optional profile information remains private unless you choose to share it.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="score-computation" data-testid="faq-score">
          <AccordionTrigger className="text-left">
            How is my score computed?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2"><strong>Two scoring models:</strong></p>
            <div className="space-y-3 mb-2">
              <div>
                <p className="font-semibold text-sm mb-1">LocalHealth (Personal Networks):</p>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded-md">
                  LocalHealth = 60 × flowScore + 40 × redundancyRatio
                </div>
                <p className="text-xs mt-1">Iterative algorithm with tiered capacity weighting. Voucher capacity: 0.08 (zero-score), 0.08-0.30 (scores 1-30), 0.30-1.0 (scores 31+).</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Community STS (Seed-Based):</p>
                <div className="font-mono text-sm bg-muted/50 p-2 rounded-md">
                  STS = 100 × (0.55F + 0.25C + 0.05S + 0.10D + 0.05P)
                </div>
                <p className="text-xs mt-1">Flow from community seeds using Dinic's algorithm.</p>
              </div>
            </div>
            <p className="text-sm">See "How it Works" for detailed formulas.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mincut" data-testid="faq-mincut">
          <AccordionTrigger className="text-left">
            What is "min-cut" in plain English?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            It's the smallest number of independent endorsements that would need to disappear for you to lose your badge. Bigger = more resilient. For example, if your min-cut is 3, you need at least 3 completely separate paths from seeds to you.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="why-works" data-testid="faq-why-works">
          <AccordionTrigger className="text-left">
            Why does this approach work? How do we know it's sound?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-3">
              <strong>Nature already solved this problem.</strong> The same optimization challenges MaxFlow addresses—finding efficient paths, building redundancy, pruning freeloaders—have been solved by natural systems over billions of years of evolution:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm mb-3">
              <li><strong>Rivers and watersheds:</strong> Water finds optimal paths to the sea through network topology alone—no central planner. Our max-flow algorithm computes the same: how much "trust" can flow through the network.</li>
              <li><strong>Root systems:</strong> Plants grow stronger roots by feeding from healthy neighbors. Similarly, our recursive trust weighting means vouches from high-score users carry more weight—a self-reinforcing quality signal.</li>
              <li><strong>Forest mycorrhizal networks:</strong> The "wood-wide web" distributes nutrients through redundant fungal pathways. When one tree fails, others continue. Our min-cut component rewards exactly this: multiple independent connection paths.</li>
              <li><strong>Ecosystem pruning:</strong> Species that take without contributing eventually get excluded from symbiotic networks. Our dilution penalty works the same way: over-vouching reduces your score, creating natural accountability.</li>
            </ul>
            <p className="text-sm italic text-muted-foreground/80">
              MaxFlow didn't invent these principles—we discovered that the mathematics of graph flow, recursion, and network resilience mirrors patterns nature has been computing for eons. The math works because it describes how robust networks actually form.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="updates" data-testid="faq-updates">
          <AccordionTrigger className="text-left">
            How often do scores update?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Each epoch (e.g., hourly or daily depending on configuration). Every epoch publishes a signed bundle so anyone can reproduce results. Your score reflects the latest computation from the most recent epoch.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="improve" data-testid="faq-improve">
          <AccordionTrigger className="text-left">
            How can I improve my score?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <ul className="list-disc list-inside space-y-2">
              <li>Get vouches from people already well-connected in the network</li>
              <li>Diversify paths (get vouches from independent regions or communities)</li>
              <li>Expand your network connections over time</li>
              <li>Focus on quality connections with established members</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wallets" data-testid="faq-wallets">
          <AccordionTrigger className="text-left">
            Can I link multiple wallets?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes. We bind wallets to a DID (Decentralized Identifier) so you can rotate keys or add addresses without changing your identity. All endorsements flow to your DID, not individual wallet addresses.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="portable" data-testid="faq-portable">
          <AccordionTrigger className="text-left">
            Can other apps use my scores?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes. Export your score attestation (verifiable credential) and present it anywhere. Verifiers can check the cryptographic signature or verify the on-chain record. Your attestation is a portable, verifiable proof of your network quality scores. Each application interprets the neutral signals based on their own context and requirements.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="interpretation" data-testid="faq-interpretation">
          <AccordionTrigger className="text-left">
            How do different applications interpret MaxFlow scores?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>MaxFlow computes neutral graph signals</strong> (LocalHealth 0-100, STS 0-100) that measure network quality: flow capacity, path redundancy, connectivity strength. These are verifiable, reproducible metrics—not prescriptive judgments.
            </p>
            <p className="mb-2">
              Applications interpret these neutral signals based on their context:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-2">
              <li><strong>Credit/Lending:</strong> Interpret LocalHealth as creditworthiness signal</li>
              <li><strong>Governance:</strong> Use STS to weight voting power or proposal eligibility</li>
              <li><strong>Access Control:</strong> Gate features by score thresholds (e.g., STS ≥ 60 for verified access)</li>
              <li><strong>Airdrops:</strong> Distribute tokens proportionally to network quality scores</li>
              <li><strong>Reputation:</strong> Display scores as social proof or endorsement strength</li>
            </ul>
            <p className="text-sm">
              MaxFlow is infrastructure, not application logic. The algorithm computes flow and redundancy; your application assigns meaning. Same score, different interpretations.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seeds" data-testid="faq-seeds">
          <AccordionTrigger className="text-left">
            Who chooses seeds and parameters?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            A governed list (multisig/DAO). Changes are published transparently and only take effect after a one-epoch timelock. The seed list and scoring parameters are part of each epoch's public policy.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="data" data-testid="faq-data">
          <AccordionTrigger className="text-left">
            Can I delete my data?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            You can unlink wallets and delete your optional profile. However, vouches are public and recorded on-chain in the transparency log, so they remain visible for network integrity and reproducibility. Historical epochs stay intact to maintain verifiability.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="personal-network" data-testid="faq-personal-network">
          <AccordionTrigger className="text-left">
            What's the difference between my personal network and community scores?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Personal Network (LocalHealth 0-100):</strong> A neutral graph signal measuring your network quality based on incoming vouches weighted by voucher strength using an iterative algorithm. Uses max-flow/min-cut with 60% weight on flow, 40% on network redundancy. Co-seeds not used for LocalHealth.
            </p>
            <p>
              <strong>Community Network (STS 0-100):</strong> Join context-specific communities (lending, hiring, governance) with community-managed seeds. Community vouches are isolated and tied to specific criteria via prompts. Each community computes your STS separately using a 5-component weighted formula. Applications interpret these neutral signals based on their specific needs.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="co-seeds" data-testid="faq-co-seeds">
          <AccordionTrigger className="text-left">
            What are co-seeds and do I need them?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Co-seeds are not used for LocalHealth scoring.</strong> Your LocalHealth score is computed entirely from incoming vouches weighted by voucher strength through the iterative algorithm.
            </p>
            <p className="mb-2">
              Co-seeds are available for future features like community-specific scoring (STS) where seed sets define trusted anchors, but they don't affect your personal LocalHealth score.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vouch-types" data-testid="faq-vouch-types">
          <AccordionTrigger className="text-left">
            What's the difference between a global vouch and a community vouch?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Global Vouches:</strong> Flow across all personal networks (ego contexts). No specific prompt or community required. Used for general endorsements. Created from user profiles or the My Network page.
            </p>
            <p>
              <strong>Community Vouches:</strong> Isolated to specific communities with context-specific prompts (e.g., "Would you vouch for this person for a $500 loan?"). Include a promptHash for verification. Only affect STS within that community.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ego-score" data-testid="faq-ego-score">
          <AccordionTrigger className="text-left">
            How is LocalHealth (personal network score) calculated?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              LocalHealth (0-100) uses an <strong>iterative PageRank-style algorithm</strong> with tiered capacity weighting. Voucher capacity ranges from 0.08 (fresh accounts) to 1.0 (established users). Your score depends on both the quantity and quality of vouches:
            </p>
            <div className="font-mono text-sm bg-muted/50 p-2 rounded-md my-2">
              LocalHealth = 60 × flowScore + 40 × redundancyRatio
            </div>
            <div className="p-3 rounded-lg my-3" style={{ backgroundColor: 'hsl(var(--score-growth) / 0.1)', borderColor: 'hsl(var(--score-growth) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--score-growth))' }}>
                Tiered Capacity System (v1.5 Dec 2025):
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                <li><strong>Iterative computation:</strong> Scores calculated in rounds until convergence (max 10 iterations)</li>
                <li><strong>Tiered capacity:</strong> Score-0 = 0.08, scores 1-30 linear to 0.30, scores 30+ sqrt to 1.0</li>
                <li><strong>Recursive trust:</strong> Your vouchers' scores depend on their vouchers, creating trust propagation</li>
                <li><strong>Average voucher strength:</strong> ResidualFlow = directFlow / voucherCount captures voucher quality</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/20">
                <strong>API fields:</strong> Graph shows <span className="font-mono">voucherCount</span> and <span className="font-mono">avgVoucherStrength</span> (%) which map to the formula's flowScore.
              </p>
            </div>
            <p className="text-sm mb-2">
              <strong>Flow Component (60%):</strong> Measures weighted incoming trust with tiered capacity (0.08-1.0). Normalized by HEALTHY_VOUCH_COUNT (4). Strong vouchers contribute more.
            </p>
            <p className="text-sm mb-2">
              <strong>Min-Cut Component (40%):</strong> effectiveRedundancy = actualMinCut + depthBonus + vertex-disjoint path bonus (max 10 pts). Normalized by HEALTHY_REDUNDANCY (18 pts). Uses true min-cut via Dinic's algorithm.
            </p>
            <p className="text-sm mb-2 text-muted-foreground/80">
              <strong>vouchQuality</strong> = directFlow / voucherCount (avg voucher strength, also called ResidualFlow)
            </p>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 my-3">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                Four-Layer Sybil Protection (v1.6):
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                <li><strong>Tenure-Gated Scoring:</strong> New accounts capped: week 1 ≤20, week 2 ≤30, weeks 3-4 ≤50, month 1+ uncapped</li>
                <li><strong>Hub Saturation:</strong> Users giving 50+ vouches have reduced weight (decay to 0.5 at 100, floor at 0.3)</li>
                <li><strong>Reciprocity Dampening:</strong> Mutual vouches (A↔B) get 50% weight to prevent collusion rings</li>
                <li><strong>Path Redundancy Gates:</strong> Scores above 50 require 2+ independent paths; above 70 require 3+</li>
              </ul>
            </div>
            <p className="text-sm">
              <strong>Note:</strong> This is a neutral signal. Applications interpret it based on their context—creditworthiness, governance weight, etc. View your score on the My Network page.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vouch-spam" data-testid="faq-vouch-spam">
          <AccordionTrigger className="text-left">
            Why can't I spam vouches to game the system?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-3">
              <strong style={{ color: 'hsl(var(--score-soil))' }}>Your score is penalized based on who YOU vouch for.</strong> This two-way accountability is the core anti-Sybil mechanism that makes endorsements meaningful and prevents gaming.
            </p>
            
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
              <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-2">Hub Saturation (v1.6)</p>
              <p className="text-sm text-muted-foreground mb-2">
                Users giving excessive outgoing vouches have diminishing vouch weight, preventing hub-based attacks:
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>1-50 vouches:</span>
                  <span className="font-mono">Full weight (1.0)</span>
                </div>
                <div className="flex justify-between">
                  <span>51-100 vouches:</span>
                  <span className="font-mono">Linear decay to 0.5</span>
                </div>
                <div className="flex justify-between">
                  <span>100+ vouches:</span>
                  <span className="font-mono">Floor at 0.3</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Combined with:</strong> Reciprocity dampening (mutual vouches = 50% weight), tenure caps (new accounts limited), and path redundancy gates (high scores need multiple paths).
              </p>
            </div>

            <p className="text-sm mb-2 font-semibold">Game Theory: Why This Stops Attacks</p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-3">
              <li><strong>Attack scenario:</strong> Creating fake network of 50 Sybil accounts requires vouching for all 50</li>
              <li><strong>Your penalty:</strong> 40 excess vouches → min-cut dilution penalty → significant score reduction</li>
              <li><strong>Sybils' scores:</strong> Still low (no incoming vouches from established users)</li>
              <li><strong>Result:</strong> You hurt your min-cut score to create weak fake accounts → not economically viable</li>
            </ul>

            <p className="text-sm">
              <strong>The key insight:</strong> You can't spam vouches without reducing your own min-cut component. This makes endorsements selective, which makes the resulting graph signals (flow, min-cut) reliable—the definition of Sybil resistance.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="score-range" data-testid="faq-score-range">
          <AccordionTrigger className="text-left">
            What do the different score ranges mean?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              LocalHealth scores depend on both <strong>vouch COUNT and voucher QUALITY</strong>. These ranges assume vouchers with average LocalHealth (~50):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Low scores (0-20):</strong> Few vouches OR vouchers with weak networks</li>
              <li><strong>Mid scores (20-50):</strong> Several vouches with average strength OR few vouches with strong networks</li>
              <li><strong>High scores (50-75):</strong> Many vouches with good strength AND network redundancy</li>
              <li><strong>Top scores (75-100):</strong> Many vouches from highly-trusted users with strong networks</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Note:</strong> With recursive trust weighting, a single vouch from someone with LocalHealth 100 is worth more than three vouches from people with LocalHealth 20.
            </p>
            <p className="text-sm mt-2">
              The tiered capacity weighting (sockpuppets: 0.08, low scores: 0.08-0.30, high scores: sqrt to 1.0) creates Sybil resistance while the 60/40 linear flow/redundancy formula rewards dense network topology. Remember: these are neutral signals that applications interpret differently (e.g., creditworthiness, governance eligibility, etc.).
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="kudos" data-testid="faq-kudos">
          <AccordionTrigger className="text-left">
            What is KUDOS and how does it work?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'hsl(var(--score-sun) / 0.1)', borderColor: 'hsl(var(--score-sun) / 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--score-sun))' }}>
                Pure Rewards Layer
              </p>
              <p className="text-xs">
                <strong>KUDOS does NOT influence LocalHealth scores.</strong> It's a one-way relationship: LocalHealth determines KUDOS rewards, but KUDOS never affects scoring. This preserves LocalHealth as a pure graph-based signal.
              </p>
            </div>
            <p className="mb-2">
              KUDOS is an off-chain reputation token that you earn based on your LocalHealth score:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-2">
              <li><strong>Daily Claims:</strong> Claim amount = (LocalHealth² / 100), capped at daily availability</li>
              <li><strong>24-Hour Cooldown:</strong> Must wait 24 hours between claims</li>
              <li><strong>1% Transfer Fee:</strong> 0.5% burned (deflationary), 0.5% pooled for future claims</li>
              <li><strong>Transferable:</strong> Send KUDOS to others as reputation gifts</li>
            </ul>
            <p className="text-sm">
              View KUDOS economics and supply metrics on the KUDOS Economics page.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-12 p-6 rounded-lg border bg-muted/30">
        <h2 className="text-lg font-semibold mb-2">Still have questions?</h2>
        <p className="text-sm text-muted-foreground">
          Check out our{" "}
          <a href="/how-it-works" className="hover:underline" style={{ color: 'hsl(var(--score-dormant))' }}>
            How It Works
          </a>{" "}
          page for technical details, or reach out to the community for support.
        </p>
      </div>
    </div>
  );
}
