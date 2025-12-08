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
        
        <h4>Example Request</h4>
        <pre><code>{`curl ${baseUrl}/api/v1/score/0x216844eF94D95279c6d1631875F2dd93FbBdfB61`}</code></pre>
        
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
  }
}`}</code></pre>

        <h4>Response Fields</h4>
        <ul>
          <li><strong>local_health</strong>: Signal score 0-100 (higher = more trusted). This is the authoritative trust signal computed by the max-flow algorithm.</li>
          <li><strong>vouch_counts.incoming_total</strong>: Total vouches ever received (exact count)</li>
          <li><strong>vouch_counts.incoming_active</strong>: Non-expired/non-revoked vouches (from last 1,000 evaluated)</li>
          <li><strong>vouch_counts.outgoing_total</strong>: Total vouches ever given (exact count)</li>
          <li><strong>vouch_counts.unique_vouchers</strong>: Distinct active endorsers (from last 1,000 evaluated)</li>
          <li><strong>activity.last_vouch_given_at</strong>: When this user last vouched for someone (null if never)</li>
        </ul>
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
              <td>/api/v1/score/:address</td>
              <td>Get Signal score</td>
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
          </tbody>
        </table>
      </section>

      <section>
        <h2>Community API (Server-Side)</h2>
        <p>For backend services requiring API key authentication.</p>
        
        <h3>Authentication</h3>
        <p>Include your API key in the X-Community-Key header:</p>
        <pre><code>{`curl -H "X-Community-Key: mxf_live_xxxxxxxx" \\
  ${baseUrl}/api/v1/communities/1/metrics.min`}</code></pre>
        
        <h3>Rate Limits</h3>
        <p>100 requests per minute per API key. Rate limit headers included in responses:</p>
        <ul>
          <li><strong>X-RateLimit-Limit</strong>: Maximum requests per window</li>
          <li><strong>X-RateLimit-Remaining</strong>: Requests remaining</li>
          <li><strong>X-RateLimit-Reset</strong>: Time when limit resets</li>
        </ul>

        <h3>Community Endpoints</h3>
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
              <td>/communities/:id/eligibility.min/:address</td>
              <td>Check if user is accepted</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/communities/:id/scores.min/:address</td>
              <td>Get detailed scores</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>/communities/:id/metrics.min</td>
              <td>Get community metrics</td>
            </tr>
            <tr>
              <td>POST</td>
              <td>/communities/:id/vouch.min</td>
              <td>Submit vouch</td>
            </tr>
          </tbody>
        </table>

        <h3>Eligibility Response</h3>
        <pre><code>{`{
  "accepted": true
}`}</code></pre>

        <h3>Scores Response</h3>
        <pre><code>{`{
  "accepted": true,
  "score": 72.5,
  "local_health": 68,
  "min_cut": 3,
  "vertex_disjoint": 3,
  "seed_coverage_ok": true,
  "why": "3 independent paths; ≥2 seeds with ≥0.30 each",
  "updated_at": "2025-10-31T00:15:23.456Z"
}`}</code></pre>

        <h3>Metrics Response</h3>
        <pre><code>{`{
  "accepted_users": 156,
  "min_cut_ge2_share": 0.94,
  "disjoint_ge2_share": 0.94,
  "seeds": [
    {
      "addr": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "coverage": 0.30
    }
  ]
}`}</code></pre>
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
          <li>Store API keys in environment variables, never in code</li>
          <li>Make API calls from your backend, not client-side JavaScript</li>
          <li>Use HTTPS for all requests</li>
        </ul>
      </section>
    </article>
  );
}
</code></pre>
