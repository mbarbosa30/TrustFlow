import { Home, CreditCard, Users, Coins } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Community } from "@shared/schema";
import { useAccount } from "wagmi";

interface MobileBottomNavProps {
  hasMicrocreditAccess?: boolean;
  hasActiveLoans?: boolean;
}

export function MobileBottomNav({ hasMicrocreditAccess = false, hasActiveLoans = false }: MobileBottomNavProps) {
  const [location] = useLocation();
  const { address } = useAccount();

  const { data: communitiesResponse } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities'],
    enabled: !!address,
  });

  const communities = communitiesResponse?.communities || [];
  const userCommunities = communities.filter(c => 
    c.creator.toLowerCase() === address?.toLowerCase()
  );

  const communityPath = userCommunities.length === 1 
    ? `/communities/${userCommunities[0].id}`
    : '/communities';

  const isActive = (path: string) => {
    if (path === communityPath && (location.startsWith('/communities'))) {
      return true;
    }
    return location === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="flex items-center justify-around h-16">
        <Link
          href="/overview"
          data-testid="nav-home"
          className={`flex flex-col items-center justify-center flex-1 h-full ${
            isActive('/overview') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>

        <Link
          href="/kudos"
          data-testid="nav-kudos"
          className={`flex flex-col items-center justify-center flex-1 h-full ${
            isActive('/kudos') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Coins className="w-6 h-6" />
          <span className="text-xs mt-1">KUDOS</span>
        </Link>

        {(hasMicrocreditAccess || hasActiveLoans) && (
          <Link
            href="/credit"
            data-testid="nav-credit"
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive('/credit') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-xs mt-1">Credit</span>
          </Link>
        )}

        <Link
          href={communityPath}
          data-testid="nav-community"
          className={`flex flex-col items-center justify-center flex-1 h-full ${
            isActive(communityPath) ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Community</span>
        </Link>
      </div>
    </nav>
  );
}
