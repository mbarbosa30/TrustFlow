## Overview

MaxFlow is a Sybil-resistant graph signal infrastructure that computes verifiable network quality scores using max-flow/min-cut algorithms. It provides neutral, mathematically-derived signals: LocalHealth (0-100) for personal networks and STS (0-100) for community reputation. Applications can interpret these signals for various uses like creditworthiness, governance weight, or access control. The system features dual-layer scoring and stores all vouches publicly on-chain in a Merkle transparency log. MaxFlow leverages nature-inspired narratives and analogies to explain its robust, ungameable design, emphasizing concepts like flow capacity (rivers), recursive trust (root systems), path redundancy (mycorrhizal networks), and dilution penalties (ecosystem pruning).

## User Preferences

Preferred communication style: Simple, everyday language.

### Naming Convention (Dec 2025)
*   **Internal Code**: Use `LocalHealth` for variable names, types, and function names (e.g., `avgLocalHealth`, `getLocalHealthScore`)
*   **User-Facing Copy**: Use "Signal" in all UI text, headings, and descriptions (e.g., "Your Signal: 72", "Average Signal", "Signal Distribution")
*   **Conceptual Framing**: The algorithm computes signal vs noise—genuine trust (signal) from Sybil attacks and fake accounts (noise)

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Shadcn/ui (Radix UI, Tailwind CSS), and Material Design 3 principles. It uses Inter and JetBrains Mono fonts, custom CSS variable themes for light/dark mode, and prioritizes accessibility.

### Multi-Biome Design System (Dec 2025)
The "Living Networks" design philosophy uses varied, nature-inspired colors from multiple biomes—avoiding green-saturation by incorporating rivers, earth, sun, and forest colors:

*   **CSS Variables in `index.css`**:
    *   `--score-canopy`: Forest green - peak health (80-100)
    *   `--score-growth`: River teal - water-fed expansion (60-79)
    *   `--score-transition`: Sunlit amber - activation energy (40-59)
    *   `--score-dormant`: Rich soil umber - grounded stability (20-39)
    *   `--score-seedling`: River-stone quartz - cool potential (0-19)
*   **Semantic Aliases** (for intuitive theming):
    *   `--score-river`: Alias for flow/network visualizations
    *   `--score-sun`: Alias for energy/activation states
    *   `--score-soil`: Alias for accountability/grounding
    *   `--score-stone`: Alias for neutral/foundational elements
*   **Dilution Indicators**: `--dilution-quality`, `--dilution-warning`, `--dilution-penalty`, `--dilution-cap`
*   **Usage**: Use `style={{ color: 'hsl(var(--score-river))' }}` instead of `text-primary` class for semantic coloring
*   **Chart Colors**: `--chart-1` through `--chart-5` map to the biome palette for Recharts visualizations
*   **WCAG Accessibility (Dec 2025)**: Score-sun, score-stone, score-transition, and score-seedling use 58% lightness for 4.5:1 contrast compliance
*   **Mathematical Tokens**: `--spacing-phi` (golden ratio), `--fib-1` through `--fib-10` (Fibonacci spacing), `--text-xs` through `--text-4xl` (1.125 typographic scale)
*   **Typography Rhythm**: Body line-height 1.6, headings 1.25 with -0.02em tracking, mono blocks 1.7 for breathing room

### Technical Implementations
The backend is an Express.js and TypeScript (Node.js) application offering RESTful APIs. Data is managed in PostgreSQL via Neon serverless with Drizzle ORM. Multi-network authentication (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base) and off-chain EIP-712 signatures are handled by Reown AppKit. The project uses a monorepo structure (`client/`, `server/`, `shared/`).

### Feature Specifications
*   **KUDOS Token Economy (Off-Chain MVP)**: A rewards layer decoupled from scoring, earned based on LocalHealth scores. Features daily claiming based on `LocalHealth²`, a 1% transfer fee (0.5% burned, 0.5% pooled), and a 24-hour cooldown.
*   **Privacy by Default**: Aggregated scores and opted-in reveals are public; endorsement graphs remain opaque.
*   **Binary Vouch Model**: Simplified endorsements for transparency.
*   **Vouch Expiration & Revocation (Dec 2025)**: Vouches have a 90-day validity window to encourage ongoing participation:
    *   **Activity-Based Retention**: A vouch is valid if the vouch is less than 90 days old OR the recipient has been active (vouched for someone) within the last 90 days from today.
    *   **Manual Revocation**: Endorsers can revoke their vouches at any time by signing a revocation message. Revoked vouches are stored in an `endorsementTombstones` table.
    *   **Expiration Logic**: Uses `lastSignalActivityAt` timestamp on user contexts to track last outgoing vouch activity.
    *   **UI Indicators**: Vouch status badges show "Active", days remaining (with warning at <30 days), "Expired", or "Revoked".
    *   **Anti-Sybil**: Prevents "set and forget" sockpuppet farms—inactive accounts gradually lose their incoming vouches.
*   **Epoch-Based Computation**: Deterministic, versioned scoring with verifiable artifacts.
*   **Portable Credentials**: Self-contained, signed JSON objects compatible with W3C Verifiable Credentials.
*   **Seed Quality Scoring & Seed-Personalized PageRank**: Used for STS calculation and graph integrity.
*   **Communities Architecture**: Supports isolated scoring with custom policies.
*   **Ego Context Architecture**: Enables personal trust networks and co-seed management.
*   **Economic Layer**: Daily USDC distribution on Celo based on STS scores using EIP-3009.
*   **Microcredit Lending System**: Community-opt-in USDC microlending with configurable parameters.
*   **API Integration**: A minimal REST API with community API keys and simplified EIP-712 signatures for third-party integration, with CORS enabled for all origins.
*   **Dual Scoring Model**:
    *   **LocalHealth (Ego Score)**: Personal network quality (0-100) using max-flow/min-cut algorithms with recursive trust weighting.
        *   **Pure Option 2 (Default)**: Measures "how much the network trusts me" using an iterative PageRank-style algorithm where vouches are weighted by the voucher's LocalHealth score (up to 10 iterations). It combines a Flow Component (60%) and a Redundancy Component (40%).
        *   **Network-Wide Computation (Dec 2025 Fix)**: ALL participants (endorsers + endorsees) must be computed together in each iteration. Single-user or subset computation produces inflated/deflated scores because voucher weights depend on peers.
        *   **True Min-Cut Redundancy (Dec 2025)**: The redundancy component now uses actual min-cut computation via Dinic's algorithm instead of a heuristic. Min-cut measures the minimum number of edges that must be removed to disconnect trust sources from the user—the core Sybil resistance metric. Formula: `effectiveRedundancy = actualMinCut + depthBonus + vertexDisjointBonus`.
        *   **Vertex-Disjoint Paths**: Bonus for having multiple truly independent paths (no shared intermediate nodes) - harder to Sybil attack.
        *   **Adaptive Baselines**: Dynamically computes healthy baselines from network percentiles (75th percentile vouch count), clamped to 4-15 vouches.
        *   **Algorithm Breakdown**: API returns detailed components (flow_component + redundancy_component) that sum to the final LocalHealth score.
        *   **Tiered Capacity Weighting (Dec 2025 Fix)**: Voucher edge capacities use tiered formula for Sybil resistance:
            *   Zero-score vouchers (sockpuppets): `0.08` capacity floor (10 sockpuppets × 0.08 = 0.8 flow, well below 4.0 baseline)
            *   Low-score (1-30): Linear interpolation `0.08 + 0.22 * (score/30)` reaching 0.30 at score 30
            *   Normal (31+): Sqrt weighting `0.30 + 0.70 * sqrt((score-30)/70)` - continuous from 0.30 at score 31 to 1.0 at score 100
            *   Unknown vouchers default to score 0 (maximum Sybil resistance)
        *   **Flash Mob Protection (Dec 2025)**: Prevents coordinated mass-vouching attacks:
            *   **Threshold-Based Activation**: Protection only triggers when >20 low-quality (score <30) vouchers detected (FLASH_MOB_THRESHOLD)
            *   **Capped Low-Quality Flow**: Total flow from score-<30 vouchers capped at 2.0 (100 sockpuppets × 0.08 = 8.0 → capped to 2.0)
            *   **Quality-Gated Min-Cut**: Low-quality vouchers contribute reduced capacity (0.1-1.0, scaling with score) to redundancy calculation
            *   **Legitimate Network Preservation**: Small legitimate networks (15 new users vouching for a hub) are NOT penalized
            *   Result: Flash Mob target scores 52 instead of 99 - below the 65 "likely human" threshold
        *   **Algorithm Test Data**: Comprehensive 51 test scenarios in `server/testdata/algorithmTestData.ts` covering: hub-spoke patterns, mesh networks, Sybil rings, sockpuppet farms, collusion clusters, over-vouching dilution, multi-path redundancy, expired/revoked vouches, isolated users, large-scale stress tests, and 8 unexpected attack patterns (Compromised Whale, Slow-Burn Sybil, Parasitic Bridge, Reputation Laundering, Flash Mob, Trojan Community, Dilution Sabotage, Eclipse Attack). Admin endpoints: `POST /api/admin/populate-test-data`, `GET /api/admin/validate-algorithm`.
        *   **Signal Confidence Tiers**: Recommended thresholds derived from validated test scenarios:
            *   ≥75: High Confidence (almost certainly human)
            *   ≥65: Likely Human (organic redundancy)
            *   50-64: Uncertain (could be newcomer OR attack)
            *   <50: Low Confidence (most attack patterns)
    *   **Outgoing Vouch Adjustment**: Applies a piecewise dilution curve to penalize excessive vouching, ensuring accountability.
    *   LocalHealth is purely graph-based, independent of economic factors.
*   **LocalHealth Score Caching**: Scores are cached in `contexts` table for fast API responses.
*   **Scheduled Network Recalculation (Dec 2025)**: 
    *   **6-Hour Batch Computation**: RecalculationScheduler runs network-wide LocalHealth computation automatically every 6 hours on server boot
    *   **No On-Vouch Recalculation**: Removed expensive per-vouch recomputation for performance (network-wide computation required for accurate scores)
    *   **Admin Endpoints**: `GET /api/admin/scheduler-status` (check next run), `POST /api/admin/scheduler-run-now` (trigger immediate recalculation)
    *   **Manual Override**: Admin can still trigger recalculation via `POST /api/admin/recalculate-network`
*   **Advanced Algorithm Analytics**: Mathematician-focused Dashboard with 8 analytics endpoints for convergence metrics, vouch timelines, flow/redundancy correlation, voucher strength distribution, flow saturation, dilution zones, network resilience, and adaptive baseline monitoring.
*   **Network Traction API**: `/api/stats/network-traction` endpoint providing aggregated LocalHealth-focused metrics for network health, distribution, and dilution.
*   **Signal-Focused Pages (Dec 2025)**: All public-facing pages use "Signal" in user-facing copy (internal code uses LocalHealth):
    *   **Landing page**: Hero stats show Vouchers, Vouches, Scored Users, Avg Signal. Network Traction section shows graph density, vouches per user, quality voucher %, and Signal distribution.
    *   **Status page**: Shows network signal metrics, aggregate Signal, score distribution, dilution zones, graph density, and algorithm explanations.
    *   **Admin page**: Recalculation description updated to reflect current algorithm.

### System Design Choices
*   **TypeScript Everywhere**: Enhances code quality and maintainability.
*   **Component-First UI**: Promotes reusable components.
*   **Epoch Progression System**: Manages epoch lifecycle and data immutability.
*   **Address Normalization**: All Ethereum addresses are normalized to lowercase.
*   **Simulation Framework**: Interactive tool for validating max-flow implementations.

## External Dependencies

*   **Frontend Libraries**: Radix UI, Tailwind CSS, TanStack Query, Wouter, Lucide React, date-fns, Wagmi v2, @reown/appkit.
*   **Backend Libraries**: Express, Drizzle ORM, @neondatabase/serverless, ws, Zod.
*   **Development Tools**: Vite, TypeScript, ESBuild.
*   **Typography Fonts**: Google Fonts (Inter, JetBrains Mono).