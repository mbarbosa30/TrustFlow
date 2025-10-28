import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Coins, Gift, Users, ShoppingBag, AlertCircle } from "lucide-react";

const useCases = [
  {
    icon: Shield,
    title: "Sybil-Resistant Access",
    description: "Gate community actions (posting, proposals, grants) by tier (e.g., Journeyer+). Prevent spam and bot manipulation while allowing genuine humans to participate.",
    examples: [
      "Forum posting requires Apprentice level",
      "DAO governance requires Journeyer level",
      "Grant proposals require Master level"
    ]
  },
  {
    icon: Coins,
    title: "UBI / Claims",
    description: "Distribute a base floor equally to accepted users and allocate a bonus pool by STS (with diminishing returns and diversity bonuses).",
    examples: [
      "Base $10 to all accepted users",
      "Bonus pool distributed by STS with sqrt scaling",
      "Extra rewards for diverse path users"
    ]
  },
  {
    icon: Gift,
    title: "Airdrops & Referrals",
    description: "Reward humans who are stably connected to trusted regions; penalize single-edge farms and Sybil attacks.",
    examples: [
      "Airdrop only to users with min-cut ≥ 2",
      "Referral bonuses weighted by referee's STS",
      "Block users with low stability scores"
    ]
  },
  {
    icon: AlertCircle,
    title: "Collusion-Resistant Moderation",
    description: "Use min-cut + stability to prioritize reports and throttle brigading. Trust scores help surface legitimate concerns.",
    examples: [
      "Reports from Master users are prioritized",
      "Bulk reports from low-diversity clusters are flagged",
      "Appeal processes require Journeyer+ status"
    ]
  },
  {
    icon: ShoppingBag,
    title: "P2P Markets & Credit",
    description: "Use STS as a soft reputation input for limits, escrow release, or fee discounts in peer-to-peer marketplaces.",
    examples: [
      "Transaction limits scale with STS",
      "Faster escrow release for Master users",
      "Fee discounts for high-stability users"
    ]
  },
  {
    icon: Users,
    title: "Community Gating",
    description: "Create private communities or channels that require specific trust levels, ensuring quality members without KYC.",
    examples: [
      "Premium channels for Journeyer+ users",
      "Beta access for high-STS early adopters",
      "Expert forums gated by Master + specific skills"
    ]
  }
];

export default function UseCases() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Use Cases</h1>
        <p className="text-muted-foreground">
          Real-world applications of TrustFlow's Sybil-resistant trust network
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
        <h2 className="text-lg font-semibold mb-2">Building with TrustFlow?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          TrustFlow attestations are portable and verifiable. Export your users' trust scores and integrate them into any application. All computations are transparent and reproducible from the public Merkle transparency log.
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
