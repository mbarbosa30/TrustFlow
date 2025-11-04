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
            MaxFlow turns public vouches into a Sybil-resistant trust score using a max-flow/min-cut algorithm from a small, curated seed set. You receive a portable attestation (JWT/VC) proving your trustworthiness based on network structure.
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
              <strong>Why no levels?</strong> The max-flow/min-cut algorithm determines trust scores based on network topology (path redundancy, distance from seeds, node capacity budgets) rather than explicit edge weights. This keeps it simple and avoids social friction from visible trust rankings.
            </p>
            <p>
              Each vouch carries the same weight, but the graph structure does the heavy lifting to prevent Sybil attacks.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy" data-testid="faq-privacy">
          <AccordionTrigger className="text-left">
            Are vouches public or private?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Vouches are fully public.</strong> All vouches are visible on-chain and included in the epoch's Merkle transparency log. This enables complete auditability and independent verification of trust scores.
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
            <p className="mb-2">We build a flow network from the seed set to all users. Your flow and min-cut (redundancy) are normalized into a Standardized Trust Score (STS) from 0–100.</p>
            <div className="font-mono text-sm bg-muted/50 p-2 rounded-md my-2">
              STS = 100 × (0.55F + 0.25C + 0.05S + 0.10D + 0.05P)
            </div>
            <p>See "How it Works" for detailed formulas.</p>
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
              <li>Build genuine relationships over time</li>
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
            Can other apps use my trust score?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes. Export your Trust Attestation and present it anywhere. Verifiers can check the signature or verify the on-chain record. Your attestation is a portable, verifiable proof of your trust score.
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
            What's the difference between my personal network and community trust?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Personal Network (Ego Score):</strong> Measures "how much the network trusts you" based on incoming vouches. No co-seeds required by default. Optionally add up to 3 co-seeds for hybrid mode with enhanced Sybil resistance. Your Ego Score (0-100) uses max-flow/min-cut with 60% weight on incoming trust, 40% on network redundancy.
            </p>
            <p>
              <strong>Community Reputation (STS):</strong> Join context-specific communities (lending, hiring, governance) with community-managed seeds. Community vouches are isolated and tied to specific criteria via prompts. Each community computes your STS separately using a 5-component weighted formula.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="co-seeds" data-testid="faq-co-seeds">
          <AccordionTrigger className="text-left">
            What are co-seeds and do I need them?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Co-seeds are optional.</strong> By default, your Ego Score is based purely on incoming vouches (Pure Option 2 mode) - no co-seeds required. You'll get a non-zero score as soon as someone vouches for you.
            </p>
            <p className="mb-2">
              <strong>Why add co-seeds?</strong> Optionally add 1-3 trusted people to enable "hybrid mode" for enhanced Sybil resistance. The algorithm then measures flow from your co-seeds through the network to you, making it harder for attackers to fake connections to YOUR specific trusted people.
            </p>
            <p className="text-sm">
              <strong>Tip:</strong> Start without co-seeds. Add them later if you want the extra security layer. You can manage co-seeds on your My Network page.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vouch-types" data-testid="faq-vouch-types">
          <AccordionTrigger className="text-left">
            What's the difference between a global vouch and a community vouch?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              <strong>Global Vouches:</strong> Flow across all personal networks (ego contexts). No specific prompt or community required. Used for general interpersonal trust. Created from user profiles or the My Network page.
            </p>
            <p>
              <strong>Community Vouches:</strong> Isolated to specific communities with context-specific prompts (e.g., "Would you trust this person to repay a $500 loan?"). Include a promptHash for verification. Only affect STS within that community.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ego-score" data-testid="faq-ego-score">
          <AccordionTrigger className="text-left">
            How is Ego Score (personal network score) calculated?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              Ego Score (0-100) measures "how much the network trusts you" using max-flow/min-cut:
            </p>
            <div className="font-mono text-sm bg-muted/50 p-2 rounded-md my-2">
              EgoScore = 60 × avgResidualFlow + 40 × min(medianMinCut / voucherCount, 1) × vouchQuality
            </div>
            <p className="text-sm mb-2">
              <strong>Flow Component (60%):</strong> Incoming trust saturation - measures how much trust flows TO you from vouchers.
            </p>
            <p className="text-sm mb-2">
              <strong>Cut Component (40%):</strong> Network redundancy - how many independent paths connect you to the network.
            </p>
            <p className="text-sm">
              <strong>Vouch Quality Factor:</strong> Your score is slightly influenced by who YOU vouch for (preventing vouch spam). Quality-based adjustment (0.9-1.1x) + dilution penalty for &gt;10 vouches. Impact: ~5-10% score swing.
            </p>
            <p className="text-sm">
              <strong>Note:</strong> The Ego Score calculation is currently implemented. View your score on the My Network page.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-12 p-6 rounded-lg border bg-muted/30">
        <h2 className="text-lg font-semibold mb-2">Still have questions?</h2>
        <p className="text-sm text-muted-foreground">
          Check out our{" "}
          <a href="/how-it-works" className="text-primary hover:underline">
            How It Works
          </a>{" "}
          page for technical details, or reach out to the community for support.
        </p>
      </div>
    </div>
  );
}
