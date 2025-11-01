import { useAccount } from "wagmi";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Heart, Shield, Plus, X, Info, Network } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface EgoContext {
  id: number;
  contextType: 'ego';
  ownerAddress: string;
  communityId: number | null;
  policyJson: any;
  createdAt: string;
}

interface CoSeed {
  id: number;
  contextId: number;
  address: string;
  addedAt: string;
}

interface EgoContextResponse {
  context: EgoContext;
  coSeeds: CoSeed[];
  seedAddresses: string[];
}

// Zod schema for co-seed address validation
const coSeedSchema = z.object({
  address: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address (0x...)")
    .transform(val => val.toLowerCase()),
});

type CoSeedFormData = z.infer<typeof coSeedSchema>;

export default function MyNetwork() {
  const { address } = useAccount();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Form for adding co-seeds
  const form = useForm<CoSeedFormData>({
    resolver: zodResolver(coSeedSchema),
    defaultValues: {
      address: "",
    },
  });

  // Fetch ego context
  const { data: egoData, isLoading } = useQuery<EgoContextResponse>({
    queryKey: ['/api/ego', address?.toLowerCase(), 'context'],
    enabled: !!address,
  });

  // Add co-seed mutation
  const addCoSeedMutation = useMutation({
    mutationFn: async (coSeedAddress: string) => {
      return await apiRequest('POST', `/api/ego/${address?.toLowerCase()}/co-seeds`, { coSeedAddress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ego', address?.toLowerCase(), 'context'] });
      toast({
        title: "Co-seed added",
        description: "Your trusted co-seed has been added successfully.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add co-seed",
        variant: "destructive",
      });
    },
  });

  // Remove co-seed mutation
  const removeCoSeedMutation = useMutation({
    mutationFn: async (coSeedAddress: string) => {
      return await apiRequest('DELETE', `/api/ego/${address?.toLowerCase()}/co-seeds/${coSeedAddress}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ego', address?.toLowerCase(), 'context'] });
      toast({
        title: "Co-seed removed",
        description: "Co-seed has been removed from your network.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove co-seed",
        variant: "destructive",
      });
    },
  });

  const handleAddCoSeed = (data: CoSeedFormData) => {
    addCoSeedMutation.mutate(data.address);
  };

  const handleRemoveCoSeed = (coSeedAddress: string) => {
    removeCoSeedMutation.mutate(coSeedAddress);
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert data-testid="alert-connect-wallet">
          <Info className="h-4 w-4" />
          <AlertDescription data-testid="text-connect-wallet-message">
            Connect your wallet to view your personal trust network.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const coSeedCount = egoData?.coSeeds.length || 0;
  const maxCoSeeds = 3;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="heading-my-network">
          <Network className="w-8 h-8" />
          My Network
        </h1>
        <p className="text-muted-foreground text-lg" data-testid="text-page-description">
          Your personal trust network powered by max-flow algorithms
        </p>
      </div>

      {/* Personal Health Card */}
      <Card className="mb-6" data-testid="card-personal-health">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            <span data-testid="text-card-title-health">Personal Network Health</span>
          </CardTitle>
          <CardDescription data-testid="text-card-description-health">
            Your trust score based on your curated network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-5xl font-bold mb-2" data-testid="text-health-score">
                —
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-health-score-label">
                Health Score (0-100)
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="mb-2" data-testid="badge-status">
                Building Network
              </Badge>
              <p className="text-sm text-muted-foreground" data-testid="text-status-message">
                Add co-seeds to strengthen your network
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold" data-testid="text-accepted-users">0</div>
              <p className="text-xs text-muted-foreground" data-testid="text-label-accepted">Accepted Users</p>
            </div>
            <div>
              <div className="text-2xl font-semibold" data-testid="text-avg-flow">—</div>
              <p className="text-xs text-muted-foreground" data-testid="text-label-avg-flow">Avg Flow</p>
            </div>
            <div>
              <div className="text-2xl font-semibold" data-testid="text-median-cut">—</div>
              <p className="text-xs text-muted-foreground" data-testid="text-label-median-cut">Median Min-Cut</p>
            </div>
          </div>

          <Alert className="mt-6" data-testid="alert-scoring-info">
            <Info className="h-4 w-4" />
            <AlertDescription data-testid="text-scoring-info-message">
              Scoring engine coming soon. Your network will be evaluated using max-flow/min-cut algorithms.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Co-Seeds Management Card */}
      <Card className="mb-6" data-testid="card-co-seeds">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span data-testid="text-co-seeds-title">Trusted Co-Seeds ({coSeedCount}/{maxCoSeeds})</span>
          </CardTitle>
          <CardDescription data-testid="text-co-seeds-description">
            Add up to 3 trusted wallets as co-seeds to strengthen your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Co-Seed Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCoSeed)} className="space-y-4 mb-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-co-seed-address">Co-seed Address</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-co-seed-address"
                          placeholder="0x... wallet address"
                          disabled={coSeedCount >= maxCoSeeds || addCoSeedMutation.isPending}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        data-testid="button-add-co-seed"
                        disabled={coSeedCount >= maxCoSeeds || addCoSeedMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Co-Seed
                      </Button>
                    </div>
                    <FormDescription data-testid="text-form-description">
                      Enter a valid Ethereum address (0x...)
                    </FormDescription>
                    <FormMessage data-testid="text-form-error" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
            
          {coSeedCount >= maxCoSeeds && (
            <Alert data-testid="alert-max-co-seeds" className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription data-testid="text-max-co-seeds-message">
                You've reached the maximum of {maxCoSeeds} co-seeds. Remove one to add another.
              </AlertDescription>
            </Alert>
          )}

          {/* Co-Seeds List */}
          {coSeedCount > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium mb-3" data-testid="text-co-seeds-list-label">Your Co-Seeds:</p>
              {egoData?.coSeeds.map((coSeed) => (
                <div
                  key={coSeed.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`co-seed-${coSeed.address}`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-mono text-sm" data-testid={`text-co-seed-address-${coSeed.address}`}>
                        {coSeed.address.slice(0, 6)}...{coSeed.address.slice(-4)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-co-seed-date-${coSeed.address}`}>
                        Added {new Date(coSeed.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-remove-co-seed-${coSeed.address}`}
                    onClick={() => handleRemoveCoSeed(coSeed.address)}
                    disabled={removeCoSeedMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert data-testid="alert-no-co-seeds">
              <Info className="h-4 w-4" />
              <AlertDescription data-testid="text-no-co-seeds-message">
                No co-seeds yet. Add trusted wallets to strengthen your network's Sybil resistance.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* How It Works Card */}
      <Card data-testid="card-how-it-works">
        <CardHeader>
          <CardTitle data-testid="text-how-it-works-title">How Personal Networks Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-ego">🌐 Ego-Centric Trust</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-ego">
              Your network is centered on you and your chosen co-seeds. Unlike community networks with fixed criteria,
              your personal network reflects who you trust.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-vouches">🔄 Global Vouches</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-vouches">
              Create global vouches for people you trust. These vouches flow across all personal networks,
              not just specific communities.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-score">📊 Local Health Score</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-score">
              Your network quality is measured by average flow and median min-cut. Higher scores mean stronger,
              more Sybil-resistant connections.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2" data-testid="text-section-title-capacity">🎯 Distance-Based Capacity</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-section-description-capacity">
              Nodes closer to you and your co-seeds have higher capacity in the trust graph. This prevents
              distant collusion attacks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
