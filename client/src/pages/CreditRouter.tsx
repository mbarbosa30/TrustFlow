import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Building2 } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LendingPolicy {
  enabled: boolean;
  loanButtonsUsdc?: number[];
  tenorsMonths?: number[];
}

interface Community {
  id: number;
  name: string;
  description: string;
  currency: string;
  logoUrl?: string;
  lendingPolicyJson: LendingPolicy;
}

export default function CreditRouter() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: communitiesResponse, isLoading } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities'],
    enabled: !!address,
  });

  const communities = communitiesResponse?.communities || [];
  
  const lendingCommunities = communities.filter(c => {
    const policy = c.lendingPolicyJson;
    return policy && policy.enabled === true;
  });

  useEffect(() => {
    if (!isLoading && lendingCommunities.length === 1) {
      setLocation(`/credit/${lendingCommunities[0].id}`);
    }
  }, [isLoading, lendingCommunities, setLocation]);

  if (!address) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Credit
            </CardTitle>
            <CardDescription>
              Connect your wallet to access credit services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please connect your wallet to view available credit options.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lendingCommunities.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              No Lending Communities
            </CardTitle>
            <CardDescription>
              You don't have access to any communities with lending enabled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To access credit services, you need to join a community that offers lending.
            </p>
            <Button 
              onClick={() => setLocation('/communities')}
              data-testid="button-browse-communities"
            >
              Browse Communities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lendingCommunities.length === 1) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Select Community
          </CardTitle>
          <CardDescription>
            Choose a community to access credit services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {lendingCommunities.map((community) => (
              <Card 
                key={community.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation(`/credit/${community.id}`)}
                data-testid={`card-community-${community.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {community.logoUrl ? (
                      <img 
                        src={community.logoUrl} 
                        alt={community.name}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">
                        {community.name}
                      </CardTitle>
                      <CardDescription className="text-sm line-clamp-2 mt-1">
                        {community.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Currency:</span>
                    <span className="font-medium">{community.currency}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
