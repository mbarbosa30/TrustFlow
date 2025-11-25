# MaxFlow: Sybil-Resistant Graph Signal Infrastructure via Recursive Trust Weighting

**Version 1.1 — November 2025**

---

## Abstract

MaxFlow is neutral reputation infrastructure that converts public binary endorsements ("vouches") into verifiable graph signals using max-flow/min-cut and recursive trust weighting. Two complementary score families are produced per epoch:

- **LocalHealth (0-100)**: A personal network quality score computed by an iterative algorithm that weights each incoming vouch by the voucher's score
- **STS (Standardized Trust Score, 0-100)**: A community score built on Advogato-style max-flow/min-cut from community-managed seeds, with robust percentile normalization

**Core properties:**
1. **Accountability** — Outgoing vouches incur a dilution penalty, creating real cost for endorsement spam
2. **Epoch-lagged capacities** — Distance-based node capacities use the previous accepted graph to prevent distance inflation
3. **Separation of concerns** — Reward layers (e.g., KUDOS) consume scores but never influence them
4. **Verifiability** — Parameters, roots, and signed outputs are published per epoch

---

## 1. Introduction

### 1.1 Problem

Sybil attacks—mass creation of fake identities—distort decentralized decision-making, grants, and access control. Attestation-heavy approaches centralize trust; purely economic ones exclude users without capital. Graph-based approaches are promising but historically vulnerable to seed capture, bridge hubs, and endorsement spam.

### 1.2 Design Principles

1. **Neutrality**: Scores are signals; applications decide what they mean (credit, governance, access, allocation)
2. **Verifiability**: Public endorsements + epoch-pinned, deterministic computation + signed attestations
3. **Accountability**: Endorsing has costs; spamming or endorsing low-quality nodes reduces your own score
4. **Separation**: Rewards never influence scoring

### 1.3 Contributions

- Recursive trust weighting (personal networks) with bounded, damped iteration
- Effective redundancy metric (count + depth + connectivity) with explicit formula & bounds
- Dilution penalty that specifically hits the redundancy term (structural resilience), capped to protect legitimate connectors
- Advogato-style STS with epoch-lagged capacities, robust normalization, and seed quality scoring
- Attestations: per-epoch params, Merkle roots, signed scores

---

## 2. Related Work

### 2.1 Advogato (Levien 1998)

Max-flow trust bounded by disjoint paths from seeds. MaxFlow extends it with:
- Epoch-lagged capacities
- Seed quality scoring
- Robust STS normalization

### 2.2 EigenTrust / PageRank

Iterative trust propagation; prone to convergence quirks & pre-trusted capture. MaxFlow uses:
- Bounded, damped iteration
- Explicit accountability penalty

### 2.3 Web3 Identity Stacks

Gitcoin Passport, BrightID, PoH provide useful attestations but are centralized or require in-person verification. MaxFlow remains permissionless and can consume such signals without depending on them.

---

## 3. System Overview

### 3.1 Graph Model

Directed graph G = (V, E):
- **Nodes**: User accounts (addresses)
- **Edges**: Binary endorsements e = (u → v) with (epoch, community)
- All endorsements are public and logged in a per-epoch Merkle tree

### 3.2 Dual Scores (per epoch)

| Score | Range | Scope | Algorithm |
|-------|-------|-------|-----------|
| LocalHealth | 0-100 | Personal network | Iterative recursive trust weighting |
| STS | 0-100 | Community | Advogato-style max-flow from seeds |

### 3.3 Epochs & Attestations

Discrete epochs ensure determinism, anti-gaming via lagged capacities, and verifiability:
- Publish `params.json`, `seed_root`, `graph_root`, `scores.jsonl` (+ signature)
- Anyone can recompute and verify hash-exact outputs

---

## 4. LocalHealth (Personal Networks)

### 4.1 Notation

For user i:

| Symbol | Definition |
|--------|------------|
| 𝒱ᵢ | Set of vouchers (incoming endorsers) |
| sⱼ | LocalHealth of voucher j ∈ [0, 100] |
| Fᵢ | directFlow = Σⱼ∈𝒱ᵢ (sⱼ / 100) |
| φᵢ | flowScore = min(1, Fᵢ / F₀), baseline F₀ = 5 |
| Rᵢ | ResidualQuality = clip[0,1](Fᵢ / max(1, |𝒱ᵢ|)) |
| ρᵢ | effectiveRedundancy from ego upstream |
| dᵢ | redundancy = min(1, ρᵢ / R₀), baseline R₀ = 20 |
| Dᵢ | DilutionFactor = max(0.5, 1 - 0.1 × max(0, outVouchesᵢ - 10)) |

### 4.2 Score Formula

We separate average voucher quality from accountability and apply the penalty only to the structural term:

```
LocalHealth_i = 60 × φᵢ² + 40 × (dᵢ² × Rᵢ × Dᵢ)
```

**Components:**
- **60% Flow**: Who vouches for you, recursively weighted
- **40% Structure × Quality × Accountability**: Path diversity (redundancy), average voucher strength (ResidualQuality), and dilution penalty (DilutionFactor)

### 4.3 Effective Redundancy (Explicit Definition)

Build an upstream ego subgraph from 𝒱ᵢ by BFS on incoming edges (who vouches for my vouchers, etc.), excluding i. Let:

| Variable | Definition |
|----------|------------|
| k | \|𝒱ᵢ\| (direct voucher count) |
| u | max(0, \|Uᵢ\| - k) (additional upstream supporters) |
| m | Internal edges in ego subgraph |
| n | \|Uᵢ\| nodes in ego subgraph |
| δ | Edge density = m / max(1, n(n-1)) |

**Formula:**
```
ρᵢ = k + λ_depth × u + λ_conn × (δ × n)

λ_depth = 0.2 (default)
λ_conn = 1.0 (default)
```

Values are defaults; can be learned/tuned (§7).

### 4.4 Iterative Computation (Damped)

Initialize sᵢ⁽⁰⁾ from |𝒱ᵢ| (e.g., min(100, 20√|𝒱ᵢ|)).

At each round:
1. Compute ŝᵢ⁽ᵗ⁺¹⁾ via the formula above using s⁽ᵗ⁾ for vouchers
2. Apply damped update:
   ```
   sᵢ⁽ᵗ⁺¹⁾ = (1 - α) × sᵢ⁽ᵗ⁾ + α × ŝᵢ⁽ᵗ⁺¹⁾
   
   α = 0.85 (default damping factor)
   ```

**Stopping criteria:** max|sᵢ⁽ᵗ⁺¹⁾ - sᵢ⁽ᵗ⁾| < ε (default 0.5) or at 10 rounds.

**Convergence note:** With damping, the update is a convex combination of the previous state and a 1-Lipschitz transform. Choosing α < 1 yields a contraction in practice; empirically ≤8 rounds for avg degree < 10.

### 4.5 Worked Examples

**Flow Component Calculations:**

| Vouchers | Avg Strength | directFlow (F) | flowScore (φ) | Flow Pts (60×φ²) |
|----------|--------------|----------------|---------------|------------------|
| 1 | 50% | 0.5 | 0.10 | 0.6 |
| 3 | 70% | 2.1 | 0.42 | 10.6 |
| 5 | 80% | 4.0 | 0.80 | 38.4 |
| 8 | 90% | 7.2 | 1.00 | 60.0 |

**Dilution Penalty Impact:**

| Outgoing Vouches | Excess | Penalty | Dᵢ Factor | Redundancy Impact |
|------------------|--------|---------|-----------|-------------------|
| ≤10 | 0 | 0% | 1.00 | None |
| 12 | 2 | 20% | 0.80 | -8 pts max |
| 15 | 5 | 50% | 0.50 | -20 pts max |
| 20+ | 10+ | 50% (cap) | 0.50 | -20 pts max |

---

## 5. STS (Community Score)

### 5.1 Graph Construction (Advogato-style with Lagged Capacities)

- Split each user u into (u⁻, u⁺) with internal capacity c(d) based on prev-epoch hop-distance d from any seed
- Add u⁻ → SINK with cap = 1
- For each vouch a → b: add a⁺ → b⁻ with cap = 1
- SOURCE → seed⁻ capacity = BASE × (0.7 + 0.6 × Sₛ) where Sₛ ∈ [0,1] is the SeedScore (§6.3)

**Default capacity schedule:**

| Distance d | Capacity c(d) |
|------------|---------------|
| 0 (seed) | 800 |
| 1 | 240 |
| 2 | 96 |
| 3 | 48 |
| ≥4 | 24 |

Can be replaced with geometric c₀ρᵈ if desired.

### 5.2 Components

For user i (in the accepted set of the epoch):

| Component | Symbol | Definition |
|-----------|--------|------------|
| Flow | fᵢ | Max-flow from SOURCE |
| Min-cut | cᵢ | Min-cut capacity |
| Depth | dᵢ | Prev-epoch distance from seeds |
| Stability | Sᵢ | 1 - min(1, Δᵢ) where Δᵢ is worst single-edge relative drop |
| PageRank | prᵢ | Seed-personalized PageRank |

**Normalization (95th-percentile robust):**

```
Fᵢ = min(1, log(1 + fᵢ) / log(1 + max(F₉₅, F̃₉₅)))
Cᵢ = min(1, cᵢ / max(3, max(C₉₅, C̃₉₅)))
Dᵢ = e^(-λdᵢ)     where λ ≈ 0.35
PRᵢ = log(1 + prᵢ) / log(1 + max(pr))
```

F̃₉₅, C̃₉₅ are fallback anchors from previous epochs for small cohorts.

### 5.3 Score Formula

```
STS_i = 100 × (0.55×Fᵢ + 0.25×Cᵢ + 0.05×Sᵢ + 0.10×Dᵢ + 0.05×PRᵢ)
```

Weights are defaults; can be learned (§7).

### 5.4 Acceptance & Tiers

**Acceptance (personal networks, neutral defaults):**
- flow ≥ 0.5 AND min-cut ≥ 2

**STS Tiers (defaults, interpretive):**

| Tier | Requirements |
|------|--------------|
| Connected | STS ≥ 40 |
| Verified | STS ≥ 60 AND min-cut ≥ 2 |
| Trusted | STS ≥ 80 AND min-cut ≥ 3 AND Stability ≥ 0.8 |

**Percentile option:** In small/volatile graphs, define tiers by percentiles for stability.

---

## 6. Security Model

### 6.1 Current Defenses

| Defense | Mechanism |
|---------|-----------|
| Epoch-lagged capacities | Prev-epoch distances prevent distance inflation |
| Min-cut floors | Require ≥2 edge-disjoint paths |
| Seed coverage ≥2 | Dust-flow mitigated via floors |
| Public vouches | Merkle log enables community auditing |
| Dilution penalty | Prices endorsement spam |

### 6.2 Planned/Shipping Enhancements

- **Vertex-disjoint paths**: Not just edge-disjoint for true independence
- **Per-seed flow floors**: Require ≥30% flow from each of ≥2 seeds to avoid dust-coverage
- **Seed saturation throttles**: Monitor and damp seeds exceeding 40-50% of total outflow
- **Cut witnesses**: Publish minimal vertex-cut witness sets with Merkle proofs
- **SeedScore smoothing**: EMA across epochs to avoid oscillations

### 6.3 Seed Quality Scoring

Seed s gets Sₛ ∈ [0,1] from:

| Component | Weight | Definition |
|-----------|--------|------------|
| Predictive validity | 35% | Influence persists without seed's edges |
| Downstream quality | 30% | STS of influenced users |
| Diversity lift | 20% | Distinct neighborhoods reached |
| Centralization penalty | 15% | Damp if seed carries >50% of outflow |

**SOURCE capacity multiplier:** 0.7 + 0.6×Sₛ ∈ [0.7, 1.3]

Only seeds with Sₛ ≥ 0.6 count toward "≥2 seeds" requirement.

### 6.4 Attack Resistance Analysis

**Sybil Network Attack:**
1. Sybil accounts start with LocalHealth 0 (no incoming vouches)
2. Attacker must vouch for all Sybils → triggers dilution penalty
3. 50 Sybils = 40 excess vouches → 50% redundancy penalty on attacker
4. Sybils only gain score weighted by attacker's (now reduced) score
5. **Result:** Not economically viable

**Seed Capture Attack:**
1. Seed quality scoring reduces captured seed's capacity multiplier
2. Coverage requirements (≥2 high-quality seeds) prevent single-seed dominance
3. Seed saturation monitoring alerts on suspicious concentration

---

## 7. Parameterization & Learning

### 7.1 Default Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| F₀ | 5 | Healthy vouch count baseline |
| R₀ | 20 | Healthy redundancy baseline |
| λ_depth | 0.2 | Depth bonus weight |
| λ_conn | 1.0 | Connectivity bonus weight |
| α | 0.85 | Iteration damping factor |
| ε | 0.5 | Convergence threshold |
| max_iter | 10 | Maximum iterations |

### 7.2 Data-Driven Refinement

Learn component weights and baselines from simulated and labeled graphs using constrained (monotone) models:

**Targets:**
- High Sybil detection AUC
- Low false-negative rate on under-connected legitimate users
- Score stability across epochs

**Method:**
- Logistic regression or monotone gradient boosting over {F, C, S, D, PR}
- Monotonicity constraints ensure interpretability
- Calibration via Platt/Isotonic scaling

### 7.3 Sensitivity Analysis

| F₀ Change | Effect on Scores |
|-----------|------------------|
| 5 → 3 | +15-25% for users with 3-4 vouchers |
| 5 → 7 | -10-15% for users with 5-6 vouchers |

| R₀ Change | Effect on Scores |
|-----------|------------------|
| 20 → 15 | +8-12% for sparse networks |
| 20 → 25 | -5-10% for most users |

### 7.4 Publishing

Include learned weights in `params.json` as "advisory defaults"; core algorithm remains neutral.

---

## 8. Implementation

### 8.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js / TypeScript (Express) |
| Database | PostgreSQL (Drizzle ORM) |
| Frontend | React / Vite / Tailwind CSS |
| Auth | Multi-chain wallets; EIP-712 signatures |

### 8.2 Performance

| Operation | Complexity | Notes |
|-----------|------------|-------|
| LocalHealth (per round) | O(\|E\|) | Trivially parallel per node |
| Full iteration | O(\|E\| × k) | k ≤ 10 rounds with damping |
| STS (per user) | O(\|E\| log \|V\|) | Push-Relabel with global relabeling |

**Caching strategy:**
- Cache LocalHealth with timestamps
- Recompute on vouch events or on-demand with freshness hints

### 8.3 API Reference

```
GET  /api/ego/:addr/score
  → { localHealth, voucherCount, residualQuality, redundancy, dilution, components }

GET  /api/ego/:addr/explain
  → { minCut, seedPaths, componentBreakdown, egoSubgraphSize }

POST /api/vouch
  → { endorsee, signature }  // triggers recomputes

GET  /api/community/:id/sts/:addr
  → { sts, F, C, S, D, PR, minCut, depth }

GET  /api/epoch/:id/attestation
  → { params.json, seed_root, graph_root, scores.jsonl, signature }
```

---

## 9. Evaluation

### 9.1 Simulation Harness (Planned)

**Scenarios:**
- Planted communities with varying inter-cluster density
- Sybil subgraphs of varying size and collusion patterns
- Seed capture attempts
- Bridge hub attacks
- Reciprocal spam networks
- Path failure scenarios

**Metrics:**
- Sybil detection AUC
- False negative rate on legitimate users
- Epoch-to-epoch stability
- Convergence rounds
- Seed saturation levels

### 9.2 Deployment Snapshot

| Metric | Value |
|--------|-------|
| LocalHealth range | ~21 - 100 |
| Median LocalHealth | ~55 |
| Typical convergence | 4-6 iterations |
| Users with dilution penalty | <5% (most have <10 outgoing vouches) |

---

## 10. Future Work

### 10.1 Security Hardening
- Ship vertex-disjoint checks & per-seed flow floors
- Publish cut witnesses and add verification endpoints

### 10.2 Algorithm Improvements
- Adaptive baselines (percentile-based F₀, R₀)
- Optional percentile-based tiers
- Piecewise dilution curve with connector exemptions

### 10.3 Feature Extensions
- Revocation/expiry for endorsements
- Typed vouches (skill, creditworthiness, etc.)
- Cross-community portability (federated aggregates)

---

## 11. Conclusion

MaxFlow computes neutral, verifiable graph signals by pairing recursive trust with structural resilience and explicit accountability. Public vouches, epoch-lagged capacities, and signed attestations yield an auditable, Sybil-resistant foundation.

Applications consume these signals to:
- Allocate capital (microcredit, grants)
- Weight governance (DAO voting)
- Gate access (communities, features)
- Route grants (quadratic funding)

—without inheriting centralized choke points.

---

## References

1. Levien, R. "Attack-Resistant Trust Metrics for Public Key Certification." USENIX Security (1998).

2. Kamvar, S., Schlosser, M., Garcia-Molina, H. "The EigenTrust Algorithm for Reputation Management in P2P Networks." WWW (2003).

3. Douceur, J. "The Sybil Attack." IPTPS (2002).

4. Ford, L., Fulkerson, D. "Maximal Flow through a Network." Canadian Journal of Mathematics (1956).

5. Dinic, E. "Algorithm for Solution of a Problem of Maximum Flow in Networks with Power Estimation." Soviet Mathematics Doklady (1970).

---

## Appendix A: Pseudocode Reference

### A.1 LocalHealth Iterative Computation

```python
def compute_local_health_iterative(addresses, endorsements, 
                                    max_iter=10, threshold=0.5, alpha=0.85):
    # Initialize scores from vouch count
    scores = {}
    for addr in addresses:
        incoming = count_incoming(addr, endorsements)
        scores[addr] = min(100, sqrt(incoming) * 20)
    
    # Iterate with damping
    for iteration in range(max_iter):
        new_scores = {}
        max_change = 0
        
        for addr in addresses:
            # Compute raw score using current voucher scores
            raw = compute_single_score(addr, endorsements, scores)
            
            # Damped update
            new_scores[addr] = (1 - alpha) * scores[addr] + alpha * raw
            max_change = max(max_change, abs(new_scores[addr] - scores[addr]))
        
        scores = new_scores
        if max_change < threshold:
            break
    
    return scores


def compute_single_score(owner, endorsements, voucher_scores):
    vouchers = get_incoming_vouchers(owner, endorsements)
    
    if len(vouchers) == 0:
        return 0
    
    # Flow component
    direct_flow = sum(voucher_scores.get(v, 50) / 100 for v in vouchers)
    flow_score = min(1.0, direct_flow / F_0)  # F_0 = 5
    flow_component = 60 * (flow_score ** 2)
    
    # Residual quality (average voucher strength)
    residual_quality = clip(direct_flow / len(vouchers), 0, 1)
    
    # Redundancy component
    ego_subgraph = build_upstream_subgraph(vouchers, endorsements)
    ego_subgraph.discard(owner)
    
    k = len(vouchers)  # direct voucher count
    u = max(0, len(ego_subgraph) - k)  # upstream supporters
    m = count_internal_edges(ego_subgraph, endorsements)
    n = len(ego_subgraph)
    delta = m / max(1, n * (n - 1))  # edge density
    
    effective_redundancy = k + LAMBDA_DEPTH * u + LAMBDA_CONN * (delta * n)
    redundancy = min(1.0, effective_redundancy / R_0)  # R_0 = 20
    
    # Dilution penalty
    outgoing = count_outgoing(owner, endorsements)
    if outgoing > DILUTION_THRESHOLD:  # 10
        excess = outgoing - DILUTION_THRESHOLD
        dilution_factor = max(0.5, 1 - 0.1 * excess)
    else:
        dilution_factor = 1.0
    
    # Structure component: redundancy² × quality × accountability
    structure_component = 40 * (redundancy ** 2) * residual_quality * dilution_factor
    
    return min(100, max(0, flow_component + structure_component))
```

### A.2 Constants

```python
# Flow baseline
F_0 = 5                    # Healthy vouch count

# Redundancy baseline
R_0 = 20                   # Healthy redundancy points

# Redundancy component weights
LAMBDA_DEPTH = 0.2         # Weight for upstream depth bonus
LAMBDA_CONN = 1.0          # Weight for connectivity bonus

# Dilution parameters
DILUTION_THRESHOLD = 10    # Outgoing vouches before penalty
DILUTION_RATE = 0.1        # Penalty per excess vouch
DILUTION_CAP = 0.5         # Minimum dilution factor

# Iteration parameters
ALPHA = 0.85               # Damping factor
MAX_ITERATIONS = 10        # Maximum rounds
CONVERGENCE_THRESHOLD = 0.5  # Score change threshold

# Score weights
FLOW_WEIGHT = 60           # Flow component weight
STRUCTURE_WEIGHT = 40      # Structure component weight
SCALING_EXPONENT = 2.0     # Quadratic scaling
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **LocalHealth** | Personal network quality score (0-100) via iterative recursive trust weighting |
| **STS** | Standardized Trust Score for community-specific reputation |
| **Vouch** | Binary endorsement from one user to another |
| **directFlow (F)** | Sum of voucher strengths: Σ(sⱼ/100) |
| **flowScore (φ)** | Normalized flow: min(1, F/F₀) |
| **ResidualQuality (R)** | Average voucher strength: F / \|vouchers\| |
| **effectiveRedundancy (ρ)** | k + λ_depth×u + λ_conn×(δ×n) |
| **redundancy (d)** | Normalized redundancy: min(1, ρ/R₀) |
| **DilutionFactor (D)** | Penalty factor for excessive outgoing vouches |
| **Epoch** | Discrete time period for score computation |
| **Seed** | Trusted anchor node for community scoring |
| **Min-cut** | Minimum capacity of edges separating source from sink |
| **KUDOS** | Reward token earned from LocalHealth; never influences scoring |
| **Damping (α)** | Iteration smoothing factor (default 0.85) |

---

*MaxFlow is open infrastructure. This whitepaper describes the implementation as of November 2025. Algorithm parameters may be updated based on empirical performance and community feedback.*
