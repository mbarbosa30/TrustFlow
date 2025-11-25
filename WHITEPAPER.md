# MaxFlow: Sybil-Resistant Graph Signal Infrastructure via Recursive Trust Weighting

**Version 1.0 — November 2025**

---

## Abstract

We present MaxFlow, a decentralized reputation infrastructure that computes verifiable network quality scores from endorsement graphs using max-flow/min-cut algorithms with recursive trust weighting. Unlike existing Sybil detection systems that rely on centralized attestors or fixed seed sets, MaxFlow provides neutral, mathematically-derived signals that applications interpret based on their specific needs—creditworthiness for lending, governance weight for DAOs, access control for communities, or allocation efficiency for grants.

The system implements a dual-layer scoring model: **LocalHealth** (0-100) measures personal network quality using an iterative PageRank-style algorithm where vouches are weighted by voucher strength, and **STS** (Standardized Trust Score, 0-100) provides community-specific scoring with community-managed seed sets. All endorsements are publicly visible and stored in a Merkle transparency log, enabling third-party verification.

Key contributions include: (1) recursive trust weighting that propagates quality through endorsement chains, (2) a dilution penalty mechanism that creates economic cost for vouch spam, (3) epoch-lagged capacity assignment preventing distance manipulation, and (4) separation of scoring from rewards to preserve signal integrity.

---

## 1. Introduction

### 1.1 The Sybil Problem in Decentralized Systems

Sybil attacks—where adversaries create multiple fake identities to gain disproportionate influence—represent a fundamental challenge in decentralized systems. Traditional solutions fall into three categories:

1. **Proof-of-work/stake**: Ties identity to scarce resources, but excludes legitimate users without capital
2. **Centralized attestation**: Relies on trusted third parties (KYC, social media verification), compromising decentralization
3. **Web-of-trust**: Leverages social graph structure, but suffers from seed capture and manipulation

MaxFlow advances the web-of-trust approach by introducing recursive trust weighting and accountability mechanisms that address historical vulnerabilities.

### 1.2 Design Principles

MaxFlow is built on four core principles:

1. **Neutrality**: Scores are signals, not prescriptions. The infrastructure computes flow, redundancy, and penalties; applications decide what these signals mean.

2. **Verifiability**: All inputs (endorsements) are public. Computation is deterministic and epoch-pinned, enabling independent verification.

3. **Accountability**: Endorsing has costs. Users who spam vouches or endorse low-quality participants see their own scores penalized.

4. **Separation of Concerns**: Economic rewards (KUDOS tokens) are derived from scores but never influence them, preserving graph-based signal integrity.

### 1.3 Contribution Summary

This paper makes the following contributions:

- **Recursive Trust Weighting**: An iterative algorithm where edge capacities equal voucher LocalHealth scores, creating trust propagation through endorsement chains
- **Effective Redundancy Metric**: Combines direct vouch count, upstream supporter depth, and network connectivity density
- **Dilution Penalty**: Linear penalty for excessive outgoing vouches, capped to avoid destroying legitimate connector nodes
- **Dual Scoring Model**: LocalHealth for personal networks, STS for community-specific reputation
- **Parameter Rationale**: Derivation and calibration of all algorithm constants

---

## 2. Related Work

### 2.1 Advogato and Max-Flow Trust Metrics

Levien (1998) introduced the max-flow trust metric for Advogato, using network flow algorithms to compute trust from seeds. The key insight: a user's trust is bounded by the number of edge-disjoint paths connecting them to trusted seeds.

MaxFlow extends Advogato with:
- Epoch-lagged capacity assignment (prevents gaming distance)
- Node-splitting for capacity limits (Advogato-style)
- Iterative score computation (recursive weighting)

### 2.2 EigenTrust and PageRank-Based Systems

Kamvar et al. (2003) proposed EigenTrust for P2P networks, using PageRank-style iteration to aggregate local trust values. EigenTrust suffers from:
- Convergence instability in sparse graphs
- Pre-trusted peer manipulation
- No accountability for endorsement spam

MaxFlow addresses these by:
- Bounded iteration (max 10 rounds, Δ < 0.5 threshold)
- Dilution penalty for excessive endorsements
- Dual-mode scoring (personal vs. community)

### 2.3 Web3 Identity Solutions

Modern solutions like Gitcoin Passport, BrightID, and Proof of Humanity rely on centralized attestation or in-person verification. While effective, they:
- Create single points of failure
- Require physical presence or platform accounts
- Cannot capture endorsement quality gradients

MaxFlow provides complementary infrastructure that can incorporate such attestations as seed quality signals while remaining permissionless.

---

## 3. System Architecture

### 3.1 Endorsement Graph Model

The fundamental data structure is a directed graph G = (V, E) where:
- V = set of user addresses (Ethereum addresses, normalized to lowercase)
- E = set of endorsements, each e = (endorser, endorsee, epoch, community)

Endorsements are:
- **Binary**: Users either vouch or don't (no fractional trust)
- **Public**: All vouches visible in Merkle transparency log
- **Immutable**: Once recorded, endorsements persist (revocation planned)

### 3.2 Dual Scoring Model

MaxFlow computes two score families:

**LocalHealth (Personal Networks)**
- Range: 0-100
- Scope: User's own endorsement network
- Algorithm: Iterative recursive trust weighting
- Use case: Personal reputation, creditworthiness

**STS (Standardized Trust Score)**
- Range: 0-100
- Scope: Community-specific with managed seed set
- Algorithm: Advogato-style max-flow with percentile normalization
- Use case: Community governance, access control

### 3.3 Epoch-Based Computation

Scoring operates in discrete epochs to ensure:
- **Determinism**: Same inputs produce same outputs
- **Auditability**: Epoch attestations include Merkle roots and signatures
- **Anti-gaming**: Capacities use distances from previous epoch's accepted graph

Each epoch produces:
- Per-user scores with component breakdown
- Network-wide statistics (distributions, seed saturation)
- Signed attestation for verification

### 3.4 Transparency Log

All endorsements are recorded in a Merkle tree structure:
- Leaf = hash(endorser || endorsee || epoch || timestamp)
- Root published per epoch
- Enables inclusion proofs for third-party verification

---

## 4. LocalHealth Algorithm

### 4.1 Overview

LocalHealth measures personal network quality using an iterative algorithm where vouches are weighted by voucher strength. The key insight: a vouch from someone with LocalHealth 90 should count more than a vouch from someone with LocalHealth 20.

### 4.2 Iterative Computation

```
ALGORITHM: ComputeLocalHealthIterative
INPUT: addresses[], endorsements[], maxIterations=10, threshold=0.5
OUTPUT: Map<address, LocalHealth>

1. Initialize scores:
   FOR each address a IN addresses:
     incomingCount ← count endorsements where endorsee = a
     scores[a] ← min(100, sqrt(incomingCount) × 20)

2. Iterate until convergence:
   FOR iteration = 1 TO maxIterations:
     maxChange ← 0
     FOR each address a IN addresses:
       newScore ← ComputePureOption2Score(a, endorsements, scores)
       maxChange ← max(maxChange, |newScore - scores[a]|)
       scores[a] ← newScore
     IF maxChange < threshold:
       BREAK

3. RETURN scores
```

### 4.3 Single-User Score Computation

For each user, LocalHealth combines two components:

```
LocalHealth = 60 × (flowScore)² + 40 × (redundancy)² × vouchQuality
```

Where:
- **flowScore** ∈ [0, 1]: Weighted incoming trust, normalized
- **redundancy** ∈ [0, 1]: Network structural resilience
- **vouchQuality** ∈ [0.5, 1.0]: Dilution penalty factor

### 4.4 Flow Component (60%)

The flow component measures quality of incoming endorsements:

```
directFlow = Σ(voucherScore_j / 100) for each voucher j
flowScore = min(1.0, directFlow / HEALTHY_VOUCH_COUNT)
flowComponent = 60 × (flowScore)²
```

**Key properties:**
- Vouches weighted by voucher's LocalHealth (recursive trust)
- Normalized by HEALTHY_VOUCH_COUNT = 5 (calibration target)
- Quadratic scaling spreads 0-100 range across active users

**Example calculations:**
| Vouchers | Avg Strength | directFlow | flowScore | Flow Pts |
|----------|--------------|------------|-----------|----------|
| 1 | 50% | 0.5 | 0.10 | 0.6 |
| 3 | 70% | 2.1 | 0.42 | 10.6 |
| 5 | 80% | 4.0 | 0.80 | 38.4 |
| 8 | 90% | 7.2 | 1.00 | 60.0 |

### 4.5 Redundancy Component (40%)

The redundancy component measures structural resilience—how many independent paths connect you to the network:

```
ALGORITHM: ComputeEffectiveRedundancy
INPUT: ownerAddress, directVouchers, endorsements

1. Build ego subgraph via upstream BFS from vouchers:
   FOR each voucher v IN directVouchers:
     Add v to egoSubgraph
     BFS upstream (find who vouches for v, recursively)
   Remove owner from egoSubgraph

2. Count edges within ego subgraph:
   egoEdgeCount ← count edges where both endpoints in egoSubgraph

3. Compute effective redundancy:
   baseRedundancy ← |directVouchers|
   depthBonus ← max(0, |egoSubgraph| - |directVouchers|) × 0.2
   edgeDensity ← egoEdgeCount / (|egoSubgraph| × (|egoSubgraph| - 1))
   connectivityBonus ← edgeDensity × |egoSubgraph|
   
   effectiveRedundancy ← baseRedundancy + depthBonus + connectivityBonus

4. Normalize and apply quadratic scaling:
   redundancy ← min(1.0, effectiveRedundancy / HEALTHY_REDUNDANCY)
   redundancyComponent ← 40 × (redundancy)²
```

**Component weights:**
- Base count: 1 point per direct voucher
- Depth bonus: 0.2 points per upstream supporter beyond vouchers
- Connectivity bonus: Edge density × ego size

### 4.6 Dilution Penalty (Accountability)

Users who endorse excessively face a penalty on their redundancy component:

```
IF outgoingVouches > DILUTION_THRESHOLD (10):
  excess ← outgoingVouches - DILUTION_THRESHOLD
  dilutionPenalty ← 0.1 × excess  // 10% per excess vouch
  vouchQualityFactor ← max(0.5, 1 - dilutionPenalty)  // Cap at 50%
ELSE:
  vouchQualityFactor ← 1.0
```

**Worked example:**
- User with LocalHealth 79.6 (flow 60, redundancy 19.6)
- Gives 15 vouches (5 excess)
- Dilution: 50% × 0.5 = 25% redundancy penalty
- New redundancy: 19.6 × 0.75 = 14.7
- New LocalHealth: 60 + 14.7 = 74.7 (6.2% reduction)

### 4.7 Convergence Analysis

**Claim**: The iterative algorithm converges in O(log n) iterations for bounded-degree graphs.

**Proof sketch**:
1. Scores are bounded in [0, 100]
2. Each iteration is a contractive map: |f(x) - f(y)| ≤ k|x - y| for k < 1
3. Contraction factor k ≈ 0.8 from capacity normalization (voucherScore/100)
4. By Banach fixed-point theorem, convergence in ⌈log_{1/k}(100/threshold)⌉ iterations

**Empirical observations:**
- Sparse graphs (avg degree < 5): 3-5 iterations
- Dense graphs (avg degree > 10): 6-8 iterations
- Threshold 0.5 ensures sub-point precision

---

## 5. Community STS Algorithm

### 5.1 Overview

STS (Standardized Trust Score) provides community-specific reputation using Advogato-style max-flow with seed-anchored trust.

### 5.2 Graph Construction (Node-Splitting)

Following Advogato, we split each user u into two nodes (u⁻, u⁺) with internal capacity:

```
FOR each user u at distance d from seeds:
  Add edge u⁻ → u⁺ with capacity c(d)
  Add edge u⁻ → SINK with capacity 1

FOR each endorsement a → b:
  Add edge a⁺ → b⁻ with capacity 1

FOR each seed s with quality score S_s:
  Add edge SOURCE → s⁻ with capacity BASE × (0.7 + 0.6 × S_s)
```

**Distance-based capacities:**
| Distance d | Capacity c(d) |
|------------|---------------|
| 0 (seed) | 800 |
| 1 | 240 |
| 2 | 96 |
| 3 | 48 |
| ≥4 | 24 |

### 5.3 Score Components

STS combines five normalized components:

```
STS = 100 × (0.55×F + 0.25×C + 0.05×S + 0.10×D + 0.05×PR)
```

Where:
- **F** (Flow): Log-normalized max-flow from SOURCE
- **C** (Cut): Min-cut capacity normalized by healthy baseline
- **S** (Stability): 1 - worst single-edge influence drop
- **D** (Depth): e^(-λd) decay from seeds (λ ≈ 0.35)
- **PR** (PageRank): Seed-personalized PageRank score

### 5.4 Robust Normalization

Components are normalized using 95th-percentile anchors to handle outliers:

```
F_i = min(1, log(1 + f_i) / log(1 + max(F_95, F̃_95)))
C_i = min(1, c_i / max(3, max(C_95, C̃_95)))
```

Where F̃_95, C̃_95 are fallback anchors from previous epochs.

### 5.5 Acceptance Tiers

```
Connected: STS ≥ 40
Verified:  STS ≥ 60 AND minCut ≥ 2
Trusted:   STS ≥ 80 AND minCut ≥ 3 AND stability ≥ 0.8
```

---

## 6. Security Analysis

### 6.1 Threat Model

We consider adversaries who can:
- Create unlimited Sybil identities
- Coordinate endorsements among Sybils
- Attempt to capture seeds or bridge nodes
- Observe all public endorsements

We assume:
- Honest seeds maintain endorsement standards
- Legitimate users don't collude with Sybils
- Epochs provide sufficient lag to detect manipulation

### 6.2 Sybil Attack Resistance

**Claim**: Creating a high-LocalHealth Sybil network is not economically viable.

**Analysis**:
1. Sybil accounts start with LocalHealth 0 (no incoming vouches)
2. Attacker must vouch for all Sybils from their main account
3. Dilution penalty activates: 50 Sybils → 40 excess vouches → 50% redundancy penalty
4. Main account loses ~20% of score to create accounts with score 0
5. Sybils only gain score from attacker's vouches, weighted by attacker's (now reduced) score
6. Recursive weighting means Sybil scores remain low

**Game-theoretic equilibrium**: Selective endorsement dominates spam.

### 6.3 Seed Capture Attacks

**Attack vector**: Compromise or create seeds to inflate Sybil scores.

**Defenses**:
1. Seed quality scoring with capacity multipliers (0.7-1.3× based on performance)
2. Coverage requirements: ≥2 high-quality seeds must endorse for acceptance
3. Seed saturation monitoring: Alert if single seed provides >30% of flow
4. Epoch-lagged distances: Cannot manipulate distance within epoch

### 6.4 Bridge Node Attacks

**Attack vector**: Create high-value connector nodes to amplify influence.

**Defenses**:
1. Dilution penalty limits outgoing vouch count
2. Min-cut requirements ensure multiple independent paths
3. Stability component penalizes single-edge dependencies

### 6.5 Convergence Attacks

**Attack vector**: Cause oscillation in iterative algorithm.

**Defense**: 
- Scores bounded in [0, 100]
- Capacity normalization ensures contraction
- Max iteration cap (10) provides bounded computation

---

## 7. Parameter Rationale

### 7.1 Weight Split: 60% Flow / 40% Redundancy

**Rationale**: Flow measures quality of incoming trust (who vouches for you); redundancy measures structural resilience (how hard to isolate you).

- 60% flow: Quality is primary signal, aligns with "good vouchers matter more"
- 40% redundancy: Sufficient for Sybil resistance via min-cut requirements
- Future: Weights may be learned from labeled Sybil detection data

### 7.2 HEALTHY_VOUCH_COUNT = 5

**Rationale**: Baseline for "healthy" incoming flow.

- Based on power-law distribution in social graphs
- Median active users have 3-7 vouchers
- 5 strong vouchers (80%+ strength) yields flowScore ≈ 0.8 → 38 pts

**Adaptive alternative**: `global_avg_vouches` for per-network calibration.

### 7.3 HEALTHY_REDUNDANCY = 20

**Rationale**: Baseline for "healthy" network redundancy.

- Composition: 5 vouchers + 10 depth bonus + 5 connectivity
- Users at this level have multiple independent paths
- Calibrated for dense networks with rich upstream graphs

### 7.4 Quadratic Scaling (exponent = 2.0)

**Rationale**: Spread 0-100 range across active users.

Without quadratic:
- Scores cluster at extremes (very low or maxed out)
- Limited differentiation in middle range

With quadratic:
- flowScore 0.5 → 15 pts (vs 30 linear)
- flowScore 0.8 → 38 pts (vs 48 linear)
- Better granularity in active user range

### 7.5 Dilution: 10% per excess, 50% cap

**Rationale**: Balance accountability with legitimate bridging.

- 10 vouches threshold: Reasonable for active community member
- 10% per excess: Strong deterrent without cliff effects
- 50% cap: Prevents complete destruction of connector nodes
- Linear (not exponential): Avoids over-punishing bridges

**Planned enhancement**: Piecewise curve with retroactive relief.

### 7.6 Convergence: max 10 iterations, Δ = 0.5

**Rationale**: Practical bounds on computation.

- Typical convergence: 3-8 iterations
- Threshold 0.5: Sub-point precision sufficient for scoring
- Max 10: Bounded computation for large networks

---

## 8. Implementation

### 8.1 Technology Stack

- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Frontend**: React with Vite, Tailwind CSS
- **Authentication**: Multi-chain wallet connection (Ethereum, Polygon, Celo, etc.)
- **Signing**: EIP-712 typed signatures for endorsements

### 8.2 Performance Considerations

**Score computation**:
- Iterative algorithm: O(n × m × k) where n=users, m=edges, k=iterations
- Typical: 1000 users, 5000 edges, 5 iterations → 25M operations
- Parallelizable per-user within each iteration round

**Caching strategy**:
- LocalHealth cached in database with timestamp
- Recalculation triggered by vouch events (give or receive)
- API serves cached scores, fresh computation on demand

### 8.3 API Design

```
GET /api/ego/:address/score
  Returns: { localHealth, voucherCount, avgVoucherStrength, ... }

POST /api/vouch
  Body: { endorsee, signature }
  Triggers: LocalHealth recalculation for both parties

GET /api/ego/:address/graph
  Returns: { nodes, links } for 3D visualization
```

---

## 9. Evaluation Framework

### 9.1 Simulation Harness (Planned)

Test scenarios:
1. **Planted communities**: Known clusters with varying inter-cluster density
2. **Sybil subgraphs**: Attacker-controlled regions of varying size
3. **Seed capture**: Compromised seeds with different quality thresholds
4. **Bridge attacks**: High-degree connector nodes

Metrics:
- Detection AUC (Sybil vs. legitimate)
- False negative rate (missed Sybils)
- Score stability across epochs
- Convergence speed

### 9.2 Real-World Deployment

Current metrics (November 2025):
- LocalHealth score range: 20.9 - 100.0
- Median LocalHealth: ~55
- Typical convergence: 4-6 iterations
- Vouch dilution adoption: Low (most users < 10 vouches)

### 9.3 Comparison Baselines

Planned comparisons:
- PageRank (centrality-based)
- In-degree count (simple popularity)
- EigenTrust (iterative averaging)
- BrightID score (attestation-based)

---

## 10. Future Work

### 10.1 Security Enhancements

- **Vertex-disjoint paths**: Require paths share no intermediate nodes
- **Per-seed flow floors**: Each of ≥2 seeds must provide ≥30% of flow
- **Cut witnesses**: Publish minimal vertex-cut sets for verification
- **Seed saturation throttles**: Limit single-seed influence

### 10.2 Algorithm Improvements

- **Learned weights**: Train component weights on labeled Sybil data
- **Adaptive baselines**: Dynamic HEALTHY_VOUCH_COUNT from network stats
- **Piecewise dilution**: Steeper penalty curve with connector exemptions
- **Smoothed seed scoring**: Exponential moving average for stability

### 10.3 Observability

- Per-epoch dashboards (score histograms, seed saturation)
- Attack detection alerts (anomalous endorsement patterns)
- Component contribution breakdowns (why my score changed?)

### 10.4 Extensions

- **Revocation support**: Ability to withdraw endorsements
- **Context-specific vouches**: Different vouch types (skill, creditworthiness)
- **Cross-community portability**: Federated score aggregation

---

## 11. Conclusion

MaxFlow provides neutral, verifiable reputation infrastructure for decentralized systems. By combining max-flow algorithms with recursive trust weighting and accountability mechanisms, it addresses fundamental weaknesses in prior web-of-trust systems.

Key innovations:
1. **Recursive weighting** propagates trust quality through endorsement chains
2. **Dilution penalty** creates economic cost for endorsement spam
3. **Dual scoring** supports both personal and community reputation
4. **Separation of rewards** preserves graph-based signal integrity

The system is deployed and actively computing scores for a growing network. Future work focuses on security hardening, weight learning, and ecosystem integration.

---

## References

1. Levien, R. (1998). "Attack-Resistant Trust Metrics for Public Key Certification." USENIX Security.

2. Kamvar, S., Schlosser, M., Garcia-Molina, H. (2003). "The EigenTrust Algorithm for Reputation Management in P2P Networks." WWW.

3. Douceur, J. (2002). "The Sybil Attack." IPTPS.

4. Ford, L., Fulkerson, D. (1956). "Maximal Flow through a Network." Canadian Journal of Mathematics.

5. Dinic, E. (1970). "Algorithm for Solution of a Problem of Maximum Flow in Networks with Power Estimation." Soviet Mathematics Doklady.

---

## Appendix A: Pseudocode Reference

### A.1 Full LocalHealth Computation

```python
def compute_local_health_iterative(addresses, endorsements, max_iter=10, threshold=0.5):
    # Initialize
    scores = {}
    for addr in addresses:
        incoming = count_incoming(addr, endorsements)
        scores[addr] = min(100, sqrt(incoming) * 20)
    
    # Iterate
    for iteration in range(max_iter):
        new_scores = {}
        max_change = 0
        
        for addr in addresses:
            result = compute_pure_option2(addr, endorsements, scores)
            new_scores[addr] = result.local_health
            max_change = max(max_change, abs(result.local_health - scores[addr]))
        
        scores = new_scores
        if max_change < threshold:
            break
    
    return scores

def compute_pure_option2(owner, endorsements, voucher_scores):
    vouchers = [e.endorser for e in endorsements if e.endorsee == owner]
    
    if len(vouchers) == 0:
        return LocalHealthResult(0)
    
    # Flow component
    direct_flow = sum(voucher_scores.get(v, 50) / 100 for v in vouchers)
    flow_score = min(1.0, direct_flow / HEALTHY_VOUCH_COUNT)
    flow_component = 60 * (flow_score ** 2)
    
    # Redundancy component
    ego_subgraph = build_upstream_subgraph(vouchers, endorsements)
    ego_subgraph.discard(owner)
    
    ego_edges = count_internal_edges(ego_subgraph, endorsements)
    base = len(vouchers)
    depth_bonus = max(0, len(ego_subgraph) - len(vouchers)) * 0.2
    density = ego_edges / max(1, len(ego_subgraph) * (len(ego_subgraph) - 1))
    connectivity = density * len(ego_subgraph)
    
    effective_redundancy = base + depth_bonus + connectivity
    redundancy = min(1.0, effective_redundancy / HEALTHY_REDUNDANCY)
    
    # Dilution penalty
    outgoing = count_outgoing(owner, endorsements)
    if outgoing > DILUTION_THRESHOLD:
        excess = outgoing - DILUTION_THRESHOLD
        penalty = 0.1 * excess
        vouch_quality = max(0.5, 1 - penalty)
    else:
        vouch_quality = 1.0
    
    cut_component = 40 * (redundancy ** 2) * vouch_quality
    
    local_health = min(100, max(0, flow_component + cut_component))
    return LocalHealthResult(local_health)
```

### A.2 Constants

```python
HEALTHY_VOUCH_COUNT = 5      # Baseline for healthy incoming flow
HEALTHY_REDUNDANCY = 20      # Baseline for healthy redundancy
DILUTION_THRESHOLD = 10      # Outgoing vouches before penalty
DILUTION_RATE = 0.1          # Penalty per excess vouch
DILUTION_CAP = 0.5           # Minimum quality factor
FLOW_WEIGHT = 60             # Weight for flow component
REDUNDANCY_WEIGHT = 40       # Weight for redundancy component
SCALING_EXPONENT = 2.0       # Quadratic scaling
MAX_ITERATIONS = 10          # Iteration cap
CONVERGENCE_THRESHOLD = 0.5  # Score change threshold
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **LocalHealth** | Personal network quality score (0-100) computed via iterative recursive trust weighting |
| **STS** | Standardized Trust Score for community-specific reputation |
| **Vouch** | Binary endorsement from one user to another |
| **Flow Component** | Weighted sum of incoming voucher strengths |
| **Redundancy Component** | Measure of network structural resilience |
| **Dilution Penalty** | Score reduction for excessive outgoing vouches |
| **Epoch** | Discrete time period for score computation |
| **Seed** | Trusted anchor node for community scoring |
| **Min-cut** | Minimum capacity of edges separating source from sink |
| **KUDOS** | Reward token earned from LocalHealth, does not influence scoring |

---

*MaxFlow is open infrastructure. This whitepaper describes the current implementation as of November 2025. Algorithm parameters may be updated based on empirical performance and community feedback.*
