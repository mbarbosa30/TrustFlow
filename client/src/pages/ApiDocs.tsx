import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Key, Code, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";

interface Community {
  id: number;
  name: string;
  slug: string;
  apiKey: string;
  creatorAddress: string;
}

export default function ApiDocs() {
  const { toast } = useToast();
  const { address } = useAccount();
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(null);

  const { data: communitiesData } = useQuery<{ communities: Community[] }>({
    queryKey: ['/api/communities'],
  });

  const communities = communitiesData?.communities || [];
  const ownedCommunities = communities.filter(
    c => c.creatorAddress?.toLowerCase() === address?.toLowerCase()
  );

  const community = selectedCommunity 
    ? ownedCommunities.find(c => c.id === selectedCommunity)
    : ownedCommunities[0];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Use example values if no community is selected
  const exampleCommunityId = community?.id || 1;
  const exampleApiKey = community?.apiKey || 'mxf_live_xxxxxxxxxxxxxxxxxxxxxxxx';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-api-docs-title">
          API Documentation
        </h1>
        <p className="text-muted-foreground">
          Integrate MaxFlow trust scoring into your application with our REST API
        </p>
      </div>

      <div className="space-y-6">
        {address && ownedCommunities.length > 0 && (
          <>
            {ownedCommunities.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ownedCommunities.map(c => (
                      <Button
                        key={c.id}
                        variant={community?.id === c.id ? "default" : "outline"}
                        onClick={() => setSelectedCommunity(c.id)}
                        data-testid={`button-select-community-${c.id}`}
                      >
                        {c.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-api-key">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Your API Key
                </CardTitle>
                <CardDescription>
                  Use this key to authenticate API requests for {community!.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 bg-accent/50 rounded-lg text-sm font-mono break-all" data-testid="text-api-key">
                      {community!.apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(community!.apiKey, "API key")}
                      data-testid="button-copy-api-key"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Keep your API key secure</p>
                    <p className="text-muted-foreground mt-1">
                      Never commit keys to version control or expose them in client-side code. 
                      Use environment variables and keep keys server-side only.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!address && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Get Your API Key</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Create a community to receive an API key for integration. Connect your wallet to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {address && ownedCommunities.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Create a Community</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  API keys are provided to community creators. Create your first community to get started with the API.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-quick-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="block px-4 py-2 bg-accent/50 rounded text-sm font-mono">
                {baseUrl}/api/v1
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the <code className="px-1 py-0.5 bg-accent/50 rounded">X-Community-Key</code> header:
              </p>
              <pre className="px-4 py-3 bg-accent/50 rounded text-sm font-mono overflow-x-auto">
{`curl -H "X-Community-Key: ${exampleApiKey}" \\
  ${baseUrl}/api/v1/communities/${exampleCommunityId}/metrics.min`}
              </pre>
            </div>
                  <div>
                    <h3 className="font-semibold mb-2">Rate Limits</h3>
                    <p className="text-sm text-muted-foreground">
                      100 requests per minute per API key. Rate limit headers included in responses:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li><code className="px-1 py-0.5 bg-accent/50 rounded">X-RateLimit-Limit</code>: Maximum requests per window</li>
                      <li><code className="px-1 py-0.5 bg-accent/50 rounded">X-RateLimit-Remaining</code>: Requests remaining</li>
                      <li><code className="px-1 py-0.5 bg-accent/50 rounded">X-RateLimit-Reset</code>: Time when limit resets</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-endpoints">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="eligibility" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                      <TabsTrigger value="scores">Scores</TabsTrigger>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                      <TabsTrigger value="vouch">Vouch</TabsTrigger>
                    </TabsList>

                    <TabsContent value="eligibility" className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                          <code className="text-sm font-mono">/communities/:id/eligibility.min/:address</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Quick check if a user is accepted in the trust network. Perfect for access control.
                        </p>

                        <h4 className="font-semibold text-sm mb-2">Example Request</h4>
                        <Tabs defaultValue="curl" className="w-full">
                          <TabsList>
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="js">JavaScript</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                          </TabsList>
                          <TabsContent value="curl">
                            <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`curl -H "X-Community-Key: ${exampleApiKey}" \\
  ${baseUrl}/api/v1/communities/${exampleCommunityId}/eligibility.min/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`}
                            </pre>
                          </TabsContent>
                          <TabsContent value="js">
                            <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`const response = await fetch(
  '${baseUrl}/api/v1/communities/${exampleCommunityId}/eligibility.min/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  {
    headers: {
      'X-Community-Key': '${exampleApiKey}'
    }
  }
);
const data = await response.json();
console.log(data.accepted); // true or false`}
                            </pre>
                          </TabsContent>
                          <TabsContent value="python">
                            <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`import requests

response = requests.get(
    '${baseUrl}/api/v1/communities/${exampleCommunityId}/eligibility.min/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    headers={'X-Community-Key': '${exampleApiKey}'}
)
data = response.json()
print(data['accepted'])  # True or False`}
                            </pre>
                          </TabsContent>
                        </Tabs>

                        <h4 className="font-semibold text-sm mb-2 mt-4">Response</h4>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "accepted": true
}`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="scores" className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                          <code className="text-sm font-mono">/communities/:id/scores.min/:address</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get detailed trust metrics for a user including score, min-cut, and acceptance status.
                        </p>

                        <h4 className="font-semibold text-sm mb-2">Response Fields</h4>
                        <ul className="text-sm space-y-2 mb-4">
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">accepted</code>: Boolean - whether user meets acceptance criteria</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">score</code>: Number - standardized trust score (0-100)</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">min_cut</code>: Number - minimum vertex-disjoint paths from seeds</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">vertex_disjoint</code>: Number - redundant trust paths</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">seed_coverage_ok</code>: Boolean - meets seed diversity requirement</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">why</code>: String - human-readable explanation</li>
                        </ul>

                        <h4 className="font-semibold text-sm mb-2">Example Response</h4>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "accepted": true,
  "score": 72.5,
  "min_cut": 3,
  "vertex_disjoint": 3,
  "seed_coverage_ok": true,
  "why": "3 rutas independientes; ≥2 semillas con ≥0.30 cada una",
  "updated_at": "2025-10-31T00:15:23.456Z"
}`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="metrics" className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                          <code className="text-sm font-mono">/communities/:id/metrics.min</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Get aggregate community health metrics and seed information.
                        </p>

                        <h4 className="font-semibold text-sm mb-2">Example Response</h4>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "accepted_users": 156,
  "min_cut_ge2_share": 0.94,
  "disjoint_ge2_share": 0.94,
  "seeds": [
    {
      "addr": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "coverage": 0.30
    }
  ]
}`}
                        </pre>
                      </div>
                    </TabsContent>

                    <TabsContent value="vouch" className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">POST</Badge>
                          <code className="text-sm font-mono">/communities/:id/vouch.min</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Submit a cryptographically signed vouch. Requires EIP-712 signature from the endorser's wallet.
                        </p>

                        <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "endorser": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "endorsee": "0x1234567890123456789012345678901234567890",
  "sig": "0x...",
  "ts": 1698765432000,
  "chainId": 42220
}`}
                        </pre>

                        <h4 className="font-semibold text-sm mb-2 mt-4">EIP-712 Signature Guide</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          Use the following domain and message structure:
                        </p>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`// EIP-712 Domain
const domain = {
  name: 'MaxFlow',
  version: '1',
  chainId: 42220, // or your target chain
};

// Get current epoch and nonce from your backend
const epoch = await getCurrentEpoch(communityId);
const nonce = await getNextNonce(endorserAddress, epoch);

// Message to sign
const message = {
  endorser: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  endorsee: '0x1234567890123456789012345678901234567890',
  epoch: BigInt(epoch),
  nonce: BigInt(nonce),
  timestamp: BigInt(Date.now())
};

// Types
const types = {
  Endorsement: [
    { name: 'endorser', type: 'address' },
    { name: 'endorsee', type: 'address' },
    { name: 'epoch', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
};

// Sign with wagmi/viem
import { signTypedData } from '@wagmi/core';
const signature = await signTypedData({
  domain,
  types,
  primaryType: 'Endorsement',
  message
});`}
                        </pre>

                        <h4 className="font-semibold text-sm mb-2 mt-4">Success Response</h4>
                        <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "ok": true
}`}
                        </pre>

                        <h4 className="font-semibold text-sm mb-2 mt-4">Error Codes</h4>
                        <ul className="text-sm space-y-1">
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">MISSING_FIELDS</code>: Required fields missing</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">INVALID_FIELDS</code>: Field validation failed</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">INVALID_NONCE</code>: Nonce not sequential</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">BAD_SIGNATURE</code>: Signature verification failed</li>
                          <li><code className="px-1 py-0.5 bg-accent/50 rounded">NO_ACTIVE_EPOCH</code>: No active scoring epoch</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Security</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Store API keys in environment variables, never in code</li>
                      <li>Make API calls from your backend, not client-side JavaScript</li>
                      <li>Use HTTPS for all requests</li>
                      <li>Validate signatures server-side before submitting vouches</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Performance</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Cache eligibility results when appropriate (scores update per epoch)</li>
                      <li>Use eligibility endpoint for simple checks, scores endpoint for detailed data</li>
                      <li>Respect rate limits and implement exponential backoff on errors</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Integration Patterns</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>Access Control:</strong> Use eligibility endpoint to gate features</li>
                      <li><strong>Risk Scoring:</strong> Use detailed scores for lending/credit decisions</li>
                      <li><strong>Community Building:</strong> Submit vouches when users connect accounts</li>
                      <li><strong>Analytics:</strong> Track metrics endpoint to monitor community health</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
      </div>
    </div>
  );
}
