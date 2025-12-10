export default function ApiDocs() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://maxflow.example.com';

  return (
    <article className="max-w-4xl mx-auto px-4 py-12 prose prose-slate dark:prose-invert">
      <h1 data-testid="text-api-docs-title">MaxFlow API Documentation</h1>
      
      <p>
        MaxFlow provides verifiable graph signals computed from endorsement graphs using max-flow/min-cut algorithms. 
        The API returns network quality scores that applications can interpret for access control, credit scoring, 
        governance weight, or other Sybil-resistant reputation use cases.
      </p>

      <section>
        <h2>Overview</h2>
        
        <h3>Base URL</h3>
        <pre><code>{baseUrl}/api/v1</code></pre>
        
        <h3>Authentication</h3>
        <ul>
          <li><strong>Read operations</strong> (scores, vouch status): No authentication required</li>
          <li><strong>Write operations</strong> (vouching, revoking): Requires EIP-712 wallet signatures</li>
        </ul>
        
        <h3>Rate Limits</h3>
        <p>200 requests per minute per IP address</p>
        
        <h3>CORS</h3>
        <p>CORS is enabled for all origins. External applications can call the API directly from the browser.</p>
      </section>

      <section>
        <h2>Endpoints</h2>

        <h3>GET /api/v1/score/:address</h3>
        <p>Get network quality score (0-100) for any wallet address. No authentication required.</p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>force_refresh</strong> (optional): Set to <code>true</code> to bypass cache and recompute the score. Default is <code>false</code>.</li>
        </ul>
        
        <h4>Example Requests</h4>
        <pre><code>{`# Get cached score (default)
curl ${baseUrl}/api/v1/score/0x216844eF94D95279c6d1631875F2dd93FbBdfB61

# Force fresh computation
curl ${baseUrl}/api/v1/score/0x216844eF94D95279c6d1631875F2dd93FbBdfB61?force_refresh=true`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "address": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
  "local_health": 72,
  "cached": true,
  "cached_at": "2025-01-15T12:30:45.123Z",
  "vouch_counts": {
    "incoming_total": 8,
    "incoming_active": 7,
    "outgoing_total": 5,
    "unique_vouchers": 7
  },
  "activity": {
    "last_vouch_given_at": "2025-01-10T08:15:00.000Z"
  },
  "algorithm_breakdown": {
    "flow_component": 45.5,
    "redundancy_component": 26.5,
    "direct_flow": 7.0,
    "actual_min_cut": 5.0,
    "effective_redundancy": 12.4,
    "dilution_factor": 1.0,
    "vertex_disjoint_paths": 4,
    "ego_network_size": 15,
    "edge_density": 0.12,
    "baselines": {
      "healthy_vouch_count": 8.0,
      "healthy_redundancy": 36.0
    }
  }
}`}</code></pre>

        <h4>Response Fields</h4>
        <ul>
          <li><strong>address</strong>: Normalized wallet address (lowercase)</li>
          <li><strong>local_health</strong>: Signal score 0-100 (higher = more trusted). This is the authoritative trust signal computed by the max-flow algorithm.</li>
          <li><strong>cached</strong>: Whether the score was retrieved from cache (true) or freshly computed (false)</li>
          <li><strong>cached_at</strong>: Timestamp when the score was last computed (null if freshly calculated)</li>
          <li><strong>vouch_counts.incoming_total</strong>: Total vouches ever received (exact count)</li>
          <li><strong>vouch_counts.incoming_active</strong>: Non-expired/non-revoked vouches (from last 1,000 evaluated)</li>
          <li><strong>vouch_counts.outgoing_total</strong>: Total vouches ever given (exact count)</li>
          <li><strong>vouch_counts.unique_vouchers</strong>: Distinct active endorsers (from last 1,000 evaluated)</li>
          <li><strong>activity.last_vouch_given_at</strong>: When this user last vouched for someone (null if never). Used for vouch expiration calculation.</li>
        </ul>

        <h4>Algorithm Breakdown Fields</h4>
        <ul>
          <li><strong>flow_component</strong>: Points from incoming trust (0-60). Based on weighted sum of voucher strengths normalized by healthy baseline.</li>
          <li><strong>redundancy_component</strong>: Points from true min-cut (0-40). The min-cut component measures Sybil resistance via Dinic's algorithm. (Field name retained for API compatibility.)</li>
          <li><strong>direct_flow</strong>: Raw max-flow value from vouchers to target. Each voucher contributes capacity weighted by their own score.</li>
          <li><strong>actual_min_cut</strong>: True min-cut computed via Dinic's algorithm. Measures the minimum edges to disconnect trust sources—core Sybil resistance metric.</li>
          <li><strong>effective_redundancy</strong>: Combined redundancy metric = actual_min_cut + depth bonus + vertex-disjoint path bonus.</li>
          <li><strong>dilution_factor</strong>: Penalty multiplier (0.4-1.0) applied for excessive outgoing vouches. 1.0 = no penalty.</li>
          <li><strong>vertex_disjoint_paths</strong>: Count of truly independent trust paths (no shared intermediate nodes).</li>
          <li><strong>ego_network_size</strong>: Number of nodes in the user's extended ego subgraph (within 3 hops).</li>
          <li><strong>edge_density</strong>: Ratio of actual edges to potential edges in the ego subgraph. Higher = more interconnected network.</li>
          <li><strong>baselines.healthy_vouch_count</strong>: Network 75th percentile vouch count (clamped 4-15). Scores scale relative to this.</li>
          <li><strong>baselines.healthy_redundancy</strong>: Derived redundancy baseline (healthy_vouch_count × 4.5). Used for redundancy normalization.</li>
        </ul>

        <h4>Ego Context (Scoring Model)</h4>
        <p>
          The ego context represents a wallet's personal trust network state. Each wallet has an isolated scoring context 
          that tracks their position in the trust graph. The <code>local_health</code> score (displayed as "Signal" in the UI) 
          measures how much the network trusts this wallet, computed using:
        </p>
        <ul>
          <li><strong>Flow Component (60%)</strong>: Iterative PageRank-style algorithm where vouches are weighted by the voucher's own score (up to 10 iterations)</li>
          <li><strong>Min-Cut Component (40%)</strong>: True min-cut computed via Dinic's algorithm, plus depth bonus and vertex-disjoint path bonus for Sybil resistance</li>
          <li><strong>Dilution Penalty</strong>: Excessive outgoing vouches reduce the weight of each vouch given, ensuring accountability</li>
          <li><strong>Adaptive Baseline</strong>: Network-wide 75th percentile vouch count (clamped 4-15) sets healthy participation thresholds</li>
        </ul>
        <p>
          Scores are cached for 5 minutes and recalculated when a wallet gives or receives a vouch. The <code>cached</code> field indicates 
          if the returned score is from cache; <code>cached_at</code> shows when it was last computed.
          Use <code>force_refresh=true</code> or the POST refresh endpoint to bypass the cache.
        </p>
      </section>

      <section>
        <h3>GET /api/v1/scores/cached</h3>
        <p>
          <strong>Bulk cached scores endpoint.</strong> Retrieve all pre-computed LocalHealth scores from the database in a single request. 
          This is the fastest way to get scores for multiple users - ideal for applications that need to display many scores at once.
        </p>
        
        <h4>Performance</h4>
        <p>
          This endpoint returns cached scores computed during the 6-hour network-wide recalculation cycle. 
          <strong>No computation occurs on request</strong> - it's a simple database query, typically completing in under 100ms for 500+ users.
        </p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>min_score</strong> (optional): Minimum LocalHealth score to include (default: 0)</li>
          <li><strong>limit</strong> (optional): Maximum number of scores to return (default: 10000, max: 10000)</li>
        </ul>
        
        <h4>Example Requests</h4>
        <pre><code>{`# Get all cached scores
curl ${baseUrl}/api/v1/scores/cached

# Get only scores >= 65 (likely human threshold)
curl "${baseUrl}/api/v1/scores/cached?min_score=65"

# Get top 100 scores
curl "${baseUrl}/api/v1/scores/cached?limit=100"`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "count": 412,
  "min_score_filter": 0,
  "scores": [
    {
      "address": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
      "local_health": 72,
      "last_updated": "2025-01-15T06:00:00.000Z"
    },
    {
      "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb2",
      "local_health": 85,
      "last_updated": "2025-01-15T06:00:00.000Z"
    }
  ],
  "scheduler": {
    "last_run": "2025-01-15T06:00:00.000Z",
    "next_run": "2025-01-15T12:00:00.000Z",
    "interval_hours": 6
  },
  "note": "Scores are cached from the last network-wide computation. Use GET /api/v1/score/:address/details for on-demand detailed metrics."
}`}</code></pre>

        <h4>Response Fields</h4>
        <ul>
          <li><strong>count</strong>: Total number of scores returned</li>
          <li><strong>min_score_filter</strong>: The min_score filter applied (0 if not specified)</li>
          <li><strong>scores</strong>: Array of cached score objects</li>
          <li><strong>scores[].address</strong>: Wallet address (lowercase)</li>
          <li><strong>scores[].local_health</strong>: Cached LocalHealth score (0-100)</li>
          <li><strong>scores[].last_updated</strong>: When this score was last computed</li>
          <li><strong>scheduler</strong>: Information about the 6-hour recalculation scheduler</li>
          <li><strong>scheduler.last_run</strong>: When the last network-wide recalculation completed</li>
          <li><strong>scheduler.next_run</strong>: When the next recalculation is scheduled</li>
          <li><strong>scheduler.interval_hours</strong>: How often recalculation runs (6 hours)</li>
        </ul>

        <h4>When to Use This Endpoint</h4>
        <ul>
          <li><strong>Displaying leaderboards or score lists</strong> - Fast retrieval of many scores</li>
          <li><strong>Batch verification</strong> - Check scores for multiple users at once</li>
          <li><strong>Analytics dashboards</strong> - Get aggregate score data quickly</li>
          <li><strong>Periodic syncing</strong> - Keep your app's cache updated every few hours</li>
        </ul>
        <p>
          For detailed algorithm breakdown on a single user, use <code>GET /api/v1/score/:address/details</code> instead.
        </p>
      </section>

      <section>
        <h3>GET /api/v1/score/:address/details</h3>
        <p>
          <strong>Single-user detailed metrics endpoint.</strong> Get comprehensive algorithm breakdown and confidence tier 
          for one wallet address. Computes the algorithm breakdown on-demand for the most detailed analysis.
        </p>
        
        <h4>Performance</h4>
        <p>
          This endpoint computes the algorithm breakdown on-demand by running the iterative scoring algorithm. 
          Response time is typically 1-5 seconds depending on network size. Use sparingly for individual user analysis.
        </p>
        
        <h4>Example Request</h4>
        <pre><code>{`curl ${baseUrl}/api/v1/score/0x216844eF94D95279c6d1631875F2dd93FbBdfB61/details`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "address": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
  "local_health": 72,
  "cached_at": "2025-01-15T06:00:00.000Z",
  
  "confidence": {
    "tier": "likely_human",
    "description": "Likely human - organic redundancy detected, passes Sybil resistance checks",
    "thresholds": {
      "high_confidence": "≥75",
      "likely_human": "≥65",
      "uncertain": "50-64",
      "low_confidence": "<50"
    }
  },
  
  "vouch_counts": {
    "incoming_total": 8,
    "incoming_active": 7,
    "outgoing_total": 5,
    "unique_vouchers": 7
  },
  
  "activity": {
    "last_vouch_given_at": "2025-01-10T08:15:00.000Z"
  },
  
  "algorithm_breakdown": {
    "flow_component": 45.5,
    "redundancy_component": 26.5,
    "direct_flow": 7.0,
    "actual_min_cut": 5.0,
    "effective_redundancy": 12.4,
    "dilution_factor": 1.0,
    "vertex_disjoint_paths": 4,
    "ego_network_size": 15,
    "edge_density": 0.12,
    "baselines": {
      "healthy_vouch_count": 8.0,
      "healthy_redundancy": 36.0
    }
  },
  
  "note": "Algorithm breakdown is computed on-demand from the current network state."
}`}</code></pre>

        <h4>Confidence Tiers</h4>
        <p>The confidence tier indicates how likely the wallet belongs to a real human based on validated attack pattern analysis:</p>
        <ul>
          <li><strong>high_confidence (≥75)</strong>: Almost certainly human - strong organic network with redundant trust paths. All legitimate network patterns score here.</li>
          <li><strong>likely_human (≥65)</strong>: Likely human - organic redundancy detected, passes Sybil resistance checks. Safe for most access control.</li>
          <li><strong>uncertain (50-64)</strong>: Uncertain - could be a newcomer legitimately building their network OR a potential attack pattern. Consider additional verification.</li>
          <li><strong>low_confidence (&lt;50)</strong>: Low confidence - matches common attack patterns (sockpuppet farms, flash mobs, Sybil rings) or very new user with minimal network.</li>
        </ul>
        <p>
          These thresholds are derived from 51 validated test scenarios covering hub-spoke patterns, mesh networks, 
          Sybil rings, sockpuppet farms, flash mob attacks, and more. All known attack patterns score below 55.
        </p>

        <h4>When to Use This Endpoint</h4>
        <ul>
          <li><strong>User profile pages</strong> - Show detailed score breakdown to users</li>
          <li><strong>Access control decisions</strong> - Check confidence tier before granting privileges</li>
          <li><strong>Debugging score issues</strong> - Understand why a user has a particular score</li>
          <li><strong>Fraud investigation</strong> - Analyze algorithm components for suspicious patterns</li>
        </ul>
      </section>

      <section>
        <h3>POST /api/v1/score/:address/refresh</h3>
        <p>Force a fresh score recalculation for a wallet. Useful when you need the most up-to-date score immediately after a vouch action.</p>
        
        <h4>Rate Limiting</h4>
        <p><strong>3 requests per minute per IP.</strong> Score recalculation is computationally expensive (runs max-flow algorithm iteratively across the network). Use sparingly - the GET endpoint with caching is preferred for most use cases. Scores are automatically refreshed when vouches are created or revoked.</p>
        
        <h4>Example Request</h4>
        <pre><code>{`curl -X POST ${baseUrl}/api/v1/score/0x216844eF94D95279c6d1631875F2dd93FbBdfB61/refresh`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "address": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
  "local_health": 72,
  "cached": false,
  "cached_at": "2025-01-15T12:30:45.123Z",
  "vouch_counts": { ... },
  "activity": { ... },
  "algorithm_breakdown": { ... },
  "refreshed": true,
  "refreshed_at": "2025-01-15T12:30:45.123Z"
}`}</code></pre>
        <p>Returns the same fields as GET /api/v1/score/:address plus <code>refreshed: true</code> and <code>refreshed_at</code> timestamp.</p>
      </section>

      <section>
        <h3>GET /api/v1/vouch/nonce/:address</h3>
        <p>Get the current epoch and next nonce for creating a vouch signature.</p>
        
        <h4>Response</h4>
        <pre><code>{`{
  "epoch": 0,
  "nonce": 1
}`}</code></pre>
      </section>

      <section>
        <h3>POST /api/v1/vouch</h3>
        <p>Submit a vouch using EIP-712 wallet signature.</p>
        
        <h4>Request Body</h4>
        <pre><code>{`{
  "endorser": "0x742d35Cc...",
  "endorsee": "0x1234567...",
  "epoch": "0",
  "nonce": "1",
  "sig": "0xabcd...",
  "chainId": 1
}`}</code></pre>

        <h4>EIP-712 Message Types</h4>
        <pre><code>{`const domain = {
  name: 'MaxFlow',
  version: '1',
  chainId: 1,
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
  epoch: BigInt(epoch),
  nonce: BigInt(nonce),
};`}</code></pre>

        <h4>Success Response</h4>
        <pre><code>{`{ "ok": true }`}</code></pre>

        <h4>Error Responses</h4>
        <pre><code>{`// Invalid nonce (stale - refetch nonce and retry)
{ "error": "Invalid nonce - expected 2, got 1..." }

// Duplicate vouch
{ "error": "Vouch already exists for this endorser->endorsee pair" }

// Invalid signature
{ "error": "Invalid signature - signature must be from endorser wallet" }

// Race condition (409 status)
{ "error": "Nonce already used - please get a new nonce" }`}</code></pre>
      </section>

      <section>
        <h3>GET /api/v1/vouch-status</h3>
        <p>Check if a vouch exists and its current status.</p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>endorser</strong>: Endorser wallet address</li>
          <li><strong>endorsee</strong>: Endorsee wallet address</li>
        </ul>
        
        <h4>Response Examples</h4>
        <pre><code>{`// Active vouch
{
  "exists": true,
  "status": "active",
  "days_remaining": 67,
  "created_at": "2025-11-15T12:00:00.000Z"
}

// Expiring soon (< 30 days remaining)
{
  "exists": true,
  "status": "expiring_soon",
  "days_remaining": 12,
  "created_at": "2025-09-15T12:00:00.000Z"
}

// Expired
{
  "exists": true,
  "status": "expired",
  "days_remaining": 0,
  "created_at": "2025-06-15T12:00:00.000Z"
}

// Revoked
{
  "exists": true,
  "status": "revoked",
  "days_remaining": null,
  "created_at": "2025-11-15T12:00:00.000Z"
}

// No vouch exists
{
  "exists": false,
  "status": null,
  "days_remaining": null
}`}</code></pre>

        <p>Vouches are valid for 90 days from creation OR as long as the recipient remains active (vouches someone within 90 days).</p>
      </section>

      <section>
        <h3>GET /api/v1/revoke/info</h3>
        <p>Get endorsement ID needed for revocation.</p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>endorser</strong>: Endorser wallet address</li>
          <li><strong>endorsee</strong>: Endorsee wallet address</li>
        </ul>
        
        <h4>Response</h4>
        <pre><code>{`{
  "exists": true,
  "endorsement_id": 1234,
  "already_revoked": false
}`}</code></pre>
      </section>

      <section>
        <h3>POST /api/v1/revoke</h3>
        <p>Revoke a vouch using EIP-712 wallet signature.</p>
        
        <h4>Request Body</h4>
        <pre><code>{`{
  "endorser": "0x742d35Cc...",
  "endorsee": "0x1234567...",
  "endorsementId": 1234,
  "sig": "0xabcd...",
  "chainId": 1
}`}</code></pre>

        <h4>EIP-712 Revocation Types</h4>
        <pre><code>{`const types = {
  Revocation: [
    { name: 'endorser', type: 'address' },
    { name: 'endorsee', type: 'address' },
    { name: 'endorsementId', type: 'uint256' },
  ],
};

const message = {
  endorser: endorserAddress,
  endorsee: endorseeAddress,
  endorsementId: BigInt(endorsementId),
};`}</code></pre>

        <h4>Success Response</h4>
        <pre><code>{`{ "ok": true, "revoked": true }`}</code></pre>
      </section>

      <section>
        <h2>Additional Context Endpoints</h2>
        <p>These endpoints provide additional context about users and their endorsement history.</p>

        <h3>GET /api/endorsements</h3>
        <p>List endorsements (vouches) with optional filtering. Useful for displaying who vouched for someone.</p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>endorser</strong> (optional): Filter by endorser address</li>
          <li><strong>endorsee</strong> (optional): Filter by endorsee address</li>
          <li><strong>limit</strong> (optional): Max results to return (default: 100)</li>
          <li><strong>offset</strong> (optional): Pagination offset</li>
        </ul>
        
        <h4>Example Request</h4>
        <pre><code>{`curl "${baseUrl}/api/endorsements?endorsee=0x216844ef94d95279c6d1631875f2dd93fbbdfb61&limit=10"`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "endorsements": [
    {
      "id": 42,
      "communityId": 0,
      "scope": "global",
      "endorser": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
      "endorsee": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
      "epoch": 0,
      "nonce": 5,
      "sig": "0x...",
      "leafHash": "0x...",
      "promptHash": null,
      "note": null,
      "createdAt": "2025-10-15T14:30:00.000Z"
    }
  ],
  "count": 1
}`}</code></pre>

        <h4>Response Fields</h4>
        <ul>
          <li><strong>id</strong>: Unique endorsement identifier</li>
          <li><strong>communityId</strong>: Community ID (0 = global graph)</li>
          <li><strong>scope</strong>: Either "global" (community 0) or "community" (specific community)</li>
          <li><strong>endorser</strong>: Address that gave the vouch</li>
          <li><strong>endorsee</strong>: Address that received the vouch</li>
          <li><strong>epoch</strong>: Epoch when vouch was created</li>
          <li><strong>sig</strong>: EIP-712 signature</li>
          <li><strong>leafHash</strong>: Merkle tree leaf hash for verification</li>
          <li><strong>promptHash</strong>: Hash of community prompt (null for global vouches)</li>
          <li><strong>note</strong>: Optional note from endorser</li>
          <li><strong>createdAt</strong>: Timestamp when vouch was created</li>
        </ul>
      </section>

      <section>
        <h3>GET /api/endorsements/with-status</h3>
        <p>List endorsements with expiration status for each. Shows whether vouches are active, expiring soon, expired, or revoked.</p>
        
        <h4>Query Parameters</h4>
        <ul>
          <li><strong>endorser</strong> (optional): Filter by endorser address</li>
          <li><strong>endorsee</strong> (optional): Filter by endorsee address</li>
          <li><strong>limit</strong> (optional): Max results to return</li>
        </ul>
        
        <h4>Example Request</h4>
        <pre><code>{`curl "${baseUrl}/api/endorsements/with-status?endorsee=0x216844ef94d95279c6d1631875f2dd93fbbdfb61"`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "endorsements": [
    {
      "id": 42,
      "communityId": 0,
      "scope": "global",
      "endorser": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
      "endorsee": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
      "epoch": 0,
      "nonce": 5,
      "sig": "0x...",
      "leafHash": "0x...",
      "promptHash": null,
      "note": null,
      "createdAt": "2025-10-15T14:30:00.000Z",
      "expirationStatus": {
        "isValid": true,
        "isRevoked": false,
        "isExpired": false,
        "expiresAt": "2026-01-13T14:30:00.000Z",
        "daysUntilExpiration": 45
      }
    }
  ],
  "count": 1
}`}</code></pre>

        <h4>Expiration Status Fields</h4>
        <ul>
          <li><strong>isValid</strong>: Whether the vouch counts toward the endorsee's score</li>
          <li><strong>isRevoked</strong>: Whether the endorser manually revoked this vouch</li>
          <li><strong>isExpired</strong>: Whether the vouch has expired (90+ days old and recipient inactive)</li>
          <li><strong>expiresAt</strong>: When the vouch will expire (null if revoked)</li>
          <li><strong>daysUntilExpiration</strong>: Days remaining until expiration (null if revoked/expired)</li>
        </ul>
      </section>

      <section>
        <h3>GET /api/user/:address</h3>
        <p>Get wallet profile information (display name) for an address.</p>
        
        <h4>Example Request</h4>
        <pre><code>{`curl ${baseUrl}/api/user/0x216844ef94d95279c6d1631875f2dd93fbbdfb61`}</code></pre>
        
        <h4>Response</h4>
        <pre><code>{`{
  "address": "0x216844ef94d95279c6d1631875f2dd93fbbdfb61",
  "name": "Alice",
  "createdAt": "2025-09-01T10:00:00.000Z",
  "updatedAt": "2025-10-15T14:30:00.000Z"
}`}</code></pre>

        <h4>404 Response</h4>
        <pre><code>{`{ "error": "Profile not found" }`}</code></pre>
        <p>Returns 404 if no profile exists for the address. Profiles are created when users set a display name.</p>
      </section>

      <section>
        <h2>Endpoints Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GET</td>
              <td>/api/v1/scores/cached</td>
              <td>Bulk cached scores (fast)</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/v1/score/:address</td>
              <td>Get Signal score</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/v1/score/:address/details</td>
              <td>Detailed metrics + confidence</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/v1/vouch/nonce/:address</td>
              <td>Get epoch + nonce</td>
            </tr>
            <tr>
              <td>POST</td>
              <td>/api/v1/vouch</td>
              <td>Submit vouch</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/v1/vouch-status</td>
              <td>Check vouch status</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/v1/revoke/info</td>
              <td>Get endorsement ID</td>
            </tr>
            <tr>
              <td>POST</td>
              <td>/api/v1/revoke</td>
              <td>Revoke vouch</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/endorsements</td>
              <td>List endorsements</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/endorsements/with-status</td>
              <td>List with expiration</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/api/user/:address</td>
              <td>Get wallet profile</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Best Practices</h2>
        
        <h3>Caching</h3>
        <p>Scores are cached server-side and update when vouches change. Client-side caching for 5-10 minutes is safe.</p>
        
        <h3>Nonce Handling</h3>
        <p>If you get "Invalid nonce" or 409 errors, fetch a fresh nonce and retry.</p>
        
        <h3>Address Handling</h3>
        <p>All addresses are normalized to lowercase server-side. Both checksummed and lowercase addresses are accepted.</p>
        
        <h3>Epoch/Nonce Types</h3>
        <p>Both strings and numbers are accepted for epoch and nonce values (e.g., "1" or 1).</p>
        
        <h3>Security</h3>
        <ul>
          <li>All write operations require EIP-712 wallet signatures - no API keys needed</li>
          <li>Read operations are fully public and can be called from client-side JavaScript</li>
          <li>Use HTTPS in production for all requests</li>
          <li>Verify signature addresses match expected wallets before trusting responses</li>
        </ul>
      </section>
    </article>
  );
}
