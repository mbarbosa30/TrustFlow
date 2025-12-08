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
        *   **Redundancy**: Combines direct vouches, depth bonus, connectivity bonus, and vertex-disjoint path bonus for Sybil resistance.
        *   **Adaptive Baselines**: Dynamically computes healthy baselines from network percentiles (75th percentile vouch count), clamped to 4-15 vouches.
    *   **Outgoing Vouch Adjustment**: Applies a piecewise dilution curve to penalize excessive vouching, ensuring accountability.
    *   LocalHealth is purely graph-based, independent of economic factors.
*   **LocalHealth Score Caching**: Event-driven caching system in `contexts` table, triggering recalculation upon receiving or giving a vouch for API optimization.
*   **Network Recalculation**: Admin tool for batch computing and persisting all LocalHealth scores across the network.
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