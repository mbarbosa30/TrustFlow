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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("hiring-v1");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [policyPreviewOpen, setPolicyPreviewOpen] = useState(false);

  const { data: templatesData } = useQuery<{ templates: CommunityTemplate[] }>({
    queryKey: ["/api/communities/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description: string; 
      promptText: string; 
      templateId: string; 
      creator: string;
      location?: string;
      logoUrl?: string;
      coverUrl?: string;
      themeJson?: any;
    }) => {
      const response = await apiRequest("POST", "/api/communities", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: t('createCommunity.communityCreated'),
        description: `${data.community.name} ${t('createCommunity.creatorFirstSeed')}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      setLocation(`/communities/${data.community.id}`);
    },
    onError: (error: any) => {
      toast({
        title: t('createCommunity.errorCreating'),
        description: error.message || t('createCommunity.errorCreatingDesc'),
        variant: "destructive",
      });
    },
  });

  const templates = templatesData?.templates || [];
  const template = templates.find((t: CommunityTemplate) => t.id === selectedTemplate);

  const handleSubmit = () => {
    if (!address) {
      toast({
        title: t('createCommunity.walletRequired'),
        description: t('createCommunity.walletRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: t('createCommunity.nameRequired'),
        description: t('createCommunity.nameRequiredDesc'),
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
      location: locationText.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      themeJson: primaryColor !== "#3b82f6" ? { primaryColor } : undefined,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">{t('createCommunity.title')}</h1>
        <p className="text-muted-foreground">{t('createCommunity.description')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card data-testid="card-template-selector">
            <CardHeader>
              <CardTitle>{t('createCommunity.step1')}</CardTitle>
              <CardDescription>{t('createCommunity.templateDesc')}</CardDescription>
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
              <CardTitle>{t('createCommunity.step2')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t('createCommunity.communityName')} *</Label>
                <Input
                  id="name"
                  placeholder={t('createCommunity.communityNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-community-name"
                />
              </div>

              <div>
                <Label htmlFor="description">{t('createCommunity.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('createCommunity.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-community-description"
                />
              </div>

              <div>
                <Label htmlFor="prompt">{t('createCommunity.endorsementPrompt')}</Label>
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

          <Card data-testid="card-branding">
            <CardHeader>
              <CardTitle>3. Branding (Optional)</CardTitle>
              <CardDescription>Customize your community's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., San Francisco, CA"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  data-testid="input-community-location"
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  data-testid="input-community-logo"
                />
              </div>

              <div>
                <Label htmlFor="coverUrl">Cover Image URL</Label>
                <Input
                  id="coverUrl"
                  placeholder="https://example.com/cover.jpg"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  data-testid="input-community-cover"
                />
              </div>

              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                    data-testid="input-community-color"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Preview Card with Live Branding */}
          <Card className="overflow-hidden" data-testid="card-preview">
            <CardHeader className="pb-3">
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your community will look</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Card className="overflow-hidden m-4 border-2">
                {/* Cover Preview */}
                <div 
                  className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5"
                  style={{
                    backgroundImage: coverUrl 
                      ? `linear-gradient(to bottom, ${primaryColor}15, ${primaryColor}30), url(${coverUrl})`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  
                  {/* Logo Preview */}
                  <div className="absolute bottom-0 left-4 transform translate-y-1/2">
                    <div 
                      className="h-16 w-16 rounded-full border-4 border-background flex items-center justify-center text-xl font-bold"
                      style={{ 
                        backgroundColor: logoUrl ? 'transparent' : `${primaryColor}20`,
                        color: primaryColor,
                        backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!logoUrl && (name || "CO").substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="pt-10 pb-3 px-4">
                  <h3 className="text-lg font-bold">{name || "Community Name"}</h3>
                  {locationText && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <span>📍</span> {locationText}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{description || "Community description will appear here"}</p>
                </div>
              </Card>
            </CardContent>
          </Card>

          <Card data-testid="card-policy-preview">
            <Collapsible open={policyPreviewOpen} onOpenChange={setPolicyPreviewOpen}>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between text-left hover-elevate p-2 -m-2 rounded" data-testid="button-toggle-policy-preview">
                  <div>
                    <CardTitle>Policy Configuration</CardTitle>
                    <CardDescription>Sybil-resistance parameters</CardDescription>
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
                  {createMutation.isPending ? "Creating..." : !address ? "Connect Wallet" : t('createCommunity.createButton')}
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
