# TrustFlow - Public Verifiable Trust Network

## Overview

TrustFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. It computes standardized trust scores (STS) from a curated seed set and issues portable credentials (JWT/VC) for third-party application integration. The core concept involves users vouching for others via a binary endorsement system, with all vouches publicly visible and stored on-chain in a Merkle transparency log for auditability. The system periodically calculates trust scores, path redundancy (min-cut), and stability metrics, assigning tier badges (Connected, Verified, Trusted) and allowing users to export signed attestations.

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
**Seed-Personalized PageRank Integration**: Auxiliary scoring signal (0-5% configurable weight, default 0%) computed via power iteration with damping factor 0.85, teleport vector weighted to seeds, and log-normalization. Currently experimental with 0% weight in STS. Includes PR skew, seed concentration, and convergence metrics. Phase 2 expansion planned for transaction-weighted PageRank using USDC transfers and EigenTrust algorithm. Max-flow/min-cut remains primary acceptance gate; PageRank is for quality ranking within accepted users.

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