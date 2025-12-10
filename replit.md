## Overview

MaxFlow is a Sybil-resistant graph signal infrastructure designed to compute verifiable network quality scores using max-flow/min-cut algorithms. It generates two key, neutral, and mathematically-derived signals: LocalHealth (0-100) for personal network quality and STS (0-100) for community reputation. These signals can be interpreted by various applications for purposes such as creditworthiness assessment, governance weight allocation, or access control. The system employs a dual-layer scoring mechanism and stores all vouches on-chain in a Merkle transparency log. MaxFlow leverages nature-inspired narratives and analogies to explain its robust, ungameable design, drawing parallels to concepts like flow capacity (rivers), recursive trust (root systems), path redundancy (mycorrhizal networks), and dilution penalties (ecosystem pruning).

## User Preferences

Preferred communication style: Simple, everyday language.

### Naming Convention
*   **Internal Code**: Use `LocalHealth` for variable names, types, and function names (e.g., `avgLocalHealth`, `getLocalHealthScore`)
*   **User-Facing Copy**: Use "Signal" in all UI text, headings, and descriptions (e.g., "Your Signal: 72", "Average Signal", "Signal Distribution")
*   **Conceptual Framing**: The algorithm computes signal vs noise—genuine trust (signal) from Sybil attacks and fake accounts (noise)

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript using Vite, Shadcn/ui (Radix UI, Tailwind CSS), and Material Design 3 principles. It uses Inter and JetBrains Mono fonts, custom CSS variable themes for light/dark mode, and prioritizes WCAG accessibility standards. The design system, "Multi-Biome," employs nature-inspired color palettes for semantic meaning and data visualization.

### Technical Implementations
The backend is an Express.js and TypeScript (Node.js) application offering RESTful APIs. Data is managed in PostgreSQL via Neon serverless with Drizzle ORM. Multi-network authentication (Ethereum, Celo, Polygon, Arbitrum, Optimism, Base) and off-chain EIP-712 signatures are handled by Reown AppKit. The project uses a monorepo structure.

Key features include:
*   **KUDOS Token Economy**: An off-chain rewards layer based on LocalHealth scores.
*   **Privacy by Default**: Aggregated scores and opted-in reveals are public; endorsement graphs remain opaque.
*   **Binary Vouch Model**: Simplified endorsements with a 90-day activity-based validity window and manual revocation.
*   **Epoch-Based Computation**: Deterministic, versioned scoring.
*   **Portable Credentials**: W3C Verifiable Credentials compatible signed JSON objects.
*   **STS Calculation**: Uses Seed Quality Scoring and Seed-Personalized PageRank.
*   **Communities Architecture**: Supports isolated scoring with custom policies.
*   **Ego Context Architecture**: Manages personal trust networks.
*   **Economic Layer**: Daily USDC distribution on Celo based on STS scores.
*   **Microcredit Lending System**: Community-opt-in USDC microlending.
*   **API Integration**: A minimal REST API with tiered performance for cached bulk data and on-demand single-user details, with rate limiting. Admin endpoints are publicly accessible with rate limiting only.
*   **Dual Scoring Model**:
    *   **LocalHealth (Ego Score)**: Personal network quality (0-100) using max-flow/min-cut algorithms with recursive trust weighting (Pure Option 2). This involves a Flow Component and a Redundancy Component (using Dinic's algorithm for true min-cut). It includes adaptive baselines, tiered capacity weighting for vouchers, flash mob protection, diminishing returns for higher scores, quality gates, and a quality bonus. Computation is network-wide and iterative.
    *   **Outgoing Vouch Adjustment**: Applies a piecewise dilution curve to penalize excessive vouching.
*   **LocalHealth Score Caching**: Scores are cached in the `contexts` table.
*   **Scheduled Network Recalculation**: Network-wide LocalHealth computation runs automatically every 6 hours, with admin control for status and immediate runs.
*   **Advanced Algorithm Analytics**: Dashboard with 8 analytics endpoints for mathematicians.
*   **Network Traction API**: Endpoint providing aggregated LocalHealth-focused metrics.
*   **Signal-Focused Pages**: Public-facing pages use "Signal" in user-facing copy.

### System Design Choices
*   **TypeScript Everywhere**: For code quality.
*   **Component-First UI**: For reusability.
*   **Epoch Progression System**: For epoch lifecycle and data immutability.
*   **Address Normalization**: All Ethereum addresses are normalized.
*   **Simulation Framework**: Interactive tool for max-flow validation.

## External Dependencies

*   **Frontend Libraries**: Radix UI, Tailwind CSS, TanStack Query, Wouter, Lucide React, date-fns, Wagmi v2, @reown/appkit.
*   **Backend Libraries**: Express, Drizzle ORM, @neondatabase/serverless, ws, Zod.
*   **Development Tools**: Vite, TypeScript, ESBuild.
*   **Typography Fonts**: Google Fonts (Inter, JetBrains Mono).