import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import NotFound from "@/pages/not-found";
import Overview from "@/pages/Overview";
import WhyScore from "@/pages/WhyScore";
import Endorse from "@/pages/Endorse";
import Endorsements from "@/pages/Endorsements";
import Verify from "@/pages/Verify";
import { Network } from "lucide-react";

function Navigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Overview" },
    { path: "/why", label: "Why this score?" },
    { path: "/endorse", label: "Endorse" },
    { path: "/endorsements", label: "Endorsements" },
    { path: "/verify", label: "Verify" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="flex items-center gap-2 font-bold text-xl hover-elevate rounded-lg px-2 py-1" data-testid="link-home">
                <Network className="w-6 h-6 text-primary" />
                <span>TrustFlow</span>
              </a>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors hover-elevate ${
                      location === item.path
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                    data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <WalletConnect onConnect={(address) => console.log('Wallet connected:', address)} />
            <ThemeToggle />
          </div>
        </div>
        
        <nav className="md:hidden pb-3 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors hover-elevate ${
                  location === item.path
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/why" component={WhyScore} />
      <Route path="/endorse" component={Endorse} />
      <Route path="/endorsements" component={Endorsements} />
      <Route path="/verify" component={Verify} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main>
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
