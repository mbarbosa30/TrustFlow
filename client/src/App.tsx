import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
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
import Credit from "@/pages/Credit";
import CreditRouter from "@/pages/CreditRouter";
import LendingDashboard from "@/pages/LendingDashboard";
import LendingAdmin from "@/pages/LendingAdmin";
import ApiDocs from "@/pages/ApiDocs";
import MyNetwork from "@/pages/MyNetwork";
import Simulation from "@/pages/Simulation";
import Kudos from "@/pages/Kudos";
import KudosEconomics from "@/pages/KudosEconomics";
import Admin from "@/pages/Admin";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

// Dynamic app nav items - will be filtered based on user's community access
const getAppNavItems = (hasMicrocreditAccess: boolean) => {
  const items = [
    { path: "/overview", label: "nav.overview" },
    { path: "/network", label: "My Network" },
    { path: "/kudos", label: "KUDOS" },
    { path: "/communities", label: "nav.communities" },
  ];
  
  // Only show Credit if user has access to microcredit communities
  if (hasMicrocreditAccess) {
    items.splice(3, 0, { path: "/credit", label: "nav.credit" });
  }
  
  return items;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/overview" component={Overview} />
      <Route path="/network" component={MyNetwork} />
      <Route path="/credit/:id" component={Credit} />
      <Route path="/credit" component={CreditRouter} />
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
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/simulation" component={Simulation} />
      <Route path="/kudos" component={Kudos} />
      <Route path="/kudos-economics" component={KudosEconomics} />
      <Route path="/admin" component={Admin} />
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
  
  // Import necessary hooks for checking community access
  const { address } = useAccount();
  
  // Check if user has access to any communities with microcredit enabled
  const { data: communitiesResponse } = useQuery<{ communities: any[] }>({
    queryKey: ['/api/communities'],
    enabled: !!address,
  });

  const hasMicrocreditAccess = (communitiesResponse?.communities || []).some(
    (c: any) => c.lendingPolicyJson?.enabled === true
  );
  
  const appNavItems = getAppNavItems(hasMicrocreditAccess);

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
            <main className="flex-1 pb-16 md:pb-0">
              <Router />
            </main>
            <Footer />
            {!isLandingPage && <MobileBottomNav hasMicrocreditAccess={hasMicrocreditAccess} />}
          </div>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
