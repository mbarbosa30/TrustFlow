## Overview

MaxFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. It supports hybrid P2P ego contexts alongside traditional communities, enabling every user to run their own seeded trust network. The system offers dual-layer scoring: Personal Networks (Local Health) for user-seeded trust and Community Reputation (STS) for context-specific trust. All vouches are publicly visible and stored on-chain in a Merkle transparency log. MaxFlow also supports multi-tenant trust graphs through "Communities" with custom policies, an economic layer providing daily USDC distribution and a microcredit lending system based on trust, and an off-chain KUDOS token economy for reputation-based rewards.

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
*   **Microcredit Lending System**: Community-opt-in USDC microlending with configurable parameters, installment schedules, and various subsidy systems.
*   **API Integration**: Provides a minimal REST API for third-party applications to integrate with MaxFlow, using community API keys and EIP-712 signatures.
*   **Dual Scoring Model**:
    *   **Local Health (Ego Score)**: Personal network quality score (0-100) using max-flow/min-cut algorithms. Supports two modes:
        *   **Pure Option 2 (Default)**: No co-seeds required. Measures "how much the network trusts me" by computing flow from direct vouchers to the owner. Formula: `60 × avgResidualFlow + 40 × min(1, medianMinCut/voucherCount)`. Intuitive for users: more vouches = higher score.
        *   **Hybrid Mode (Optional)**: When co-seeds are selected, measures "connection quality within my trusted circle" for enhanced Sybil resistance. Flow computed from co-seeds through network to owner.
    *   **Scoring Weights**: 60% flow component (incoming trust saturation), 40% cut component (network redundancy). Emphasizes incoming trust while maintaining Sybil resistance.
    *   **KUDOS Integration**: Edge capacities boosted by KUDOS transfers (exponential decay, 180-day halflife). Boost multiplier: `1 + min(1, kudosWeight/100)`, max 2x.
    *   **Global Trust (Planned)**: Cross-network reputation score combining Local Health and Incoming Flow.
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