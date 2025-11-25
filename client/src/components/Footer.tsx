import { Link } from "wouter";
import { Network } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <Network className="w-5 h-5 text-primary" />
              <span>MaxFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Trust, computed naturally. Graph algorithms with the resilience of ecosystems.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/faqs" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-faqs">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-how-it-works">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-use-cases">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link href="/whitepaper" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-whitepaper">
                  Whitepaper
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Network</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/network" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-my-network">
                  My Network
                </Link>
              </li>
              <li>
                <Link href="/kudos" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-kudos">
                  KUDOS
                </Link>
              </li>
              <li>
                <Link href="/kudos-economics" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-kudos-economics">
                  KUDOS Economics
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-dashboard">
                  Global Dashboard
                </Link>
              </li>
              <li>
                <Link href="/verify" className="text-muted-foreground hover:text-foreground transition-colors">
                  Verify Attestations
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-status">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://github.com/mbarbosa30/MaxFlow" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-footer-github"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-api-docs">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/bluesky" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-bluesky">
                  Bluesky Explorer
                </Link>
              </li>
              <li>
                <Link href="/terms-privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms-privacy">
                  Terms & Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> MaxFlow issues portable, verifiable network quality attestations computed from a curated seed set using max-flow/min-cut algorithms. All endorsements are publicly visible on-chain in the Merkle transparency log. Scores update by epoch. MaxFlow provides neutral signals—applications interpret them for specific use cases. Do not rely on MaxFlow for high-stakes decisions without additional verification.
          </p>
        </div>
      </div>
    </footer>
  );
}
