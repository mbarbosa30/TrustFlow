# MaxFlow

**Sybil-resistant graph signal infrastructure** using max-flow/min-cut algorithms to compute verifiable trust scores.

MaxFlow generates two mathematically-derived signals:
- **LocalHealth (0-100)**: Personal network quality score
- **STS (0-100)**: Community reputation score

These neutral signals can be interpreted by applications for creditworthiness assessment, governance weight allocation, access control, and more.

## How It Works

MaxFlow measures trust the way nature measures health — through **flow**, **redundancy**, and **resilience**.

### The Algorithm

1. **Flow Component (60%)**: Measures how much trust flows to you from quality vouchers
   - Weighted by voucher scores (recursive trust)
   - Penalized for excessive vouching (dilution curve)
   - Protected against flash mob attacks

2. **Redundancy Component (40%)**: Measures attack resistance via min-cut
   - How many connections must be severed to isolate you?
   - Uses Dinic's algorithm for true min-cut calculation
   - Rewards diverse, independent trust paths

### Nature-Inspired Design

| Concept | Natural Analogy |
|---------|----------------|
| Flow capacity | Rivers finding paths through terrain |
| Recursive trust | Root systems drawing from healthy soil |
| Path redundancy | Mycorrhizal networks with multiple paths |
| Dilution penalty | Ecosystem pruning of weak connections |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your DATABASE_URL and SESSION_SECRET

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`.

## API Reference

### Core Endpoints

#### Create a Vouch
```http
POST /api/endorse
Content-Type: application/json

{
  "endorser": "0x...",
  "endorsee": "0x...",
  "epoch": "11",
  "nonce": "0",
  "sig": "0x...",
  "communityId": 0
}
```

#### Get Nonce (for signing)
```http
GET /api/nonce/:endorser/:epoch
```
Returns: `{ "maxNonce": 0, "nextNonce": 1 }`

#### Get Current Epoch
```http
GET /api/epoch/current
```
Returns: `{ "epochId": 11, "status": "active" }`

#### Get User Score
```http
GET /api/public/users/:address/score
```
Returns LocalHealth score and algorithm components.

#### Revoke a Vouch
```http
POST /api/revoke
Content-Type: application/json

{
  "endorser": "0x...",
  "endorsee": "0x...",
  "sig": "0x..."
}
```

### Network Statistics

#### Network Traction
```http
GET /api/stats/network-traction
```
Returns aggregated network metrics (cached 5 minutes).

### Admin Endpoints

#### Trigger Network Recalculation
```http
POST /api/admin/recalculate-network
```
Triggers immediate network-wide score recalculation.

#### Get Recalculation Status
```http
GET /api/admin/recalculation-status
```

## Architecture

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── algorithm/          # Scoring algorithms
│   │   └── egoScoring.ts   # LocalHealth computation
│   ├── services/           # Business logic
│   │   ├── networkRecalculation.ts
│   │   └── externalSybilService.ts
│   ├── routes.ts           # API endpoints
│   └── storage.ts          # Database interface
├── shared/                 # Shared types
│   └── schema.ts           # Drizzle schema + Zod types
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Shadcn/ui |
| Backend | Express.js, TypeScript, Node.js |
| Database | PostgreSQL (Neon serverless), Drizzle ORM |
| Authentication | Reown AppKit, EIP-712 signatures |
| Networks | Ethereum, Celo, Polygon, Arbitrum, Optimism, Base |

## Scoring Mechanics

### LocalHealth Formula

```
LocalHealth = flowComponent (60%) + cutComponent (40%)

flowComponent = 60 × min(1, qualityWeightedFlow / healthyVouchCount)
cutComponent = 40 × min(1, effectiveRedundancy / healthyRedundancy)
```

### Dilution Penalty

Vouching too many people dilutes your credibility:

| Vouches Given | Capacity Multiplier |
|---------------|---------------------|
| 1-10 | 100% (no penalty) |
| 11-15 | 100% → 85% (linear) |
| 16-25 | 85% → 55% (quadratic) |
| 26+ | 55% → 40% (asymptotic) |

### Quality Gates

Higher scores require quality vouchers:

| Score Tier | Requirement |
|------------|-------------|
| 0-50 | Any vouches |
| 50-65 | 1+ voucher with 50+ score |
| 65-80 | 2+ vouchers with 65+ score |
| 80-100 | 3+ vouchers with 75+ score + 2+ independent paths |

## Key Features

- **Privacy by Default**: Aggregated scores are public; endorsement graphs remain opaque
- **Binary Vouch Model**: Simple yes/no endorsements with 90-day activity window
- **Epoch-Based Computation**: Deterministic, versioned scoring
- **Multi-Chain Support**: Works across EVM-compatible networks
- **External Sybil Integration**: Device fingerprinting via NanoPay API (v1.7)

## User Recommendations

> Your Signal reflects the trust of those who vouch for you, balanced against the risk of those you vouch for. Be selective — vouch only for people you genuinely trust and respect.

- **Vouch for people you trust** — Only vouch for people you'd stake your reputation on
- **Less is more** — Vouching fewer people makes each vouch count more
- **Connect outside your circle** — Know people in different communities? That helps your Signal
- **Stay active** — Vouches fade after 90 days of inactivity

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key |
| `NANOPAY_API_KEY` | (Optional) External Sybil service key |

## License

MIT

## Links

- [Whitepaper](/whitepaper)
- [API Documentation](/api-docs)
- [Dashboard](/dashboard)
