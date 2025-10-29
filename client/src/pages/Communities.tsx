import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Globe, Lock, LayoutDashboard } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useLanguage } from "@/contexts/LanguageContext";
import { Separator } from "@/components/ui/separator";

export default function Communities() {
  const { address, isConnected } = useWallet();
  const { t } = useLanguage();
  
  const { data, isLoading } = useQuery<{ communities: any[] }>({
    queryKey: ["/api/communities"],
  });

  const { data: userCommunitiesData, isLoading: isLoadingUserCommunities } = useQuery<{ communities: any[] }>({
    queryKey: ['/api/communities/user', address],
    enabled: !!address && isConnected,
  });

  const communities = data?.communities || [];
  const userCommunities = userCommunitiesData?.communities || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">{t('communities.title')}</h1>
          <p className="text-muted-foreground">
            {t('communities.description')}
          </p>
        </div>
        <Link href="/communities/create">
          <Button data-testid="button-create-community">
            <Plus className="w-4 h-4 mr-2" />
            {t('communities.create')}
          </Button>
        </Link>
      </div>

      {/* My Communities Section */}
      {isConnected && userCommunities.length > 0 && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{t('communities.myCommunities')}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userCommunities.map((community) => (
                <Card key={community.id} className="hover-elevate" data-testid={`card-my-community-${community.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg">{community.name}</CardTitle>
                      {community.visibility === "public" ? (
                        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">{community.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Link href={`/communities/${community.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-community-${community.id}`}>
                          {t('communities.viewDetails')}
                        </Button>
                      </Link>
                      <Link href={`/lending/${community.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full gap-2" data-testid={`button-dashboard-${community.id}`}>
                          <LayoutDashboard className="w-4 h-4" />
                          {t('communities.dashboard')}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Separator className="my-8" />
        </>
      )}

      <h2 className="text-2xl font-bold mb-4">{t('communities.allCommunities')}</h2>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-accent rounded w-3/4 mb-2" />
                <div className="h-4 bg-accent rounded w-full" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-accent rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('communities.noCommunities')}</h3>
            <p className="text-muted-foreground mb-4">{t('communities.beFirst')}</p>
            <Link href="/communities/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('communities.create')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <Link key={community.id} href={`/communities/${community.id}`}>
              <Card className="h-full hover-elevate cursor-pointer transition-all" data-testid={`card-community-${community.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-xl">{community.name}</CardTitle>
                    {community.visibility === "public" ? (
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{community.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Prompt: </span>
                    <span className="font-medium">"{community.promptText}"</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {community.policyId}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Community {community.id}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
