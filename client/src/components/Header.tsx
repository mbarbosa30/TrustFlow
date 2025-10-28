import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Network } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import { useWallet } from "@/hooks/useWallet";

interface NavItem {
  path: string;
  label: string;
}

interface HeaderProps {
  navItems: NavItem[];
  authenticatedNavItems?: NavItem[];
  variant?: "landing" | "app";
}

export function Header({ navItems, authenticatedNavItems, variant = "app" }: HeaderProps) {
  const [location] = useLocation();
  const { isConnected } = useWallet();
  
  // Use authenticated nav items when wallet is connected, otherwise use default nav items
  const displayNavItems = isConnected && authenticatedNavItems ? authenticatedNavItems : navItems;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="flex items-center gap-2 font-bold text-xl hover-elevate rounded-lg px-2 py-1" 
              data-testid="link-home"
            >
              <Network className="w-6 h-6 text-primary" />
              <span>TrustFlow</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-2">
              {displayNavItems.map((item) => {
                const isActive = location === item.path;
                
                if (variant === "landing") {
                  return (
                    <Link key={item.path} href={item.path}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  );
                }
                
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors hover-elevate ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                    data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <WalletConnect onConnect={(address) => console.log('Wallet connected:', address)} />
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile navigation */}
        <nav className="md:hidden pb-3 flex gap-2 overflow-x-auto">
          {displayNavItems.map((item) => {
            const isActive = location === item.path;
            
            if (variant === "landing") {
              return (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </Button>
                </Link>
              );
            }
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors hover-elevate ${
                  isActive
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
