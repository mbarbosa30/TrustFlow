# MaxFlow - Public Verifiable Trust Network

## Overview

MaxFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. It supports hybrid P2P ego contexts alongside traditional communities, enabling every user to run their own seeded trust network.

The system provides dual-layer scoring:
- **Personal Networks (Local Health)**: Users run their own seeded trust networks with chosen co-seeds, scored via distance-based max-flow/min-cut
- **Community Reputation (STS)**: Context-specific trust scores for lending, hiring, or governance with community-managed seeds

All vouches are publicly visible and stored on-chain in a Merkle transparency log for auditability. The system periodically calculates trust scores, path redundancy, and stability metrics, assigning tier badges (Connected, Verified, Trusted) and allowing users to export signed attestations.

MaxFlow also supports multi-tenant trust graphs through "Communities," where each community defines custom vouch prompts, policies, and seed sets while maintaining core Sybil-resistance guarantees. An economic layer provides daily USDC distribution based on STS scores, and a microcredit lending system is implemented with trust-based risk profiling and supporter subsidies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript (Vite), Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles. Design tokens include Inter and JetBrains Mono fonts, custom CSS variable themes (light/dark mode), and Tailwind-based spacing. Key pages include Dashboard, Overview, Why Score, Verify, and documentation. Accessibility is prioritized with semantic HTML, ARIA labels, and keyboard navigation.

### Technical Implementations
The backend uses Express.js with TypeScript (Node.js) and RESTful APIs. Data is stored in PostgreSQL via Neon serverless with Drizzle ORM. Authentication is handled by Reown AppKit for multi-network support (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base), supporting various login methods and off-chain EIP-712 signatures.

### Feature Specifications
*   **Monorepo Structure**: `client/`, `server/`, `shared/` for code reuse and shared TypeScript types.
*   **Privacy by Default**: Aggregated scores and opted-in reveals are public; endorsement graph is opaque.
*   **Binary Vouch Model**: Simplified endorsement system for transparency.
*   **Epoch-Based Computation**: Deterministic, versioned scoring with verifiable artifacts.
*   **Portable Credentials**: Self-contained, signed JSON objects compatible with W3C Verifiable Credentials.
*   **Seed Quality Scoring**: Seeds are continuously scored to influence their capacity and coverage requirements, preventing compromised seeds from polluting the graph.
*   **Seed-Personalized PageRank Integration**: Auxiliary scoring signal (5% weight) in STS calculation, complementing max-flow/min-cut.
*   **Communities Architecture**: Supports isolated scoring per community with custom policies and seed sets. Endorsements include `promptHash` for verification.
*   **Ego Context Architecture**: Enables users to run their own seeded trust networks with global and community-scoped vouches, and co-seed management.
*   **Economic Layer**: Daily USDC distribution using Celo native USDC with EIP-3009 gasless transfers, based on STS scores.
*   **Microcredit Lending System**: Community-opt-in USDC microlending with configurable parameters, installment schedules, and subsidy systems (Interest Buy-Down, Repay-Assist, Interest Vouchers, First-Loss Guarantee). Includes a two-stage payment approval workflow.
*   **API Integration for External Applications**: Provides a minimal REST API for third-party applications to integrate with MaxFlow, allowing vouch submissions and retrieval of trust scores and eligibility status. Uses community API keys and EIP-712 signatures for authentication.

### System Design Choices
*   **TypeScript Everywhere**: Enhances code quality and maintainability.
*   **Component-First UI**: Promotes reusable components.
*   **Epoch Progression System**: Manages the lifecycle of epochs, ensuring immutability of historical data.
*   **Address Normalization**: All Ethereum addresses are normalized to lowercase to prevent case-sensitivity issues.

## Ego Context Architecture (Sprint 1 Foundation - Nov 2024)

### Overview
MaxFlow now supports hybrid P2P ego contexts alongside traditional communities, enabling every user to run their own seeded trust network. This architectural pivot extends the system from community-only trust graphs to a dual-layer model where users can maintain both personal networks (ego contexts) and participate in community networks (lending, hiring, etc.).

### Vouch Scoping Model
The system distinguishes two types of vouches to support both personal and community trust graphs:

1. **Global Vouches** (scope='global'):
   - Flow across all personal networks
   - No promptHash required
   - Stored with communityId=0 for consistency
   - Created via POST /api/vouch endpoint
   - Used for general interpersonal trust relationships

2. **Community Vouches** (scope='community'):
   - Isolated to specific communities
   - Include promptHash for verification
   - Tied to specific lending/hiring criteria
   - Created via POST /api/endorse endpoint
   - Used for context-specific trust (loans, jobs, etc.)

### Database Schema Changes

#### Contexts Table
New table supporting both ego and community trust contexts:
```typescript
contexts {
  id: serial (primary key)
  contextType: enum('ego', 'community')
  ownerAddress: varchar(42) (indexed, lowercase normalized)
  communityId: integer | null (foreign key to communities)
  policyJson: jsonb (scoring parameters, capacity rules)
  createdAt: timestamp
}
```

#### Co-Seeds Table
Manages trusted co-seeds for ego contexts (max 3 per context):
```typescript
coSeeds {
  id: serial (primary key)
  contextId: integer (foreign key to contexts)
  address: varchar(42) (lowercase normalized)
  addedAt: timestamp
  UNIQUE(contextId, address) // Composite unique constraint
}
```

#### PublicEndorsements Extension
Extended with scope field to differentiate vouch types:
```typescript
publicEndorsements {
  ...existing fields...
  scope: enum('global', 'community') DEFAULT 'community'
  // promptHash nullable for global vouches
}
```

### API Endpoints

#### GET /api/ego/:address/context
Lazy-creates ego context if missing, returns context with co-seeds.

**Request**: `GET /api/ego/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/context`

**Response**:
```json
{
  "context": {
    "id": 123,
    "contextType": "ego",
    "ownerAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "communityId": null,
    "policyJson": { /* default ego policy */ },
    "createdAt": "2024-11-01T12:00:00Z"
  },
  "coSeeds": [
    {
      "id": 456,
      "contextId": 123,
      "address": "0x1234567890123456789012345678901234567890",
      "addedAt": "2024-11-01T13:00:00Z"
    }
  ],
  "seedAddresses": [
    "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "0x1234567890123456789012345678901234567890"
  ]
}
```

**Side Effects**: Auto-creates ego context with default policy if none exists.

#### POST /api/ego/:address/co-seeds
Adds co-seed to ego context (enforces max 3 limit).

**Request**: `POST /api/ego/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/co-seeds`
```json
{
  "coSeedAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response**:
```json
{
  "success": true,
  "coSeed": {
    "id": 456,
    "contextId": 123,
    "address": "0x1234567890123456789012345678901234567890",
    "addedAt": "2024-11-01T13:00:00Z"
  }
}
```

**Validation**: Returns 400 if max 3 co-seeds limit exceeded.

#### DELETE /api/ego/:address/co-seeds/:coSeedAddress
Removes co-seed from ego context.

**Request**: `DELETE /api/ego/0x742d35Cc.../co-seeds/0x1234567...`

**Response**: `{ "success": true }`

#### POST /api/vouch
Creates global vouch (no promptHash, no community restriction).

**Request**: `POST /api/vouch`
```json
{
  "endorsement": {
    "endorser": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "endorsee": "0x1234567890123456789012345678901234567890",
    "epoch": "1",
    "nonce": "0",
    "timestamp": "1730469600000",
    "sig": "0xabc...",
    "chainId": 42161 // Required for signature verification
  }
}
```

**Response**:
```json
{
  "success": true,
  "endorsement": { /* created endorsement with scope='global' */ },
  "message": "Global vouch created successfully"
}
```

**Validation**: EIP-712 signature verification with chainId, nonce validation, field validation (returns detailed error object).

### UI Integration

#### My Network Page (/network)
User-facing interface for managing personal trust network:
- **Personal Health Card**: Displays Local Health score (placeholder until scoring engine built), accepted users count, avg flow, median min-cut metrics
- **Co-Seeds Management**: Shadcn Form with zod validation (Ethereum address regex: `^0x[a-fA-F0-9]{40}$`), add/remove up to 3 co-seeds, visual co-seed count (X/3)
- **Educational Section**: "How It Works" explanations for ego-centric trust, global vouches, local health scoring, distance-based capacity
- **Testing Coverage**: Comprehensive data-testid attributes on all interactive elements (buttons, inputs) and informational text (labels, descriptions, messages)

#### EndorseForm Component Updates
Handles both global and community vouches:
- Conditional logic based on selectedCommunityId:
  - If communityId=0: POST /api/vouch (global vouch, no promptHash)
  - If communityId>0: POST /api/endorse (community vouch, with promptHash)
- Includes chainId in all signature payloads for EIP-712 verification
- Maintains existing community selector for multi-community users
- "Global Network" option available in community dropdown

### Planned: Dual Scoring Model

#### Local Health (0-100)
Ego network quality score computed using max-flow/min-cut on ego subgraph:

**Formula**: `LocalHealth = 50 * (avgResidualFlow / maxPossibleFlow) + 50 * (medianMinCut / seedCount)`

**Node Capacities** (distance-based decay from seed set):
- Distance 0 (self): 1.0
- Distance 1 (direct vouches): 0.5
- Distance 2+: 0.25
- Formula: `capacity = 1.0 / (2^distance)`

**Computation**:
1. Build ego subgraph: nodes within distance ≤ K from seed set
2. Run max-flow from SOURCE to each non-seed node
3. Calculate residual flow (max flow / capacity)
4. Compute min-cut for accepted users
5. Aggregate: avg residual flow + median min-cut

#### Global Trust (Pending)
Cross-network reputation score (not yet implemented):

**Formula**: `GlobalTrust = 0.6 * LocalHealth + 0.4 * IncomingFlow`

**IncomingFlow**: Weighted sum of vouches from other ego networks, normalized by their Local Health scores.

### Planned: Anti-Gaming Rules

#### Per-Epoch Vouch Cap
Limit: 5 global vouches per user per epoch. Prevents vouch flooding attacks.

#### Warm-Up Period
New ego contexts start with 50% capacity for first epoch. Prevents instant Sybil attacks via fresh context creation.

#### Reciprocality Brake
Mutual vouches (A↔B) receive 0.5x capacity multiplier. Prevents collusion clusters from gaming the system.

### Backward Compatibility

#### Data Migration
- Existing community vouches automatically default to scope='community'
- No manual migration required for existing endorsements
- Global vouches use communityId=0 for storage consistency with Community 0 architecture

#### API Compatibility
- POST /api/endorse continues to work for community vouches unchanged
- POST /api/vouch introduced as new endpoint for global vouches
- Both endpoints share signature verification logic (verifyEndorsementSignature)
- chainId field optional for backward compatibility (defaults to 1 if missing)

#### Storage Layer
- All storage methods accept communityId parameter (defaults to 0)
- getOrCreateEgoContext() auto-creates context on first access
- Co-seed methods enforce max 3 limit at database level (unique constraint)
- Address normalization consistent across ego and community contexts

### Current Status: Sprint 1 Complete (November 2024)
✅ Database schema (contexts, co_seeds, scope field)
✅ API endpoints (GET/POST/DELETE for ego contexts, POST /api/vouch)
✅ Storage layer with lazy creation and validation
✅ UI integration (My Network page, EndorseForm updates)
✅ Technical documentation (replit.md, inline code comments)
✅ **Public documentation modernization (November 2024)**:
  - Landing page: "Two Types of Trust" section explaining hybrid architecture
  - FAQs: 4 new questions about ego contexts, co-seeds, vouch types, Local Health
  - How It Works: Comprehensive "Personal Networks (Ego Contexts)" section with formula and capacity details
  - Use Cases: 2 new personal network use cases (curation, P2P lending)
  - All pages updated with clear definitions of technical terms (seed, co-seed, Local Health 0-100 scale)
  - Consistent terminology across all public pages for non-technical accessibility

### Next: Sprint 2 (Planned)
⏳ Ego scoring engine implementation
⏳ Anti-gaming rules enforcement
⏳ Score explanations ("why" strings)
⏳ Dual Trust Profile UI
⏳ Context health endpoints

## External Dependencies

### Frontend Libraries
*   Radix UI
*   Tailwind CSS
*   TanStack Query
*   Wouter
*   Lucide React
*   date-fns
*   Wagmi v2
*   @reown/appkit

### Backend Libraries
*   Express
*   Drizzle ORM
*   @neondatabase/serverless
*   ws
*   Zod

### Development Tools
*   Vite
*   TypeScript
*   ESBuild

### Typography Fonts
*   Google Fonts (Inter, JetBrains Mono)