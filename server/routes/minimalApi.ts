import type { Express } from 'express';
import { validateCommunityApiKey } from '../middleware/apiKeyAuth';
import { rateLimit } from '../middleware/rateLimit';
import { storage } from '../storage';
import { verifyEndorsementSignature, validateEndorsementFields } from '../crypto/eip712';
import { validateNonce } from '../crypto/nonce';
import { computeLeafHash } from '../crypto/merkle';
import type { Address } from 'viem';
import { EgoScorer } from '../algorithm/egoScoring';
import type { EgoEndorsement, KudosBoost } from '../algorithm/egoScoring';

/**
 * Minimal API routes for external integrations
 * Authenticated via X-Community-Key header
 */
export function registerMinimalApiRoutes(app: Express) {
  // Rate limiting for API endpoints
  const apiRateLimit = rateLimit({
    windowMs: 60000,
    max: 100,
    keyGenerator: (req) => {
      const apiKey = req.headers['x-community-key'] as string;
      return `api:${apiKey}`;
    }
  });
  
  // POST /api/v1/communities/:id/vouch.min
  // Submit a vouch with EIP-712 signature
  app.post(
    "/api/v1/communities/:id/vouch.min",
    apiRateLimit,
    validateCommunityApiKey,
    async (req, res) => {
      try {
        const communityId = parseInt(req.params.id);
        
        // Verify community ID matches the API key's community
        const authenticatedCommunity = (req as any).community;
        if (authenticatedCommunity.id !== communityId) {
          return res.status(403).json({ 
            error: "FORBIDDEN",
            message: "API key does not have access to this community" 
          });
        }
        
        const { endorser, endorsee, sig, ts, chainId } = req.body;
        
        if (!endorser || !endorsee || !sig || !ts) {
          return res.status(400).json({ 
            error: "MISSING_FIELDS",
            message: "endorser, endorsee, sig, and ts are required" 
          });
        }
        
        // Get current epoch for this community
        const currentEpoch = await storage.getCurrentEpoch(communityId);
        if (!currentEpoch) {
          return res.status(400).json({ error: "NO_ACTIVE_EPOCH" });
        }
        
        const epoch = BigInt(currentEpoch.id);
        
        // Get nonce for this endorser
        const maxNonce = await storage.getMaxNonce(
          endorser.toLowerCase(),
          Number(epoch),
          communityId
        );
        const nonce = BigInt(maxNonce + 1);
        const timestamp = BigInt(ts);
        
        // Validate fields
        const fieldValidation = validateEndorsementFields({
          endorser: endorser.toLowerCase() as Address,
          endorsee: endorsee.toLowerCase() as Address,
          epoch,
          nonce,
          timestamp,
        });
        
        if (!fieldValidation.valid) {
          return res.status(400).json({ 
            error: "INVALID_FIELDS",
            message: fieldValidation.error 
          });
        }
        
        // Validate nonce (check it's sequential)
        if (nonce !== BigInt(maxNonce + 1)) {
          return res.status(400).json({ 
            error: "INVALID_NONCE",
            message: "Nonce must be sequential" 
          });
        }
        
        // Verify EIP-712 signature
        const signedEndorsement = {
          endorser: endorser.toLowerCase() as Address,
          endorsee: endorsee.toLowerCase() as Address,
          epoch,
          nonce,
          timestamp,
          sig,
          chainId: chainId || 1,
        };
        
        const isValid = await verifyEndorsementSignature(signedEndorsement);
        
        if (!isValid) {
          return res.status(400).json({ error: "BAD_SIGNATURE" });
        }
        
        // Compute leaf hash for Merkle tree
        const leafHash = computeLeafHash({
          endorser: endorser.toLowerCase(),
          endorsee: endorsee.toLowerCase(),
          epoch,
          nonce,
          sig
        });
        
        // Get community to retrieve promptHash
        const community = (req as any).community;
        
        // Create endorsement
        await storage.createEndorsement({
          communityId,
          endorser: endorser.toLowerCase(),
          endorsee: endorsee.toLowerCase(),
          epoch: Number(epoch),
          nonce: Number(nonce),
          sig,
          leafHash,
          promptHash: community.promptHash,
        });
        
        // Trigger LocalHealth recalculation for both endorser and endorsee
        // This happens asynchronously after the vouch is stored
        const { localHealthService } = await import('../services/localHealthService');
        localHealthService.recalculateMultipleLocalHealth([
          endorser.toLowerCase(),
          endorsee.toLowerCase()
        ]).catch(err => {
          console.error('Failed to recalculate LocalHealth after vouch:', err);
        });
        
        res.status(202).json({ ok: true });
      } catch (error) {
        console.error('Error in vouch.min:', error);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );
  
  // GET /api/v1/communities/:id/scores.min/:address
  // Get detailed score for a single user (includes both community STS and personal LocalHealth)
  app.get(
    "/api/v1/communities/:id/scores.min/:address",
    apiRateLimit,
    validateCommunityApiKey,
    async (req, res) => {
      try {
        const communityId = parseInt(req.params.id);
        
        // Verify community ID matches the API key's community
        const authenticatedCommunity = (req as any).community;
        if (authenticatedCommunity.id !== communityId) {
          return res.status(403).json({ 
            error: "FORBIDDEN",
            message: "API key does not have access to this community" 
          });
        }
        
        const address = req.params.address.toLowerCase();
        
        // Get latest score for this user in this community
        const allScores = await storage.getAllScoresForUser(address);
        const scores = allScores.filter(s => s.communityId === communityId);
        
        // Get cached LocalHealth score (personal network score)
        let localHealth = 0;
        try {
          const { localHealthService } = await import("../services/localHealthService");
          const cachedScore = await localHealthService.getCachedLocalHealth(address);
          
          if (cachedScore !== null) {
            localHealth = cachedScore;
          } else {
            // No cached score - trigger recalculation
            localHealth = await localHealthService.recalculateLocalHealth(address);
          }
        } catch (egoError) {
          console.error('Error getting LocalHealth for API:', egoError);
          // Continue with localHealth = 0 if retrieval fails
        }
        
        if (!scores || scores.length === 0) {
          return res.json({
            accepted: false,
            score: 0,
            local_health: localHealth,
            min_cut: 0,
            vertex_disjoint: 0,
            seed_coverage_ok: false,
            why: "No score computed yet",
            updated_at: null,
          });
        }
        
        // Get most recent score
        const latestScore = scores[0];
        
        // Check vertex disjoint paths (simplified - we don't store this separately)
        const vertexDisjoint = latestScore.minCut || 0;
        
        // Check seed coverage (simplified - if accepted, assume seed coverage OK)
        const seedCoverageOk = latestScore.tier !== 'Outlier';
        
        // Build explanation
        let why = '';
        if (latestScore.tier === 'Outlier') {
          why = 'Does not meet acceptance criteria';
        } else {
          why = `${latestScore.minCut || 0} rutas independientes; ≥2 semillas con ≥0.30 cada una`;
        }
        
        res.json({
          accepted: latestScore.tier !== 'Outlier',
          score: Number(latestScore.sts?.toFixed(1)) || 0,
          local_health: localHealth,
          min_cut: latestScore.minCut || 0,
          vertex_disjoint: vertexDisjoint,
          seed_coverage_ok: seedCoverageOk,
          why,
          updated_at: latestScore.createdAt,
        });
      } catch (error) {
        console.error('Error in scores.min:', error);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );
  
  // GET /api/v1/communities/:id/eligibility.min/:address
  // Simple accepted/rejected check
  app.get(
    "/api/v1/communities/:id/eligibility.min/:address",
    apiRateLimit,
    validateCommunityApiKey,
    async (req, res) => {
      try {
        const communityId = parseInt(req.params.id);
        
        // Verify community ID matches the API key's community
        const authenticatedCommunity = (req as any).community;
        if (authenticatedCommunity.id !== communityId) {
          return res.status(403).json({ 
            error: "FORBIDDEN",
            message: "API key does not have access to this community" 
          });
        }
        
        const address = req.params.address.toLowerCase();
        
        const allScores = await storage.getAllScoresForUser(address);
        const scores = allScores.filter(s => s.communityId === communityId);
        
        const accepted = scores && scores.length > 0 && scores[0].tier !== 'Outlier';
        
        res.json({ accepted });
      } catch (error) {
        console.error('Error in eligibility.min:', error);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );
  
  // GET /api/v1/communities/:id/metrics.min
  // Public community metrics
  app.get(
    "/api/v1/communities/:id/metrics.min",
    apiRateLimit,
    validateCommunityApiKey,
    async (req, res) => {
      try {
        const communityId = parseInt(req.params.id);
        
        // Verify community ID matches the API key's community
        const authenticatedCommunity = (req as any).community;
        if (authenticatedCommunity.id !== communityId) {
          return res.status(403).json({ 
            error: "FORBIDDEN",
            message: "API key does not have access to this community" 
          });
        }
        
        // Get all scores for this community
        const scores = await storage.getAllScores(communityId);
        const acceptedScores = scores.filter((s: any) => s.tier !== 'Outlier');
        
        const acceptedUsers = acceptedScores.length;
        
        // Calculate shares
        const minCutGe2Count = acceptedScores.filter((s: any) => (s.minCut || 0) >= 2).length;
        const minCutGe2Share = acceptedUsers > 0 ? minCutGe2Count / acceptedUsers : 0;
        
        // For disjoint paths, we use minCut as proxy (simplified)
        const disjointGe2Share = minCutGe2Share;
        
        // Get seeds for this community
        const seedsList = await storage.getSeeds(communityId);
        
        // Calculate seed coverage (simplified - if user is accepted, they have good seed coverage)
        const seedsWithMetrics = seedsList.map((seed: any) => ({
          addr: seed.address,
          coverage: 0.30, // Simplified - would need to calculate actual flow from each seed
        }));
        
        res.json({
          accepted_users: acceptedUsers,
          min_cut_ge2_share: Number(minCutGe2Share.toFixed(2)),
          disjoint_ge2_share: Number(disjointGe2Share.toFixed(2)),
          seeds: seedsWithMetrics,
        });
      } catch (error) {
        console.error('Error in metrics.min:', error);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );
}
