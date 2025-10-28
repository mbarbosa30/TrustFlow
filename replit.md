# TrustFlow - Public Verifiable Trust Network

## Overview

TrustFlow is a Sybil-resistant trust scoring system that converts public vouches into verifiable trust attestations using max-flow/min-cut graph algorithms. The application computes standardized trust scores (STS) from a curated seed set and issues portable credentials (JWT/VC) that users can present to third-party applications.

**Core Concept**: Users vouch for others using a simple binary endorsement system. All vouches are publicly visible and stored on-chain in a Merkle transparency log for complete auditability. Periodically, the system runs graph flow algorithms to calculate trust scores, path redundancy (min-cut), and stability metrics. Users receive tier badges (Apprentice, Journeyer, Master) based on their scores and can export signed attestations for use in external systems.

**Key Features**:
- Fully public, verifiable vouch graph with Merkle transparency log
- Deterministic, reproducible epoch-based scoring
- Portable trust attestations with cryptographic signatures
- Explainability tools showing trust paths and score breakdowns
- Global dashboard with network statistics and metrics

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI System**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling. The design follows Material Design 3 principles adapted for Web3 contexts, emphasizing clarity for complex trust metrics.

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Client-side state is primarily React hooks-based.

**Routing**: Wouter for lightweight client-side routing

**Design Tokens**:
- Typography: Inter for UI elements, JetBrains Mono for technical data (addresses, commitments, timestamps)
- Custom theme system with CSS variables for light/dark modes
- Spacing based on Tailwind's 4px grid (2, 4, 6, 8, 12, 16 units)
- Custom elevation system using opacity-based overlays

**Key Pages**:
- Dashboard: Global network statistics and recent activity
- Overview: Unified personal dashboard with score card, vouch form, and vouches list
- Why Score: Explainability interface showing flow paths, bottlenecks, stability
- Verify: Validate trust attestations from others
- FAQs, How It Works, Use Cases: Static documentation pages

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js

**API Design**: RESTful endpoints under `/api` prefix (currently scaffolded but not implemented)

**Storage Layer**: Currently using in-memory storage (`MemStorage` class) with interface (`IStorage`) designed for future database implementation

**Database Setup**: Configured for PostgreSQL via Neon serverless with Drizzle ORM
- Schema defined in `shared/schema.ts`
- Migrations configured via `drizzle.config.ts`
- Connection pooling via `@neondatabase/serverless`

**Development Server**: Vite middleware mode for HMR during development, with production build outputting to `dist/`

### Data Storage Solutions

**Current State**: In-memory storage with placeholder User model (id, username, password)

**Planned Schema** (based on design documents):
- **Users**: id, pubkey/DID, wallet addresses, optional profile fields
- **Edges**: commitment hash, endorser_id, endorsee_id, epoch_introduced, revoked flag (binary vouch, no levels)
- **Epochs**: id, graph_root (Merkle), seed_root (Merkle), params_hash, created_at, scores_hash, signature
- **Scores**: user_id, epoch_id, tier, STS, flow, min_cut, stability, percentile

**Transparency Model**: Vouches are fully public and stored on-chain in a Merkle transparency log. All endorsements are visible and auditable, enabling complete verification of trust score computations.

### Authentication and Authorization

**Current Implementation**: WaaP (Wallet as a Protocol) integration for one-click authentication
- Uses @human.tech/waap-sdk via custom wagmi connector
- Supports email, phone, social (Google, Twitter, Discord, GitHub) authentication methods
- Auto-reconnect on page refresh for improved UX
- EIP-1193 compliant interface with full multi-chain support
- Configuration in `client/src/lib/waap.config.ts` and `client/src/lib/waap.connector.ts`
- WalletConnect component prioritizes WaaP "Sign In" flow over traditional wallet connections

**Future Enhancements**:
- DID (Decentralized Identifier) system binding multiple wallets to a single trust subject
- Optional linking of Web2 identifiers (ENS, Farcaster, email/phone hashes)
- Enhanced wallet signature verification for seed management endpoints

### External Dependencies

**Frontend Libraries**:
- **Radix UI**: Headless component primitives (dialogs, accordions, tooltips, etc.)
- **Tailwind CSS**: Utility-first styling framework
- **TanStack Query**: Async state management
- **Wouter**: Client-side routing
- **Lucide React**: Icon library
- **date-fns**: Date manipulation
- **Wagmi v2**: React hooks for Ethereum with viem
- **@human.tech/waap-sdk**: WaaP authentication SDK for one-click sign-in

**Backend Libraries**:
- **Express**: HTTP server framework
- **Drizzle ORM**: TypeScript-first ORM for PostgreSQL
- **@neondatabase/serverless**: Serverless Postgres driver with WebSocket support
- **ws**: WebSocket library for Neon connection
- **Zod**: Schema validation (via drizzle-zod)

**Development Tools**:
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety across stack
- **ESBuild**: Production server bundling
- **Replit plugins**: Error overlay, dev banner, cartographer (development only)

**Third-Party Services** (planned/referenced in design docs):
- Trust computation engine (max-flow/min-cut algorithm runner)
- Cryptographic signing service for attestations
- Merkle tree generation for epoch artifacts
- Optional: IPFS/Arweave for epoch artifact storage

**Typography Fonts**:
- Google Fonts: Inter (400, 500, 600, 700 weights)
- Google Fonts: JetBrains Mono (400, 500 weights)

### Key Architectural Decisions

**Monorepo Structure**: Single repository with `client/`, `server/`, and `shared/` directories for code reuse

**TypeScript Everywhere**: Shared type definitions between frontend and backend via `shared/` directory

**Component-First UI**: Reusable, tested components with example implementations in `client/src/components/examples/`

**Privacy by Default**: Endorsement graph is opaque; only aggregated scores and opted-in reveals are public

**ARCHITECTURAL CHANGE (October 2025)**: System redesigned from three-level endorsement system (Human 0.4, Known 0.7, Trusted 1.0) to single binary vouch model. Key changes:
- **Endorsement Model**: Changed from weighted three-level system to simple binary vouches
- **Privacy Model**: Changed from privacy-preserving commitments to fully public, verifiable vouches on-chain
- **Rationale**: 
  - Max-flow/min-cut works the same with binary edges + node capacity budgets
  - Transparent connection weights create social friction between friends/communities
  - No clear incentive to signal human vs. known status
  - Aligns with Levien/Advogato trust metric systems
- **Schema Impact**: Removed `level` field from `publicEndorsements` table
- **UI Impact**: Simplified vouch form, removed level selector, updated all explanation pages

**DATA INTEGRITY UPDATE (October 2025)**: Removed all mock data from frontend pages to ensure production-ready state:
- **Dashboard**: Now queries real API endpoints (`/api/stats`, `/api/endorsements`, `/api/epoch/0/health`). Removed mock charts for analytics that don't have real data yet
- **WhyScore**: Replaced mock flow paths/bottlenecks with message explaining epoch-based calculations
- **Status**: Already using real data from `/api/epoch/0/health`
- **Overview**: Already using real data from database queries
- **Backend**: Created `/api/stats` endpoint that aggregates real network statistics (total users, endorsements, endorsers, endorsees)
- All pages gracefully handle empty database states with appropriate loading/empty state messages

**WAAP INTEGRATION (October 2025)**: Integrated WaaP (Wallet as a Protocol) for improved authentication UX:
- **Authentication Methods**: Email, phone, social (Google, Twitter, Discord, GitHub) plus traditional wallet options
- **Custom Connector**: Created wagmi v2 connector (`waap.connector.ts`) implementing EIP-1193 interface
- **Configuration**: TrustFlow-specific config in `waap.config.ts` with branding and auth method settings
- **UI Updates**: WalletConnect component detects WaaP and shows "Sign In" instead of "Connect Wallet"
- **Connector Priority**: WaaP connector listed first in wagmi config for default selection
- **Benefits**: No browser extensions required, auto-reconnect, gas sponsorship capabilities
- **Compatibility**: Maintains full backward compatibility with existing wallet connectors (injected, Coinbase, WalletConnect)

**Epoch-Based Computation**: Deterministic, versioned scoring runs that publish all inputs as verifiable artifacts

**Portable Credentials**: Trust attestations are self-contained, signed JSON objects (compatible with W3C Verifiable Credentials)

**Mock Data Strategy**: All components and pages use mock data with clear TODO markers for backend integration

**Theme System**: CSS variable-based theming supporting light/dark modes with localStorage persistence

**Accessibility**: Semantic HTML, ARIA labels, keyboard navigation via Radix UI primitives