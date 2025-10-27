import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Overview from "@/pages/Overview";
import WhyScore from "@/pages/WhyScore";
import Verify from "@/pages/Verify";
import FAQs from "@/pages/FAQs";
import HowItWorks from "@/pages/HowItWorks";
import UseCases from "@/pages/UseCases";
import { Footer } from "@/components/Footer";
import { Network } from "lucide-react";

function Navigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/overview", label: "Overview" },
    { path: "/why", label: "Why this score?" },
    { path: "/verify", label: "Verify" },
  ];

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
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors hover-elevate ${
                    location === item.path
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {item.label}
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
            <Link 
              key={item.path} 
              href={item.path}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors hover-elevate ${
                location === item.path
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
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
      <Route path="/" component={Dashboard} />
      <Route path="/overview" component={Overview} />
      <Route path="/why" component={WhyScore} />
      <Route path="/verify" component={Verify} />
      <Route path="/faqs" component={FAQs} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/use-cases" component={UseCases} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
