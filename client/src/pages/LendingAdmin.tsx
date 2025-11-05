import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Shield,
  HandHeart,
  Save,
  AlertCircle,
  Coins
} from "lucide-react";

interface LendingPolicy {
  enabled: boolean;
  currency: string;
  loanAmounts: {
    min: number;
    max: number;
    step: number;
  };
  tenorMonths: {
    min: number;
    max: number;
    step: number;
  };
  annualInterestRate: number;
  subsidies: {
    ibdEnabled: boolean;
    raEnabled: boolean;
    vouchersEnabled: boolean;
    flgEnabled: boolean;
  };
  trustDeltas: {
    onTimePayment: number;
    latePayment: number;
    defaultEvent: number;
    repayAssist: number;
    maxPerEpoch: number;
  };
  eligibility: {
    ghiThreshold: number;
    minCutThreshold: number;
  };
}

const DEFAULT_POLICY: LendingPolicy = {
  enabled: false,
  currency: "ARS",
  loanAmounts: {
    min: 160,
    max: 800,
    step: 80,
  },
  tenorMonths: {
    min: 6,
    max: 12,
    step: 1,
  },
  annualInterestRate: 40.0,
  subsidies: {
    ibdEnabled: true,
    raEnabled: true,
    vouchersEnabled: false,
    flgEnabled: false,
  },
  trustDeltas: {
    onTimePayment: 0.02,
    latePayment: -0.05,
    defaultEvent: -0.15,
    repayAssist: 0.03,
    maxPerEpoch: 0.10,
  },
  eligibility: {
    ghiThreshold: 60,
    minCutThreshold: 2,
  },
};

export default function LendingAdmin() {
  const params = useParams();
  const communityId = parseInt(params.communityId || "0");
  const { toast } = useToast();

  // Fetch current lending policy
  const { data: policy, isLoading } = useQuery<LendingPolicy>({
    queryKey: ["/api/admin/lending-policy", communityId],
  });

  const [localPolicy, setLocalPolicy] = useState<LendingPolicy>(DEFAULT_POLICY);
  const [isDirty, setIsDirty] = useState(false);

  // Sync local state when server data loads (using useEffect to avoid render-time setState)
  // Only sync if user hasn't made unsaved changes (prevents background refetches from wiping edits)
  useEffect(() => {
    if (policy && !isDirty && JSON.stringify(policy) !== JSON.stringify(localPolicy)) {
      setLocalPolicy(policy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy, isDirty]);

  // Save lending policy mutation
  const savePolicyMutation = useMutation({
    mutationFn: async (updatedPolicy: LendingPolicy) => {
      return apiRequest("POST", `/api/admin/lending-policy/${communityId}`, updatedPolicy);
    },
    onSuccess: () => {
      setIsDirty(false); // Clear dirty flag on successful save
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lending-policy", communityId] });
      toast({
        title: "Policy Saved",
        description: "Lending policy has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    savePolicyMutation.mutate(localPolicy);
  };

  const updatePolicy = (updates: Partial<LendingPolicy>) => {
    setLocalPolicy({ ...localPolicy, ...updates });
    setIsDirty(true); // Mark as dirty when user makes changes
  };

  const updateSubsidies = (subsidyUpdates: Partial<LendingPolicy["subsidies"]>) => {
    setLocalPolicy({
      ...localPolicy,
      subsidies: { ...localPolicy.subsidies, ...subsidyUpdates },
    });
    setIsDirty(true); // Mark as dirty when user makes changes
  };

  const updateTrustDeltas = (deltaUpdates: Partial<LendingPolicy["trustDeltas"]>) => {
    setLocalPolicy({
      ...localPolicy,
      trustDeltas: { ...localPolicy.trustDeltas, ...deltaUpdates },
    });
    setIsDirty(true); // Mark as dirty when user makes changes
  };

  const updateEligibility = (eligibilityUpdates: Partial<LendingPolicy["eligibility"]>) => {
    setLocalPolicy({
      ...localPolicy,
      eligibility: { ...localPolicy.eligibility, ...eligibilityUpdates },
    });
    setIsDirty(true); // Mark as dirty when user makes changes
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <p className="text-muted-foreground">Loading lending policy...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Lending Policy Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure LocalHealth-based lending parameters for Community #{communityId}
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Note: This system interprets neutral MaxFlow scores as creditworthiness. Other communities may use the same scores differently.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={localPolicy.enabled ? "default" : "secondary"} className="text-lg px-4 py-2">
            {localPolicy.enabled ? "Lending Active" : "Lending Disabled"}
          </Badge>
          <Button 
            onClick={handleSave} 
            disabled={savePolicyMutation.isPending}
            data-testid="button-save-policy"
          >
            <Save className="h-4 w-4 mr-2" />
            {savePolicyMutation.isPending ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      </div>

      {/* Master Enable/Disable */}
      <Card data-testid="card-master-toggle">
        <CardHeader>
          <CardTitle>Lending System Status</CardTitle>
          <CardDescription>
            Enable or disable the entire lending system for this community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Lending</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, eligible members can apply for loans
              </p>
            </div>
            <Switch
              checked={localPolicy.enabled}
              onCheckedChange={(checked) => updatePolicy({ enabled: checked })}
              data-testid="switch-lending-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan Parameters */}
      <Card data-testid="card-loan-parameters">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Loan Parameters
          </CardTitle>
          <CardDescription>
            Configure available loan amounts, tenors, and interest rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Currency Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Loan Currency
            </Label>
            <Select
              value={localPolicy.currency}
              onValueChange={(value) => {
                updatePolicy({ currency: value });
              }}
            >
              <SelectTrigger className="w-full" data-testid="select-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                <SelectItem value="BRL">BRL - Brazilian Real</SelectItem>
                <SelectItem value="COP">COP - Colombian Peso</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Primary currency for loan amounts and repayments
            </p>
          </div>

          <Separator />

          {/* Loan Amounts */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Loan Amounts ({localPolicy.currency})</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loan-min" className="text-sm text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="loan-min"
                  type="number"
                  value={localPolicy.loanAmounts.min}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      loanAmounts: { ...localPolicy.loanAmounts, min: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-loan-min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-max" className="text-sm text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="loan-max"
                  type="number"
                  value={localPolicy.loanAmounts.max}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      loanAmounts: { ...localPolicy.loanAmounts, max: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-loan-max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan-step" className="text-sm text-muted-foreground">
                  Step Size
                </Label>
                <Input
                  id="loan-step"
                  type="number"
                  value={localPolicy.loanAmounts.step}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      loanAmounts: { ...localPolicy.loanAmounts, step: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-loan-step"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Tenor Months */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Loan Tenor (Months)
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenor-min" className="text-sm text-muted-foreground">
                  Minimum
                </Label>
                <Input
                  id="tenor-min"
                  type="number"
                  value={localPolicy.tenorMonths.min}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      tenorMonths: { ...localPolicy.tenorMonths, min: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-tenor-min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenor-max" className="text-sm text-muted-foreground">
                  Maximum
                </Label>
                <Input
                  id="tenor-max"
                  type="number"
                  value={localPolicy.tenorMonths.max}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      tenorMonths: { ...localPolicy.tenorMonths, max: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-tenor-max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenor-step" className="text-sm text-muted-foreground">
                  Step Size
                </Label>
                <Input
                  id="tenor-step"
                  type="number"
                  value={localPolicy.tenorMonths.step}
                  onChange={(e) => {
                    setLocalPolicy({
                      ...localPolicy,
                      tenorMonths: { ...localPolicy.tenorMonths, step: parseInt(e.target.value) || 0 },
                    });
                    setIsDirty(true);
                  }}
                  data-testid="input-tenor-step"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Annual Interest Rate
              </Label>
              <span className="text-2xl font-bold" data-testid="text-apr">
                {localPolicy.annualInterestRate.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[localPolicy.annualInterestRate]}
              onValueChange={([value]) => {
                updatePolicy({ annualInterestRate: value });
              }}
              min={0}
              max={100}
              step={0.5}
              data-testid="slider-apr"
            />
            <p className="text-sm text-muted-foreground">
              Adjust the annual percentage rate (APR) charged to borrowers
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subsidy Rails */}
      <Card data-testid="card-subsidy-rails">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5" />
            Subsidy Systems
          </CardTitle>
          <CardDescription>
            Enable or disable supporter subsidy mechanisms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Interest Buy-Down (IBD)</Label>
              <p className="text-sm text-muted-foreground">
                Allow supporters to reduce borrower interest rates
              </p>
            </div>
            <Switch
              checked={localPolicy.subsidies.ibdEnabled}
              onCheckedChange={(checked) => updateSubsidies({ ibdEnabled: checked })}
              data-testid="switch-ibd-enabled"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Repay-Assist (RA)</Label>
              <p className="text-sm text-muted-foreground">
                Allow supporters to cover late installments
              </p>
            </div>
            <Switch
              checked={localPolicy.subsidies.raEnabled}
              onCheckedChange={(checked) => updateSubsidies({ raEnabled: checked })}
              data-testid="switch-ra-enabled"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Interest Vouchers</Label>
              <p className="text-sm text-muted-foreground">
                Allow waiving N months of interest payments
              </p>
            </div>
            <Switch
              checked={localPolicy.subsidies.vouchersEnabled}
              onCheckedChange={(checked) => updateSubsidies({ vouchersEnabled: checked })}
              data-testid="switch-vouchers-enabled"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">First-Loss Guarantee (FLG)</Label>
              <p className="text-sm text-muted-foreground">
                Enable default protection via guarantee waterfall
              </p>
            </div>
            <Switch
              checked={localPolicy.subsidies.flgEnabled}
              onCheckedChange={(checked) => updateSubsidies({ flgEnabled: checked })}
              data-testid="switch-flg-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Score Delta Configuration */}
      <Card data-testid="card-score-deltas">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Delta Configuration
          </CardTitle>
          <CardDescription>
            Configure network score adjustments based on lending behavior (this community's interpretation of neutral graph signals)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delta-ontime">On-Time Payment</Label>
              <Input
                id="delta-ontime"
                type="number"
                step="0.01"
                value={localPolicy.trustDeltas.onTimePayment}
                onChange={(e) => {
                  updateTrustDeltas({ onTimePayment: parseFloat(e.target.value) || 0 });
                }}
                data-testid="input-delta-ontime"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delta-late">Late Payment</Label>
              <Input
                id="delta-late"
                type="number"
                step="0.01"
                value={localPolicy.trustDeltas.latePayment}
                onChange={(e) => {
                  updateTrustDeltas({ latePayment: parseFloat(e.target.value) || 0 });
                }}
                data-testid="input-delta-late"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delta-default">Default Event</Label>
              <Input
                id="delta-default"
                type="number"
                step="0.01"
                value={localPolicy.trustDeltas.defaultEvent}
                onChange={(e) => {
                  updateTrustDeltas({ defaultEvent: parseFloat(e.target.value) || 0 });
                }}
                data-testid="input-delta-default"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delta-assist">Repay-Assist Received</Label>
              <Input
                id="delta-assist"
                type="number"
                step="0.01"
                value={localPolicy.trustDeltas.repayAssist}
                onChange={(e) => {
                  updateTrustDeltas({ repayAssist: parseFloat(e.target.value) || 0 });
                }}
                data-testid="input-delta-assist"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="delta-max">Maximum Delta Per Epoch</Label>
            <Input
              id="delta-max"
              type="number"
              step="0.01"
              value={localPolicy.trustDeltas.maxPerEpoch}
              onChange={(e) => {
                updateTrustDeltas({ maxPerEpoch: parseFloat(e.target.value) || 0 });
              }}
              data-testid="input-delta-max"
            />
            <p className="text-sm text-muted-foreground">
              Cap on total network score delta changes per user per epoch (prevents gaming)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Thresholds */}
      <Card data-testid="card-eligibility">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Eligibility Thresholds
          </CardTitle>
          <CardDescription>
            Set minimum requirements for loan eligibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">GHI Threshold</Label>
              <span className="text-xl font-bold" data-testid="text-ghi-threshold">
                {localPolicy.eligibility.ghiThreshold}
              </span>
            </div>
            <Slider
              value={[localPolicy.eligibility.ghiThreshold]}
              onValueChange={([value]) => {
                updateEligibility({ ghiThreshold: value });
              }}
              min={0}
              max={100}
              step={1}
              data-testid="slider-ghi-threshold"
            />
            <p className="text-sm text-muted-foreground">
              Minimum community health index required for lending activation
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Min-Cut Threshold</Label>
              <span className="text-xl font-bold" data-testid="text-mincut-threshold">
                {localPolicy.eligibility.minCutThreshold}
              </span>
            </div>
            <Slider
              value={[localPolicy.eligibility.minCutThreshold]}
              onValueChange={([value]) => {
                updateEligibility({ minCutThreshold: value });
              }}
              min={1}
              max={5}
              step={1}
              data-testid="slider-mincut-threshold"
            />
            <p className="text-sm text-muted-foreground">
              Minimum Sybil-resistance score (vertex-disjoint paths) required for borrowers
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Users must meet both GHI and min-cut thresholds to be eligible for loans
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Action */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          size="lg"
          disabled={savePolicyMutation.isPending}
          data-testid="button-save-policy-bottom"
        >
          <Save className="h-5 w-5 mr-2" />
          {savePolicyMutation.isPending ? "Saving Policy..." : "Save Lending Policy"}
        </Button>
      </div>
    </div>
  );
}
