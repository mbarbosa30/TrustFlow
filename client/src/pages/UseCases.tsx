import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Coins, Gift, Users, ShoppingBag, AlertCircle, UserCircle, Network } from "lucide-react";

const useCases = [
  {
    icon: Shield,
    title: "Sybil-Resistant Access",
    description: "Interpretation: Use score thresholds to gate community actions. Applications assign meaning to neutral signals (e.g., STS ≥ 60 = verified access).",
    examples: [
      "Forum posting requires STS ≥ 40 (Connected threshold)",
      "DAO governance requires STS ≥ 60 + min-cut ≥ 2",
      "Grant proposals require STS ≥ 80 (Trusted threshold)"
    ]
  },
  {
    icon: Coins,
    title: "UBI / Token Distribution",
    description: "Interpretation: Distribute tokens based on network quality scores. The neutral signals determine allocation—applications decide distribution curves.",
    examples: [
      "Base allocation to all accepted users (flow ≥ 0.5)",
      "Bonus pool distributed by STS with sqrt scaling",
      "Extra rewards for high min-cut (path diversity)"
    ]
  },
  {
    icon: Gift,
    title: "Airdrops & Referrals",
    description: "Interpretation: Weight rewards by graph connectivity strength. Applications use redundancy signals to prevent Sybil attacks.",
    examples: [
      "Airdrop only to users with min-cut ≥ 2",
      "Referral bonuses weighted by referee's STS",
      "Block single-edge users (low stability scores)"
    ]
  },
  {
    icon: AlertCircle,
    title: "Moderation & Prioritization",
    description: "Interpretation: Use redundancy and stability signals to prioritize actions. Applications decide how to weight reports or votes.",
    examples: [
      "Reports from high-STS users prioritized",
      "Bulk reports from low-diversity clusters flagged",
      "Appeal processes require min-cut ≥ 2"
    ]
  },
  {
    icon: ShoppingBag,
    title: "P2P Markets & Reputation",
    description: "Interpretation: Use STS as reputation signal for marketplace limits. Applications translate neutral scores into trust parameters.",
    examples: [
      "Transaction limits scale with STS",
      "Escrow release speed based on stability score",
      "Fee discounts for high-redundancy users"
    ]
  },
  {
    icon: Users,
    title: "Community Gating",
    description: "Interpretation: Gate access by score thresholds without KYC. Applications set their own meaning for 'verified' or 'trusted' members.",
    examples: [
      "Premium channels for STS ≥ 60",
      "Beta access for high-LocalHealth users",
      "Expert forums gated by STS ≥ 80 + specific skills"
    ]
  },
  {
    icon: UserCircle,
    title: "Personal Curation Networks",
    description: "Interpretation: Run personal networks with co-seeds for content filtering. Applications use LocalHealth scores for recommendations.",
    examples: [
      "Curate reading lists from your network (LocalHealth ≥ 50)",
      "Filter social media by personal graph signals",
      "Build invite-only groups (min-cut ≥ 2 from your co-seeds)",
      "Job referrals weighted by LocalHealth scores"
    ]
  },
  {
    icon: Network,
    title: "Credit Scoring: Interpret as Creditworthiness",
    description: "Interpretation: Use LocalHealth (0-100) as creditworthiness signal for micro-lending. Applications map neutral graph scores to loan limits.",
    examples: [
      "Loan limits based on LocalHealth (e.g., 60+ = eligible)",
      "Co-seeds can vouch to increase borrowing capacity",
      "Repayment history tracked in personal network",
      "Lend to network connections with visible trust paths"
    ]
  }
];

export default function UseCases() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Use Cases</h1>
        <p className="text-muted-foreground">
          Real-world applications of MaxFlow's Sybil-resistant network quality scores
        </p>
      </div>

      <div className="mb-8 p-6 rounded-lg bg-primary/10 border border-primary/20">
        <h2 className="text-lg font-semibold mb-2">MaxFlow Provides Neutral Sybil-Resistant Scores</h2>
        <p className="text-sm text-muted-foreground">
          MaxFlow computes verifiable graph signals (LocalHealth 0-100, STS 0-100) that measure network quality: flow capacity, path redundancy, connectivity strength. <strong>Each application interprets them differently</strong> based on their context and needs. Below are example interpretations—not prescriptive uses.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {useCases.map((useCase, index) => {
          const Icon = useCase.icon;
          return (
            <Card key={index} data-testid={`use-case-${index}`}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {useCase.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    Examples:
                  </div>
                  {useCase.examples.map((example, exampleIndex) => (
                    <div
                      key={exampleIndex}
                      className="flex items-start gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{example}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 p-6 rounded-lg border bg-muted/30">
        <h2 className="text-lg font-semibold mb-2">Building with MaxFlow?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          MaxFlow provides neutral, verifiable graph signals (LocalHealth 0-100, STS 0-100). Export portable score attestations and integrate them into any application. <strong>Your application assigns meaning</strong>: creditworthiness, governance weight, access control, grant allocation, etc. All computations are transparent and reproducible from the public Merkle transparency log.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <a href="/verify" className="text-primary hover:underline">
            Verify Attestations
          </a>
          <span className="text-muted-foreground">•</span>
          <a href="/how-it-works" className="text-primary hover:underline">
            Technical Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
