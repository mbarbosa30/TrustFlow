# TrustFlow - Privacy-First Trust Network

## Overview

TrustFlow is a Sybil-resistant trust scoring system that converts private endorsements into verifiable trust attestations using max-flow/min-cut graph algorithms. The application computes standardized trust scores (STS) from a curated seed set and issues portable credentials (JWT/VC) that users can present to third-party applications.

**Core Concept**: Users endorse others at three levels (Human, Known, Trusted), which are stored as cryptographic commitments to preserve privacy. Periodically, the system runs graph flow algorithms to calculate trust scores, path redundancy (min-cut), and stability metrics. Users receive tier badges (Apprentice, Journeyer, Master) based on their scores and can export signed attestations for use in external systems.

**Key Features**:
- Privacy-preserving endorsement storage (commitments only, not raw edges)
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
- Overview: Unified personal dashboard with score card, endorsement form, and endorsements list
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
- **Edges**: commitment hash, endorser_id, endorsee_id, level (Human/Known/Trusted), epoch_introduced, revoked flag
- **Epochs**: id, graph_root (Merkle), seed_root (Merkle), params_hash, created_at, scores_hash, signature
- **Scores**: user_id, epoch_id, tier, STS, flow, min_cut, stability, percentile

**Privacy Model**: Endorsements stored as salted commitments, not raw edges. Mutual reveal requires both parties' consent.

### Authentication and Authorization

**Planned Approach** (not yet implemented):
- Wallet-based authentication using Sign-In With Ethereum (SIWE) / EIP-712
- DID (Decentralized Identifier) system binding multiple wallets to a single trust subject
- Optional linking of Web2 identifiers (ENS, Farcaster, email/phone hashes)

**Current State**: No authentication system implemented; scaffolded in storage interface

### External Dependencies

**Frontend Libraries**:
- **Radix UI**: Headless component primitives (dialogs, accordions, tooltips, etc.)
- **Tailwind CSS**: Utility-first styling framework
- **TanStack Query**: Async state management
- **Wouter**: Client-side routing
- **Lucide React**: Icon library
- **date-fns**: Date manipulation

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

**Epoch-Based Computation**: Deterministic, versioned scoring runs that publish all inputs as verifiable artifacts

**Portable Credentials**: Trust attestations are self-contained, signed JSON objects (compatible with W3C Verifiable Credentials)

**Mock Data Strategy**: All components and pages use mock data with clear TODO markers for backend integration

**Theme System**: CSS variable-based theming supporting light/dark modes with localStorage persistence

**Accessibility**: Semantic HTML, ARIA labels, keyboard navigation via Radix UI primitives