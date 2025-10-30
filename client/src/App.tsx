import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { LanguageProvider } from "@/contexts/LanguageContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Overview from "@/pages/Overview";
import WhyScore from "@/pages/WhyScore";
import Verify from "@/pages/Verify";
import FAQs from "@/pages/FAQs";
import HowItWorks from "@/pages/HowItWorks";
import UseCases from "@/pages/UseCases";
import Status from "@/pages/Status";
import Seeds from "@/pages/Seeds";
import TermsPrivacy from "@/pages/TermsPrivacy";
import BlueskyExplorer from "@/pages/BlueskyExplorer";
import Communities from "@/pages/Communities";
import CreateCommunity from "@/pages/CreateCommunity";
import CommunityDetail from "@/pages/CommunityDetail";
import MyWallet from "@/pages/MyWallet";
import Credit from "@/pages/Credit";
import LendingDashboard from "@/pages/LendingDashboard";
import LendingAdmin from "@/pages/LendingAdmin";
import { Footer } from "@/components/Footer";

const appNavItems = [
  { path: "/overview", label: "nav.overview" },
  { path: "/wallet", label: "nav.wallet" },
  { path: "/credit", label: "nav.credit" },
  { path: "/communities", label: "nav.communities" },
];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/overview" component={Overview} />
      <Route path="/wallet" component={MyWallet} />
      <Route path="/credit" component={Credit} />
      <Route path="/bluesky" component={BlueskyExplorer} />
      <Route path="/why" component={WhyScore} />
      <Route path="/verify" component={Verify} />
      <Route path="/seeds" component={Seeds} />
      <Route path="/status" component={Status} />
      <Route path="/faqs" component={FAQs} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/terms-privacy" component={TermsPrivacy} />
      <Route path="/communities" component={Communities} />
      <Route path="/communities/create" component={CreateCommunity} />
      <Route path="/communities/:id" component={CommunityDetail} />
      <Route path="/lending/:communityId" component={LendingDashboard} />
      <Route path="/admin/lending/:communityId" component={LendingAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

const landingNavItems = [
  { path: "/how-it-works", label: "nav.howItWorks" },
  { path: "/use-cases", label: "nav.useCases" },
  { path: "/faqs", label: "nav.faqs" },
];

function App() {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <Header 
              navItems={isLandingPage ? landingNavItems : appNavItems} 
              authenticatedNavItems={appNavItems}
              variant={isLandingPage ? "landing" : "app"} 
            />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
