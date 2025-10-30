import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSignMessage } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Shield, Zap, ArrowRight, Calendar, Database, Users, AlertTriangle, Globe } from "lucide-react";
import { useWallet } from '@/hooks/useWallet';

interface Seed {
  address: string;
  addedBy: string | null;
  note: string | null;
  createdAt: Date;
}

interface ComputationSummary {
  scoresComputed: number;
  networkMetrics: {
    totalAccepted: number;
    avgMinCut: number;
    avgFlow: number;
    p95Flow: number;
  };
  health: {
    ghi: number;
    sizeN: number;
    cutN: number;
    churnN: number;
  } | null;
  duration: number;
}

export default function Seeds() {
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<number>(0);
  const [computationResult, setComputationResult] = useState<ComputationSummary | null>(null);
  const { toast } = useToast();
  const { address: userAddress, isConnected } = useWallet();
  const { signMessageAsync } = useSignMessage();

  const { data: communitiesData } = useQuery<{ communities: { id: number; name: string; slug: string }[] }>({
    queryKey: ['/api/communities'],
  });

  const { data: seedsData, isLoading } = useQuery<{ seeds: Seed[] }>({
    queryKey: ['/api/seeds', { communityId: selectedCommunityId }],
    queryFn: async () => {
      const response = await fetch(`/api/seeds?communityId=${selectedCommunityId}`);
      if (!response.ok) throw new Error('Failed to fetch seeds');
      return response.json();
    },
  });

  const { data: epochData, isLoading: isEpochLoading } = useQuery<{ 
    epochId: number; 
    status: string;
    createdAt: string;
    closedAt: string | null;
  }>({
    queryKey: ['/api/epoch/current'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const addSeedMutation = useMutation({
    mutationFn: async (data: { address: string; walletSignature: any; note?: string; communityId: number }) => {
      return await apiRequest('POST', '/api/seeds', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seeds', { communityId: selectedCommunityId }] });
      setNewAddress("");
      setNewNote("");
      toast({
        title: "Seed Added",
        description: "New seed address has been added to the network",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Seed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteSeedMutation = useMutation({
    mutationFn: async (data: { address: string; walletSignature: any; communityId: number }) => {
      const response = await fetch(`/api/seeds/${data.address}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletSignature: data.walletSignature,
          communityId: data.communityId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete seed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seeds', { communityId: selectedCommunityId }] });
      toast({
        title: "Seed Removed",
        description: "Seed address has been removed from the network",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Seed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const advanceEpochMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/epoch/advance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to advance epoch');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setComputationResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/epoch/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Epoch Advanced",
        description: `Advanced to Epoch ${data.newEpochId}. Current epoch closed and new epoch created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Advance Epoch",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetEpochMutation = useMutation({
    mutationFn: async () => {
      const currentEpochId = epochData?.epochId ?? 0;
      const response = await fetch(`/api/epoch/${currentEpochId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to reset epoch');
      }

      return response.json();
    },
    onSuccess: () => {
      const currentEpochId = epochData?.epochId ?? 0;
      setComputationResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/score'] });
      queryClient.invalidateQueries({ queryKey: [`/api/epoch/${currentEpochId}/health`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Epoch Reset",
        description: "Epoch scores and health data have been cleared",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Reset Epoch",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const computeEpochMutation = useMutation({
    mutationFn: async () => {
      const currentEpochId = epochData?.epochId ?? 0;
      const response = await fetch(`/api/epoch/${currentEpochId}/compute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to compute epoch');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const currentEpochId = epochData?.epochId ?? 0;
      setComputationResult(data.summary);
      queryClient.invalidateQueries({ queryKey: ['/api/score'] });
      queryClient.invalidateQueries({ queryKey: [`/api/epoch/${currentEpochId}/health`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Epoch Computation Complete",
        description: `Computed scores for ${data.summary.scoresComputed} users`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Computation Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const addOrganicGrowthMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/test-data/organic-growth', {});
    },
    onSuccess: (data: any) => {
      // Invalidate all data-dependent queries
      queryClient.invalidateQueries({ queryKey: ['/api/endorsements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/epoch/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sts-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/tier-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-growth'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/endorsement-velocity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/score-components'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/average-sts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-density'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/path-diversity'] });
      // Invalidate all epoch health queries (current and specific)
      const currentEpochId = epochData?.epochId ?? 0;
      queryClient.invalidateQueries({ queryKey: [`/api/epoch/${currentEpochId}/health`] });
      toast({
        title: "Organic Growth Added",
        description: `Added ${data.summary.totalAdded} endorsements (${data.summary.newMembers} new members)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Growth Data",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const clearEndorsementsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-data/endorsements', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear endorsements');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all data-dependent queries
      queryClient.invalidateQueries({ queryKey: ['/api/endorsements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/epoch/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sts-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/tier-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-growth'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/endorsement-velocity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/score-components'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/average-sts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-density'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/path-diversity'] });
      // Invalidate all epoch health queries
      const currentEpochId = epochData?.epochId ?? 0;
      queryClient.invalidateQueries({ queryKey: [`/api/epoch/${currentEpochId}/health`] });
      toast({
        title: "Endorsements Cleared",
        description: "All endorsements have been deleted from the database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear Endorsements",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const clearAllDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-data/all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear all data');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate ALL queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/endorsements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/epoch/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sts-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/tier-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-growth'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/endorsement-velocity'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/score-components'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/average-sts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/network-density'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/path-diversity'] });
      // Invalidate all epoch health queries
      const currentEpochId = epochData?.epochId ?? 0;
      queryClient.invalidateQueries({ queryKey: [`/api/epoch/${currentEpochId}/health`] });
      toast({
        title: "All Data Cleared",
        description: "All test data has been deleted (seeds preserved)",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear Data",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleAddSeed = async () => {
    if (!newAddress || !userAddress || !isConnected) return;
    
    try {
      const message = `Add seed: ${newAddress.toLowerCase()}\nCommunity: ${selectedCommunityId}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      
      addSeedMutation.mutate({
        address: newAddress.toLowerCase(),
        walletSignature: {
          address: userAddress,
          message,
          signature,
        },
        note: newNote || undefined,
        communityId: selectedCommunityId,
      });
    } catch (error: any) {
      toast({
        title: "Signature Required",
        description: error.message || "You must sign the message to add a seed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSeed = async (address: string) => {
    if (!userAddress || !isConnected) return;
    
    if (confirm(`Are you sure you want to remove ${address} as a seed?`)) {
      try {
        const message = `Remove seed: ${address}\nCommunity: ${selectedCommunityId}\nTimestamp: ${Date.now()}`;
        const signature = await signMessageAsync({ message });
        
        deleteSeedMutation.mutate({
          address,
          walletSignature: {
            address: userAddress,
            message,
            signature,
          },
          communityId: selectedCommunityId,
        });
      } catch (error: any) {
        toast({
          title: "Signature Required",
          description: error.message || "You must sign the message to remove a seed",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Seed Management</h1>
        <p className="text-muted-foreground">
          Manage seed addresses that bootstrap the trust network
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Select Community
            </CardTitle>
            <CardDescription>
              Choose which community's seeds to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="community-select">Community</Label>
              <Select
                value={selectedCommunityId.toString()}
                onValueChange={(value) => setSelectedCommunityId(parseInt(value, 10))}
              >
                <SelectTrigger id="community-select" data-testid="select-community">
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Global Network (Community 0)</SelectItem>
                  {communitiesData?.communities?.map((community) => (
                    <SelectItem key={community.id} value={community.id.toString()}>
                      {community.name} (Community {community.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Seeds are specific to each community. Global seeds (Community 0) are shared across the platform.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Current Epoch
            </CardTitle>
            <CardDescription>
              Track and manage the current active epoch for trust scoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEpochLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading epoch information...
              </div>
            ) : epochData ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                    <div>
                      <div className="text-sm text-muted-foreground">Active Epoch</div>
                      <div className="text-3xl font-bold font-mono" data-testid="text-current-epoch">
                        {epochData.epochId}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="font-semibold text-primary capitalize">{epochData.status}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Created</div>
                      <div className="font-mono">{new Date(epochData.createdAt).toLocaleDateString()}</div>
                    </div>
                    {epochData.closedAt && (
                      <div>
                        <div className="text-muted-foreground">Closed</div>
                        <div className="font-mono">{new Date(epochData.closedAt).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong>Epochs</strong> are sequential scoring periods. Each epoch builds on the accepted 
                      subgraph from the previous epoch, creating an immutable trust history.
                    </p>
                    <p>
                      When you <strong>advance an epoch</strong>, the current epoch is closed (made immutable) 
                      and a new epoch is created. All new endorsements will go to the new epoch.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (confirm(`Are you sure you want to advance to Epoch ${(epochData.epochId || 0) + 1}?\n\nThis will:\n- Close Epoch ${epochData.epochId} (make it immutable)\n- Create Epoch ${(epochData.epochId || 0) + 1}\n- All new endorsements will go to the new epoch`)) {
                      advanceEpochMutation.mutate();
                    }
                  }}
                  disabled={advanceEpochMutation.isPending}
                  className="w-full"
                  data-testid="button-advance-epoch"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {advanceEpochMutation.isPending ? "Advancing..." : `Advance to Epoch ${(epochData.epochId || 0) + 1}`}
                </Button>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No epoch data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              What are Seeds?
            </CardTitle>
            <CardDescription>
              Seeds are trusted starting points for the max-flow algorithm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Seeds are the foundation of the trust network. They serve as the "source" nodes
                in the max-flow computation that calculates everyone's trust scores.
              </p>
              <p>
                Without seeds, there's no origin point for trust to flow from, so no one receives
                scores. Typically, seeds are:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Founding community members</li>
                <li>Well-known, trusted individuals</li>
                <li>Addresses verified through external means</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New Seed</CardTitle>
            <CardDescription>
              Add a trusted wallet address as a seed for the trust network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="seed-address">Wallet Address</Label>
              <Input
                id="seed-address"
                placeholder="0x1234..."
                className="mt-2 font-mono"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                data-testid="input-seed-address"
              />
            </div>

            <div>
              <Label htmlFor="seed-note">Note (Optional)</Label>
              <Textarea
                id="seed-note"
                placeholder="Why this address is a seed..."
                className="mt-2 resize-none"
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                data-testid="input-seed-note"
              />
            </div>

            <Button
              onClick={handleAddSeed}
              disabled={!newAddress || !isConnected || addSeedMutation.isPending}
              className="w-full"
              data-testid="button-add-seed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {!isConnected ? "Connect Wallet to Add Seed" : "Add Seed"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Seeds</CardTitle>
            <CardDescription>
              {seedsData?.seeds.length || 0} seed address{seedsData?.seeds.length === 1 ? '' : 'es'} in the network
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading seeds...
              </div>
            ) : !seedsData?.seeds.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No seeds have been added yet. Add your first seed to bootstrap the trust network.
              </div>
            ) : (
              <div className="space-y-3">
                {seedsData.seeds.map((seed) => (
                  <Card key={seed.address} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="font-mono text-sm break-all" data-testid={`text-seed-${seed.address}`}>
                          {seed.address}
                        </div>
                        {seed.note && (
                          <p className="text-xs text-muted-foreground">{seed.note}</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Added {new Date(seed.createdAt).toLocaleDateString()}
                          {seed.addedBy && ` by ${seed.addedBy.slice(0, 6)}...${seed.addedBy.slice(-4)}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSeed(seed.address)}
                        disabled={deleteSeedMutation.isPending}
                        data-testid={`button-delete-${seed.address}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Compute Epoch Scores
            </CardTitle>
            <CardDescription>
              Run the max-flow algorithm to calculate trust scores for all users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This triggers the trust scoring algorithm which:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Loads all vouches from the network</li>
                <li>Runs max-flow/min-cut from seed addresses</li>
                <li>Calculates STS (Standardized Trust Score) for each user</li>
                <li>Stores results in the database</li>
              </ul>
              <p className="pt-2">
                <strong>Note:</strong> If the epoch is already computed, click "Reset Epoch" first to clear existing scores, then compute again.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => computeEpochMutation.mutate()}
                disabled={!isConnected || computeEpochMutation.isPending || !seedsData?.seeds.length}
                className="flex-1"
                data-testid="button-compute-epoch"
              >
                <Zap className="w-4 h-4 mr-2" />
                {computeEpochMutation.isPending ? "Computing..." : `Compute Epoch ${epochData?.epochId ?? 0} Scores`}
              </Button>

              <Button
                onClick={() => resetEpochMutation.mutate()}
                disabled={resetEpochMutation.isPending}
                variant="outline"
                className="flex-1"
                data-testid="button-reset-epoch"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {resetEpochMutation.isPending ? "Resetting..." : "Reset Epoch"}
              </Button>
            </div>

            {computationResult && (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-2">Computation Results</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scores Computed:</span>
                      <span className="font-mono font-semibold">{computationResult.scoresComputed}</span>
                    </div>
                    {computationResult.health && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Network Health (GHI):</span>
                        <span className="font-mono font-semibold">{computationResult.health.ghi}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Accepted:</span>
                      <span className="font-mono">{computationResult.networkMetrics.totalAccepted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Min-Cut:</span>
                      <span className="font-mono">{computationResult.networkMetrics.avgMinCut.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Flow:</span>
                      <span className="font-mono">{computationResult.networkMetrics.avgFlow.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Test Data Management
            </CardTitle>
            <CardDescription>
              Experimental tools to populate and manage test data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground p-4 bg-amber-500/10 rounded-md border border-amber-500/20">
              <p className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                Development Tool
              </p>
              <p>
                These tools are for testing and experimentation. Use them to quickly populate
                the network with realistic data or reset to a clean state.
              </p>
            </div>

            {epochData && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                <div>
                  <div className="text-xs text-muted-foreground">Current Epoch</div>
                  <div className="text-2xl font-bold font-mono">{epochData.epochId}</div>
                  <div className="text-xs text-muted-foreground capitalize">{epochData.status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-sm font-mono">{new Date(epochData.createdAt).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">{new Date(epochData.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Populate Data
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Add organic growth data to the current epoch (peer vouches + new members)
                </p>
                <Button
                  onClick={() => addOrganicGrowthMutation.mutate()}
                  disabled={addOrganicGrowthMutation.isPending}
                  className="w-full"
                  data-testid="button-add-organic-growth"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addOrganicGrowthMutation.isPending ? "Adding..." : "Add Organic Growth"}
                </Button>
              </div>

              <div className="border-t pt-3">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Remove Data
                </h4>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      if (confirm("Clear all endorsements? This cannot be undone.")) {
                        clearEndorsementsMutation.mutate();
                      }
                    }}
                    disabled={clearEndorsementsMutation.isPending}
                    variant="outline"
                    className="w-full"
                    data-testid="button-clear-endorsements"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {clearEndorsementsMutation.isPending ? "Clearing..." : "Clear All Endorsements"}
                  </Button>

                  <Button
                    onClick={() => {
                      if (confirm("Delete ALL test data (endorsements, scores, epochs)? Seeds will be preserved. This cannot be undone.")) {
                        clearAllDataMutation.mutate();
                      }
                    }}
                    disabled={clearAllDataMutation.isPending}
                    variant="destructive"
                    className="w-full"
                    data-testid="button-clear-all-data"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {clearAllDataMutation.isPending ? "Clearing..." : "Clear Everything (Keep Seeds)"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
