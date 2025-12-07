## Overview

MaxFlow is a Sybil-resistant graph signal infrastructure that computes verifiable network quality scores from endorsement graphs using max-flow/min-cut algorithms. It provides neutral, mathematically-derived signals (LocalHealth 0-100 for personal networks, STS 0-100 for communities) that applications interpret based on their needs: creditworthiness for lending, governance weight for DAOs, access control for communities, or allocation efficiency for grants. The system supports dual-layer scoring: Personal Networks (LocalHealth) for user-seeded graphs and Community Reputation (STS) for context-specific scoring with community-managed seeds. All vouches are publicly visible and stored on-chain in a Merkle transparency log. MaxFlow is infrastructure, not a trust dictator—it computes flow, redundancy, and dilution penalties; communities choose what these signals mean.

### Nature-Inspired Narrative Framework (Nov 2025)
MaxFlow uses a **math-first, nature-supportive** narrative framing across all pages:
*   **Hero Messaging (Finalized)**: 
    *   Headline: **"Trust, Computed Naturally"**
    *   Subtitle: *"Sybil-resistant graph algorithms measuring flow, redundancy, and resilience — the same patterns that make ecosystems ungameable."*
    *   Badge: "Graph Signal Infrastructure"
*   **Core Positioning**: The nature parallel is a **power feature** — deliberate engineering leveraging patterns with billions of years of optimization. Confident, impressive, intentional. Not accidental.
*   **Key Analogies** (each paired with precise graph property):
    *   **Rivers/Watersheds** → Max-flow capacity (water finds optimal paths through topology)
    *   **Root Systems** → Recursive trust weighting (stronger roots get more nutrients)
    *   **Mycorrhizal Networks** → Path redundancy (forest resilience through multiple paths)
    *   **Ecosystem Pruning** → Dilution penalty (freeloaders get naturally isolated)
*   **Implementation**: Nature metaphors appear as supportive callouts (italic text) below technical explanations, never replacing the mathematical framing
*   **Tone Guidelines**: Confident, impressive, intentional. No "We" language — keep impersonal/product-focused. Tech is primary; nature validates robustness.
*   **Section Taglines**:
    *   How It Works: "Three steps. Graph math. Natural resilience."
    *   Why MaxFlow: "Proven algorithms. Natural resilience. Ungameable by design."

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript (Vite), Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles. It incorporates Inter and JetBrains Mono fonts, custom CSS variable themes (light/dark mode), and Tailwind-based spacing. Accessibility is a priority.

### Technical Implementations
The backend is built with Express.js and TypeScript (Node.js) providing RESTful APIs. Data is managed in PostgreSQL via Neon serverless with Drizzle ORM. Reown AppKit handles multi-network authentication (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base) and supports off-chain EIP-712 signatures.

### Feature Specifications
*   **KUDOS Token Economy (Off-Chain MVP)**: 
    *   Pure rewards layer - earned based on LocalHealth but does NOT influence scoring
    *   Off-chain reputation tokens earned through LocalHealth scores
    *   Daily claiming: amount = (LocalHealth² / 100), capped at 1000 KUDOS/day
    *   1% transfer fee: 0.5% burned (deflationary), 0.5% pooled for future claims
    *   24-hour cooldown between claims
    *   One-way relationship: LocalHealth → KUDOS (scores determine rewards, but rewards don't affect scores)
    *   Server-side LocalHealth computation prevents score manipulation
    *   **Known MVP Limitations**: Signature replay protection not yet implemented (acceptable for off-chain testing, required for production)
    *   **Architecture Decision (Nov 2025)**: KUDOS decoupled from scoring to preserve LocalHealth as pure graph-based signal and maintain MaxFlow's identity as neutral infrastructure
*   **Monorepo Structure**: Organized into `client/`, `server/`, and `shared/` for code reuse.
*   **Privacy by Default**: Aggregated scores and opted-in reveals are public; the endorsement graph remains opaque.
*   **Binary Vouch Model**: Simplified endorsement for transparency.
*   **Epoch-Based Computation**: Deterministic, versioned scoring with verifiable artifacts.
*   **Portable Credentials**: Self-contained, signed JSON objects compatible with W3C Verifiable Credentials.
*   **Seed Quality Scoring**: Continuously scores seeds to prevent graph pollution.
*   **Seed-Personalized PageRank Integration**: Auxiliary scoring signal for STS calculation.
*   **Communities Architecture**: Supports isolated scoring with custom policies and seed sets.
*   **Ego Context Architecture**: Enables users to run personal trust networks with global and community-scoped vouches and co-seed management.
*   **Economic Layer**: Daily USDC distribution on Celo using EIP-3009 gasless transfers, based on STS scores.
*   **Microcredit Lending System**: Community-opt-in USDC microlending with configurable parameters, installment schedules, and various subsidy systems. The Credit menu is automatically shown to users who either have access to lending-enabled communities OR have active loans (ensuring borrowers can always access their repayment interface).
*   **API Integration**: Provides a minimal REST API for third-party applications to integrate with MaxFlow, using community API keys and EIP-712 signatures. CORS is enabled for all origins to allow external applications to call API endpoints directly from browsers.
    *   **Simplified EIP-712 Signatures (Nov 2025)**: Removed timestamp from endorsement signatures to eliminate clock sync requirements. Signatures now use 4 fields (endorser, endorsee, epoch, nonce) instead of 5. Nonce + epoch provide sufficient replay protection. Server auto-sets timestamps when vouches are received.
*   **Dual Scoring Model**:
    *   **Local Health (Ego Score)**: Personal network quality score (0-100) using max-flow/min-cut algorithms with **recursive trust weighting**. Supports two modes:
        *   **Pure Option 2 (Default)**: No co-seeds required. Measures "how much the network trusts me" by computing flow from direct vouchers to the owner. **Uses iterative PageRank-style algorithm where vouches are weighted by voucher's LocalHealth score**, creating recursive trust propagation:
            *   **Iterative Computation (Nov 2025)**: Scores computed in rounds until convergence (max 10 iterations, threshold 0.5). Each round recalculates scores using current voucher scores as edge weights (capacity = voucherScore / 100). This implements true recursive trust: your score depends on the strength of who vouches for you, and their strength depends on their vouchers.
            *   **Flow Component (60%)**: Weighted flow from vouchers to owner. Each vouch weighted by voucher's LocalHealth (0-100 normalized to 0-1). ResidualFlow = directFlow / voucherCount captures average voucher strength. Normalized by healthy baseline (8 vouches) with quadratic exponential scaling (2.0 exponent). Measures incoming trust quality, not just quantity.
            *   **Redundancy Component (40%)**: Effective redundancy metric with quadratic exponential scaling, combining:
                *   Base: Number of direct vouchers (each vouch = 1 point)
                *   Depth bonus: Upstream supporter count × 0.2 (rewards multi-hop endorsement chains)
                *   Connectivity bonus: (edge_count / potential_edges) × ego_size (rewards network density)
            *   **Ego Subgraph**: Built via upstream-only BFS from vouchers (finds people who vouch for vouchers), excluding owner to prevent inflation
            *   **Healthy Baseline (Dec 2025 Calibration)**: 8 vouchers + 35 redundancy points. Raised from 5/20 to prevent score saturation. Score ceiling of 99 (epsilon = 1.0) ensures 100 is mathematically rare.
            *   **Score Distribution**: Depends on both vouch count AND voucher quality. Strong vouchers (high LocalHealth) provide more value than weak vouchers.
        *   **Hybrid Mode (Optional)**: When co-seeds are selected, measures "connection quality within my trusted circle" for enhanced Sybil resistance. Flow computed from co-seeds through network to owner.
    *   **Outgoing Vouch Adjustment**: Adds accountability for who you vouch for. Cut component is multiplied by a vouch quality factor:
        *   Dilution penalty: 10% per vouch beyond 10 vouches (prevents vouch spam)
        *   Caps at 50% reduction, ~10-20% typical impact
    *   **Pure Graph-Based Scoring**: LocalHealth derived entirely from endorsement network structure. No economic factors (KUDOS, tokens, payments) influence scores. This ensures signal integrity, auditability, and alignment with MaxFlow's identity as neutral infrastructure.
    *   **Global Trust (Planned)**: Cross-network reputation score combining Local Health and Incoming Flow.
*   **LocalHealth Score Caching**: Event-driven caching system for LocalHealth scores to optimize API performance:
    *   Cached scores stored in `contexts` table with `localHealth` (0-100) and `localHealthUpdatedAt` timestamp
    *   Automatic recalculation triggered when:
        *   User receives a vouch (affects incoming flow)
        *   User gives a vouch (affects outgoing vouch quality factor)
    *   API endpoints use cached scores by default, falling back to fresh computation if missing
    *   Detailed ego score endpoint (`/api/ego/:address/score`) still computes on-demand for full metrics
    *   Asynchronous recalculation prevents blocking requests
    *   KUDOS transfers do NOT trigger recalculation (KUDOS is rewards-only, doesn't influence scores)
*   **Network Recalculation**: Admin tool for batch computing and persisting all LocalHealth scores across the entire network. Computes scores using current algorithm parameters and saves them to the database `contexts.local_health` column. Includes zero-vouch safety guard to prevent empty-graph runs and provides detailed per-user results with timing metrics. Accessible via `/api/admin/recalculate-network` or the Admin panel button.
*   **Anti-Gaming Rules (Planned)**: Includes per-epoch vouch caps, a warm-up period for new ego contexts, and a reciprocality brake for mutual vouches.

### System Design Choices
*   **TypeScript Everywhere**: Ensures code quality and maintainability.
*   **Component-First UI**: Promotes reusable components.
*   **Epoch Progression System**: Manages epoch lifecycle and data immutability.
*   **Address Normalization**: All Ethereum addresses are normalized to lowercase.
*   **Simulation Framework**: Interactive tool for validating max-flow implementations against Sybil attacks.

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