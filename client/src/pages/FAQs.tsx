import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Everything you need to know about TrustFlow
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="what-is" data-testid="faq-what-is">
          <AccordionTrigger className="text-left">
            What is TrustFlow?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            TrustFlow turns public vouches into a Sybil-resistant trust score using a max-flow/min-cut algorithm from a small, curated seed set. You receive a portable attestation (JWT/VC) proving your trustworthiness based on network structure.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vouching" data-testid="faq-vouching">
          <AccordionTrigger className="text-left">
            How does vouching work?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-2">
              TrustFlow uses a simple binary vouch system—you either vouch for someone or you don't. There are no weighted levels like "Known" vs. "Trusted."
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
              STS = 100 × (0.55F + 0.25C + 0.10S + 0.10D)
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
