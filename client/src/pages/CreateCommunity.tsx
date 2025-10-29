import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Briefcase, Coins, ShoppingBag, Settings, Check, ChevronDown } from "lucide-react";
import type { CommunityTemplate } from "@shared/community-types";

const templateIcons = {
  Briefcase,
  Coins,
  ShoppingBag,
  Settings,
};

export default function CreateCommunity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { address } = useAccount();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("hiring-v1");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [policyPreviewOpen, setPolicyPreviewOpen] = useState(false);

  const { data: templatesData } = useQuery<{ templates: CommunityTemplate[] }>({
    queryKey: ["/api/communities/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; promptText: string; templateId: string; creator: string }) => {
      const response = await apiRequest("POST", "/api/communities", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Community created!",
        description: `${data.community.name} has been created. You're automatically the first seed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setLocation(`/communities/${data.community.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating community",
        description: error.message || "Failed to create community",
        variant: "destructive",
      });
    },
  });

  const templates = templatesData?.templates || [];
  const template = templates.find((t: CommunityTemplate) => t.id === selectedTemplate);

  const handleSubmit = () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a community",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a community name",
        variant: "destructive",
      });
      return;
    }

    if (!promptText.trim() && template) {
      setPromptText(template.defaultPrompt);
    }

    createMutation.mutate({
      name,
      description,
      promptText: promptText || template?.defaultPrompt || "",
      templateId: selectedTemplate,
      creator: address,
    });
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Create a Community</h1>
        <p className="text-muted-foreground">Build a trust network with custom endorsement criteria</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card data-testid="card-template-selector">
            <CardHeader>
              <CardTitle>1. Choose a Template</CardTitle>
              <CardDescription>Select a pre-configured policy or start from scratch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((tmpl: CommunityTemplate) => {
                const Icon = templateIcons[tmpl.icon as keyof typeof templateIcons] || Settings;
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all hover-elevate ${
                      isSelected ? "border-primary bg-accent" : "border-border"
                    }`}
                    data-testid={`button-template-${tmpl.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tmpl.name}</h3>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{tmpl.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card data-testid="card-community-details">
            <CardHeader>
              <CardTitle>2. Community Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Community Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., SF Freelancers Network"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-community-name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this community about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-community-description"
                />
              </div>

              <div>
                <Label htmlFor="prompt">Endorsement Prompt</Label>
                <Input
                  id="prompt"
                  placeholder={template?.defaultPrompt}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  data-testid="input-community-prompt"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Defaults to: "{template?.defaultPrompt}"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card data-testid="card-policy-preview">
            <Collapsible open={policyPreviewOpen} onOpenChange={setPolicyPreviewOpen}>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between text-left hover-elevate p-2 -m-2 rounded" data-testid="button-toggle-policy-preview">
                  <div>
                    <CardTitle>Policy Preview</CardTitle>
                    <CardDescription>Sybil-resistance configuration</CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${policyPreviewOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {template && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Acceptance Criteria</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-lg bg-accent">
                            <div className="text-xs text-muted-foreground">Min Cut</div>
                            <div className="text-lg font-semibold">{template.policy.acceptance.minCut}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-accent">
                            <div className="text-xs text-muted-foreground">Vertex Disjoint</div>
                            <div className="text-lg font-semibold">{template.policy.acceptance.vertexDisjoint}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-accent">
                            <div className="text-xs text-muted-foreground">Min Seeds</div>
                            <div className="text-lg font-semibold">{template.policy.acceptance.seedCoverage.minSeeds}</div>
                          </div>
                          <div className="p-3 rounded-lg bg-accent">
                            <div className="text-xs text-muted-foreground">Seed Quality</div>
                            <div className="text-lg font-semibold">{(template.policy.acceptance.seedCoverage.minSeedScore * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Trust Tiers</h4>
                        <div className="flex flex-wrap gap-2">
                          {template.policy.tiers.map((tier: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {tier}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-2">Capacity Decay</h4>
                        <div className="flex gap-1">
                          {template.policy.nodeCap.distance.map((cap: number, idx: number) => (
                            <div key={idx} className="flex-1 p-2 rounded bg-accent text-center">
                              <div className="text-xs text-muted-foreground">d={idx}</div>
                              <div className="text-sm font-semibold">{cap}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
            <CardContent className="pt-0">
              {template && (
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !name.trim() || !address}
                  className="w-full"
                  data-testid="button-create-community"
                >
                  {createMutation.isPending ? "Creating..." : !address ? "Connect Wallet" : "Create Community"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">You'll be the first seed</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              As the community creator, you're automatically added as the first seed. This gives you trusted status and ensures the network has a foundation to build from.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
