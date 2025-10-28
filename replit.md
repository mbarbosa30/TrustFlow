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

**Current Implementation**: Reown AppKit integration for multi-network authentication
- Supports multiple networks: Ethereum, Celo, Polygon, Arbitrum, Optimism, Base
- Email, phone, social (Google, Twitter, Discord, GitHub) authentication methods via Reown features
- Traditional wallet connections (MetaMask, Coinbase, WalletConnect, etc.)
- Auto-reconnect on page refresh for improved UX
- Configuration in `client/src/lib/reown.config.ts`
- Uses off-chain EIP-712 signatures - users can stay on ANY supported network (no forced network switching)
- Signature domain includes chainId matching user's current network for security and wallet compatibility

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
- **@reown/appkit**: Multi-network wallet connection and authentication SDK

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

**MULTI-NETWORK SUPPORT (October 2025)**: Implemented flexible multi-chain authentication via Reown AppKit:
- **Supported Networks**: Ethereum, Celo, Polygon, Arbitrum, Optimism, Base (users can stay on any network)
- **Authentication Methods**: Email, phone, social (Google, Twitter, Discord, GitHub) plus traditional wallet connections
- **Configuration**: Reown AppKit in `client/src/lib/reown.config.ts` with multi-network setup
- **Dynamic Signatures**: EIP-712 domain uses user's current chainId for signature security
- **No Forced Switching**: Since TrustFlow only uses off-chain signatures, users don't need to change networks
- **Backend Support**: Server accepts chainId parameter and verifies signatures with matching domain
- **Benefits**: Improved UX (no network switching prompts), broader accessibility, network-agnostic trust system

**EPOCH PROGRESSION SYSTEM (October 2025)**: Implemented proper epoch lifecycle management:
- **Schema Changes**: Added `status` ('active'/'closed') and `closedAt` fields to `epochs` table
- **Storage Layer**: Created `getCurrentEpoch()`, `getEpoch()`, `createEpoch()`, `closeEpoch()`, `advanceEpoch()` methods
- **API Endpoints**: 
  - `GET /api/epoch/current` - Returns current active epoch (auto-creates epoch 0 if none exists)
  - `POST /api/epoch/advance` - Closes current epoch and creates next sequential epoch
- **Immutability**: Endorsements to closed epochs are rejected with validation error
- **Frontend Integration**:
  - EndorseForm dynamically fetches current epoch (no hardcoded epoch 0)
  - Seeds page displays current epoch status with "Advance Epoch" button
  - Dashboard shows current epoch number and queries health data for active epoch
  - All compute/reset operations use current epoch dynamically
- **Sequential Progression**: Each new epoch builds on the accepted subgraph from previous epoch
- **Benefits**: Proper epoch lifecycle, immutable historical data, supports multi-epoch trust evolution

**ADDRESS NORMALIZATION (October 2025)**: Fixed critical case-sensitivity bug in scoring algorithm:
- **Problem**: JavaScript Set/Map treated addresses with different casing as separate users (e.g., "0x216844eF..." vs "0x216844ef...")
- **Impact**: Scoring algorithm was creating duplicate user nodes, causing incorrect network size calculations and missing scores for legitimate users
- **Solution**: Normalized all Ethereum addresses to lowercase throughout the scoring algorithm
- **Affected Methods**: 
  - `extractAllUsers()` - normalizes addresses when building user set
  - `computeDepths()` - normalizes addresses in BFS graph traversal
  - `buildUserGraph()` - normalizes addresses when building flow network
  - `calculateDepth()`, `calculateStability()`, `calculateSeedCoverage()` - normalize for map lookups and graph operations
  - `computeLaggedDepths()` - normalizes addresses from previous epoch's accepted subgraph
- **Database Impact**: All addresses are now stored in lowercase in the scores table
- **Verification**: Epoch 3 recomputation correctly processes 17 unique addresses instead of creating duplicates
- **Future Safeguards**: All address comparisons and storage operations use lowercase normalization to prevent regression

**Epoch-Based Computation**: Deterministic, versioned scoring runs that publish all inputs as verifiable artifacts

**Portable Credentials**: Trust attestations are self-contained, signed JSON objects (compatible with W3C Verifiable Credentials)

**Mock Data Strategy**: All components and pages use mock data with clear TODO markers for backend integration

**Theme System**: CSS variable-based theming supporting light/dark modes with localStorage persistence

**Accessibility**: Semantic HTML, ARIA labels, keyboard navigation via Radix UI primitives