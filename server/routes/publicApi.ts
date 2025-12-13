import type { Express } from 'express';
import { storage } from '../storage';
import { verifyEndorsementSignature, validateEndorsementFields, DOMAIN_BASE } from '../crypto/eip712';
import { computeLeafHash } from '../crypto/merkle';
import { type Address, verifyTypedData, type Hex } from 'viem';
import { rateLimit } from '../middleware/rateLimit';

const REVOCATION_TYPES = {
  Revocation: [
    { name: "endorser", type: "address" },
    { name: "endorsee", type: "address" },
    { name: "endorsementId", type: "uint256" },
  ],
} as const;

async function verifyRevocationSignature(
  endorser: Address,
  endorsee: Address,
  endorsementId: number,
  sig: Hex,
  chainId: number = 1
): Promise<boolean> {
  try {
    const domain = { ...DOMAIN_BASE, chainId };
    const message = { endorser, endorsee, endorsementId: BigInt(endorsementId) };
    
    return await verifyTypedData({
      address: endorser,
      domain,
      types: REVOCATION_TYPES,
      primaryType: "Revocation",
      message,
      signature: sig,
    });
  } catch (error) {
    console.error("Revocation signature verification failed:", error);
    return false;
  }
}

const publicRateLimit = rateLimit({
  windowMs: 60000,
  max: 200,
  keyGenerator: (req) => req.ip || 'unknown'
});

export function registerPublicApiRoutes(app: Express) {
  
  // Bulk cached scores endpoint - fast retrieval of all pre-computed LocalHealth scores
  // No computation, just database query - sub-second for 400+ users
  app.get("/api/v1/scores/cached", publicRateLimit, async (req, res) => {
    try {
      const minScore = parseInt(req.query.min_score as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 10000, 10000);
      
      // Query all ego contexts with cached LocalHealth scores
      const allContexts = await storage.getAllContexts();
      
      // Filter to ego contexts with scores, apply minScore filter
      const egoContexts = allContexts
        .filter(ctx => 
          ctx.type === 'ego' && 
          ctx.ownerAddress && 
          ctx.localHealth !== null && 
          ctx.localHealth >= minScore
        )
        .slice(0, limit);
      
      const scores = egoContexts.map(ctx => ({
        address: ctx.ownerAddress!.toLowerCase(),
        local_health: ctx.localHealth!,
        last_updated: ctx.localHealthUpdatedAt?.toISOString() || ctx.updatedAt?.toISOString() || null,
      }));
      
      // Get scheduler status for freshness info
      let schedulerInfo = null;
      try {
        const { recalculationScheduler } = await import('../services/recalculationScheduler');
        const status = recalculationScheduler.getStatus();
        schedulerInfo = {
          last_run: status.lastRunAt,
          next_run: status.nextRunAt,
          interval_hours: status.intervalHours,
        };
      } catch (e) {
        // Scheduler may not be initialized
      }
      
      res.json({
        count: scores.length,
        min_score_filter: minScore,
        scores,
        scheduler: schedulerInfo,
        note: "Scores are cached from the last network-wide computation. Use GET /api/v1/score/:address/details for on-demand detailed metrics.",
      });
    } catch (error) {
      console.error('Error getting cached scores:', error);
      res.status(500).json({ error: "Failed to get cached scores" });
    }
  });

  // Bulk cached detailed scores endpoint - returns all pre-computed scores WITH algorithm breakdowns
  // Fast: reads from cached data stored during 6-hour recalculation
  app.get("/api/v1/scores/cached/detailed", publicRateLimit, async (req, res) => {
    try {
      const minScore = parseInt(req.query.min_score as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 10000, 10000);
      
      // Query all ego contexts with cached LocalHealth scores and breakdowns
      const allContexts = await storage.getAllContexts();
      
      // Filter to ego contexts with scores, apply minScore filter
      const egoContexts = allContexts
        .filter(ctx => 
          ctx.type === 'ego' && 
          ctx.ownerAddress && 
          ctx.localHealth !== null && 
          ctx.localHealth >= minScore
        )
        .slice(0, limit);
      
      const scores = egoContexts.map(ctx => {
        const localHealth = ctx.localHealth!;
        
        // Determine confidence tier
        let confidenceTier: string;
        if (localHealth >= 75) {
          confidenceTier = "high_confidence";
        } else if (localHealth >= 65) {
          confidenceTier = "likely_human";
        } else if (localHealth >= 50) {
          confidenceTier = "uncertain";
        } else {
          confidenceTier = "low_confidence";
        }
        
        return {
          address: ctx.ownerAddress!.toLowerCase(),
          local_health: localHealth,
          confidence_tier: confidenceTier,
          flow_component: ctx.flowComponent !== null ? Math.round(ctx.flowComponent * 100) / 100 : null,
          redundancy_component: ctx.redundancyComponent !== null ? Math.round(ctx.redundancyComponent * 100) / 100 : null,
          actual_min_cut: ctx.actualMinCut !== null ? Math.round(ctx.actualMinCut * 100) / 100 : null,
          effective_redundancy: ctx.effectiveRedundancy !== null ? Math.round(ctx.effectiveRedundancy * 100) / 100 : null,
          vertex_disjoint_paths: ctx.vertexDisjointPaths,
          dilution_factor: ctx.dilutionFactor !== null ? Math.round(ctx.dilutionFactor * 1000) / 1000 : null,
          incoming_active: ctx.incomingActive,
          outgoing_total: ctx.outgoingTotal,
          last_updated: ctx.localHealthUpdatedAt?.toISOString() || ctx.updatedAt?.toISOString() || null,
        };
      });
      
      // Get scheduler status for freshness info
      let schedulerInfo = null;
      try {
        const { recalculationScheduler } = await import('../services/recalculationScheduler');
        const status = recalculationScheduler.getStatus();
        schedulerInfo = {
          last_run: status.lastRunAt,
          next_run: status.nextRunAt,
          interval_hours: status.intervalHours,
        };
      } catch (e) {
        // Scheduler may not be initialized
      }
      
      res.json({
        count: scores.length,
        min_score_filter: minScore,
        scores,
        scheduler: schedulerInfo,
        note: "Detailed scores cached from last network-wide computation (6-hour cycle). Algorithm breakdown data is included.",
      });
    } catch (error) {
      console.error('Error getting cached detailed scores:', error);
      res.status(500).json({ error: "Failed to get cached detailed scores" });
    }
  });

  // Single-user detailed metrics endpoint - computes algorithm breakdown on-demand
  // More expensive but provides full component breakdown for one user
  app.get("/api/v1/score/:address/details", publicRateLimit, async (req, res) => {
    try {
      const chainNamespace = (req.query.chainNamespace as string) || "eip155";
      const address = chainNamespace === "eip155" ? req.params.address.toLowerCase() : req.params.address;
      
      if (chainNamespace === "eip155") {
        if (!address.startsWith('0x') || address.length !== 42) {
          return res.status(400).json({ error: "Invalid address format (EVM: 0x + 40 hex chars)" });
        }
      } else {
        if (!address || address.length < 10 || address.length > 256) {
          return res.status(400).json({ error: "Invalid address format (10-256 chars required)" });
        }
      }
      
      const { localHealthService } = await import('../services/localHealthService');
      
      // Get cached score and compute detailed breakdown
      const egoContext = await storage.getOrCreateEgoContext(address);
      const algorithmBreakdown = await localHealthService.computeAlgorithmBreakdown(address);
      
      // Get vouch counts
      const [incomingTotal, outgoingTotal, incomingEndorsements] = await Promise.all([
        storage.countEndorsements({ endorsee: address, communityId: 0 }),
        storage.countEndorsements({ endorser: address, communityId: 0 }),
        storage.getEndorsements({ endorsee: address, communityId: 0, limit: 1000 }),
      ]);
      
      // Filter active vouches
      const { buildVouchFilter, isVouchValid } = await import('../services/vouchExpiration');
      const filter = await buildVouchFilter();
      const now = new Date();
      const incomingActive = incomingEndorsements.filter(e => isVouchValid(e, filter, now));
      const uniqueVouchers = new Set(incomingActive.map(e => e.endorser.toLowerCase())).size;
      
      // Determine confidence tier based on LocalHealth score
      const localHealth = egoContext.localHealth ?? 0;
      let confidenceTier: string;
      let confidenceDescription: string;
      if (localHealth >= 75) {
        confidenceTier = "high_confidence";
        confidenceDescription = "Almost certainly human - strong organic network with redundant trust paths";
      } else if (localHealth >= 65) {
        confidenceTier = "likely_human";
        confidenceDescription = "Likely human - organic redundancy detected, passes Sybil resistance checks";
      } else if (localHealth >= 50) {
        confidenceTier = "uncertain";
        confidenceDescription = "Uncertain - could be newcomer building network OR potential attack pattern";
      } else {
        confidenceTier = "low_confidence";
        confidenceDescription = "Low confidence - matches common attack patterns or very new user";
      }
      
      res.json({
        address,
        local_health: localHealth,
        cached_at: egoContext.localHealthUpdatedAt?.toISOString() || egoContext.updatedAt?.toISOString() || null,
        
        confidence: {
          tier: confidenceTier,
          description: confidenceDescription,
          thresholds: {
            high_confidence: "≥75",
            likely_human: "≥65",
            uncertain: "50-64",
            low_confidence: "<50",
          },
        },
        
        vouch_counts: {
          incoming_total: incomingTotal,
          incoming_active: incomingActive.length,
          outgoing_total: outgoingTotal,
          unique_vouchers: uniqueVouchers,
        },
        
        activity: {
          last_vouch_given_at: egoContext.lastSignalActivityAt?.toISOString() || null,
        },
        
        algorithm_breakdown: algorithmBreakdown ? {
          flow_component: Math.round(algorithmBreakdown.flow_component * 100) / 100,
          redundancy_component: Math.round(algorithmBreakdown.redundancy_component * 100) / 100,
          direct_flow: Math.round(algorithmBreakdown.direct_flow * 100) / 100,
          actual_min_cut: Math.round((algorithmBreakdown as any).actual_min_cut * 100) / 100 || 0,
          effective_redundancy: Math.round(algorithmBreakdown.effective_redundancy * 100) / 100,
          dilution_factor: Math.round(algorithmBreakdown.dilution_factor * 100) / 100,
          vertex_disjoint_paths: algorithmBreakdown.vertex_disjoint_paths,
          ego_network_size: algorithmBreakdown.ego_network_size,
          edge_density: Math.round(algorithmBreakdown.edge_density * 1000) / 1000,
          baselines: {
            healthy_vouch_count: algorithmBreakdown.baselines.healthy_vouch_count,
            healthy_redundancy: algorithmBreakdown.baselines.healthy_redundancy,
          },
        } : null,
        
        note: "Algorithm breakdown is computed on-demand from the current network state.",
      });
    } catch (error) {
      console.error('Error getting score details:', error);
      res.status(500).json({ error: "Failed to get score details" });
    }
  });

  app.get("/api/v1/score/:address", publicRateLimit, async (req, res) => {
    try {
      const chainNamespace = (req.query.chainNamespace as string) || "eip155";
      const address = chainNamespace === "eip155" ? req.params.address.toLowerCase() : req.params.address;
      
      if (chainNamespace === "eip155") {
        if (!address.startsWith('0x') || address.length !== 42) {
          return res.status(400).json({ error: "Invalid address format (EVM: 0x + 40 hex chars)" });
        }
      } else {
        if (!address || address.length < 10 || address.length > 256) {
          return res.status(400).json({ error: "Invalid address format (10-256 chars required)" });
        }
      }
      
      const forceRefresh = req.query.force_refresh === 'true';
      
      const { localHealthService } = await import('../services/localHealthService');
      
      const metrics = await localHealthService.getExtendedScoreMetrics(address, forceRefresh);
      
      res.json(metrics);
    } catch (error) {
      console.error('Error getting score:', error);
      res.status(500).json({ error: "Failed to get score" });
    }
  });

  const refreshRateLimit = rateLimit({
    windowMs: 60000,
    max: 3,
    keyGenerator: (req) => req.ip || 'unknown'
  });

  app.post("/api/v1/score/:address/refresh", refreshRateLimit, async (req, res) => {
    try {
      const chainNamespace = (req.query.chainNamespace as string) || (req.body?.chainNamespace as string) || "eip155";
      const address = chainNamespace === "eip155" ? req.params.address.toLowerCase() : req.params.address;
      
      if (chainNamespace === "eip155") {
        if (!address.startsWith('0x') || address.length !== 42) {
          return res.status(400).json({ error: "Invalid address format (EVM: 0x + 40 hex chars)" });
        }
      } else {
        if (!address || address.length < 10 || address.length > 256) {
          return res.status(400).json({ error: "Invalid address format (10-256 chars required)" });
        }
      }
      
      const { localHealthService } = await import('../services/localHealthService');
      
      const metrics = await localHealthService.getExtendedScoreMetrics(address, true);
      
      res.json({
        ...metrics,
        refreshed: true,
        refreshed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error refreshing score:', error);
      res.status(500).json({ error: "Failed to refresh score" });
    }
  });

  app.get("/api/v1/vouch/nonce/:address", publicRateLimit, async (req, res) => {
    try {
      const chainNamespace = (req.query.chainNamespace as string) || "eip155";
      const address = chainNamespace === "eip155" ? req.params.address.toLowerCase() : req.params.address;
      
      if (chainNamespace === "eip155") {
        if (!address.startsWith('0x') || address.length !== 42) {
          return res.status(400).json({ error: "Invalid address format (EVM: 0x + 40 hex chars)" });
        }
      } else {
        if (!address || address.length < 10 || address.length > 256) {
          return res.status(400).json({ error: "Invalid address format (10-256 chars required)" });
        }
      }
      
      let currentEpoch = await storage.getCurrentEpoch(0);
      if (!currentEpoch) {
        currentEpoch = await storage.createEpoch({
          id: 0,
          communityId: 0,
          status: "active",
          graphRoot: null,
          seedRoot: null,
          paramsHash: null,
          scoresHash: null,
          signature: null,
          closedAt: null,
        });
      }
      
      const epoch = Number(currentEpoch.id);
      const maxNonce = await storage.getMaxNonce(address, epoch, 0);
      const nextNonce = maxNonce + 1;
      
      res.json({ epoch, nonce: nextNonce });
    } catch (error) {
      console.error('Error getting nonce:', error);
      res.status(500).json({ error: "Failed to get nonce" });
    }
  });

  app.post("/api/v1/vouch", publicRateLimit, async (req, res) => {
    try {
      const { endorser, endorsee, sig, epoch, nonce, chainId, chainNamespace, externallyVerified } = req.body;
      
      // Multi-chain support: chainNamespace defaults to "eip155" (EVM), externallyVerified defaults to false
      const chain = chainNamespace || "eip155";
      const isExternallyVerified = externallyVerified === true;
      
      // For EVM chains, sig is required; for non-EVM with externallyVerified, sig can be placeholder
      if (!endorser || !endorsee || epoch === undefined || nonce === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: endorser, endorsee, epoch, nonce" 
        });
      }
      
      if (!isExternallyVerified && !sig) {
        return res.status(400).json({ 
          error: "Missing required field: sig (or set externallyVerified=true for non-EVM chains)" 
        });
      }
      
      // Address normalization: lowercase only for EVM chains, preserve case for others
      const normalizedEndorser = chain === "eip155" ? endorser.toLowerCase() : endorser;
      const normalizedEndorsee = chain === "eip155" ? endorsee.toLowerCase() : endorsee;
      
      // Chain-specific address validation
      if (chain === "eip155") {
        // EVM: require 0x-prefixed 40-hex address
        if (!normalizedEndorser.startsWith('0x') || normalizedEndorser.length !== 42) {
          return res.status(400).json({ error: "Invalid endorser address (EVM format: 0x + 40 hex chars)" });
        }
        if (!normalizedEndorsee.startsWith('0x') || normalizedEndorsee.length !== 42) {
          return res.status(400).json({ error: "Invalid endorsee address (EVM format: 0x + 40 hex chars)" });
        }
      } else {
        // Non-EVM: basic length validation (10-256 chars)
        if (!endorser || endorser.length < 10 || endorser.length > 256) {
          return res.status(400).json({ error: "Invalid endorser address (must be 10-256 characters)" });
        }
        if (!endorsee || endorsee.length < 10 || endorsee.length > 256) {
          return res.status(400).json({ error: "Invalid endorsee address (must be 10-256 characters)" });
        }
      }
      
      const epochBigInt = BigInt(epoch);
      const nonceBigInt = BigInt(nonce);
      
      let currentEpoch = await storage.getCurrentEpoch(0);
      if (!currentEpoch) {
        currentEpoch = await storage.createEpoch({
          id: 0,
          communityId: 0,
          status: "active",
          graphRoot: null,
          seedRoot: null,
          paramsHash: null,
          scoresHash: null,
          signature: null,
          closedAt: null,
        });
      }
      
      if (Number(epochBigInt) !== currentEpoch.id) {
        return res.status(400).json({ error: "Invalid epoch - use /api/v1/vouch/nonce/:address to get current epoch" });
      }
      
      const maxNonce = await storage.getMaxNonce(normalizedEndorser, Number(epochBigInt), 0);
      const expectedNonce = maxNonce + 1;
      
      if (Number(nonceBigInt) !== expectedNonce) {
        return res.status(400).json({ 
          error: `Invalid nonce - expected ${expectedNonce}, got ${nonce}. Use /api/v1/vouch/nonce/:address to get current nonce.`
        });
      }
      
      const existingVouch = await storage.getEndorsements({
        endorser: normalizedEndorser,
        endorsee: normalizedEndorsee,
        limit: 1
      });
      
      if (existingVouch.length > 0) {
        return res.status(400).json({ error: "Vouch already exists for this endorser->endorsee pair" });
      }
      
      const fieldValidation = validateEndorsementFields({
        endorser: normalizedEndorser as Address,
        endorsee: normalizedEndorsee as Address,
        epoch: epochBigInt,
        nonce: nonceBigInt,
        chainNamespace: chain,
      });
      
      if (!fieldValidation.valid) {
        return res.status(400).json({ error: fieldValidation.error });
      }
      
      // Skip EIP-712 signature verification for externally verified non-EVM chains
      if (!isExternallyVerified) {
        const signedEndorsement = {
          endorser: normalizedEndorser as Address,
          endorsee: normalizedEndorsee as Address,
          epoch: epochBigInt,
          nonce: nonceBigInt,
          sig,
          chainId: chainId || 1,
        };
        
        const isValid = await verifyEndorsementSignature(signedEndorsement);
        
        if (!isValid) {
          return res.status(400).json({ error: "Invalid signature - signature must be from endorser wallet" });
        }
      } else {
        console.log(`[Multi-Chain] Skipping EIP-712 verification for ${chain} chain (externallyVerified=true)`);
      }
      
      const leafHash = computeLeafHash({
        endorser: normalizedEndorser,
        endorsee: normalizedEndorsee,
        epoch: epochBigInt,
        nonce: nonceBigInt,
        sig: sig || "externally_verified"
      });
      
      try {
        await storage.createEndorsement({
          communityId: 0,
          endorser: normalizedEndorser,
          endorsee: normalizedEndorsee,
          epoch: Number(epochBigInt),
          nonce: Number(nonceBigInt),
          sig: sig || "externally_verified",
          leafHash,
          promptHash: null,
          chainNamespace: chain,
          externallyVerified: isExternallyVerified,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('duplicate key')) {
          return res.status(409).json({ error: "Nonce already used - please get a new nonce" });
        }
        throw err;
      }
      
      await storage.getOrCreateEgoContext(normalizedEndorser);
      await storage.updateLastSignalActivity(normalizedEndorser);
      
      // Note: LocalHealth scores are recalculated every 6 hours by the scheduler
      // On-vouch recalculation removed for performance (network-wide computation is expensive)
      
      res.status(202).json({ ok: true });
    } catch (error) {
      console.error('Error submitting vouch:', error);
      res.status(500).json({ error: "Failed to submit vouch" });
    }
  });

  app.get("/api/v1/vouch-status", publicRateLimit, async (req, res) => {
    try {
      const { endorser, endorsee } = req.query;
      
      if (!endorser || !endorsee) {
        return res.status(400).json({ 
          error: "Missing required query params: endorser, endorsee" 
        });
      }
      
      const normalizedEndorser = (endorser as string).toLowerCase();
      const normalizedEndorsee = (endorsee as string).toLowerCase();
      
      const endorsements = await storage.getEndorsements({
        endorser: normalizedEndorser,
        endorsee: normalizedEndorsee,
        limit: 1
      });
      
      if (endorsements.length === 0) {
        return res.json({ 
          exists: false,
          status: null,
          days_remaining: null
        });
      }
      
      const endorsement = endorsements[0];
      
      const isRevoked = await storage.isEndorsementRevoked(endorsement.id);
      if (isRevoked) {
        return res.json({
          exists: true,
          status: "revoked",
          days_remaining: null,
          created_at: endorsement.createdAt
        });
      }
      
      const endorseeContext = await storage.getOrCreateEgoContext(normalizedEndorsee);
      const EXPIRATION_DAYS = 90;
      const now = new Date();
      const vouchCreatedAt = endorsement.createdAt;
      const lastActivity = endorseeContext.lastSignalActivityAt;
      
      const daysSinceVouch = Math.floor((now.getTime() - vouchCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceActivity = lastActivity 
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      
      const isExpired = daysSinceVouch >= EXPIRATION_DAYS && daysSinceActivity >= EXPIRATION_DAYS;
      const daysRemaining = isExpired ? 0 : Math.max(0, EXPIRATION_DAYS - Math.min(daysSinceVouch, daysSinceActivity));
      
      let statusLabel: string;
      if (isExpired) {
        statusLabel = "expired";
      } else if (daysRemaining <= 30) {
        statusLabel = "expiring_soon";
      } else {
        statusLabel = "active";
      }
      
      res.json({
        exists: true,
        status: statusLabel,
        days_remaining: daysRemaining,
        created_at: endorsement.createdAt
      });
    } catch (error) {
      console.error('Error checking vouch status:', error);
      res.status(500).json({ error: "Failed to check vouch status" });
    }
  });

  app.get("/api/v1/revoke/info", publicRateLimit, async (req, res) => {
    try {
      const { endorser, endorsee } = req.query;
      
      if (!endorser || !endorsee) {
        return res.status(400).json({ 
          error: "Missing required query params: endorser, endorsee" 
        });
      }
      
      const normalizedEndorser = (endorser as string).toLowerCase();
      const normalizedEndorsee = (endorsee as string).toLowerCase();
      
      const endorsements = await storage.getEndorsements({
        endorser: normalizedEndorser,
        endorsee: normalizedEndorsee,
        limit: 1
      });
      
      if (endorsements.length === 0) {
        return res.json({ exists: false, endorsement_id: null });
      }
      
      const endorsement = endorsements[0];
      const isRevoked = await storage.isEndorsementRevoked(endorsement.id);
      
      res.json({ 
        exists: true, 
        endorsement_id: endorsement.id,
        already_revoked: isRevoked
      });
    } catch (error) {
      console.error('Error getting revoke info:', error);
      res.status(500).json({ error: "Failed to get revoke info" });
    }
  });

  app.post("/api/v1/revoke", publicRateLimit, async (req, res) => {
    try {
      const { endorser, endorsee, endorsementId, sig, chainId } = req.body;
      
      if (!endorser || !endorsee || !endorsementId || !sig) {
        return res.status(400).json({ 
          error: "Missing required fields: endorser, endorsee, endorsementId, sig" 
        });
      }
      
      const normalizedEndorser = endorser.toLowerCase() as Address;
      const normalizedEndorsee = endorsee.toLowerCase() as Address;
      const endorsementIdNum = Number(endorsementId);
      
      const endorsements = await storage.getEndorsements({
        endorser: normalizedEndorser,
        endorsee: normalizedEndorsee,
        limit: 1
      });
      
      if (endorsements.length === 0) {
        return res.status(404).json({ error: "Vouch not found" });
      }
      
      const endorsement = endorsements[0];
      
      if (endorsement.id !== endorsementIdNum) {
        return res.status(400).json({ error: "endorsementId does not match vouch" });
      }
      
      const isAlreadyRevoked = await storage.isEndorsementRevoked(endorsement.id);
      if (isAlreadyRevoked) {
        return res.status(400).json({ error: "Vouch already revoked" });
      }
      
      const isValidSig = await verifyRevocationSignature(
        normalizedEndorser,
        normalizedEndorsee,
        endorsementIdNum,
        sig as Hex,
        chainId || 1
      );
      
      if (!isValidSig) {
        return res.status(400).json({ error: "Invalid signature - must be signed by endorser" });
      }
      
      await storage.createEndorsementTombstone({
        endorsementId: endorsement.id,
        reason: "Revoked by endorser via API",
      });
      
      // Note: LocalHealth scores are recalculated every 6 hours by the scheduler
      // On-revocation recalculation removed for performance
      
      res.json({ ok: true, revoked: true });
    } catch (error) {
      console.error('Error revoking vouch:', error);
      res.status(500).json({ error: "Failed to revoke vouch" });
    }
  });
}
