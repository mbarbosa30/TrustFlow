# TrustFlow - Public Verifiable Trust Network

## Overview

TrustFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. It computes standardized trust scores (STS) from a curated seed set and issues portable credentials (JWT/VC) for third-party application integration. The core concept involves users vouching for others via a binary endorsement system, with all vouches publicly visible and stored on-chain in a Merkle transparency log for auditability. The system periodically calculates trust scores, path redundancy (min-cut), and stability metrics, assigning tier badges (Connected, Verified, Trusted) and allowing users to export signed attestations.

**TrustFlow Communities (Phase 1 - In Development)**: Multi-tenant trust graphs where each community defines custom vouch prompts, policies, and seed sets while maintaining core Sybil-resistance guarantees (min-cut ≥2, vertex-disjoint paths ≥2, per-seed share ≥0.30). Communities are isolated by default with separate scoring computations. Global graph treated as "Community 0" for backward compatibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Framework**: React with TypeScript (Vite).
**UI System**: Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles.
**State Management**: TanStack Query for server state; React hooks for client state.
**Routing**: Wouter.
**Design Tokens**: Inter (UI), JetBrains Mono (technical data), custom CSS variable themes (light/dark mode), Tailwind-based spacing, opacity-based elevation.
**Key Pages**: Dashboard, Overview (personal score/vouch), Why Score (explainability), Verify (attestation validation), documentation pages.

### Backend

**Server Framework**: Express.js with TypeScript (Node.js).
**API Design**: RESTful endpoints under `/api`.
**Storage Layer**: Configured for PostgreSQL via Neon serverless with Drizzle ORM.
**Development Server**: Vite middleware mode.

### Data Storage

**Schema**: Users (id, pubkey/DID), Edges (endorsement details), Epochs (graph/seed roots, params hash, scores hash), Scores (user_id, epoch_id, tier, STS, flow, min_cut, stability, percentile).
**Transparency Model**: Public, on-chain Merkle transparency log for vouches.

### Authentication and Authorization

**Current Implementation**: Reown AppKit for multi-network authentication (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base). Supports email, phone, social logins, and traditional wallet connections. Uses off-chain EIP-712 signatures.
**Future Enhancements**: DID system, optional Web2 identifier linking, enhanced wallet signature verification.

### Key Architectural Decisions

**Monorepo Structure**: `client/`, `server/`, `shared/` for code reuse.
**TypeScript Everywhere**: Shared types via `shared/`.
**Component-First UI**: Reusable components.
**Privacy by Default**: Aggregated scores and opted-in reveals are public; endorsement graph is opaque.
**Binary Vouch Model**: Simplified from a three-level system to a binary endorsement for transparency and alignment with max-flow/min-cut.
**Epoch-Based Computation**: Deterministic, versioned scoring with verifiable artifacts.
**Portable Credentials**: Self-contained, signed JSON objects compatible with W3C Verifiable Credentials.
**Mock Data Strategy**: Components use mock data with TODOs for backend integration.
**Theme System**: CSS variable-based, localStorage persistent.
**Accessibility**: Semantic HTML, ARIA labels, keyboard navigation.
**Multi-Network Support**: Flexible authentication via Reown AppKit, no forced network switching.
**Epoch Progression System**: Proper lifecycle management for epochs (`getCurrentEpoch()`, `createEpoch()`, `closeEpoch()`, `advanceEpoch()`), ensuring immutability of historical data.
**Address Normalization**: All Ethereum addresses are normalized to lowercase throughout the system to prevent case-sensitivity issues in scoring and user identification.
**Seed Quality Scoring**: Seeds are continuously scored (0-1) on four metrics: predictive validity (35%), downstream quality (30%), diversity lift (20%), and centralization penalty (15%). Seed scores affect their SOURCE→seed capacity (0.7x-1.3x multiplier) and whether they count toward the "≥2 seeds" coverage requirement (threshold: 0.6). This creates a feedback loop where quality seeds strengthen the network while weak seeds self-throttle, preventing compromised seeds from polluting the graph—especially critical for vulnerable communities facing high collusion risk.
**Bluesky Explorer Demo**: Read-only Bluesky network analysis using AT Protocol API. Fetches seed user's followers (1st hop), then for each peer fetches top 10 most influential followers by follower count (2nd hop), then for top 25 influential depth-2 users fetches their top 5 followers (selective 3rd hop). Creates bidirectional edges throughout. Network size kept under ~800 users for fast Dinic's max-flow scoring. Seed excluded from all results. Analysis shows "network around" the seed with influence-weighted selection at each depth.
**Seed-Personalized PageRank Integration**: Auxiliary scoring signal (5% weight) computed via power iteration with damping factor 0.85, teleport vector weighted to seeds, and log-normalization. **Active in production** with 5% weight in STS calculation (Flow 55%, Cut 25%, Stability 5%, Depth 10%, PageRank 5%). Includes PR skew, seed concentration, and convergence metrics. Phase 2 expansion planned for transaction-weighted PageRank using USDC transfers and EigenTrust algorithm. Max-flow/min-cut remains primary acceptance gate; PageRank is for quality ranking within accepted users. Database schema extended with normalized component columns for accurate UI display of percentage-based metrics.
**Communities Architecture (Phase 1 COMPLETE)**: Database schema extended with `community_id` FK on endorsements, epochs, scores, and seeds tables. Composite primary keys enable isolated scoring per community. Policy stored as JSONB with templates (Hiring, Lending, Marketplace). Endorsements include `promptHash` for verification. Community creator automatically becomes first seed. Phase 1 backend complete: keccak256 prompt hashing (viem), Community 0 initialized with hash `0xc734fc067acf567598769f685d1b552755c1ba0102fe5709244cf374a0ad45de`, community-scoped storage interface (backward compatible with communityId=0 default), API routes operational (POST/GET /communities with proper JSONB deserialization). Architect-reviewed and ready for frontend integration. Phase 2 planned: seed governance + creator authentication. Phase 3 planned: capped bridges to global rollup.
**Economic Layer (COMPLETE)**: Daily USDC distribution system using Celo native USDC (0xcebA9300f2b948710d2653dD7B07f33A8B32118C) with EIP-3009 gasless transfers. Database schema extended with 5 tables (budget, allowance, payment, pledge, auth_3009). Economic computation runs automatically after trust scoring: daily budget = ρ% (default 0.5%) of treasury, linear distribution by STS scores, caps: $5/user/day, $5/tx. Security hardening complete: deterministic nonces prevent replay attacks, server-side deduplication via `storage.getAuth3009()`, unique constraint on `auth_3009.nonce` prevents race conditions. Unified MyWallet dashboard (/wallet) combines Trust Card + Wallet Card + Activity Feed. API endpoints: GET /budget/today, GET /allowance/:user, POST /claim, POST /pay. Treasury integration currently mocked ($10K balance) - ready for real Celo contract integration. Architect-reviewed and security-approved.
**Microcredit Lending System (MVP COMPLETE - PILOT MODE)**: Community-opt-in USDC microlending with trust-based risk profiling and supporter subsidy systems. **PILOT CONFIGURATION**: Trust scores are **ADVISORY ONLY** - all users can apply for loans regardless of min-cut, GHI, or acceptance status. The eligibility endpoint (`checkLoanEligibility`) returns trust metrics for informational display but always returns `eligible: true` (unless lending is completely disabled). This enables maximum experimentation flexibility while surfacing trust data as risk indicators in the UI. **Core Infrastructure (All 16 Tasks COMPLETE)**: Database schema extended with 6 tables (loan, installment, subsidy_ledger, assist, guarantee, trust_event). Lending policy system with configurable parameters (loan amounts: $160-$800 USDC, tenors: 6-12 months, 40% APR). Installment schedule generator uses standard amortization formula with month-end date normalization. Transaction-safe loan creation via `db.transaction()`. **Subsidy Systems**: Interest Buy-Down (IBD), Repay-Assist (RA) with 6% premium repayment waterfall, Interest Vouchers, and First-Loss Guarantee (FLG). **Payment Processing**: Installment payments with grace period (5 days), late marking (>7 days), default trigger (>60 days), FLG waterfall execution. **Trust Integration**: Conservative delta recording (+0.02 on-time, -0.05 late, -0.15 default, ±0.03 assist) with epoch-level caps (±0.10 per user per epoch) prevents gaming. **Exchange Rate Service**: Mock ARS/USD conversion ready for real-time API integration. **UIs Complete**: Borrower Credit UI (/credit), Community-Integrated Support (via CommunityDetail tabs), Community Lending Dashboard (/lending-dashboard/:communityId), Lending Policy Admin UI (/admin/lending/:communityId with dirty state guard). **Community-Centric Approach**: Support functionality integrated into community detail pages; supporters engage within specific communities via Credit tab showing available loans and assist opportunities. **Security Status**: Payer authentication requires EIP-712 signature verification for production (documented). Admin endpoints intentionally unauthenticated for pilot flexibility. **Future Production Mode**: To enable hard eligibility gates, update `checkLoanEligibility()` to enforce thresholds and return `eligible: false` for users not meeting criteria.

## External Dependencies

### Frontend Libraries

*   **Radix UI**: Headless component primitives.
*   **Tailwind CSS**: Styling framework.
*   **TanStack Query**: Async state management.
*   **Wouter**: Client-side routing.
*   **Lucide React**: Icon library.
*   **date-fns**: Date manipulation.
*   **Wagmi v2**: React hooks for Ethereum with viem.
*   **@reown/appkit**: Multi-network wallet connection and authentication SDK.

### Backend Libraries

*   **Express**: HTTP server framework.
*   **Drizzle ORM**: TypeScript-first ORM for PostgreSQL.
*   **@neondatabase/serverless**: Serverless Postgres driver.
*   **ws**: WebSocket library (for Neon connection).
*   **Zod**: Schema validation.

### Development Tools

*   **Vite**: Build tool and dev server.
*   **TypeScript**: Type safety.
*   **ESBuild**: Production server bundling.

### Typography Fonts

*   **Google Fonts**: Inter, JetBrains Mono.