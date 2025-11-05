## Overview

MaxFlow is a Sybil-resistant graph signal infrastructure that computes verifiable network quality scores from endorsement graphs using max-flow/min-cut algorithms. It provides neutral, mathematically-derived signals (LocalHealth 0-100 for personal networks, STS 0-100 for communities) that applications interpret based on their needs: creditworthiness for lending, governance weight for DAOs, access control for communities, or allocation efficiency for grants. The system supports dual-layer scoring: Personal Networks (LocalHealth) for user-seeded graphs and Community Reputation (STS) for context-specific scoring with community-managed seeds. All vouches are publicly visible and stored on-chain in a Merkle transparency log. MaxFlow is infrastructure, not a trust dictator—it computes flow, redundancy, and dilution penalties; communities choose what these signals mean.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript (Vite), Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles. It incorporates Inter and JetBrains Mono fonts, custom CSS variable themes (light/dark mode), and Tailwind-based spacing. Accessibility is a priority.

### Technical Implementations
The backend is built with Express.js and TypeScript (Node.js) providing RESTful APIs. Data is managed in PostgreSQL via Neon serverless with Drizzle ORM. Reown AppKit handles multi-network authentication (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base) and supports off-chain EIP-712 signatures.

### Feature Specifications
*   **KUDOS Token Economy (Off-Chain MVP)**: 
    *   Off-chain reputation tokens earned through LocalHealth scores
    *   Weekly claiming: amount = (LocalHealth² / 100), capped at 1000 KUDOS/day
    *   1% transfer fee: 0.5% burned (deflationary), 0.5% pooled for future claims
    *   7-day cooldown between claims
    *   KUDOS transfers boost edge capacities (exponential decay, 180-day halflife)
    *   Server-side LocalHealth computation prevents score manipulation
    *   **Known MVP Limitations**: Signature replay protection not yet implemented (acceptable for off-chain testing, required for production)
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
*   **API Integration**: Provides a minimal REST API for third-party applications to integrate with MaxFlow, using community API keys and EIP-712 signatures.
*   **Dual Scoring Model**:
    *   **Local Health (Ego Score)**: Personal network quality score (0-100) using max-flow/min-cut algorithms. Supports two modes:
        *   **Pure Option 2 (Default)**: No co-seeds required. Measures "how much the network trusts me" by computing flow from direct vouchers to the owner. Uses metric-based effective redundancy scoring with quadratic exponential scaling (2.0 exponent) for strict score distribution:
            *   **Flow Component (60%)**: Direct flow from vouchers to owner, normalized by healthy baseline (5 vouches), with quadratic exponential scaling. Measures incoming trust saturation.
            *   **Redundancy Component (40%)**: Effective redundancy metric with quadratic exponential scaling, combining:
                *   Base: Number of direct vouchers (each vouch = 1 point)
                *   Depth bonus: Upstream supporter count × 0.2 (rewards multi-hop endorsement chains)
                *   Connectivity bonus: (edge_count / potential_edges) × ego_size (rewards network density)
            *   **Ego Subgraph**: Built via upstream-only BFS from vouchers (finds people who vouch for vouchers), excluding owner to prevent inflation
            *   **Healthy Baseline**: 5 vouchers + 20 redundancy points (calibrated for dense networks)
            *   **Score Distribution**: ~2-3pts (1 vouch, minimal network) → ~18pts (3 vouches, basic) → ~61pts (5 vouches, solid depth) → ~74pts (10 vouches, rich connectivity)
        *   **Hybrid Mode (Optional)**: When co-seeds are selected, measures "connection quality within my trusted circle" for enhanced Sybil resistance. Flow computed from co-seeds through network to owner.
    *   **Outgoing Vouch Adjustment**: Adds accountability for who you vouch for. Cut component is multiplied by a vouch quality factor:
        *   Dilution penalty: 10% per vouch beyond 10 vouches (prevents vouch spam)
        *   Caps at 50% reduction, ~10-20% typical impact
    *   **KUDOS Integration**: Edge capacities boosted by KUDOS transfers (exponential decay, 180-day halflife). Boost multiplier: `1 + min(1, kudosWeight/500)`, max 2x. Higher threshold (500 vs previous 100) makes KUDOS a subtle nudge rather than a scoring lever.
    *   **Global Trust (Planned)**: Cross-network reputation score combining Local Health and Incoming Flow.
*   **Network Recalculation**: Admin tool for batch computing all LocalHealth scores across the entire network. Verification-only feature that computes scores using current algorithm parameters without persisting to database (scores are computed on-the-fly via `/api/ego/:address/score`). Includes zero-vouch safety guard to prevent empty-graph runs and provides detailed per-user results with timing metrics.
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