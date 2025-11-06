import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Key, Code, BookOpen, AlertCircle, CheckCircle2, Wallet, Shield } from "lucide-react";
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
  
  const exampleCommunityId = community?.id || 1;
  const exampleApiKey = community?.apiKey || 'mxf_live_xxxxxxxxxxxxxxxxxxxxxxxx';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-api-docs-title">
          API Documentation
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          MaxFlow provides verifiable graph signals computed from endorsement graphs using max-flow/min-cut algorithms. 
          How you interpret these signals is up to your application: access control, credit scoring, governance weight, 
          grant allocation, or any other use case requiring Sybil-resistant reputation.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Choose Your Integration</CardTitle>
          <CardDescription>
            MaxFlow offers two API systems depending on your use case
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Direct API (Wallet-Based)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Best for dApps and wallet integrations. Uses EIP-712 signatures for authentication.
            </p>
            <ul className="text-sm space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Get LocalHealth scores (no auth)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Create vouches with signatures</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>No API keys needed</span>
              </li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Community API (Server-Side)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Best for backend services and third-party integrations. Uses API keys.
            </p>
            <ul className="text-sm space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Check user eligibility</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Get community metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Requires community ownership</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="direct" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" data-testid="tab-direct-api">
            <Wallet className="w-4 h-4 mr-2" />
            Direct API
          </TabsTrigger>
          <TabsTrigger value="community" data-testid="tab-community-api">
            <Key className="w-4 h-4 mr-2" />
            Community API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Direct API Overview</CardTitle>
              <CardDescription>
                No API keys needed. Perfect for wallet-based applications and dApps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <code className="block px-4 py-2 bg-accent/50 rounded text-sm font-mono">
                  {baseUrl}/api
                </code>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Read operations</strong> (getting scores): No authentication required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Write operations</strong> (creating vouches): Requires EIP-712 wallet signatures
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">CORS</h3>
                <p className="text-sm text-muted-foreground">
                  CORS is enabled for all origins. External applications can call MaxFlow API endpoints directly from the browser without CORS errors.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Simplest Integration: LocalHealth Scores</h3>
                  <p className="text-sm text-muted-foreground">
                    Getting LocalHealth scores requires zero authentication—just make a GET request to any wallet address. 
                    Perfect for quickly integrating Sybil-resistant reputation into your app. Most dApps start here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Get LocalHealth Score
              </CardTitle>
              <CardDescription>
                Get network quality score (0-100) for any wallet address. Pure graph-based signal derived from endorsement network structure only—no economic factors. No authentication required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                  <code className="text-sm font-mono">/api/ego/:address/score</code>
                </div>

                <Tabs defaultValue="curl" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="js">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`curl ${baseUrl}/api/ego/0x216844eF94D95279c6d1631875F2dd93FbBdfB61/score`}
                    </pre>
                  </TabsContent>
                  <TabsContent value="js">
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`async function getLocalHealth(address) {
  const response = await fetch(
    '${baseUrl}/api/ego/' + address + '/score'
  );
  const data = await response.json();
  return data.localHealth; // 0-100
}

// Usage
const score = await getLocalHealth('0x216844eF...');
console.log(\`LocalHealth Score: \${score}/100\`);`}
                    </pre>
                  </TabsContent>
                  <TabsContent value="python">
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`import requests

response = requests.get(
    '${baseUrl}/api/ego/0x216844eF94D95279c6d1631875F2dd93FbBdfB61/score'
)
data = response.json()
print(f"LocalHealth Score: {data['localHealth']}/100")`}
                    </pre>
                  </TabsContent>
                </Tabs>

                <h4 className="font-semibold text-sm mb-2 mt-4">Response</h4>
                <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "ownerAddress": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
  "localHealth": 75.72,
  "seedAddresses": [],
  "metrics": {
    "totalNodes": 8,
    "acceptedUsers": 5,
    "avgResidualFlow": 0.123,
    "medianMinCut": 2.5,
    "maxPossibleFlow": 1.0
  },
  "nodeDetails": [
    {
      "address": "0x742d35cc...",
      "distance": 1,
      "capacity": 1.0,
      "flow": 0.25,
      "residualFlow": 0.123,
      "minCut": 0.5
    }
  ]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Create Global Vouch
              </CardTitle>
              <CardDescription>
                Submit a vouch using EIP-712 wallet signature. Works across all communities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">POST</Badge>
                  <code className="text-sm font-mono">/api/vouch</code>
                </div>

                <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "endorsement": {
    "endorser": "0x742d35Cc...",
    "endorsee": "0x1234567...",
    "epoch": "1",
    "nonce": "1",
    "sig": "0xabcd...",
    "chainId": 42220,
    "note": "Optional message"
  }
}`}
                </pre>

                <h4 className="font-semibold text-sm mb-2 mt-4">Complete Example (ethers.js v6)</h4>
                <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`import { BrowserProvider } from 'ethers';

async function createVouch(endorseeAddress) {
  // 1. Connect wallet
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const endorserAddress = await signer.getAddress();
  
  // 2. Get current epoch and nonce
  const epochRes = await fetch('${baseUrl}/api/epoch/current');
  const { epochId } = await epochRes.json();
  
  const nonceRes = await fetch(
    \`${baseUrl}/api/nonce/\${endorserAddress}/\${epochId}\`
  );
  const { nextNonce } = await nonceRes.json();
  
  // 3. Prepare EIP-712 message
  const domain = {
    name: 'MaxFlow',
    version: '1',
    chainId: 42220,
  };
  
  const types = {
    Endorsement: [
      { name: 'endorser', type: 'address' },
      { name: 'endorsee', type: 'address' },
      { name: 'epoch', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
    ],
  };
  
  const message = {
    endorser: endorserAddress,
    endorsee: endorseeAddress,
    epoch: BigInt(epochId),
    nonce: BigInt(nextNonce),
  };
  
  // 4. Sign
  const signature = await signer.signTypedData(domain, types, message);
  
  // 5. Submit vouch
  const response = await fetch('${baseUrl}/api/vouch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endorsement: {
        endorser: message.endorser,
        endorsee: message.endorsee,
        epoch: message.epoch.toString(),
        nonce: message.nonce.toString(),
        sig: signature,
        chainId: 42220,
      },
    }),
  });
  
  return await response.json();
}`}
                </pre>

                <h4 className="font-semibold text-sm mb-2 mt-4">Success Response</h4>
                <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "success": true,
  "endorsement": {
    "id": 123,
    "communityId": 0,
    "scope": "global",
    "endorser": "0x742d35Cc...",
    "endorsee": "0x1234567...",
    "leafHash": "0xdef...",
    "createdAt": "2025-11-04T21:00:00.000Z"
  },
  "message": "Global vouch created successfully"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Helper Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Get Current Epoch</h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                  <code className="text-sm font-mono">/api/epoch/current</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Returns the current active epoch ID needed for vouching
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Get Next Nonce</h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">GET</Badge>
                  <code className="text-sm font-mono">/api/nonce/:address/:epoch</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Returns the next nonce for signing. Required to prevent replay attacks.
                </p>
              </div>
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
                <h4 className="font-semibold text-sm mb-2">Caching LocalHealth Scores</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Scores update on-the-fly but change infrequently. Cache for 5-10 minutes:
                </p>
                <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`const scoreCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedScore(address) {
  const cached = scoreCache.get(address);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.score;
  }
  const score = await getLocalHealth(address);
  scoreCache.set(address, { score, time: Date.now() });
  return score;
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Handle Nonce Conflicts</h4>
                <p className="text-sm text-muted-foreground">
                  If you get "Invalid nonce" errors, fetch a fresh nonce and retry once
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Validate Addresses</h4>
                <p className="text-sm text-muted-foreground">
                  Always validate Ethereum address format before making API calls
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
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

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Start with the Scores Endpoint</h3>
                  <p className="text-sm text-muted-foreground">
                    Most integrations only need the <code className="px-1 py-0.5 bg-accent/50 rounded">scores.min</code> endpoint, 
                    which returns both community scores (STS) and personal network scores (LocalHealth) in a single call. 
                    It's a simple GET request—no complex authentication required beyond your API key.
                  </p>
                </div>
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
                      Quick check if a user is accepted in the network graph. Perfect for access control.
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
                      Get detailed network quality metrics for a user including community score (STS), personal network score (LocalHealth), min-cut, and acceptance status.
                    </p>

                    <h4 className="font-semibold text-sm mb-2">Example Response</h4>
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "accepted": true,
  "score": 72.5,
  "local_health": 68,
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
                      Submit a vouch using EIP-712 signature. Server automatically manages nonce incrementation.
                    </p>

                    <h4 className="font-semibold text-sm mb-2">Request Body</h4>
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "endorser": "0x742d35Cc...",
  "endorsee": "0x1234567...",
  "sig": "0xabcd...",
  "chainId": 42220
}`}
                    </pre>

                    <h4 className="font-semibold text-sm mb-2 mt-4">Example Request (JavaScript)</h4>
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`import { BrowserProvider } from 'ethers';

async function submitVouch(endorseeAddress) {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const endorserAddress = await signer.getAddress();
  
  // Get current epoch
  const epochRes = await fetch('${baseUrl}/api/epoch/current');
  const { epochId } = await epochRes.json();
  
  // Get next nonce (server-side)
  const nonceRes = await fetch(
    \`${baseUrl}/api/nonce/\${endorserAddress}/\${epochId}\`
  );
  const { nextNonce } = await nonceRes.json();
  
  // Prepare EIP-712 message
  const domain = {
    name: 'MaxFlow',
    version: '1',
    chainId: 42220,
  };
  
  const types = {
    Endorsement: [
      { name: 'endorser', type: 'address' },
      { name: 'endorsee', type: 'address' },
      { name: 'epoch', type: 'uint64' },
      { name: 'nonce', type: 'uint64' },
    ],
  };
  
  const message = {
    endorser: endorserAddress,
    endorsee: endorseeAddress,
    epoch: BigInt(epochId),
    nonce: BigInt(nextNonce),
  };
  
  // Sign
  const signature = await signer.signTypedData(domain, types, message);
  
  // Submit via Community API
  const response = await fetch(
    '${baseUrl}/api/v1/communities/${exampleCommunityId}/vouch.min',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Community-Key': '${exampleApiKey}'
      },
      body: JSON.stringify({
        endorser: message.endorser,
        endorsee: message.endorsee,
        sig: signature,
        chainId: 42220,
      }),
    }
  );
  
  return await response.json();
}`}
                    </pre>

                    <h4 className="font-semibold text-sm mb-2 mt-4">Success Response (HTTP 202)</h4>
                    <pre className="px-4 py-3 bg-accent/50 rounded text-xs font-mono overflow-x-auto">
{`{
  "ok": true
}`}
                    </pre>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> The Community API vouch endpoint automatically increments nonces server-side. 
                        You still need to fetch the next nonce for signature creation, but the server handles validation.
                      </p>
                    </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
