import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Shield } from "lucide-react";
import { useAccount } from "wagmi";

interface Seed {
  address: string;
  addedBy: string | null;
  note: string | null;
  createdAt: Date;
}

export default function Seeds() {
  const [newAddress, setNewAddress] = useState("");
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();
  const { address: userAddress } = useAccount();

  const { data: seedsData, isLoading } = useQuery<{ seeds: Seed[] }>({
    queryKey: ['/api/seeds'],
  });

  const addSeedMutation = useMutation({
    mutationFn: async (data: { address: string; addedBy?: string; note?: string }) => {
      return await apiRequest('POST', '/api/seeds', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seeds'] });
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
    mutationFn: async (address: string) => {
      return await apiRequest('DELETE', `/api/seeds/${address}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seeds'] });
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

  const handleAddSeed = async () => {
    if (!newAddress) return;
    
    addSeedMutation.mutate({
      address: newAddress.toLowerCase(),
      addedBy: userAddress,
      note: newNote || undefined,
    });
  };

  const handleDeleteSeed = async (address: string) => {
    if (confirm(`Are you sure you want to remove ${address} as a seed?`)) {
      deleteSeedMutation.mutate(address);
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
              disabled={!newAddress || addSeedMutation.isPending}
              className="w-full"
              data-testid="button-add-seed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Seed
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
      </div>
    </div>
  );
}
