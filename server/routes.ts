import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { IStorage } from "./storage";
import { db } from "./db";
import { verifyEndorsementSignature, validateEndorsementFields, type SignedEndorsement } from "./crypto/eip712";
import { validateNonce } from "./crypto/nonce";
import { computeLeafHash } from "./crypto/merkle";
import { insertPublicEndorsementSchema, publicEndorsements, scores, contexts, type Community, type PublicEndorsement, type Score, type Context } from "@shared/schema";
import { computeUserConfidence } from "./health/ghi";
import { sql, eq } from "drizzle-orm";
import { verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { epochComputation } from "./algorithm/compute";
import { LocalHealthService } from "./services/localHealthService";

// Singleton instance for score calculations
const localHealthService = new LocalHealthService();

// Cache for expensive stats endpoints (5 minute TTL)
interface StatsCache {
  data: object | null;
  timestamp: number;
}
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const networkTractionCache: StatsCache = { data: null, timestamp: 0 };
const localHealthStatsCache: StatsCache = { data: null, timestamp: 0 };
const generalStatsCache: StatsCache = { data: null, timestamp: 0 };
const graphLocalHealthCache: StatsCache = { data: null, timestamp: 0 };

// Shared handler for endorsement creation (used by both /api/endorse and /api/v1/vouch)
async function handleEndorse(req: any, res: any): Promise<any> {
  try {
    const body = req.body;

    // Validate required fields exist
    // For non-EVM chains with externallyVerified=true, sig can be a placeholder
    const chainNamespace = body.chainNamespace || "eip155";
    const externallyVerified = body.externallyVerified === true;
    
    if (!body.endorser || !body.endorsee || !body.epoch || !body.nonce) {
      return res.status(400).json({ error: "Missing required fields: endorser, endorsee, epoch, nonce" });
    }
    
    // Signature required for EVM chains or when not externally verified
    if (!externallyVerified && !body.sig) {
      return res.status(400).json({ error: "Missing required field: sig (or set externallyVerified=true for non-EVM chains)" });
    }

    // Parse and validate communityId (defaults to 0 for global network)
    const communityId = body.communityId !== undefined ? parseInt(body.communityId, 10) : 0;
    if (isNaN(communityId) || communityId < 0) {
      return res.status(400).json({ error: "Invalid community ID" });
    }

    // Verify community exists and get its policy
    const community = await storage.getCommunity(communityId);
    if (!community) {
      return res.status(404).json({ error: `Community ${communityId} not found` });
    }

    // Verify promptHash matches community's expected hash
    const expectedPromptHash = community.promptHash;
    const providedPromptHash = body.promptHash;
    
    if (providedPromptHash && providedPromptHash !== expectedPromptHash) {
      return res.status(400).json({ 
        error: "Prompt hash mismatch",
        message: "The endorsement was signed with a different prompt than the community's current prompt",
        expected: expectedPromptHash,
        provided: providedPromptHash
      });
    }

    // Safely parse BigInt fields with error handling
    let endorsement: SignedEndorsement;
    try {
      endorsement = {
        endorser: body.endorser as Address,
        endorsee: body.endorsee as Address,
        epoch: BigInt(body.epoch),
        nonce: BigInt(body.nonce),
        sig: body.sig as Hex,
        chainId: body.chainId ? Number(body.chainId) : undefined,
      };
    } catch (error) {
      return res.status(400).json({ error: "Invalid numeric field format" });
    }

    const fieldValidation = validateEndorsementFields({
      ...endorsement,
      chainNamespace,
    });
    if (!fieldValidation.valid) {
      return res.status(400).json({ error: fieldValidation.error });
    }

    // Check that the epoch being endorsed for is active
    const targetEpoch = await storage.getEpoch(Number(endorsement.epoch));
    if (targetEpoch && targetEpoch.status === "closed") {
      return res.status(400).json({ 
        error: `Cannot create endorsements for closed Epoch ${endorsement.epoch}. Please use the current active epoch.` 
      });
    }

    const nonceValidation = await validateNonce(
      endorsement.endorser,
      Number(endorsement.epoch),
      endorsement.nonce
    );
    if (!nonceValidation.valid) {
      return res.status(400).json({ 
        error: nonceValidation.error,
        expectedNonce: nonceValidation.expectedNonce?.toString()
      });
    }

    // Skip EIP-712 signature verification for externally verified non-EVM chains
    if (!externallyVerified) {
      const signatureValid = await verifyEndorsementSignature(endorsement);
      if (!signatureValid) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    } else {
      console.log(`[Multi-Chain] Skipping EIP-712 verification for ${chainNamespace} chain (externallyVerified=true)`);
    }

    const leafHash = computeLeafHash({
      endorser: endorsement.endorser,
      endorsee: endorsement.endorsee,
      epoch: endorsement.epoch,
      nonce: endorsement.nonce,
      sig: endorsement.sig,
    });

    // Normalize addresses: lowercase only for EVM chains, preserve case for others
    const normalizeAddress = (addr: string) => chainNamespace === "eip155" ? addr.toLowerCase() : addr;
    
    const insertData = insertPublicEndorsementSchema.parse({
      endorser: normalizeAddress(endorsement.endorser),
      endorsee: normalizeAddress(endorsement.endorsee),
      epoch: Number(endorsement.epoch),
      nonce: Number(endorsement.nonce),
      sig: endorsement.sig || "externally_verified",
      leafHash,
      note: body.note || null,
      communityId,
      promptHash: expectedPromptHash,
      chainNamespace,
      externallyVerified,
    });

    const created = await storage.createEndorsement(insertData);
    
    // Update endorser's lastSignalActivityAt (vouch activity keeps incoming vouches alive)
    const normalizedEndorser = normalizeAddress(endorsement.endorser);
    await storage.getOrCreateEgoContext(normalizedEndorser);
    await storage.updateLastSignalActivity(normalizedEndorser);

    // Auto-recalculate endorsee's LocalHealth score so API calls immediately return updated score
    // This runs network-wide computation for accuracy (tiered capacity requires iterative algorithm)
    let endorseeLocalHealth: number | null = null;
    try {
      endorseeLocalHealth = await localHealthService.recalculateLocalHealth(normalizeAddress(endorsement.endorsee));
      console.log(`[Auto-Score] Recalculated LocalHealth for ${endorsement.endorsee.toLowerCase()}: ${endorseeLocalHealth}`);
    } catch (scoreError) {
      console.error(`[Auto-Score] Failed to recalculate for ${endorsement.endorsee.toLowerCase()}:`, scoreError);
      // Non-fatal: score will be calculated on next batch run or API request
    }

    return res.status(201).json({
      endorsement: created,
      leafHash,
      endorseeLocalHealth,
    });
  } catch (error) {
    console.error("Error creating endorsement:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register both /api/endorse and /api/v1/vouch to use the same handler
  app.post("/api/endorse", handleEndorse);
  app.post("/api/v1/vouch", handleEndorse);

  app.get("/api/endorsements", async (req, res) => {
    try {
      const { endorser, endorsee, epoch, limit, offset } = req.query;

      const filters: {
        endorser?: string;
        endorsee?: string;
        epoch?: number;
        limit?: number;
        offset?: number;
      } = {};

      if (endorser && typeof endorser === "string") {
        filters.endorser = endorser.toLowerCase();
      }
      if (endorsee && typeof endorsee === "string") {
        filters.endorsee = endorsee.toLowerCase();
      }
      if (epoch && typeof epoch === "string") {
        filters.epoch = parseInt(epoch);
      }
      if (limit && typeof limit === "string") {
        filters.limit = parseInt(limit);
      }
      if (offset && typeof offset === "string") {
        filters.offset = parseInt(offset);
      }

      const endorsements = await storage.getEndorsements(filters);

      return res.status(200).json({
        endorsements,
        count: endorsements.length,
      });
    } catch (error) {
      console.error("Error fetching endorsements:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get endorsements with expiration status
  app.get("/api/endorsements/with-status", async (req, res) => {
    try {
      const { endorser, endorsee, limit } = req.query;
      
      const filters: { endorser?: string; endorsee?: string; limit?: number } = {};
      
      if (endorser && typeof endorser === "string") {
        filters.endorser = endorser.toLowerCase();
      }
      if (endorsee && typeof endorsee === "string") {
        filters.endorsee = endorsee.toLowerCase();
      }
      if (limit && typeof limit === "string") {
        filters.limit = parseInt(limit);
      }
      
      const endorsements = await storage.getEndorsements({ ...filters, communityId: 0 });
      
      // Build filter for expiration checks
      const { buildVouchFilter, getVouchExpirationStatus } = await import('./services/vouchExpiration');
      const filter = await buildVouchFilter();
      const now = new Date();
      
      // Add expiration status to each endorsement
      const endorsementsWithStatus = endorsements.map(e => {
        const status = getVouchExpirationStatus(e, filter, now);
        return {
          ...e,
          expirationStatus: status,
        };
      });
      
      return res.status(200).json({
        endorsements: endorsementsWithStatus,
        count: endorsementsWithStatus.length,
      });
    } catch (error) {
      console.error("Error fetching endorsements with status:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/nonce/:endorser/:epoch", async (req, res) => {
    try {
      const { endorser, epoch } = req.params;
      const maxNonce = await storage.getMaxNonce(endorser.toLowerCase(), parseInt(epoch));
      
      // CRITICAL: Prevent browser caching of nonces - they must always be fresh
      // Cached nonces cause "Invalid nonce" errors when endorsements are created
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json({ 
        maxNonce,
        nextNonce: maxNonce + 1 
      });
    } catch (error) {
      console.error("Error fetching nonce:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // V1 API: Get epoch and nonce for vouch signature (documented endpoint)
  // Supports optional chainNamespace and communityId query params
  app.get("/api/v1/vouch/nonce/:address", async (req, res) => {
    try {
      const chainNamespace = (req.query.chainNamespace as string) || "eip155";
      const communityId = parseInt(req.query.communityId as string) || 0;
      
      // Only lowercase for EVM chains, preserve case for non-EVM
      const address = chainNamespace === "eip155" 
        ? req.params.address.toLowerCase() 
        : req.params.address;
      
      // Get current epoch for the specified community
      let currentEpoch = await storage.getCurrentEpoch(communityId);
      if (!currentEpoch) {
        currentEpoch = await storage.createEpoch({
          id: 0,
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
      const maxNonce = await storage.getMaxNonce(address, epoch);
      
      // Prevent browser caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json({ 
        epoch,
        nonce: maxNonce + 1 
      });
    } catch (error) {
      console.error("Error fetching v1 nonce:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/epoch/current", async (req, res) => {
    try {
      let currentEpoch = await storage.getCurrentEpoch();
      
      // If no active epoch exists, create epoch 0
      if (!currentEpoch) {
        currentEpoch = await storage.createEpoch({
          id: 0,
          status: "active",
          graphRoot: null,
          seedRoot: null,
          paramsHash: null,
          scoresHash: null,
          signature: null,
          closedAt: null,
        });
      }
      
      return res.status(200).json({
        epochId: Number(currentEpoch.id),
        status: currentEpoch.status,
        createdAt: currentEpoch.createdAt,
        closedAt: currentEpoch.closedAt,
      });
    } catch (error) {
      console.error("Error fetching current epoch:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/epoch/advance", async (req, res) => {
    try {
      const newEpoch = await storage.advanceEpoch();
      
      return res.status(200).json({
        message: "Epoch advanced successfully",
        newEpochId: Number(newEpoch.id),
        status: newEpoch.status,
        createdAt: newEpoch.createdAt,
      });
    } catch (error) {
      console.error("Error advancing epoch:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin middleware imports - rate limiting and single-flight lock only (no API key required)
  const { singleFlightRecalculation, setRecalculationInProgress } = await import("./middleware/apiKeyAuth");
  const { rateLimit } = await import("./middleware/rateLimit");
  
  // Admin rate limiters
  const adminRateLimit = rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute for most admin endpoints
    keyGenerator: (req) => req.ip || 'unknown'
  });
  
  const recalculationRateLimit = rateLimit({
    windowMs: 300000, // 5 minutes
    max: 1, // 1 request per 5 minutes for heavy recalculation
    keyGenerator: (req) => req.ip || 'unknown'
  });

  // Populate test data for algorithm validation
  app.post("/api/admin/populate-test-data", adminRateLimit, async (req, res) => {
    try {
      const { clearTestData, populateTestData } = await import("./testdata/algorithmTestData");
      
      // Clear existing test data first
      await clearTestData();
      
      // Populate with new test scenarios
      const result = await populateTestData();
      
      return res.status(200).json({
        message: "Test data populated successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error populating test data:", error);
      return res.status(500).json({ 
        error: "Failed to populate test data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validate algorithm against test scenarios
  app.get("/api/admin/validate-algorithm", adminRateLimit, async (req, res) => {
    try {
      const { runAlgorithmValidation, testScenarios } = await import("./testdata/algorithmTestData");
      
      const result = await runAlgorithmValidation();
      
      return res.status(200).json({
        message: "Algorithm validation complete",
        passedCount: result.scenarios.filter(s => s.passed).length,
        totalScenarios: result.scenarios.length,
        ...result,
      });
    } catch (error) {
      console.error("Error validating algorithm:", error);
      return res.status(500).json({ 
        error: "Algorithm validation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Network recalculation endpoint (admin function) - with single-flight lock and rate limiting
  app.post("/api/admin/recalculate-network", recalculationRateLimit, singleFlightRecalculation, async (req, res) => {
    try {
      setRecalculationInProgress(true);
      
      const { NetworkRecalculationService } = await import("./services/networkRecalculation");
      const recalcService = new NetworkRecalculationService();
      
      console.log("Starting network recalculation...");
      const result = await recalcService.recalculateAllScores();
      
      setRecalculationInProgress(false);
      
      return res.status(200).json({
        message: "Network recalculation complete",
        result,
      });
    } catch (error) {
      setRecalculationInProgress(false);
      console.error("Error recalculating network:", error);
      return res.status(500).json({ 
        error: "Network recalculation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Scheduler status endpoint
  app.get("/api/admin/scheduler-status", adminRateLimit, async (req, res) => {
    try {
      const { recalculationScheduler } = await import("./services/recalculationScheduler");
      const status = recalculationScheduler.getStatus();
      
      return res.status(200).json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      return res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  // Trigger immediate recalculation via scheduler - with single-flight lock and rate limiting
  app.post("/api/admin/scheduler-run-now", recalculationRateLimit, singleFlightRecalculation, async (req, res) => {
    try {
      const { recalculationScheduler } = await import("./services/recalculationScheduler");
      
      // Run in background, return immediately
      recalculationScheduler.runNow().catch(err => {
        console.error("Scheduled recalculation failed:", err);
      });
      
      return res.status(202).json({
        message: "Recalculation triggered, running in background",
      });
    } catch (error) {
      console.error("Error triggering recalculation:", error);
      return res.status(500).json({ error: "Failed to trigger recalculation" });
    }
  });

  // Comprehensive network analytics report for algorithm improvement
  app.get("/api/admin/network-report", adminRateLimit, async (req, res) => {
    try {
      const allContexts = await db
        .select()
        .from(contexts)
        .where(eq(contexts.type, 'ego'));

      const allEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 1000000
      });

      const now = new Date();
      const generatedAt = now.toISOString();

      // 1. Score Distribution Analysis (histogram buckets 0-10, 10-20, ..., 90-100)
      const scoreDistribution: { bucket: string; count: number; percentage: number }[] = [];
      const buckets = [
        { min: 0, max: 10, label: "0-10" },
        { min: 10, max: 20, label: "10-20" },
        { min: 20, max: 30, label: "20-30" },
        { min: 30, max: 40, label: "30-40" },
        { min: 40, max: 50, label: "40-50" },
        { min: 50, max: 60, label: "50-60" },
        { min: 60, max: 70, label: "60-70" },
        { min: 70, max: 80, label: "70-80" },
        { min: 80, max: 90, label: "80-90" },
        { min: 90, max: 100, label: "90-100" },
      ];

      const validScores = allContexts.filter(c => c.localHealth !== null && c.localHealth !== undefined);
      const totalWithScores = validScores.length;

      for (const bucket of buckets) {
        const count = validScores.filter(c => {
          const score = c.localHealth!;
          return score >= bucket.min && (bucket.max === 100 ? score <= bucket.max : score < bucket.max);
        }).length;
        scoreDistribution.push({
          bucket: bucket.label,
          count,
          percentage: totalWithScores > 0 ? Math.round((count / totalWithScores) * 10000) / 100 : 0,
        });
      }

      // 2. Algorithm Component Breakdown Stats
      const flowComponents = validScores.filter(c => c.flowComponent !== null).map(c => c.flowComponent!);
      const redundancyComponents = validScores.filter(c => c.redundancyComponent !== null).map(c => c.redundancyComponent!);
      const actualMinCuts = validScores.filter(c => c.actualMinCut !== null).map(c => c.actualMinCut!);
      const dilutionFactors = validScores.filter(c => c.dilutionFactor !== null).map(c => c.dilutionFactor!);
      const incomingActives = validScores.filter(c => c.incomingActive !== null).map(c => c.incomingActive!);
      const outgoingTotals = validScores.filter(c => c.outgoingTotal !== null).map(c => c.outgoingTotal!);

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const median = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };
      const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
      const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
      const stdDev = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const mean = avg(arr);
        const squaredDiffs = arr.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
      };

      const componentBreakdown = {
        flowComponent: {
          avg: Math.round(avg(flowComponents) * 100) / 100,
          median: Math.round(median(flowComponents) * 100) / 100,
          min: Math.round(min(flowComponents) * 100) / 100,
          max: Math.round(max(flowComponents) * 100) / 100,
          stdDev: Math.round(stdDev(flowComponents) * 100) / 100,
          count: flowComponents.length,
        },
        redundancyComponent: {
          avg: Math.round(avg(redundancyComponents) * 100) / 100,
          median: Math.round(median(redundancyComponents) * 100) / 100,
          min: Math.round(min(redundancyComponents) * 100) / 100,
          max: Math.round(max(redundancyComponents) * 100) / 100,
          stdDev: Math.round(stdDev(redundancyComponents) * 100) / 100,
          count: redundancyComponents.length,
        },
        actualMinCut: {
          avg: Math.round(avg(actualMinCuts) * 100) / 100,
          median: Math.round(median(actualMinCuts) * 100) / 100,
          min: Math.round(min(actualMinCuts) * 100) / 100,
          max: Math.round(max(actualMinCuts) * 100) / 100,
          stdDev: Math.round(stdDev(actualMinCuts) * 100) / 100,
          count: actualMinCuts.length,
        },
        dilutionFactor: {
          avg: Math.round(avg(dilutionFactors) * 1000) / 1000,
          median: Math.round(median(dilutionFactors) * 1000) / 1000,
          min: Math.round(min(dilutionFactors) * 1000) / 1000,
          max: Math.round(max(dilutionFactors) * 1000) / 1000,
          stdDev: Math.round(stdDev(dilutionFactors) * 1000) / 1000,
          count: dilutionFactors.length,
        },
        incomingActive: {
          avg: Math.round(avg(incomingActives) * 100) / 100,
          median: median(incomingActives),
          min: min(incomingActives),
          max: max(incomingActives),
          stdDev: Math.round(stdDev(incomingActives) * 100) / 100,
          count: incomingActives.length,
        },
        outgoingTotal: {
          avg: Math.round(avg(outgoingTotals) * 100) / 100,
          median: median(outgoingTotals),
          min: min(outgoingTotals),
          max: max(outgoingTotals),
          stdDev: Math.round(stdDev(outgoingTotals) * 100) / 100,
          count: outgoingTotals.length,
        },
      };

      // 3. Vouch Graph Statistics
      const uniqueEndorsers = new Set(allEndorsements.map(e => e.endorser));
      const uniqueEndorsees = new Set(allEndorsements.map(e => e.endorsee));
      const uniqueParticipants = new Set(Array.from(uniqueEndorsers).concat(Array.from(uniqueEndorsees)));
      
      const totalVouches = allEndorsements.length;
      const totalParticipants = uniqueParticipants.size;
      
      // Graph density = edges / (nodes * (nodes - 1)) for directed graph
      // Guard against zero/one participant to avoid NaN/Infinity
      let graphDensity = 0;
      if (totalParticipants > 1 && totalVouches > 0) {
        graphDensity = totalVouches / (totalParticipants * (totalParticipants - 1));
      }

      // Vouch distribution by user
      const vouchesGiven = new Map<string, number>();
      const vouchesReceived = new Map<string, number>();
      
      for (const e of allEndorsements) {
        vouchesGiven.set(e.endorser, (vouchesGiven.get(e.endorser) || 0) + 1);
        vouchesReceived.set(e.endorsee, (vouchesReceived.get(e.endorsee) || 0) + 1);
      }

      const givenCounts = Array.from(vouchesGiven.values());
      const receivedCounts = Array.from(vouchesReceived.values());

      // 4. Chain Distribution
      const chainCounts = new Map<string, number>();
      for (const e of allEndorsements) {
        const chain = e.chainNamespace || 'eip155';
        chainCounts.set(chain, (chainCounts.get(chain) || 0) + 1);
      }
      const chainDistribution = Array.from(chainCounts.entries()).map(([chain, count]) => ({
        chainNamespace: chain,
        count,
        percentage: totalVouches > 0 ? Math.round((count / totalVouches) * 10000) / 100 : 0,
      })).sort((a, b) => b.count - a.count);

      // 5. Outlier Detection (users with unexpected scores)
      const outliers: { address: string; localHealth: number; incomingVouches: number; outgoingVouches: number; anomalyType: string }[] = [];
      
      for (const ctx of validScores) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        const score = ctx.localHealth!;
        const incoming = ctx.incomingActive || 0;
        const outgoing = ctx.outgoingTotal || 0;
        
        // High score with few vouches (potential gaming)
        if (score > 70 && incoming <= 1) {
          outliers.push({ address: addr, localHealth: score, incomingVouches: incoming, outgoingVouches: outgoing, anomalyType: 'high_score_few_vouches' });
        }
        // Low score with many vouches (potential quality issue)
        if (score < 30 && incoming >= 5) {
          outliers.push({ address: addr, localHealth: score, incomingVouches: incoming, outgoingVouches: outgoing, anomalyType: 'low_score_many_vouches' });
        }
        // Extreme dilution (too many outgoing)
        if (outgoing > 20 && (ctx.dilutionFactor || 1) < 0.5) {
          outliers.push({ address: addr, localHealth: score, incomingVouches: incoming, outgoingVouches: outgoing, anomalyType: 'extreme_dilution' });
        }
      }

      // 6. Reciprocity Detection (mutual vouches and cycles - Sybil indicators)
      const reciprocityAnalysis = {
        mutualVouches: [] as { userA: string; userB: string }[],
        triangles: [] as { a: string; b: string; c: string }[],
        mutualVouchCount: 0,
        triangleCount: 0,
        reciprocityRate: 0,
      };

      // Build adjacency set and adjacency list for fast lookup
      const vouchSet = new Set<string>();
      const adjacencyList = new Map<string, Set<string>>();
      
      for (const e of allEndorsements) {
        const from = e.endorser.toLowerCase();
        const to = e.endorsee.toLowerCase();
        vouchSet.add(`${from}->${to}`);
        
        if (!adjacencyList.has(from)) {
          adjacencyList.set(from, new Set());
        }
        adjacencyList.get(from)!.add(to);
      }

      // Find mutual vouches (A->B and B->A)
      const checkedPairs = new Set<string>();
      for (const e of allEndorsements) {
        const a = e.endorser.toLowerCase();
        const b = e.endorsee.toLowerCase();
        const pairKey = [a, b].sort().join('|');
        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);
          if (vouchSet.has(`${a}->${b}`) && vouchSet.has(`${b}->${a}`)) {
            reciprocityAnalysis.mutualVouches.push({ userA: a, userB: b });
          }
        }
      }
      reciprocityAnalysis.mutualVouchCount = reciprocityAnalysis.mutualVouches.length;
      
      // Calculate reciprocity rate (what % of vouches are reciprocated)
      const totalPairs = checkedPairs.size;
      reciprocityAnalysis.reciprocityRate = totalPairs > 0 
        ? Math.round((reciprocityAnalysis.mutualVouchCount / totalPairs) * 10000) / 100 
        : 0;

      // Find triangles (A->B->C->A cycles) - strong Sybil indicator
      const triangleSet = new Set<string>();
      const adjacencyEntries = Array.from(adjacencyList.entries());
      for (const [a, neighborsOfA] of adjacencyEntries) {
        const neighborsOfAArray = Array.from(neighborsOfA);
        for (const b of neighborsOfAArray) {
          const neighborsOfB = adjacencyList.get(b);
          if (neighborsOfB) {
            const neighborsOfBArray = Array.from(neighborsOfB);
            for (const c of neighborsOfBArray) {
              if (c !== a && c !== b && vouchSet.has(`${c}->${a}`)) {
                // Found triangle: A->B->C->A
                const sortedTriangle = [a, b, c].sort().join('|');
                if (!triangleSet.has(sortedTriangle)) {
                  triangleSet.add(sortedTriangle);
                  reciprocityAnalysis.triangles.push({ a, b, c });
                }
              }
            }
          }
        }
      }
      reciprocityAnalysis.triangleCount = reciprocityAnalysis.triangles.length;

      // Add users involved in mutual vouches to outliers if they have high scores
      const usersInMutualVouches = new Set<string>();
      for (const mv of reciprocityAnalysis.mutualVouches) {
        usersInMutualVouches.add(mv.userA);
        usersInMutualVouches.add(mv.userB);
      }
      
      for (const ctx of validScores) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        const score = ctx.localHealth!;
        const incoming = ctx.incomingActive || 0;
        const outgoing = ctx.outgoingTotal || 0;
        
        // High score user involved in mutual vouching
        if (score > 60 && usersInMutualVouches.has(addr)) {
          // Check if not already flagged
          if (!outliers.some(o => o.address === addr)) {
            outliers.push({ 
              address: addr, 
              localHealth: score, 
              incomingVouches: incoming, 
              outgoingVouches: outgoing, 
              anomalyType: 'mutual_vouch_high_score' 
            });
          }
        }
      }

      // Add users involved in triangles to outliers
      const usersInTriangles = new Set<string>();
      for (const tri of reciprocityAnalysis.triangles) {
        usersInTriangles.add(tri.a);
        usersInTriangles.add(tri.b);
        usersInTriangles.add(tri.c);
      }
      
      for (const ctx of validScores) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        const score = ctx.localHealth!;
        const incoming = ctx.incomingActive || 0;
        const outgoing = ctx.outgoingTotal || 0;
        
        // User involved in vouch triangle/cycle
        if (usersInTriangles.has(addr)) {
          if (!outliers.some(o => o.address === addr && o.anomalyType === 'vouch_triangle')) {
            outliers.push({ 
              address: addr, 
              localHealth: score, 
              incomingVouches: incoming, 
              outgoingVouches: outgoing, 
              anomalyType: 'vouch_triangle' 
            });
          }
        }
      }

      // 7. Path Redundancy Analysis (flag high scores with low vertex-disjoint paths)
      const pathRedundancyAnalysis = {
        highScoreLowPaths: [] as { address: string; localHealth: number; minCut: number; incoming: number }[],
        avgMinCutForHighScores: 0,
        avgMinCutForLowScores: 0,
        pathRedundancyRatio: 0,
      };

      const highScoreUsers = validScores.filter(c => c.localHealth! >= 50);
      const lowScoreUsers = validScores.filter(c => c.localHealth! < 50);
      
      const highScoreMinCuts = highScoreUsers
        .filter(c => c.actualMinCut !== null && c.actualMinCut !== undefined)
        .map(c => c.actualMinCut!);
      const lowScoreMinCuts = lowScoreUsers
        .filter(c => c.actualMinCut !== null && c.actualMinCut !== undefined)
        .map(c => c.actualMinCut!);

      pathRedundancyAnalysis.avgMinCutForHighScores = highScoreMinCuts.length > 0 
        ? Math.round(avg(highScoreMinCuts) * 100) / 100 
        : 0;
      pathRedundancyAnalysis.avgMinCutForLowScores = lowScoreMinCuts.length > 0 
        ? Math.round(avg(lowScoreMinCuts) * 100) / 100 
        : 0;

      // Path redundancy ratio: high score avg / low score avg (should be > 1 for healthy network)
      if (pathRedundancyAnalysis.avgMinCutForLowScores > 0) {
        pathRedundancyAnalysis.pathRedundancyRatio = Math.round(
          (pathRedundancyAnalysis.avgMinCutForHighScores / pathRedundancyAnalysis.avgMinCutForLowScores) * 100
        ) / 100;
      }

      // Flag users with high score but low min-cut (suspicious: score > 60 but minCut <= 1)
      for (const ctx of validScores) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        const score = ctx.localHealth!;
        const minCut = ctx.actualMinCut ?? 0;
        const incoming = ctx.incomingActive || 0;
        const outgoing = ctx.outgoingTotal || 0;
        
        // High score with low path redundancy
        if (score >= 60 && minCut <= 1 && incoming > 0) {
          pathRedundancyAnalysis.highScoreLowPaths.push({
            address: addr,
            localHealth: score,
            minCut,
            incoming,
          });
          
          // Add to outliers if not already flagged
          if (!outliers.some(o => o.address === addr && o.anomalyType === 'high_score_low_paths')) {
            outliers.push({
              address: addr,
              localHealth: score,
              incomingVouches: incoming,
              outgoingVouches: outgoing,
              anomalyType: 'high_score_low_paths',
            });
          }
        }
      }

      // 8. Cohort Segmentation (by tenure and chain)
      const cohortSegmentation = {
        byTenure: [] as { cohort: string; count: number; avgLocalHealth: number; medianLocalHealth: number }[],
        byChainAndScore: [] as { chainNamespace: string; avgLocalHealth: number; count: number }[],
      };

      // Tenure cohorts based on context creation date
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const tenureCohorts = {
        'new (< 1 week)': validScores.filter(c => c.createdAt && new Date(c.createdAt) > oneWeekAgo),
        'recent (1-4 weeks)': validScores.filter(c => c.createdAt && new Date(c.createdAt) <= oneWeekAgo && new Date(c.createdAt) > oneMonthAgo),
        'established (1-3 months)': validScores.filter(c => c.createdAt && new Date(c.createdAt) <= oneMonthAgo && new Date(c.createdAt) > threeMonthsAgo),
        'veteran (> 3 months)': validScores.filter(c => c.createdAt && new Date(c.createdAt) <= threeMonthsAgo),
      };

      for (const [cohort, users] of Object.entries(tenureCohorts)) {
        const scores = users.map(c => c.localHealth!);
        cohortSegmentation.byTenure.push({
          cohort,
          count: users.length,
          avgLocalHealth: scores.length > 0 ? Math.round(avg(scores) * 100) / 100 : 0,
          medianLocalHealth: scores.length > 0 ? Math.round(median(scores) * 100) / 100 : 0,
        });
      }

      // Chain-based score averages (using endorsement chain data)
      const chainScoreMap = new Map<string, number[]>();
      for (const ctx of validScores) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        
        // Find endorsements for this user to determine their chain
        const userEndorsements = allEndorsements.filter(e => e.endorsee.toLowerCase() === addr);
        if (userEndorsements.length > 0) {
          const chain = userEndorsements[0].chainNamespace || 'eip155';
          if (!chainScoreMap.has(chain)) {
            chainScoreMap.set(chain, []);
          }
          chainScoreMap.get(chain)!.push(ctx.localHealth!);
        }
      }

      const chainScoreEntries = Array.from(chainScoreMap.entries());
      for (const [chain, scores] of chainScoreEntries) {
        cohortSegmentation.byChainAndScore.push({
          chainNamespace: chain,
          avgLocalHealth: Math.round(avg(scores) * 100) / 100,
          count: scores.length,
        });
      }
      cohortSegmentation.byChainAndScore.sort((a, b) => b.count - a.count);

      // 9. Network Structure Metrics (clustering coefficient, articulation points approximation)
      const networkStructureMetrics = {
        clusteringCoefficient: 0,
        avgDegree: 0,
        maxDegree: 0,
        isolatedNodes: 0,
        hubNodes: [] as { address: string; degree: number; localHealth: number }[],
      };

      // Calculate degree for each node (in + out edges)
      const nodeDegreesMap = new Map<string, number>();
      for (const e of allEndorsements) {
        const from = e.endorser.toLowerCase();
        const to = e.endorsee.toLowerCase();
        nodeDegreesMap.set(from, (nodeDegreesMap.get(from) || 0) + 1);
        nodeDegreesMap.set(to, (nodeDegreesMap.get(to) || 0) + 1);
      }

      const nodeDegrees = Array.from(nodeDegreesMap.values());
      networkStructureMetrics.avgDegree = nodeDegrees.length > 0 ? Math.round(avg(nodeDegrees) * 100) / 100 : 0;
      networkStructureMetrics.maxDegree = nodeDegrees.length > 0 ? max(nodeDegrees) : 0;

      // Isolated nodes (users with no connections)
      networkStructureMetrics.isolatedNodes = allContexts.length - nodeDegreesMap.size;

      // Hub nodes (top 10 by degree)
      const nodeDegreeEntries = Array.from(nodeDegreesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      for (const [addr, degree] of nodeDegreeEntries) {
        const ctx = validScores.find(c => c.ownerAddress?.toLowerCase() === addr);
        networkStructureMetrics.hubNodes.push({
          address: addr,
          degree,
          localHealth: ctx?.localHealth ?? 0,
        });
      }

      // Approximate local clustering coefficient
      // For each node with degree >= 2, count how many of its neighbors are connected to each other
      let totalClusteringCoeff = 0;
      let nodesWithEnoughDegree = 0;
      
      const adjacencyListEntries = Array.from(adjacencyList.entries());
      for (const [node, neighbors] of adjacencyListEntries) {
        const neighborArray = Array.from(neighbors);
        if (neighborArray.length < 2) continue;
        
        nodesWithEnoughDegree++;
        let connectedNeighborPairs = 0;
        const possiblePairs = neighborArray.length * (neighborArray.length - 1);
        
        // Check how many neighbor pairs are connected (in either direction)
        for (let i = 0; i < neighborArray.length; i++) {
          for (let j = 0; j < neighborArray.length; j++) {
            if (i !== j) {
              const ni = neighborArray[i];
              const nj = neighborArray[j];
              if (vouchSet.has(`${ni}->${nj}`)) {
                connectedNeighborPairs++;
              }
            }
          }
        }
        
        if (possiblePairs > 0) {
          totalClusteringCoeff += connectedNeighborPairs / possiblePairs;
        }
      }
      
      networkStructureMetrics.clusteringCoefficient = nodesWithEnoughDegree > 0 
        ? Math.round((totalClusteringCoeff / nodesWithEnoughDegree) * 1000) / 1000 
        : 0;

      // 10. Network Summary
      const localHealthScores = validScores.map(c => c.localHealth!);
      
      const report = {
        generatedAt,
        networkSummary: {
          totalUsers: allContexts.length,
          usersWithScores: totalWithScores,
          totalVouches,
          totalParticipants,
          graphDensity: Math.round(graphDensity * 10000) / 10000,
          avgLocalHealth: Math.round(avg(localHealthScores) * 100) / 100,
          medianLocalHealth: Math.round(median(localHealthScores) * 100) / 100,
          minLocalHealth: min(localHealthScores),
          maxLocalHealth: max(localHealthScores),
          stdDevLocalHealth: Math.round(stdDev(localHealthScores) * 100) / 100,
        },
        scoreDistribution,
        componentBreakdown,
        vouchGraphStats: {
          avgVouchesGiven: Math.round(avg(givenCounts) * 100) / 100,
          medianVouchesGiven: median(givenCounts),
          maxVouchesGiven: max(givenCounts),
          avgVouchesReceived: Math.round(avg(receivedCounts) * 100) / 100,
          medianVouchesReceived: median(receivedCounts),
          maxVouchesReceived: max(receivedCounts),
          usersWhoVouched: uniqueEndorsers.size,
          usersWhoReceivedVouches: uniqueEndorsees.size,
        },
        chainDistribution,
        reciprocityAnalysis: {
          mutualVouchCount: reciprocityAnalysis.mutualVouchCount,
          triangleCount: reciprocityAnalysis.triangleCount,
          reciprocityRate: reciprocityAnalysis.reciprocityRate,
          mutualVouches: reciprocityAnalysis.mutualVouches.slice(0, 20), // Limit to 20 pairs
          triangles: reciprocityAnalysis.triangles.slice(0, 20), // Limit to 20 triangles
        },
        pathRedundancyAnalysis: {
          avgMinCutForHighScores: pathRedundancyAnalysis.avgMinCutForHighScores,
          avgMinCutForLowScores: pathRedundancyAnalysis.avgMinCutForLowScores,
          pathRedundancyRatio: pathRedundancyAnalysis.pathRedundancyRatio,
          highScoreLowPathsCount: pathRedundancyAnalysis.highScoreLowPaths.length,
          highScoreLowPaths: pathRedundancyAnalysis.highScoreLowPaths.slice(0, 20), // Limit to 20
        },
        cohortSegmentation,
        networkStructureMetrics,
        outliers: outliers.slice(0, 50), // Limit to top 50 outliers
        outlierCount: outliers.length,
      };

      return res.status(200).json(report);
    } catch (error) {
      console.error("Error generating network report:", error);
      return res.status(500).json({ error: "Failed to generate network report" });
    }
  });

  app.get("/api/epoch/:id/health", async (req, res) => {
    try {
      const epochId = parseInt(req.params.id);

      if (isNaN(epochId)) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      let health = await storage.getEpochHealth(epochId);

      // Auto-create mock epoch health data if it doesn't exist
      if (!health) {
        const { generateMockEpochHealth } = await import("./health/mock-data");
        health = await generateMockEpochHealth(epochId);
      }

      return res.status(200).json({
        epoch: epochId,
        GHI: health.ghi,
        metrics: {
          sizeN: health.sizeN,
          cutN: health.cutN,
          churnN: health.churnN,
        },
        raw: {
          acceptedCount: health.rawAcceptedCount,
          avgMinCut: health.rawAvgMinCut,
          churnStability: health.rawChurnStability,
        },
        weights: {
          sizeN: 0.30,
          cutN: 0.50,
          churnN: 0.20,
        },
      });
    } catch (error) {
      console.error("Error fetching epoch health:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/epoch/:id/pagerank-metrics", async (req, res) => {
    try {
      const epochId = parseInt(req.params.id);

      if (isNaN(epochId)) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      return res.status(200).json(null);
    } catch (error) {
      console.error("Error fetching PageRank metrics:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/score/:did", async (req, res) => {
    try {
      const did = req.params.did.toLowerCase();

      const userScore = await storage.getLatestScore(did);

      if (!userScore) {
        return res.status(404).json({ 
          error: "No score computed for this user",
          message: "User either has no endorsements or epoch computation has not run yet"
        });
      }

      const epochHealth = await storage.getEpochHealth(Number(userScore.epochId));
      
      const confidence = computeUserConfidence(epochHealth?.ghi || 0, userScore.minCut);

      return res.status(200).json({
        did,
        epoch: userScore.epochId,
        trust: {
          sts: userScore.sts,
          flow: userScore.flow,
          mincut: userScore.minCut,
        },
        tier: userScore.tier,
        percentile: userScore.percentile,
        components: {
          flow: userScore.flow,
          minCut: userScore.minCut,
          stability: userScore.stability,
          depth: userScore.depth,
          pageRank: userScore.pageRank || 0,
        },
        normalizedComponents: userScore.normalizedFlow !== null && userScore.normalizedFlow !== undefined ? {
          flow: userScore.normalizedFlow!,
          minCut: userScore.normalizedMinCut!,
          stability: userScore.normalizedStability!,
          depth: userScore.normalizedDepth!,
          pageRank: userScore.normalizedPageRank!,
        } : undefined,
        confidence: {
          percent: confidence.percent,
          global: epochHealth ? {
            GHI: epochHealth.ghi,
            sizeN: epochHealth.sizeN,
            cutN: epochHealth.cutN,
            churnN: epochHealth.churnN,
          } : null,
          local: confidence.local,
        },
      });
    } catch (error) {
      console.error("Error fetching user score:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Wallet profile endpoints
  app.get("/api/user/:address", async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const profile = await storage.getWalletProfile(address);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      return res.status(200).json(profile);
    } catch (error) {
      console.error("Error fetching wallet profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/user/:address", async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Name is required" });
      }

      // Check if profile exists, create if not
      let profile = await storage.getWalletProfile(address);
      
      if (!profile) {
        profile = await storage.createWalletProfile({ address, name });
      } else {
        profile = await storage.updateWalletProfile(address, { name });
      }

      return res.status(200).json(profile);
    } catch (error) {
      console.error("Error updating wallet profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // LocalHealth statistics endpoint (cached for 5 minutes)
  app.get("/api/stats/local-health", async (req, res) => {
    const now = Date.now();
    
    // Return cached data if fresh (within TTL)
    if (localHealthStatsCache.data && (now - localHealthStatsCache.timestamp) < STATS_CACHE_TTL) {
      return res.status(200).json(localHealthStatsCache.data);
    }
    
    try {
      // Get all ego contexts
      const allContexts = await db
        .select()
        .from(contexts)
        .where(eq(contexts.type, 'ego'));

      if (allContexts.length === 0) {
        return res.status(200).json({
          totalUsers: 0,
          avgLocalHealth: 0,
          distribution: [],
        });
      }

      // Get global endorsements once (no limit for accurate statistics)
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 1000000
      });

      const formattedVouches = globalEndorsements.map(e => ({
        endorser: e.endorser.toLowerCase() as `0x${string}`,
        endorsee: e.endorsee.toLowerCase() as `0x${string}`,
      }));

      const { EgoScorer } = await import("./algorithm/egoScoring");
      const scorer = new EgoScorer();

      // Batch fetch all co-seeds for all contexts
      const coSeedsByContext = new Map<number, string[]>();
      await Promise.all(
        allContexts.map(async (context) => {
          try {
            const coSeedsData = await storage.getCoSeeds(context.id);
            const seedAddresses = coSeedsData.map(cs => cs.address.toLowerCase());
            coSeedsByContext.set(context.id, seedAddresses);
          } catch (error) {
            console.error(`Error fetching co-seeds for context ${context.id}:`, error);
            coSeedsByContext.set(context.id, []);
          }
        })
      );

      // Compute LocalHealth for all users at once using iterative algorithm
      const allAddresses = allContexts
        .map(c => c.ownerAddress?.toLowerCase())
        .filter((addr): addr is string => !!addr) as `0x${string}`[];
      
      const results = scorer.computeLocalHealthIterative(allAddresses, formattedVouches);
      
      // Extract scores from results
      const scores: number[] = [];
      for (const addr of allAddresses) {
        const result = results.get(addr);
        if (result) {
          scores.push(result.localHealth);
        }
      }

      // Calculate statistics
      const avgLocalHealth = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

      // Create distribution bins (0-10, 10-20, ..., 90-100)
      const bins = Array(10).fill(0);
      scores.forEach(score => {
        const binIndex = Math.min(Math.floor(score / 10), 9);
        bins[binIndex]++;
      });

      const distribution = bins.map((count, index) => ({
        bin: `${index * 10}-${(index + 1) * 10}`,
        count,
      }));

      const responseData = {
        totalUsers: scores.length,
        avgLocalHealth: Math.round(avgLocalHealth * 100) / 100,
        distribution,
      };
      
      // Cache the response
      localHealthStatsCache.data = responseData;
      localHealthStatsCache.timestamp = now;
      
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching LocalHealth stats:", error);
      // Return stale cache on error if available
      if (localHealthStatsCache.data) {
        return res.status(200).json(localHealthStatsCache.data);
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Graph data endpoint for LocalHealth network visualization (cached for 5 minutes)
  app.get("/api/graph/local-health", async (req, res) => {
    const now = Date.now();
    
    // Return cached data if fresh (within TTL) - only for default params
    const limit = parseInt(req.query.limit as string) || 100;
    const communityId = parseInt(req.query.communityId as string) || 0;
    
    // For default params (100, 0), use cache
    if (limit === 100 && communityId === 0 && graphLocalHealthCache.data && (now - graphLocalHealthCache.timestamp) < STATS_CACHE_TTL) {
      return res.status(200).json(graphLocalHealthCache.data);
    }
    
    try {
      // Get endorsements for the network
      const endorsements = await storage.getEndorsements({
        communityId,
        limit: limit * 10 // Get more edges to ensure connected graph
      });

      if (endorsements.length === 0) {
        return res.status(200).json({
          nodes: [],
          links: []
        });
      }

      // Collect unique addresses from endorsements
      const addressSet = new Set<string>();
      endorsements.forEach(e => {
        addressSet.add(e.endorser.toLowerCase());
        addressSet.add(e.endorsee.toLowerCase());
      });

      const addresses = Array.from(addressSet).slice(0, limit) as `0x${string}`[];

      // Compute LocalHealth scores for all nodes
      const formattedVouches = endorsements.map(e => ({
        endorser: e.endorser.toLowerCase() as `0x${string}`,
        endorsee: e.endorsee.toLowerCase() as `0x${string}`,
      }));

      const { EgoScorer } = await import("./algorithm/egoScoring");
      const scorer = new EgoScorer();
      const results = scorer.computeLocalHealthIterative(addresses, formattedVouches);

      // Build nodes array with LocalHealth scores and degree
      const nodes = addresses.map(address => {
        const result = results.get(address);
        const degree = formattedVouches.filter(
          v => v.endorser === address || v.endorsee === address
        ).length;

        return {
          id: address,
          address,
          localHealth: Math.round(result?.localHealth || 0),
          degree,
          voucherCount: result?.metrics?.acceptedUsers || 0,
          avgVoucherStrength: result?.metrics?.avgResidualFlow || 0
        };
      });

      // Build links array (filter to only include nodes we're showing, deduplicate)
      const nodeIds = new Set(addresses);
      const seenLinks = new Set<string>();
      const links = endorsements
        .filter(e => 
          nodeIds.has(e.endorser.toLowerCase() as `0x${string}`) && 
          nodeIds.has(e.endorsee.toLowerCase() as `0x${string}`)
        )
        .map(e => ({
          source: e.endorser.toLowerCase(),
          target: e.endorsee.toLowerCase()
        }))
        .filter(link => {
          const key = `${link.source}->${link.target}`;
          if (seenLinks.has(key)) return false;
          seenLinks.add(key);
          return true;
        });

      const responseData = { nodes, links };
      
      // Cache for default params only
      if (limit === 100 && communityId === 0) {
        graphLocalHealthCache.data = responseData;
        graphLocalHealthCache.timestamp = now;
      }
      
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching graph data:", error);
      // Return stale cache on error only for matching default params
      if (limit === 100 && communityId === 0 && graphLocalHealthCache.data) {
        return res.status(200).json(graphLocalHealthCache.data);
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // General stats endpoint (cached for 5 minutes)
  app.get("/api/stats", async (req, res) => {
    const now = Date.now();
    
    // Return cached data if fresh (within TTL)
    if (generalStatsCache.data && (now - generalStatsCache.timestamp) < STATS_CACHE_TTL) {
      return res.status(200).json(generalStatsCache.data);
    }
    
    try {
      // Platform-wide aggregates
      const totalEndorsements = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(publicEndorsements);

      const uniqueEndorsers = await db
        .select({ count: sql<number>`count(distinct endorser)::int` })
        .from(publicEndorsements);

      const uniqueEndorsees = await db
        .select({ count: sql<number>`count(distinct endorsee)::int` })
        .from(publicEndorsements);

      // Count unique participants across all communities using SQL (no limit)
      const allParticipantsResult = await db
        .select({ address: sql<string>`endorser` })
        .from(publicEndorsements)
        .union(
          db.select({ address: sql<string>`endorsee` }).from(publicEndorsements)
        );
      const allParticipants = new Set(allParticipantsResult.map(r => r.address.toLowerCase()));

      // Get all communities (no "active" status flag exists - we count all)
      const allCommunities = await storage.listCommunities();

      // Calculate platform-wide trusted users using LATEST epoch score per user (across all communities)
      const allScoresResult = await db
        .select()
        .from(scores);

      // Group scores by LOWERCASE user address to handle case-insensitive deduplication
      const latestScoresByUser = new Map<string, typeof allScoresResult[0]>();
      allScoresResult.forEach(score => {
        const normalizedAddress = score.address.toLowerCase();
        const existing = latestScoresByUser.get(normalizedAddress);
        if (!existing || Number(score.epochId) > Number(existing.epochId)) {
          latestScoresByUser.set(normalizedAddress, score);
        }
      });

      // Count unique trusted users (those with isAccepted in their latest epoch, any community)
      const latestScores = Array.from(latestScoresByUser.values());
      const trustedUsers = latestScores.filter(s => s.isAccepted).length;
      
      // Calculate average STS using only latest epoch scores
      let avgScore = 0;
      const acceptedLatestScores = latestScores.filter(s => s.isAccepted);
      if (acceptedLatestScores.length > 0) {
        const totalSts = acceptedLatestScores.reduce((sum, s) => sum + s.sts, 0);
        avgScore = totalSts / acceptedLatestScores.length;
      }

      // Per-community breakdown
      const communityStats = await Promise.all(
        allCommunities.map(async (community: Community) => {
          // Use SQL count queries instead of fetching all endorsements to avoid data truncation
          const endorsementCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(publicEndorsements)
            .where(sql`community_id = ${community.id}`);
          
          // Count unique participants using UNION to avoid double-counting
          const participantsResult = await db
            .select({ address: sql<string>`endorser` })
            .from(publicEndorsements)
            .where(sql`community_id = ${community.id}`)
            .union(
              db.select({ address: sql<string>`endorsee` })
                .from(publicEndorsements)
                .where(sql`community_id = ${community.id}`)
            );
          const uniqueParticipantsCount = new Set(participantsResult.map(r => r.address.toLowerCase())).size;

          // Get latest epoch for this community
          const currentEpoch = await storage.getCurrentEpoch(community.id);
          let communityTrusted = 0;
          let communityAvgSTS = 0;
          let communityGHI = 0;

          if (currentEpoch) {
            const communityScores = await storage.getScoresByEpoch(currentEpoch.id, community.id);
            const accepted = communityScores.filter((s: Score) => s.isAccepted);
            communityTrusted = accepted.length;
            
            if (accepted.length > 0) {
              const totalSts = accepted.reduce((sum: number, s: Score) => sum + s.sts, 0);
              communityAvgSTS = totalSts / accepted.length;
            }

            // Get health metrics
            const health = await storage.getEpochHealth(currentEpoch.id, community.id);
            if (health) {
              communityGHI = health.ghi;
            }
          }

          return {
            id: community.id,
            name: community.name,
            totalUsers: uniqueParticipantsCount,
            endorsements: endorsementCount[0]?.count || 0,
            acceptedUsers: communityTrusted,
            avgSTS: Math.round(communityAvgSTS * 100) / 100,
            ghi: Math.round(communityGHI * 100) / 100,
          };
        })
      );

      const responseData = {
        // Platform-wide aggregates
        totalUsers: allParticipants.size,
        totalEndorsements: totalEndorsements[0]?.count || 0,
        totalEndorsers: uniqueEndorsers[0]?.count || 0,
        totalEndorsees: uniqueEndorsees[0]?.count || 0,
        trustedUsers,
        avgScore: Math.round(avgScore * 100) / 100,
        avgSTS: Math.round(avgScore * 100) / 100,
        totalCommunities: allCommunities.length,
        // Per-community breakdown
        communities: communityStats,
      };
      
      // Cache the response
      generalStatsCache.data = responseData;
      generalStatsCache.timestamp = now;
      
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Return stale cache on error if available
      if (generalStatsCache.data) {
        return res.status(200).json(generalStatsCache.data);
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Network Traction - aggregated metrics for landing page (cached for 5 minutes)
  app.get("/api/stats/network-traction", async (req, res) => {
    const now = Date.now();
    
    // Return cached data if fresh (within TTL)
    if (networkTractionCache.data && (now - networkTractionCache.timestamp) < STATS_CACHE_TTL) {
      return res.status(200).json(networkTractionCache.data);
    }
    
    try {
      // Get basic vouch stats - LocalHealth focused only
      const totalEndorsements = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(publicEndorsements);
      
      // Count unique vouchers (endorsers) and endorsees
      const uniqueVouchersResult = await db
        .select({ address: publicEndorsements.endorser })
        .from(publicEndorsements)
        .groupBy(publicEndorsements.endorser);
      const totalVouchers = uniqueVouchersResult.length;
      
      const uniqueEndorseesResult = await db
        .select({ address: publicEndorsements.endorsee })
        .from(publicEndorsements)
        .groupBy(publicEndorsements.endorsee);
      const totalEndorsees = uniqueEndorseesResult.length;
      
      // All participants in the graph
      const allParticipantsResult = await db
        .select({ address: sql<string>`endorser` })
        .from(publicEndorsements)
        .union(
          db.select({ address: sql<string>`endorsee` }).from(publicEndorsements)
        );
      const totalParticipants = new Set(allParticipantsResult.map(r => r.address.toLowerCase())).size;
      
      // Get LocalHealth stats from contexts
      const allContexts = await storage.getAllContexts();
      const contextsWithScores = allContexts.filter((c: Context) => c.localHealth !== null && c.localHealth > 0);
      const avgLocalHealth = contextsWithScores.length > 0
        ? contextsWithScores.reduce((sum: number, c: Context) => sum + (c.localHealth || 0), 0) / contextsWithScores.length
        : 0;
      
      // LocalHealth distribution with better buckets
      const healthDistribution = {
        critical: contextsWithScores.filter((c: Context) => (c.localHealth || 0) < 40).length,
        warning: contextsWithScores.filter((c: Context) => (c.localHealth || 0) >= 40 && (c.localHealth || 0) < 60).length,
        healthy: contextsWithScores.filter((c: Context) => (c.localHealth || 0) >= 60 && (c.localHealth || 0) < 80).length,
        quality: contextsWithScores.filter((c: Context) => (c.localHealth || 0) >= 80).length,
      };
      
      // Calculate graph density (edges / max possible edges among scored users)
      const actualEdges = totalEndorsements[0]?.count || 0;
      const maxPossibleEdges = totalParticipants * (totalParticipants - 1);
      const graphDensity = maxPossibleEdges > 0 ? (actualEdges / maxPossibleEdges) * 100 : 0;
      
      // Get dilution zones from vouches given (outgoing vouch behavior)
      const endorserCounts = await db
        .select({
          endorser: publicEndorsements.endorser,
          count: sql<number>`count(*)::int`
        })
        .from(publicEndorsements)
        .groupBy(publicEndorsements.endorser);
      
      const qualityZone = endorserCounts.filter(e => e.count <= 10).length;
      const warningZone = endorserCounts.filter(e => e.count > 10 && e.count <= 15).length;
      const penaltyZone = endorserCounts.filter(e => e.count > 15 && e.count <= 25).length;
      const criticalZone = endorserCounts.filter(e => e.count > 25).length;
      const totalEndorsersCount = endorserCounts.length;
      
      const qualityPercent = totalEndorsersCount > 0 ? Math.round((qualityZone / totalEndorsersCount) * 100) : 0;
      
      // Average vouches received per scored user
      const avgVouchesReceived = contextsWithScores.length > 0 ? actualEdges / contextsWithScores.length : 0;
      
      const responseData = {
        // Core LocalHealth metrics
        totalVouchers,
        totalVouches: actualEdges,
        scoredUsers: contextsWithScores.length,
        avgLocalHealth: Math.round(avgLocalHealth * 10) / 10,
        
        // Graph health indicators
        graphDensity: Math.round(graphDensity * 100) / 100,
        avgVouchesPerUser: Math.round(avgVouchesReceived * 10) / 10,
        totalParticipants,
        
        // LocalHealth score distribution
        healthDistribution,
        
        // Dilution zones (outgoing vouch behavior)
        dilutionZones: {
          quality: qualityZone,
          warning: warningZone,
          penalty: penaltyZone,
          critical: criticalZone,
          qualityPercent,
        },
      };
      
      // Update cache
      networkTractionCache.data = responseData;
      networkTractionCache.timestamp = now;
      
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error fetching network traction:", error);
      // Return stale cache on error if available
      if (networkTractionCache.data) {
        console.log("Returning stale cache due to error");
        return res.status(200).json(networkTractionCache.data);
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/seeds", async (req, res) => {
    try {
      const communityId = req.query.communityId ? parseInt(req.query.communityId as string, 10) : 0;
      const seeds = await storage.getSeeds(communityId);
      return res.status(200).json({ seeds });
    } catch (error) {
      console.error("Error fetching seeds:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/seeds", async (req, res) => {
    try {
      const { address, walletSignature, note, communityId } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      if (!walletSignature || !walletSignature.address || !walletSignature.message || !walletSignature.signature) {
        return res.status(401).json({ error: "Wallet signature required for authentication" });
      }

      const isValidSignature = await verifyMessage({
        address: walletSignature.address as Address,
        message: walletSignature.message,
        signature: walletSignature.signature as Hex,
      });

      if (!isValidSignature) {
        return res.status(401).json({ error: "Invalid wallet signature" });
      }

      const seed = await storage.createSeed({ 
        address: address.toLowerCase(), 
        addedBy: walletSignature.address.toLowerCase(),
        note,
        communityId: communityId !== undefined ? communityId : 0
      });
      
      return res.status(201).json({ seed });
    } catch (error) {
      console.error("Error creating seed:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/seeds/:address", async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      const { walletSignature, communityId } = req.body;

      if (!walletSignature || !walletSignature.address || !walletSignature.message || !walletSignature.signature) {
        return res.status(401).json({ error: "Wallet signature required for authentication" });
      }

      const isValidSignature = await verifyMessage({
        address: walletSignature.address as Address,
        message: walletSignature.message,
        signature: walletSignature.signature as Hex,
      });

      if (!isValidSignature) {
        return res.status(401).json({ error: "Invalid wallet signature" });
      }

      await storage.deleteSeed(address, communityId !== undefined ? communityId : 0);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting seed:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/epoch/:epochId/compute", async (req, res) => {
    try {
      const epochId = parseInt(req.params.epochId, 10);
      const communityId = req.body.communityId !== undefined ? parseInt(req.body.communityId, 10) : 0;
      
      if (isNaN(epochId) || epochId < 0) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      if (isNaN(communityId) || communityId < 0) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const alreadyComputed = await epochComputation.hasComputedScores(epochId, communityId);
      
      if (alreadyComputed) {
        return res.status(400).json({ 
          error: "Epoch already computed",
          message: "Delete existing scores first if you want to recompute"
        });
      }

      await epochComputation.computeEpochScores(epochId, communityId);
      
      const summary = await epochComputation.getComputationSummary(epochId, communityId);
      
      return res.status(200).json({ 
        success: true,
        summary
      });
    } catch (error: any) {
      console.error("Error computing epoch:", error);
      return res.status(500).json({ 
        error: "Failed to compute epoch",
        message: error.message 
      });
    }
  });

  app.delete("/api/epoch/:epochId", async (req, res) => {
    try {
      const epochId = parseInt(req.params.epochId, 10);
      
      if (isNaN(epochId) || epochId < 0) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      await storage.deleteEpochData(epochId);
      
      return res.status(200).json({ 
        success: true,
        message: "Epoch data deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting epoch:", error);
      return res.status(500).json({ 
        error: "Failed to delete epoch",
        message: error.message 
      });
    }
  });

  app.get("/api/epoch/:epochId/summary", async (req, res) => {
    try {
      const epochId = parseInt(req.params.epochId, 10);
      const communityId = req.query.communityId ? parseInt(req.query.communityId as string, 10) : 0;
      
      if (isNaN(epochId) || epochId < 0) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      if (isNaN(communityId) || communityId < 0) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const summary = await epochComputation.getComputationSummary(epochId, communityId);
      
      return res.status(200).json(summary);
    } catch (error) {
      console.error("Error fetching epoch summary:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/sts-distribution", async (req, res) => {
    try {
      // Get all scores across all epochs
      const allScores = await storage.getAllScores();
      
      if (allScores.length === 0) {
        return res.status(200).json({
          distribution: [],
          percentiles: { p25: 0, p50: 0, p75: 0, p95: 0 }
        });
      }

      // Group by user address and take latest epoch score for each user
      const latestScoresByUser = allScores.reduce((acc, score) => {
        const userAddress = score.address?.toLowerCase();
        if (!userAddress) return acc;
        if (!acc[userAddress] || Number(score.epochId) > Number(acc[userAddress].epochId)) {
          acc[userAddress] = score;
        }
        return acc;
      }, {} as Record<string, typeof allScores[0]>);

      // Get accepted scores from all users' latest scores
      const acceptedScores = Object.values(latestScoresByUser).filter(s => s.isAccepted);
      
      if (acceptedScores.length === 0) {
        return res.status(200).json({
          distribution: [],
          percentiles: { p25: 0, p50: 0, p75: 0, p95: 0 }
        });
      }

      const stsValues = acceptedScores.map(s => s.sts).sort((a, b) => a - b);
      
      const bins = [
        { bin: "0-20", count: stsValues.filter(s => s >= 0 && s < 20).length },
        { bin: "20-40", count: stsValues.filter(s => s >= 20 && s < 40).length },
        { bin: "40-60", count: stsValues.filter(s => s >= 40 && s < 60).length },
        { bin: "60-80", count: stsValues.filter(s => s >= 60 && s < 80).length },
        { bin: "80-100", count: stsValues.filter(s => s >= 80 && s <= 100).length },
      ];

      const percentiles = {
        p25: Math.round(stsValues[Math.floor(stsValues.length * 0.25)] || 0),
        p50: Math.round(stsValues[Math.floor(stsValues.length * 0.50)] || 0),
        p75: Math.round(stsValues[Math.floor(stsValues.length * 0.75)] || 0),
        p95: Math.round(stsValues[Math.floor(stsValues.length * 0.95)] || 0),
      };

      return res.status(200).json({ distribution: bins, percentiles });
    } catch (error) {
      console.error("Error fetching STS distribution:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/tier-distribution", async (req, res) => {
    try {
      // Get all scores across all epochs
      const allScores = await storage.getAllScores();
      
      if (allScores.length === 0) {
        return res.status(200).json({ distribution: [] });
      }

      // Group by user address and take latest epoch score for each user
      const latestScoresByUser = allScores.reduce((acc, score) => {
        const userAddress = score.address?.toLowerCase();
        if (!userAddress) return acc;
        if (!acc[userAddress] || Number(score.epochId) > Number(acc[userAddress].epochId)) {
          acc[userAddress] = score;
        }
        return acc;
      }, {} as Record<string, typeof allScores[0]>);

      // Get accepted scores from all users' latest scores
      const acceptedScores = Object.values(latestScoresByUser).filter(s => s.isAccepted);
      
      const tierCounts = {
        connected: acceptedScores.filter(s => {
          const tier = s.tier?.toLowerCase();
          return tier === 'connected' || tier === 'apprentice';
        }).length,
        verified: acceptedScores.filter(s => {
          const tier = s.tier?.toLowerCase();
          return tier === 'verified' || tier === 'journeyer';
        }).length,
        trusted: acceptedScores.filter(s => {
          const tier = s.tier?.toLowerCase();
          return tier === 'trusted' || tier === 'master';
        }).length,
      };

      const total = acceptedScores.length || 1;

      const distribution = [
        {
          level: 'Connected' as const,
          count: tierCounts.connected,
          percentage: Math.round((tierCounts.connected / total) * 100),
        },
        {
          level: 'Verified' as const,
          count: tierCounts.verified,
          percentage: Math.round((tierCounts.verified / total) * 100),
        },
        {
          level: 'Trusted' as const,
          count: tierCounts.trusted,
          percentage: Math.round((tierCounts.trusted / total) * 100),
        },
      ];

      return res.status(200).json({ distribution });
    } catch (error) {
      console.error("Error fetching tier distribution:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/network-growth", async (req, res) => {
    try {
      const allScores = await storage.getAllScores();
      
      // Group scores by epoch
      const scoresByEpoch = allScores.reduce((acc, score) => {
        const epochId = Number(score.epochId);
        if (!acc[epochId]) {
          acc[epochId] = [];
        }
        acc[epochId].push(score);
        return acc;
      }, {} as Record<number, typeof allScores>);

      const data = Object.keys(scoresByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => {
          const epochScores = scoresByEpoch[Number(epochId)];
          const acceptedCount = epochScores.filter(s => s.isAccepted).length;
          const totalCount = epochScores.length;
          
          return {
            epoch: `Epoch ${epochId}`,
            totalUsers: totalCount,
            activeUsers: acceptedCount,
          };
        });

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching network growth:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/endorsement-velocity", async (req, res) => {
    try {
      const allEndorsements = await storage.getEndorsements({ limit: 10000 });
      
      // Group endorsements by epoch
      const endorsementsByEpoch = allEndorsements.reduce((acc, e) => {
        const epochId = Number(e.epoch);
        if (!acc[epochId]) {
          acc[epochId] = 0;
        }
        acc[epochId]++;
        return acc;
      }, {} as Record<number, number>);

      const data = Object.keys(endorsementsByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => ({
          epoch: `Epoch ${epochId}`,
          newEndorsements: endorsementsByEpoch[Number(epochId)],
          revokedEndorsements: 0,
        }));

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching endorsement velocity:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/score-components", async (req, res) => {
    try {
      const allScores = await storage.getAllScores();
      
      // Group scores by epoch
      const scoresByEpoch = allScores.reduce((acc, score) => {
        const epochId = Number(score.epochId);
        if (!acc[epochId]) {
          acc[epochId] = [];
        }
        acc[epochId].push(score);
        return acc;
      }, {} as Record<number, typeof allScores>);

      const data = Object.keys(scoresByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => {
          const epochScores = scoresByEpoch[Number(epochId)];
          const acceptedScores = epochScores.filter(s => s.isAccepted);
          
          if (acceptedScores.length === 0) {
            return null;
          }

          const avgFlow = acceptedScores.reduce((sum, s) => sum + s.flow, 0) / acceptedScores.length;
          const avgMinCut = acceptedScores.reduce((sum, s) => sum + s.minCut, 0) / acceptedScores.length;
          const avgStability = acceptedScores.reduce((sum, s) => sum + s.stability, 0) / acceptedScores.length;
          const avgDepth = acceptedScores.reduce((sum, s) => sum + s.depth, 0) / acceptedScores.length;

          return {
            epoch: `Epoch ${epochId}`,
            flow: parseFloat((avgFlow * 100).toFixed(2)),
            cut: parseFloat((avgMinCut * 100).toFixed(2)),
            stability: parseFloat((avgStability * 100).toFixed(2)),
            depth: parseFloat(avgDepth.toFixed(2)),
          };
        })
        .filter(d => d !== null);

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching score components:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/average-sts", async (req, res) => {
    try {
      const allScores = await storage.getAllScores();
      
      // Group scores by epoch
      const scoresByEpoch = allScores.reduce((acc, score) => {
        const epochId = Number(score.epochId);
        if (!acc[epochId]) {
          acc[epochId] = [];
        }
        acc[epochId].push(score);
        return acc;
      }, {} as Record<number, typeof allScores>);

      const data = Object.keys(scoresByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => {
          const epochScores = scoresByEpoch[Number(epochId)];
          const acceptedScores = epochScores.filter(s => s.isAccepted);
          
          if (acceptedScores.length === 0) {
            return null;
          }

          const stsValues = acceptedScores.map(s => s.sts).sort((a, b) => a - b);
          const mean = stsValues.reduce((sum, v) => sum + v, 0) / stsValues.length;
          const median = stsValues[Math.floor(stsValues.length * 0.50)] || 0;
          const p25 = stsValues[Math.floor(stsValues.length * 0.25)] || 0;
          const p75 = stsValues[Math.floor(stsValues.length * 0.75)] || 0;

          return {
            epoch: `Epoch ${epochId}`,
            mean: parseFloat(mean.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            p25: parseFloat(p25.toFixed(2)),
            p75: parseFloat(p75.toFixed(2)),
          };
        })
        .filter(d => d !== null);

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching average STS:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/network-density", async (req, res) => {
    try {
      const allEndorsements = await storage.getEndorsements({ limit: 10000 });
      const allScores = await storage.getAllScores();
      
      // Group data by epoch
      const endorsementsByEpoch = allEndorsements.reduce((acc, e) => {
        const epochId = Number(e.epoch);
        if (!acc[epochId]) {
          acc[epochId] = [];
        }
        acc[epochId].push(e);
        return acc;
      }, {} as Record<number, typeof allEndorsements>);

      const scoresByEpoch = allScores.reduce((acc, score) => {
        const epochId = Number(score.epochId);
        if (!acc[epochId]) {
          acc[epochId] = [];
        }
        acc[epochId].push(score);
        return acc;
      }, {} as Record<number, typeof allScores>);

      const data = Object.keys(scoresByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => {
          const epochScores = scoresByEpoch[Number(epochId)];
          const epochEndorsements = endorsementsByEpoch[Number(epochId)] || [];
          const acceptedScores = epochScores.filter(s => s.isAccepted);
          
          if (acceptedScores.length === 0 || epochEndorsements.length === 0) {
            return null;
          }

          const allParticipants = new Set<string>();
          epochEndorsements.forEach(e => {
            allParticipants.add(e.endorser);
            allParticipants.add(e.endorsee);
          });

          const endorsementsPerUser = epochEndorsements.length / allParticipants.size;
          const avgDepth = acceptedScores.reduce((sum, s) => sum + s.depth, 0) / acceptedScores.length;

          return {
            epoch: `Epoch ${epochId}`,
            endorsementsPerUser: parseFloat(endorsementsPerUser.toFixed(2)),
            avgPathLength: parseFloat(avgDepth.toFixed(2)),
          };
        })
        .filter(d => d !== null);

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching network density:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/security-health", async (req, res) => {
    try {
      // Get all scores across all epochs
      const allScores = await storage.getAllScores();
      
      if (allScores.length === 0) {
        return res.status(200).json({
          seedSaturation: null,
          pathDiversity: null,
          avgMinCut: null,
          acceptedUsers: 0,
          epochId: 0,
        });
      }

      // Group by user address and take latest epoch score for each user
      const latestScoresByUser = allScores.reduce((acc, score) => {
        const userAddress = score.address?.toLowerCase();
        if (!userAddress) return acc;
        if (!acc[userAddress] || Number(score.epochId) > Number(acc[userAddress].epochId)) {
          acc[userAddress] = score;
        }
        return acc;
      }, {} as Record<string, typeof allScores[0]>);

      // Get accepted scores from all users' latest scores
      const acceptedScores = Object.values(latestScoresByUser).filter(s => s.isAccepted);

      // Get latest epoch health data for seed saturation
      const latestHealth = await storage.getLatestEpochHealth();
      const latestEpochId = latestHealth?.epochId || 0;

      // Calculate path diversity (minCut / flow ratio)
      const diversityValues = acceptedScores
        .map(s => {
          const flow = s.flow || 1;
          const minCut = s.minCut || 0;
          return Math.min(minCut / Math.max(flow, 1), 1.0);
        })
        .filter(v => v > 0);

      const avgPathDiversity = diversityValues.length > 0
        ? diversityValues.reduce((a, b) => a + b, 0) / diversityValues.length
        : 0;

      // Calculate average min-cut for accepted users
      const minCutValues = acceptedScores.map(s => s.minCut);
      const avgMinCut = minCutValues.length > 0
        ? minCutValues.reduce((a, b) => a + b, 0) / minCutValues.length
        : 0;

      return res.status(200).json({
        seedSaturation: latestHealth?.maxSeedShare 
          ? {
              maxShare: Math.round((latestHealth.maxSeedShare || 0) * 100),
              maxSeedAddress: latestHealth.maxSeedAddress,
              status: (latestHealth.maxSeedShare || 0) > 0.5 ? 'warning' : (latestHealth.maxSeedShare || 0) > 0.4 ? 'caution' : 'healthy'
            }
          : null,
        pathDiversity: {
          average: parseFloat((avgPathDiversity * 100).toFixed(1)),
          status: avgPathDiversity >= 0.8 ? 'healthy' : avgPathDiversity >= 0.5 ? 'moderate' : 'low'
        },
        avgMinCut: {
          value: parseFloat(avgMinCut.toFixed(2)),
          status: avgMinCut >= 3 ? 'strong' : avgMinCut >= 2 ? 'adequate' : 'weak'
        },
        acceptedUsers: acceptedScores.length,
        epochId: latestEpochId,
      });
    } catch (error) {
      console.error("Error fetching security health:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/path-diversity", async (req, res) => {
    try {
      // Get all scores across all epochs
      const allScores = await storage.getAllScores();
      
      if (allScores.length === 0) {
        return res.status(200).json({
          min: 0,
          p25: 0,
          median: 0,
          p75: 0,
          max: 0,
          count: 0
        });
      }

      // Group by user address and take latest epoch score for each user
      const latestScoresByUser = allScores.reduce((acc, score) => {
        const userAddress = score.address?.toLowerCase();
        if (!userAddress) return acc;
        if (!acc[userAddress] || Number(score.epochId) > Number(acc[userAddress].epochId)) {
          acc[userAddress] = score;
        }
        return acc;
      }, {} as Record<string, typeof allScores[0]>);

      // Get accepted scores from all users' latest scores
      const acceptedScores = Object.values(latestScoresByUser).filter(s => s.isAccepted);

      if (acceptedScores.length === 0) {
        return res.status(200).json({
          min: 0,
          p25: 0,
          median: 0,
          p75: 0,
          max: 0,
          count: 0
        });
      }

      // Calculate path diversity index for each user: minCut / max(flow, 1)
      // This represents the fraction of flow that is redundant/diverse
      const diversityValues = acceptedScores
        .map(s => {
          const flow = s.flow || 1;
          const minCut = s.minCut || 0;
          // Cap at 1.0 since diversity can't exceed 100%
          return Math.min(minCut / Math.max(flow, 1), 1.0);
        })
        .sort((a, b) => a - b);

      // Calculate percentiles helper
      const calculatePercentile = (values: number[], percentile: number): number => {
        const index = Math.ceil(values.length * percentile) - 1;
        return values[Math.max(0, index)] || 0;
      };

      return res.status(200).json({
        min: diversityValues[0] || 0,
        p25: calculatePercentile(diversityValues, 0.25),
        median: calculatePercentile(diversityValues, 0.50),
        p75: calculatePercentile(diversityValues, 0.75),
        max: diversityValues[diversityValues.length - 1] || 0,
        count: acceptedScores.length
      });
    } catch (error) {
      console.error("Error fetching path diversity:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Algorithm Convergence Telemetry - Shows LocalHealth iteration behavior
  app.get("/api/analytics/convergence-metrics", async (req, res) => {
    try {
      const { EgoScorer } = await import('./algorithm/egoScoring');
      
      // Get all vouches and addresses for computation
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      const addresses = allContexts.filter(c => c.ownerAddress).map(c => c.ownerAddress as `0x${string}`);
      
      if (addresses.length === 0 || vouches.length === 0) {
        return res.status(200).json({
          iterations: 0,
          converged: true,
          convergenceThreshold: 0.5,
          residualDecay: [],
          finalMaxChange: 0,
          userCount: 0,
          vouchCount: 0
        });
      }

      // Simulate convergence tracking with instrumented algorithm
      const scorer = new EgoScorer();
      const globalVouches = vouches.map(v => ({
        endorser: v.endorser.toLowerCase() as `0x${string}`,
        endorsee: v.endorsee.toLowerCase() as `0x${string}`
      }));

      // Track convergence manually by running iterations
      const maxIterations = 10;
      const convergenceThreshold = 0.5;
      const residualDecay: { iteration: number; maxChange: number; avgChange: number }[] = [];
      
      let currentScores = new Map<string, number>();
      for (const addr of addresses) {
        const addrLower = addr.toLowerCase();
        const incomingCount = globalVouches.filter(v => v.endorsee.toLowerCase() === addrLower).length;
        currentScores.set(addrLower, Math.min(100, Math.sqrt(incomingCount) * 20));
      }

      let iteration = 0;
      let maxChange = Infinity;
      
      for (; iteration < maxIterations && maxChange >= convergenceThreshold; iteration++) {
        const newScores = new Map<string, number>();
        let totalChange = 0;
        maxChange = 0;

        for (const addr of addresses) {
          const result = scorer.computeLocalHealth(addr, [], globalVouches);
          const addrLower = addr.toLowerCase();
          newScores.set(addrLower, result.localHealth);
          
          const oldScore = currentScores.get(addrLower) || 0;
          const change = Math.abs(result.localHealth - oldScore);
          maxChange = Math.max(maxChange, change);
          totalChange += change;
        }

        const avgChange = addresses.length > 0 ? totalChange / addresses.length : 0;
        residualDecay.push({ iteration: iteration + 1, maxChange, avgChange });

        for (const [addr, score] of Array.from(newScores.entries())) {
          currentScores.set(addr, score);
        }
      }

      return res.status(200).json({
        iterations: iteration,
        converged: maxChange < convergenceThreshold,
        convergenceThreshold,
        residualDecay,
        finalMaxChange: maxChange,
        userCount: addresses.length,
        vouchCount: vouches.length
      });
    } catch (error) {
      console.error("Error computing convergence metrics:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vouch Timeline - Activity over real timestamps (not epochs)
  app.get("/api/analytics/vouch-timeline", async (req, res) => {
    try {
      const endorsements = await storage.getEndorsements({ limit: 10000 });
      
      if (endorsements.length === 0) {
        return res.status(200).json({ timeline: [], cumulativeGrowth: [] });
      }

      // Group by day
      const dailyActivity = new Map<string, { count: number; uniqueEndorsers: Set<string>; uniqueEndorsees: Set<string> }>();
      
      endorsements.forEach(e => {
        const date = new Date(e.createdAt).toISOString().split('T')[0];
        if (!dailyActivity.has(date)) {
          dailyActivity.set(date, { count: 0, uniqueEndorsers: new Set(), uniqueEndorsees: new Set() });
        }
        const day = dailyActivity.get(date)!;
        day.count++;
        day.uniqueEndorsers.add(e.endorser.toLowerCase());
        day.uniqueEndorsees.add(e.endorsee.toLowerCase());
      });

      // Sort by date and compute cumulative
      const sortedDates = Array.from(dailyActivity.keys()).sort();
      let cumulativeVouches = 0;
      const allUsers = new Set<string>();

      const timeline = sortedDates.map(date => {
        const day = dailyActivity.get(date)!;
        cumulativeVouches += day.count;
        day.uniqueEndorsers.forEach(u => allUsers.add(u));
        day.uniqueEndorsees.forEach(u => allUsers.add(u));
        
        return {
          date,
          vouches: day.count,
          uniqueEndorsers: day.uniqueEndorsers.size,
          uniqueEndorsees: day.uniqueEndorsees.size,
          cumulativeVouches,
          cumulativeUsers: allUsers.size
        };
      });

      return res.status(200).json({ timeline });
    } catch (error) {
      console.error("Error fetching vouch timeline:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Flow vs Redundancy Correlation - Scatter plot data
  app.get("/api/analytics/flow-redundancy-correlation", async (req, res) => {
    try {
      const allContexts = await storage.getAllContexts();
      const vouches = await storage.getEndorsements({ limit: 10000 });
      
      if (allContexts.length === 0) {
        return res.status(200).json({ 
          points: [], 
          regression: { slope: 0, intercept: 0, r2: 0 },
          stats: { avgFlow: 0, avgRedundancy: 0, correlation: 0 }
        });
      }

      // Build vouch count map
      const incomingVouches = new Map<string, number>();
      const outgoingVouches = new Map<string, number>();
      
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        const endorser = v.endorser.toLowerCase();
        incomingVouches.set(endorsee, (incomingVouches.get(endorsee) || 0) + 1);
        outgoingVouches.set(endorser, (outgoingVouches.get(endorser) || 0) + 1);
      });

      const HEALTHY_VOUCH_COUNT = 8.0;
      const HEALTHY_REDUNDANCY = 35.0;
      
      const points = allContexts.filter(ctx => ctx.ownerAddress).map(ctx => {
        const address = (ctx.ownerAddress || '').toLowerCase();
        const localHealth = ctx.localHealth || 0;
        const vouchCount = incomingVouches.get(address) || 0;
        const outgoing = outgoingVouches.get(address) || 0;
        
        // Estimate flow and redundancy from score
        const flowRatio = Math.min(1.0, vouchCount / HEALTHY_VOUCH_COUNT);
        const flowComponent = 60 * Math.pow(flowRatio, 2.0);
        const redundancyComponent = Math.max(0, localHealth - flowComponent);
        const redundancyRatio = Math.sqrt(redundancyComponent / 40);
        const estimatedRedundancy = redundancyRatio * HEALTHY_REDUNDANCY;
        
        return {
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          localHealth: Math.round(localHealth),
          vouchCount,
          outgoingVouches: outgoing,
          flowComponent: Math.round(flowComponent * 10) / 10,
          redundancyComponent: Math.round(redundancyComponent * 10) / 10,
          estimatedRedundancy: Math.round(estimatedRedundancy * 10) / 10
        };
      });

      // Simple linear regression: redundancy vs localHealth
      const n = points.length;
      const sumX = points.reduce((s, p) => s + p.estimatedRedundancy, 0);
      const sumY = points.reduce((s, p) => s + p.localHealth, 0);
      const sumXY = points.reduce((s, p) => s + p.estimatedRedundancy * p.localHealth, 0);
      const sumX2 = points.reduce((s, p) => s + p.estimatedRedundancy * p.estimatedRedundancy, 0);
      const sumY2 = points.reduce((s, p) => s + p.localHealth * p.localHealth, 0);
      
      const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
      const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;
      
      // R-squared
      const meanY = sumY / n;
      const ssTotal = points.reduce((s, p) => s + Math.pow(p.localHealth - meanY, 2), 0);
      const ssResidual = points.reduce((s, p) => s + Math.pow(p.localHealth - (slope * p.estimatedRedundancy + intercept), 2), 0);
      const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

      return res.status(200).json({
        points,
        regression: { 
          slope: Math.round(slope * 1000) / 1000, 
          intercept: Math.round(intercept * 100) / 100, 
          r2: Math.round(r2 * 1000) / 1000 
        },
        stats: {
          avgFlow: Math.round((sumX / n) * 10) / 10,
          avgRedundancy: Math.round((sumY / n) * 10) / 10,
          correlation: Math.round(Math.sqrt(Math.abs(r2)) * Math.sign(slope) * 1000) / 1000
        }
      });
    } catch (error) {
      console.error("Error fetching flow-redundancy correlation:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Voucher Strength Distribution - Histogram data
  app.get("/api/analytics/voucher-strength-distribution", async (req, res) => {
    try {
      const allContexts = await storage.getAllContexts();
      const vouches = await storage.getEndorsements({ limit: 10000 });
      
      if (allContexts.length === 0 || vouches.length === 0) {
        return res.status(200).json({ 
          histogram: [], 
          stats: { mean: 0, median: 0, stdDev: 0, skewness: 0 },
          dilutionAnalysis: []
        });
      }

      // Build LocalHealth lookup
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // For each vouch, get the voucher's strength (LocalHealth)
      const voucherStrengths = vouches.map(v => healthMap.get(v.endorser.toLowerCase()) || 0);
      
      // Build histogram (buckets of 10)
      const buckets = Array.from({ length: 10 }, (_, i) => ({ 
        range: `${i * 10}-${(i + 1) * 10}`, 
        min: i * 10, 
        max: (i + 1) * 10,
        count: 0,
        percentage: 0
      }));
      
      voucherStrengths.forEach(strength => {
        const bucketIndex = Math.min(Math.floor(strength / 10), 9);
        buckets[bucketIndex].count++;
      });
      
      const total = voucherStrengths.length;
      buckets.forEach(b => { b.percentage = total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0; });

      // Statistics
      const mean = voucherStrengths.reduce((s, v) => s + v, 0) / total;
      const sorted = [...voucherStrengths].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const variance = voucherStrengths.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / total;
      const stdDev = Math.sqrt(variance);
      const skewness = stdDev > 0 
        ? voucherStrengths.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0) / total
        : 0;

      // Dilution analysis - users who vouch for many people
      const vouchCountByUser = new Map<string, number>();
      vouches.forEach(v => {
        const endorser = v.endorser.toLowerCase();
        vouchCountByUser.set(endorser, (vouchCountByUser.get(endorser) || 0) + 1);
      });

      const dilutionAnalysis = Array.from(vouchCountByUser.entries())
        .map(([address, count]) => ({
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          vouchesGiven: count,
          localHealth: Math.round(healthMap.get(address) || 0),
          dilutionPenalty: count > 10 ? Math.min(0.5, (count - 10) * 0.1) : 0
        }))
        .sort((a, b) => b.vouchesGiven - a.vouchesGiven)
        .slice(0, 20);

      return res.status(200).json({
        histogram: buckets,
        stats: {
          mean: Math.round(mean * 10) / 10,
          median: Math.round(median * 10) / 10,
          stdDev: Math.round(stdDev * 10) / 10,
          skewness: Math.round(skewness * 100) / 100
        },
        dilutionAnalysis
      });
    } catch (error) {
      console.error("Error fetching voucher strength distribution:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Flow Saturation Curve - Shows diminishing returns
  app.get("/api/analytics/flow-saturation-curve", async (req, res) => {
    try {
      const allContexts = await storage.getAllContexts();
      const vouches = await storage.getEndorsements({ limit: 10000 });
      
      // Build vouch count map
      const vouchCounts = new Map<string, number>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        vouchCounts.set(endorsee, (vouchCounts.get(endorsee) || 0) + 1);
      });

      const HEALTHY_VOUCH_COUNT = 8.0;
      
      // Group users by vouch count and compute average LocalHealth
      const byVouchCount = new Map<number, { scores: number[]; count: number }>();
      
      allContexts.forEach(ctx => {
        if (!ctx.ownerAddress) return;
        const count = vouchCounts.get(ctx.ownerAddress.toLowerCase()) || 0;
        if (!byVouchCount.has(count)) {
          byVouchCount.set(count, { scores: [], count: 0 });
        }
        byVouchCount.get(count)!.scores.push(ctx.localHealth || 0);
        byVouchCount.get(count)!.count++;
      });

      // Build curve data
      const curvePoints = Array.from(byVouchCount.entries())
        .map(([vouchCount, data]) => ({
          vouchCount,
          avgLocalHealth: data.scores.reduce((s, v) => s + v, 0) / data.scores.length,
          userCount: data.count,
          theoreticalFlow: 60 * Math.pow(Math.min(1.0, vouchCount / HEALTHY_VOUCH_COUNT), 2.0)
        }))
        .sort((a, b) => a.vouchCount - b.vouchCount);

      // Generate theoretical curve for comparison
      const theoreticalCurve = Array.from({ length: 16 }, (_, i) => ({
        vouchCount: i,
        flowComponent: 60 * Math.pow(Math.min(1.0, i / HEALTHY_VOUCH_COUNT), 2.0),
        saturationPercentage: Math.min(100, (i / HEALTHY_VOUCH_COUNT) * 100)
      }));

      return res.status(200).json({
        empiricalCurve: curvePoints,
        theoreticalCurve,
        healthyTarget: HEALTHY_VOUCH_COUNT,
        maxFlowComponent: 60
      });
    } catch (error) {
      console.error("Error fetching flow saturation curve:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // =====================================================
  // NEW LocalHealth-Focused Analytics Endpoints
  // =====================================================

  // 1. Growth Cohort Analysis - Track new user quality over time
  app.get("/api/analytics/localhealth/growth-cohorts", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ cohorts: [], summary: { totalCohorts: 0, avgRetention: 0 } });
      }

      // Build first-seen date for each address
      const firstSeen = new Map<string, Date>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        const date = new Date(v.createdAt);
        if (!firstSeen.has(endorsee) || date < firstSeen.get(endorsee)!) {
          firstSeen.set(endorsee, date);
        }
      });

      // Build LocalHealth lookup
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // Group by week cohorts
      const cohortMap = new Map<string, { users: string[]; scores: number[] }>();
      
      firstSeen.forEach((date, address) => {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const cohortKey = weekStart.toISOString().split('T')[0];
        
        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, { users: [], scores: [] });
        }
        cohortMap.get(cohortKey)!.users.push(address);
        cohortMap.get(cohortKey)!.scores.push(healthMap.get(address) || 0);
      });

      const cohorts = Array.from(cohortMap.entries())
        .map(([week, data]) => ({
          week,
          newcomers: data.users.length,
          avgLocalHealth: data.scores.length > 0 
            ? Math.round((data.scores.reduce((s, v) => s + v, 0) / data.scores.length) * 10) / 10
            : 0,
          retained: data.scores.filter(s => s > 0).length,
          retentionRate: data.scores.length > 0 
            ? Math.round((data.scores.filter(s => s > 0).length / data.scores.length) * 100)
            : 0
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

      const totalRetention = cohorts.length > 0
        ? Math.round(cohorts.reduce((s, c) => s + c.retentionRate, 0) / cohorts.length)
        : 0;

      return res.status(200).json({
        cohorts,
        summary: {
          totalCohorts: cohorts.length,
          avgRetention: totalRetention,
          totalNewcomers: cohorts.reduce((s, c) => s + c.newcomers, 0)
        }
      });
    } catch (error) {
      console.error("Error fetching growth cohorts:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 2. Voucher Influence Distribution - Trust concentration from top endorsers
  app.get("/api/analytics/localhealth/voucher-influence", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          influencers: [], 
          giniCoefficient: 0,
          concentrationMetrics: { top5Share: 0, top10Share: 0, top20Share: 0 }
        });
      }

      // Build LocalHealth lookup
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // Calculate influence per endorser
      const endorserInfluence = new Map<string, { vouchCount: number; totalInfluence: number; beneficiaries: string[] }>();
      
      vouches.forEach(v => {
        const endorser = v.endorser.toLowerCase();
        const endorsee = v.endorsee.toLowerCase();
        const endorserHealth = healthMap.get(endorser) || 0;
        
        if (!endorserInfluence.has(endorser)) {
          endorserInfluence.set(endorser, { vouchCount: 0, totalInfluence: 0, beneficiaries: [] });
        }
        
        const data = endorserInfluence.get(endorser)!;
        data.vouchCount++;
        data.totalInfluence += endorserHealth / 100; // Normalized influence
        data.beneficiaries.push(endorsee);
      });

      const totalInfluence = Array.from(endorserInfluence.values())
        .reduce((s, d) => s + d.totalInfluence, 0);

      const influencers = Array.from(endorserInfluence.entries())
        .map(([address, data]) => ({
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          fullAddress: address,
          vouchCount: data.vouchCount,
          localHealth: Math.round(healthMap.get(address) || 0),
          influenceShare: totalInfluence > 0 
            ? Math.round((data.totalInfluence / totalInfluence) * 1000) / 10
            : 0,
          beneficiaryCount: new Set(data.beneficiaries).size
        }))
        .sort((a, b) => b.influenceShare - a.influenceShare);

      // Calculate Gini coefficient
      const shares = influencers.map(i => i.influenceShare).sort((a, b) => a - b);
      let gini = 0;
      if (shares.length > 1) {
        const n = shares.length;
        const sumOfDiffs = shares.reduce((sum, share, i) => 
          sum + shares.slice(i + 1).reduce((s, other) => s + Math.abs(share - other), 0), 0);
        const mean = shares.reduce((s, v) => s + v, 0) / n;
        gini = mean > 0 ? Math.round((sumOfDiffs / (2 * n * n * mean)) * 1000) / 1000 : 0;
      }

      // Concentration metrics
      const top5 = influencers.slice(0, 5).reduce((s, i) => s + i.influenceShare, 0);
      const top10 = influencers.slice(0, 10).reduce((s, i) => s + i.influenceShare, 0);
      const top20 = influencers.slice(0, 20).reduce((s, i) => s + i.influenceShare, 0);

      return res.status(200).json({
        influencers: influencers.slice(0, 50), // Top 50
        giniCoefficient: gini,
        concentrationMetrics: {
          top5Share: Math.round(top5 * 10) / 10,
          top10Share: Math.round(top10 * 10) / 10,
          top20Share: Math.round(top20 * 10) / 10
        }
      });
    } catch (error) {
      console.error("Error fetching voucher influence:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 3. Redundancy Depth Heatmap - Direct vs multi-hop support
  app.get("/api/analytics/localhealth/redundancy-depth", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          heatmapData: [],
          depthDistribution: { direct: 0, secondHop: 0, thirdHop: 0 },
          avgDepth: 0
        });
      }

      // Build adjacency list (who vouches for whom)
      const vouchersOf = new Map<string, Set<string>>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        const endorser = v.endorser.toLowerCase();
        if (!vouchersOf.has(endorsee)) {
          vouchersOf.set(endorsee, new Set());
        }
        vouchersOf.get(endorsee)!.add(endorser);
      });

      // For each user, compute support at each depth level
      const depthData: { address: string; direct: number; secondHop: number; thirdHop: number; localHealth: number }[] = [];
      
      allContexts.forEach(ctx => {
        if (!ctx.ownerAddress) return;
        const address = ctx.ownerAddress.toLowerCase();
        
        // Direct vouchers (depth 1)
        const directVouchers = vouchersOf.get(address) || new Set();
        const direct = directVouchers.size;
        
        // Second hop (depth 2) - people who vouch for my vouchers
        const secondHopSet = new Set<string>();
        directVouchers.forEach(voucher => {
          const theirVouchers = vouchersOf.get(voucher) || new Set();
          theirVouchers.forEach(v => {
            if (v !== address && !directVouchers.has(v)) {
              secondHopSet.add(v);
            }
          });
        });
        
        // Third hop (depth 3)
        const thirdHopSet = new Set<string>();
        secondHopSet.forEach(sh => {
          const theirVouchers = vouchersOf.get(sh) || new Set();
          theirVouchers.forEach(v => {
            if (v !== address && !directVouchers.has(v) && !secondHopSet.has(v)) {
              thirdHopSet.add(v);
            }
          });
        });
        
        depthData.push({
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          direct,
          secondHop: secondHopSet.size,
          thirdHop: thirdHopSet.size,
          localHealth: Math.round(ctx.localHealth || 0)
        });
      });

      // Sort by LocalHealth descending
      depthData.sort((a, b) => b.localHealth - a.localHealth);

      // Aggregate distribution
      const totalDirect = depthData.reduce((s, d) => s + d.direct, 0);
      const totalSecond = depthData.reduce((s, d) => s + d.secondHop, 0);
      const totalThird = depthData.reduce((s, d) => s + d.thirdHop, 0);
      const totalSupport = totalDirect + totalSecond + totalThird;

      return res.status(200).json({
        heatmapData: depthData.slice(0, 30), // Top 30 users
        depthDistribution: {
          direct: totalSupport > 0 ? Math.round((totalDirect / totalSupport) * 100) : 0,
          secondHop: totalSupport > 0 ? Math.round((totalSecond / totalSupport) * 100) : 0,
          thirdHop: totalSupport > 0 ? Math.round((totalThird / totalSupport) * 100) : 0
        },
        avgDepth: depthData.length > 0 
          ? Math.round((depthData.reduce((s, d) => s + d.direct + d.secondHop * 0.5 + d.thirdHop * 0.25, 0) / depthData.length) * 10) / 10
          : 0
      });
    } catch (error) {
      console.error("Error fetching redundancy depth:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 4. Edge Fragility Analyzer - Critical connections
  app.get("/api/analytics/localhealth/edge-fragility", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          criticalEdges: [],
          fragilitySummary: { highRisk: 0, mediumRisk: 0, lowRisk: 0 }
        });
      }

      // Build health lookup
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // Count vouches per endorsee
      const vouchCounts = new Map<string, number>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        vouchCounts.set(endorsee, (vouchCounts.get(endorsee) || 0) + 1);
      });

      // Calculate edge criticality - edges where endorsee has few vouchers and endorser is strong
      const edgeCriticality: { 
        endorser: string; 
        endorsee: string; 
        endorserHealth: number;
        endorseeHealth: number;
        endorseeVouchCount: number;
        impactScore: number;
        riskLevel: 'high' | 'medium' | 'low';
      }[] = [];

      vouches.forEach(v => {
        const endorser = v.endorser.toLowerCase();
        const endorsee = v.endorsee.toLowerCase();
        const endorserHealth = healthMap.get(endorser) || 0;
        const endorseeHealth = healthMap.get(endorsee) || 0;
        const endorseeVouchCount = vouchCounts.get(endorsee) || 1;
        
        // Impact score: high endorser health + low endorsee vouch count = critical edge
        // If this edge is removed, the endorsee loses a significant portion of their incoming flow
        const flowContribution = endorserHealth / 100 / endorseeVouchCount;
        const impactScore = Math.round(flowContribution * 60 * 10) / 10; // Estimated score drop
        
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        if (endorseeVouchCount <= 2 && endorserHealth >= 30) riskLevel = 'high';
        else if (endorseeVouchCount <= 4 && endorserHealth >= 20) riskLevel = 'medium';
        
        edgeCriticality.push({
          endorser: `${endorser.slice(0, 6)}...${endorser.slice(-4)}`,
          endorsee: `${endorsee.slice(0, 6)}...${endorsee.slice(-4)}`,
          endorserHealth,
          endorseeHealth,
          endorseeVouchCount,
          impactScore,
          riskLevel
        });
      });

      // Sort by impact score
      edgeCriticality.sort((a, b) => b.impactScore - a.impactScore);

      const highRisk = edgeCriticality.filter(e => e.riskLevel === 'high').length;
      const mediumRisk = edgeCriticality.filter(e => e.riskLevel === 'medium').length;
      const lowRisk = edgeCriticality.filter(e => e.riskLevel === 'low').length;

      return res.status(200).json({
        criticalEdges: edgeCriticality.slice(0, 20), // Top 20 most critical
        fragilitySummary: { highRisk, mediumRisk, lowRisk }
      });
    } catch (error) {
      console.error("Error fetching edge fragility:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 5. Dilution Pressure Dashboard - Over-extended endorsers
  app.get("/api/analytics/localhealth/dilution-pressure", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          endorsers: [],
          networkDilution: { avgPenalty: 0, affectedUsers: 0, totalPenaltyPoints: 0 }
        });
      }

      // Build health lookup
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // Count outgoing vouches per endorser
      const outgoingCounts = new Map<string, { count: number; beneficiaries: string[] }>();
      vouches.forEach(v => {
        const endorser = v.endorser.toLowerCase();
        const endorsee = v.endorsee.toLowerCase();
        if (!outgoingCounts.has(endorser)) {
          outgoingCounts.set(endorser, { count: 0, beneficiaries: [] });
        }
        outgoingCounts.get(endorser)!.count++;
        outgoingCounts.get(endorser)!.beneficiaries.push(endorsee);
      });

      const DILUTION_THRESHOLD = 10;
      const DILUTION_RATE = 0.1; // 10% per vouch beyond threshold
      const MAX_DILUTION = 0.5;

      const endorserData = Array.from(outgoingCounts.entries())
        .map(([address, data]) => {
          const excessVouches = Math.max(0, data.count - DILUTION_THRESHOLD);
          const dilutionPenalty = Math.min(MAX_DILUTION, excessVouches * DILUTION_RATE);
          const avgBeneficiaryHealth = data.beneficiaries.length > 0
            ? data.beneficiaries.reduce((s, b) => s + (healthMap.get(b) || 0), 0) / data.beneficiaries.length
            : 0;
          
          return {
            address: `${address.slice(0, 6)}...${address.slice(-4)}`,
            fullAddress: address,
            localHealth: Math.round(healthMap.get(address) || 0),
            vouchesGiven: data.count,
            excessVouches,
            dilutionPenalty: Math.round(dilutionPenalty * 100),
            avgBeneficiaryHealth: Math.round(avgBeneficiaryHealth * 10) / 10,
            status: dilutionPenalty >= 0.3 ? 'critical' : dilutionPenalty > 0 ? 'warning' : 'healthy'
          };
        })
        .sort((a, b) => b.dilutionPenalty - a.dilutionPenalty);

      const affectedUsers = endorserData.filter(e => e.dilutionPenalty > 0).length;
      const avgPenalty = affectedUsers > 0
        ? Math.round(endorserData.filter(e => e.dilutionPenalty > 0).reduce((s, e) => s + e.dilutionPenalty, 0) / affectedUsers)
        : 0;
      const totalPenaltyPoints = endorserData.reduce((s, e) => s + e.dilutionPenalty, 0);

      return res.status(200).json({
        endorsers: endorserData.slice(0, 30),
        networkDilution: { avgPenalty, affectedUsers, totalPenaltyPoints }
      });
    } catch (error) {
      console.error("Error fetching dilution pressure:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 6. Sybil Risk Radar - Suspicious cluster detection
  app.get("/api/analytics/localhealth/sybil-risk", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          riskIndicators: [],
          overallRisk: 'low',
          suspiciousClusters: []
        });
      }

      // Build health lookup and first-seen dates
      const healthMap = new Map<string, number>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) {
          healthMap.set(ctx.ownerAddress.toLowerCase(), ctx.localHealth || 0);
        }
      });

      // Detect reciprocal vouches
      const vouchPairs = new Set<string>();
      const reciprocalPairs = new Set<string>();
      
      vouches.forEach(v => {
        const forward = `${v.endorser.toLowerCase()}-${v.endorsee.toLowerCase()}`;
        const reverse = `${v.endorsee.toLowerCase()}-${v.endorser.toLowerCase()}`;
        
        if (vouchPairs.has(reverse)) {
          reciprocalPairs.add(forward);
          reciprocalPairs.add(reverse);
        }
        vouchPairs.add(forward);
      });

      // Calculate risk metrics per user
      const userRisk = new Map<string, { 
        reciprocalCount: number; 
        totalVouches: number; 
        lowStrengthVouchers: number;
        isNew: boolean;
      }>();

      // First-seen tracking
      const firstSeen = new Map<string, Date>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        const date = new Date(v.createdAt);
        if (!firstSeen.has(endorsee) || date < firstSeen.get(endorsee)!) {
          firstSeen.set(endorsee, date);
        }
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        const endorser = v.endorser.toLowerCase();
        const pairKey = `${endorser}-${endorsee}`;
        
        if (!userRisk.has(endorsee)) {
          userRisk.set(endorsee, { 
            reciprocalCount: 0, 
            totalVouches: 0, 
            lowStrengthVouchers: 0,
            isNew: firstSeen.get(endorsee)! > oneWeekAgo
          });
        }
        
        const risk = userRisk.get(endorsee)!;
        risk.totalVouches++;
        
        if (reciprocalPairs.has(pairKey)) {
          risk.reciprocalCount++;
        }
        
        if ((healthMap.get(endorser) || 0) < 20) {
          risk.lowStrengthVouchers++;
        }
      });

      // Calculate risk scores
      const riskIndicators = Array.from(userRisk.entries())
        .map(([address, risk]) => {
          const reciprocityRate = risk.totalVouches > 0 
            ? risk.reciprocalCount / risk.totalVouches 
            : 0;
          const lowStrengthRate = risk.totalVouches > 0 
            ? risk.lowStrengthVouchers / risk.totalVouches 
            : 0;
          
          // Composite risk score (0-100)
          let riskScore = 0;
          riskScore += reciprocityRate * 40; // High reciprocity is suspicious
          riskScore += lowStrengthRate * 30; // Many low-strength vouchers is suspicious
          riskScore += risk.isNew ? 20 : 0;  // New accounts get extra scrutiny
          riskScore += (healthMap.get(address) || 0) < 15 ? 10 : 0; // Low personal score
          
          return {
            address: `${address.slice(0, 6)}...${address.slice(-4)}`,
            fullAddress: address,
            localHealth: Math.round(healthMap.get(address) || 0),
            reciprocityRate: Math.round(reciprocityRate * 100),
            lowStrengthRate: Math.round(lowStrengthRate * 100),
            isNew: risk.isNew,
            riskScore: Math.round(Math.min(100, riskScore)),
            riskLevel: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low'
          };
        })
        .filter(r => r.riskScore > 20) // Only show users with some risk
        .sort((a, b) => b.riskScore - a.riskScore);

      // Overall network risk
      const highRiskCount = riskIndicators.filter(r => r.riskLevel === 'high').length;
      const mediumRiskCount = riskIndicators.filter(r => r.riskLevel === 'medium').length;
      const overallRisk = highRiskCount > 5 ? 'high' : mediumRiskCount > 10 ? 'medium' : 'low';

      return res.status(200).json({
        riskIndicators: riskIndicators.slice(0, 20),
        overallRisk,
        riskMetrics: {
          highRiskUsers: highRiskCount,
          mediumRiskUsers: mediumRiskCount,
          reciprocalVouchRate: Math.round((reciprocalPairs.size / 2 / vouches.length) * 100),
          avgVoucherStrength: allContexts.length > 0
            ? Math.round(allContexts.reduce((s, c) => s + (c.localHealth || 0), 0) / allContexts.length)
            : 0
        }
      });
    } catch (error) {
      console.error("Error fetching sybil risk:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 7. Convergence Sensitivity Breakdown - Component contribution per iteration
  app.get("/api/analytics/localhealth/convergence-sensitivity", async (req, res) => {
    try {
      const { EgoScorer } = await import('./algorithm/egoScoring');
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      const addresses = allContexts.filter(c => c.ownerAddress).map(c => c.ownerAddress as `0x${string}`);
      
      if (addresses.length === 0 || vouches.length === 0) {
        return res.status(200).json({
          iterations: [],
          componentBreakdown: { flowDominant: 0, redundancyDominant: 0, balanced: 0 },
          stabilityScore: 100
        });
      }

      const scorer = new EgoScorer();
      const globalVouches = vouches.map(v => ({
        endorser: v.endorser.toLowerCase() as `0x${string}`,
        endorsee: v.endorsee.toLowerCase() as `0x${string}`
      }));

      // Track component contributions per iteration
      const HEALTHY_VOUCH_COUNT = 8.0;
      const HEALTHY_REDUNDANCY = 35.0;
      const maxIterations = 10;
      const convergenceThreshold = 0.5;
      
      const iterationData: {
        iteration: number;
        flowChange: number;
        redundancyChange: number;
        totalChange: number;
        converged: boolean;
      }[] = [];

      // Build vouch count map
      const incomingVouches = new Map<string, number>();
      globalVouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        incomingVouches.set(endorsee, (incomingVouches.get(endorsee) || 0) + 1);
      });

      // Simulate iterations tracking flow vs redundancy changes
      let prevFlowScores = new Map<string, number>();
      let prevRedundancyScores = new Map<string, number>();
      
      // Initialize
      addresses.forEach(addr => {
        const addrLower = addr.toLowerCase();
        const vouchCount = incomingVouches.get(addrLower) || 0;
        const flowRatio = Math.min(1.0, vouchCount / HEALTHY_VOUCH_COUNT);
        prevFlowScores.set(addrLower, 60 * Math.pow(flowRatio, 2.0));
        prevRedundancyScores.set(addrLower, 0); // Start with 0 redundancy
      });

      let iteration = 0;
      let totalChange = Infinity;

      while (iteration < maxIterations && totalChange >= convergenceThreshold) {
        iteration++;
        let flowChangeSum = 0;
        let redundancyChangeSum = 0;
        let maxChange = 0;

        const newFlowScores = new Map<string, number>();
        const newRedundancyScores = new Map<string, number>();

        for (const addr of addresses) {
          const addrLower = addr.toLowerCase();
          const result = scorer.computeLocalHealth(addr, [], globalVouches);
          
          // Estimate component breakdown from result
          const vouchCount = incomingVouches.get(addrLower) || 0;
          const flowRatio = Math.min(1.0, vouchCount / HEALTHY_VOUCH_COUNT);
          const estimatedFlow = 60 * Math.pow(flowRatio, 2.0);
          const estimatedRedundancy = Math.max(0, result.localHealth - estimatedFlow);
          
          newFlowScores.set(addrLower, estimatedFlow);
          newRedundancyScores.set(addrLower, estimatedRedundancy);
          
          const flowChange = Math.abs(estimatedFlow - (prevFlowScores.get(addrLower) || 0));
          const redChange = Math.abs(estimatedRedundancy - (prevRedundancyScores.get(addrLower) || 0));
          
          flowChangeSum += flowChange;
          redundancyChangeSum += redChange;
          maxChange = Math.max(maxChange, flowChange + redChange);
        }

        totalChange = maxChange;
        
        iterationData.push({
          iteration,
          flowChange: Math.round((flowChangeSum / addresses.length) * 100) / 100,
          redundancyChange: Math.round((redundancyChangeSum / addresses.length) * 100) / 100,
          totalChange: Math.round(totalChange * 100) / 100,
          converged: totalChange < convergenceThreshold
        });

        prevFlowScores = newFlowScores;
        prevRedundancyScores = newRedundancyScores;
      }

      // Analyze which component dominates changes
      let flowDominant = 0;
      let redundancyDominant = 0;
      let balanced = 0;
      
      iterationData.forEach(d => {
        if (d.flowChange > d.redundancyChange * 1.5) flowDominant++;
        else if (d.redundancyChange > d.flowChange * 1.5) redundancyDominant++;
        else balanced++;
      });

      // Stability score (100 = perfectly stable, lower = oscillating)
      const stabilityScore = iterationData.length > 0
        ? Math.max(0, 100 - (iterationData[iterationData.length - 1].totalChange * 10))
        : 100;

      return res.status(200).json({
        iterations: iterationData,
        componentBreakdown: { flowDominant, redundancyDominant, balanced },
        stabilityScore: Math.round(stabilityScore)
      });
    } catch (error) {
      console.error("Error fetching convergence sensitivity:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 8. Dilution Zone Distribution - Piecewise curve zone analysis
  app.get("/api/analytics/localhealth/dilution-zones", async (req, res) => {
    try {
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0) {
        return res.status(200).json({ 
          zones: [
            { zone: 'Quality (1-10)', count: 0, percentage: 0, penalty: 0 },
            { zone: 'Warning (11-15)', count: 0, percentage: 0, penalty: 15 },
            { zone: 'Penalty (16-25)', count: 0, percentage: 0, penalty: 45 },
            { zone: 'Critical (25+)', count: 0, percentage: 0, penalty: 60 }
          ],
          totalUsers: 0,
          avgVouchesGiven: 0,
          avgPenalty: 0
        });
      }

      // Count outgoing vouches per user
      const outgoingCounts = new Map<string, number>();
      vouches.forEach(v => {
        const endorser = v.endorser.toLowerCase();
        outgoingCounts.set(endorser, (outgoingCounts.get(endorser) || 0) + 1);
      });

      // Get all unique users
      const allUsers = new Set<string>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) allUsers.add(ctx.ownerAddress.toLowerCase());
      });
      vouches.forEach(v => {
        allUsers.add(v.endorser.toLowerCase());
        allUsers.add(v.endorsee.toLowerCase());
      });

      // Categorize users into piecewise zones
      let qualityZone = 0;    // 1-10 vouches (no penalty)
      let warningZone = 0;    // 11-15 vouches (gentle decay to 0.85)
      let penaltyZone = 0;    // 16-25 vouches (steeper decay to 0.55)
      let criticalZone = 0;   // 25+ vouches (asymptotic to 0.4)
      let totalPenalty = 0;
      let totalVouchesGiven = 0;

      allUsers.forEach(addr => {
        const count = outgoingCounts.get(addr) || 0;
        totalVouchesGiven += count;
        
        if (count <= 10) {
          qualityZone++;
        } else if (count <= 15) {
          warningZone++;
          const progress = (count - 10) / 5;
          totalPenalty += 15 * progress;
        } else if (count <= 25) {
          penaltyZone++;
          const progress = (count - 15) / 10;
          totalPenalty += 15 + 30 * (progress * progress);
        } else {
          criticalZone++;
          const excess = count - 25;
          const decay = 0.15 * (1 - Math.exp(-0.1 * excess));
          totalPenalty += 45 + decay * 100;
        }
      });

      const total = allUsers.size;
      const zones = [
        { zone: 'Quality (1-10)', count: qualityZone, percentage: total > 0 ? Math.round(qualityZone / total * 100) : 0, penalty: 0 },
        { zone: 'Warning (11-15)', count: warningZone, percentage: total > 0 ? Math.round(warningZone / total * 100) : 0, penalty: 15 },
        { zone: 'Penalty (16-25)', count: penaltyZone, percentage: total > 0 ? Math.round(penaltyZone / total * 100) : 0, penalty: 45 },
        { zone: 'Critical (25+)', count: criticalZone, percentage: total > 0 ? Math.round(criticalZone / total * 100) : 0, penalty: 60 }
      ];

      return res.status(200).json({
        zones,
        totalUsers: total,
        avgVouchesGiven: total > 0 ? Math.round(totalVouchesGiven / total * 10) / 10 : 0,
        avgPenalty: total > 0 ? Math.round(totalPenalty / total * 10) / 10 : 0
      });
    } catch (error) {
      console.error("Error fetching dilution zones:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 9. Network Resilience - Vertex-disjoint path statistics
  app.get("/api/analytics/localhealth/network-resilience", async (req, res) => {
    try {
      const { EgoScorer, computeVertexDisjointPaths } = await import('./algorithm/egoScoring');
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      if (vouches.length === 0 || allContexts.length === 0) {
        return res.status(200).json({ 
          distribution: [
            { paths: '0', count: 0 },
            { paths: '1', count: 0 },
            { paths: '2', count: 0 },
            { paths: '3', count: 0 },
            { paths: '4', count: 0 },
            { paths: '5+', count: 0 }
          ],
          avgDisjointPaths: 0,
          highlyResilient: 0,
          vulnerable: 0,
          totalAnalyzed: 0
        });
      }

      const globalVouches = vouches.map(v => ({
        endorser: v.endorser.toLowerCase() as `0x${string}`,
        endorsee: v.endorsee.toLowerCase() as `0x${string}`
      }));

      // Build adjacency for path counting
      const incomingMap = new Map<string, string[]>();
      globalVouches.forEach(v => {
        const list = incomingMap.get(v.endorsee) || [];
        list.push(v.endorser);
        incomingMap.set(v.endorsee, list);
      });

      // Analyze path counts for users with vouchers
      const pathCounts: number[] = [];
      let vulnerable = 0;
      let highlyResilient = 0;
      
      for (const ctx of allContexts) {
        if (!ctx.ownerAddress) continue;
        const addr = ctx.ownerAddress.toLowerCase();
        const vouchers = incomingMap.get(addr) || [];
        
        if (vouchers.length < 2) {
          pathCounts.push(vouchers.length);
          if (vouchers.length === 0) vulnerable++;
          continue;
        }
        
        // Compute vertex-disjoint paths
        const disjointPaths = computeVertexDisjointPaths(
          addr as `0x${string}`,
          vouchers as `0x${string}`[],
          globalVouches
        );
        
        pathCounts.push(disjointPaths);
        if (disjointPaths <= 1) vulnerable++;
        if (disjointPaths >= 4) highlyResilient++;
      }

      // Build distribution
      const distribution = [
        { paths: '0', count: pathCounts.filter(p => p === 0).length },
        { paths: '1', count: pathCounts.filter(p => p === 1).length },
        { paths: '2', count: pathCounts.filter(p => p === 2).length },
        { paths: '3', count: pathCounts.filter(p => p === 3).length },
        { paths: '4', count: pathCounts.filter(p => p === 4).length },
        { paths: '5+', count: pathCounts.filter(p => p >= 5).length }
      ];

      const avgDisjointPaths = pathCounts.length > 0
        ? Math.round(pathCounts.reduce((a, b) => a + b, 0) / pathCounts.length * 10) / 10
        : 0;

      return res.status(200).json({
        distribution,
        avgDisjointPaths,
        highlyResilient,
        vulnerable,
        totalAnalyzed: pathCounts.length
      });
    } catch (error) {
      console.error("Error fetching network resilience:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // 10. Adaptive Baseline Monitor - Current computed thresholds
  app.get("/api/analytics/localhealth/adaptive-baselines", async (req, res) => {
    try {
      const { computeAdaptiveBaselines, DEFAULT_CONFIG } = await import('./algorithm/egoScoring');
      const vouches = await storage.getEndorsements({ limit: 10000 });
      const allContexts = await storage.getAllContexts();
      
      // Fixed baselines for comparison
      const FIXED_VOUCH_COUNT = 8.0;
      const FIXED_REDUNDANCY = 35.0;
      
      if (vouches.length === 0 || allContexts.length === 0) {
        return res.status(200).json({ 
          adaptive: {
            healthyVouchCount: FIXED_VOUCH_COUNT,
            healthyRedundancy: FIXED_REDUNDANCY,
            source: 'fixed',
            networkTooSmall: true
          },
          fixed: {
            healthyVouchCount: FIXED_VOUCH_COUNT,
            healthyRedundancy: FIXED_REDUNDANCY
          },
          networkStats: {
            totalUsers: 0,
            totalVouches: 0,
            avgVouchCount: 0,
            medianVouchCount: 0,
            p75VouchCount: 0
          },
          adaptiveEnabled: DEFAULT_CONFIG.useAdaptiveBaselines
        });
      }

      // Count incoming vouches per user
      const incomingCounts = new Map<string, number>();
      vouches.forEach(v => {
        const endorsee = v.endorsee.toLowerCase();
        incomingCounts.set(endorsee, (incomingCounts.get(endorsee) || 0) + 1);
      });

      // Get vouch counts for all users (including those with 0)
      const allUsers = new Set<string>();
      allContexts.forEach(ctx => {
        if (ctx.ownerAddress) allUsers.add(ctx.ownerAddress.toLowerCase());
      });
      
      const vouchCounts = Array.from(allUsers).map(addr => incomingCounts.get(addr) || 0);
      vouchCounts.sort((a, b) => a - b);

      const totalUsers = vouchCounts.length;
      const avgVouchCount = totalUsers > 0 
        ? Math.round(vouchCounts.reduce((a, b) => a + b, 0) / totalUsers * 10) / 10 
        : 0;
      const medianVouchCount = totalUsers > 0 
        ? vouchCounts[Math.floor(totalUsers / 2)] 
        : 0;
      const p75VouchCount = totalUsers > 0 
        ? vouchCounts[Math.floor(totalUsers * 0.75)] 
        : 0;

      // Compute adaptive baselines
      const globalVouches = vouches.map(v => ({
        endorser: v.endorser.toLowerCase() as `0x${string}`,
        endorsee: v.endorsee.toLowerCase() as `0x${string}`
      }));
      
      const adaptiveBaselines = computeAdaptiveBaselines(globalVouches);
      const networkTooSmall = totalUsers < 10;

      return res.status(200).json({
        adaptive: {
          healthyVouchCount: adaptiveBaselines.healthyVouchCount,
          healthyRedundancy: adaptiveBaselines.healthyRedundancy,
          source: networkTooSmall ? 'fixed (network too small)' : 'computed from 75th percentile',
          networkTooSmall
        },
        fixed: {
          healthyVouchCount: FIXED_VOUCH_COUNT,
          healthyRedundancy: FIXED_REDUNDANCY
        },
        networkStats: {
          totalUsers,
          totalVouches: vouches.length,
          avgVouchCount,
          medianVouchCount,
          p75VouchCount
        },
        adaptiveEnabled: DEFAULT_CONFIG.useAdaptiveBaselines
      });
    } catch (error) {
      console.error("Error fetching adaptive baselines:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Test Data Management Endpoints
  app.post("/api/test-data/organic-growth", async (req, res) => {
    try {
      const currentEpoch = await storage.getCurrentEpoch();
      if (!currentEpoch) {
        return res.status(400).json({ error: "No current epoch found" });
      }

      const previousEpoch = await storage.getEpoch(currentEpoch.id - 1);
      if (!previousEpoch) {
        return res.status(400).json({ error: "No previous epoch found - use seeds to bootstrap" });
      }

      const previousScores = await storage.getScoresByEpoch(previousEpoch.id);
      const acceptedUsers = previousScores
        .filter(s => s.isAccepted)
        .map(s => s.address.toLowerCase());

      if (acceptedUsers.length === 0) {
        return res.status(400).json({ error: "No accepted users in previous epoch" });
      }

      const existingEndorsements = await storage.getEndorsements({ 
        epoch: currentEpoch.id,
        limit: 10000 
      });

      const existingPairs = new Set(
        existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
      );

      let added = 0;

      // Generate random address helper
      const generateRandomAddress = (): string => {
        const chars = '0123456789abcdef';
        let address = '0x';
        for (let i = 0; i < 40; i++) {
          address += chars[Math.floor(Math.random() * chars.length)];
        }
        return address;
      };

      // Step 1: Peer vouches
      const targetPeerVouches = Math.min(100, acceptedUsers.length * 3);
      let peerVouches = 0;
      while (peerVouches < targetPeerVouches) {
        const endorser = acceptedUsers[Math.floor(Math.random() * acceptedUsers.length)];
        const endorsee = acceptedUsers[Math.floor(Math.random() * acceptedUsers.length)];
        if (endorser === endorsee) continue;
        const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
        if (existingPairs.has(pairKey)) continue;

        const nonce = Date.now() + added;
        const sig = '0x' + '00'.repeat(65);
        const { computeLeafHash } = await import('./crypto/merkle');
        const leafHash = computeLeafHash({
          endorser,
          endorsee,
          epoch: BigInt(Number(currentEpoch.id)),
          nonce: BigInt(nonce),
          sig,
        });

        await storage.createEndorsement({
          endorser,
          endorsee,
          epoch: Number(currentEpoch.id),
          nonce,
          leafHash,
          sig,
        });

        existingPairs.add(pairKey);
        peerVouches++;
        added++;
      }

      // Step 2: Invite new members
      const numNewMembers = Math.max(5, Math.floor(acceptedUsers.length * 0.3));
      const newMembers: string[] = [];
      for (let i = 0; i < numNewMembers; i++) {
        newMembers.push(generateRandomAddress());
      }

      let invitations = 0;
      for (const newMember of newMembers) {
        const numInvites = 2 + Math.floor(Math.random() * 3);
        const shuffled = [...acceptedUsers].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(numInvites, shuffled.length); i++) {
          const endorser = shuffled[i];
          const pairKey = `${endorser.toLowerCase()}-${newMember.toLowerCase()}`;
          if (existingPairs.has(pairKey)) continue;

          const nonce = Date.now() + added;
          const sig = '0x' + '00'.repeat(65);
          const { computeLeafHash } = await import('./crypto/merkle');
          const leafHash = computeLeafHash({
            endorser,
            endorsee: newMember,
            epoch: BigInt(Number(currentEpoch.id)),
            nonce: BigInt(nonce),
            sig,
          });

          await storage.createEndorsement({
            endorser,
            endorsee: newMember,
            epoch: Number(currentEpoch.id),
            nonce,
            leafHash,
            sig,
          });

          existingPairs.add(pairKey);
          invitations++;
          added++;
        }
      }

      // Step 3: New members vouch for each other
      const targetNewMemberVouches = Math.min(30, newMembers.length * 2);
      let newMemberVouches = 0;
      while (newMemberVouches < targetNewMemberVouches) {
        const endorser = newMembers[Math.floor(Math.random() * newMembers.length)];
        const endorsee = newMembers[Math.floor(Math.random() * newMembers.length)];
        if (endorser === endorsee) continue;
        const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
        if (existingPairs.has(pairKey)) continue;

        const nonce = Date.now() + added;
        const sig = '0x' + '00'.repeat(65);
        const { computeLeafHash } = await import('./crypto/merkle');
        const leafHash = computeLeafHash({
          endorser,
          endorsee,
          epoch: BigInt(Number(currentEpoch.id)),
          nonce: BigInt(nonce),
          sig,
        });

        await storage.createEndorsement({
          endorser,
          endorsee,
          epoch: Number(currentEpoch.id),
          nonce,
          leafHash,
          sig,
        });

        existingPairs.add(pairKey);
        newMemberVouches++;
        added++;
      }

      return res.status(200).json({
        success: true,
        message: "Organic growth data added successfully",
        summary: {
          epochId: currentEpoch.id,
          peerVouches,
          invitations,
          newMemberVouches,
          totalAdded: added,
          newMembers: newMembers.length,
          expectedNetworkSize: acceptedUsers.length + newMembers.length,
        }
      });
    } catch (error) {
      console.error("Error adding organic growth data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/test-data/endorsements", async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM public_endorsements`);
      return res.status(200).json({ 
        success: true,
        message: "All endorsements deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting endorsements:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/test-data/all", async (req, res) => {
    try {
      await db.execute(sql`DELETE FROM scores`);
      await db.execute(sql`DELETE FROM epoch_health`);
      await db.execute(sql`DELETE FROM public_endorsements`);
      await db.execute(sql`DELETE FROM epochs WHERE id > 0`);
      
      return res.status(200).json({ 
        success: true,
        message: "All test data deleted successfully (seeds preserved)" 
      });
    } catch (error) {
      console.error("Error deleting all data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/test-data/nuclear", async (req, res) => {
    try {
      // Delete in correct order to respect foreign key constraints
      await db.execute(sql`DELETE FROM assists`);
      await db.execute(sql`DELETE FROM loan_installments`);
      await db.execute(sql`DELETE FROM loans`);
      await db.execute(sql`DELETE FROM scores`);
      await db.execute(sql`DELETE FROM epoch_health`);
      await db.execute(sql`DELETE FROM public_endorsements`);
      await db.execute(sql`DELETE FROM epochs`);
      await db.execute(sql`DELETE FROM co_seeds`);
      await db.execute(sql`DELETE FROM contexts`);
      await db.execute(sql`DELETE FROM seeds`);
      await db.execute(sql`DELETE FROM community_roles`);
      await db.execute(sql`DELETE FROM communities WHERE id > 0`);
      await db.execute(sql`DELETE FROM wallet_profiles`);
      
      return res.status(200).json({ 
        success: true,
        message: "Nuclear reset complete - all data cleared (Community 0 preserved)" 
      });
    } catch (error) {
      console.error("Error performing nuclear reset:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================================================
  // COMMUNITY ROUTES
  // ============================================================================

  // Create a new community
  app.post("/api/communities", async (req, res) => {
    try {
      const { name, description, promptText, templateId, visibility, creator, location, logoUrl, coverUrl, themeJson, currency } = req.body;

      if (!name || !promptText || !creator) {
        return res.status(400).json({ error: "name, promptText, and creator are required" });
      }

      // Import templates and crypto
      const { getTemplate, CUSTOM_TEMPLATE } = await import("@shared/community-types");
      const { createPromptHash } = await import("./crypto/keccak");

      // Get template policy or use custom
      let policy;
      if (templateId && templateId !== "custom-v1") {
        const template = getTemplate(templateId);
        if (!template) {
          return res.status(400).json({ error: `Invalid templateId: ${templateId}` });
        }
        policy = template.policy;
      } else {
        policy = CUSTOM_TEMPLATE.policy;
      }

      // Create prompt hash using keccak256
      const promptHash = createPromptHash(promptText);

      // Update policy with actual promptHash
      const policyWithHash = {
        ...policy,
        promptHash,
        visibility: visibility || "public",
      };

      // Create slug from name (lowercase, replace spaces with hyphens)
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const communityCurrency = currency || "USD";

      // Create community (policyJson will be stored as JSONB)
      const community = await storage.createCommunity({
        slug,
        name,
        description: description || null,
        location: location || null,
        logoUrl: logoUrl || null,
        coverUrl: coverUrl || null,
        promptText,
        promptHash,
        policyId: policy.policyId,
        policyJson: policyWithHash as any, // Will be stored as JSONB
        lendingPolicyJson: null,
        themeJson: themeJson || null,
        visibility: visibility || "public",
        creator: creator.toLowerCase(),
        currency: communityCurrency,
      });

      // Automatically add creator as first seed
      await storage.createSeed({
        address: creator.toLowerCase(),
        communityId: community.id,
        addedBy: creator.toLowerCase(),
        note: "Community creator (auto-added)",
      });

      res.status(201).json({
        community,
        message: "Community created successfully. You have been added as the first seed.",
      });
    } catch (error) {
      console.error("Error creating community:", error);
      res.status(500).json({ error: "Failed to create community" });
    }
  });

  // List all communities
  app.get("/api/communities", async (req, res) => {
    try {
      const { visibility, creator } = req.query;

      const filters: {
        visibility?: "public" | "invite" | "archived";
        creator?: string;
      } = {};

      if (visibility && (visibility === "public" || visibility === "invite" || visibility === "archived")) {
        filters.visibility = visibility;
      }
      if (creator && typeof creator === "string") {
        filters.creator = creator.toLowerCase();
      }

      const communities = await storage.listCommunities(filters);

      // Enhance each community with basic metrics
      const communitiesWithMetrics = await Promise.all(
        communities.map(async (community) => {
          try {
            // Get latest epoch health for this specific community
            const latestHealth = await storage.getLatestEpochHealth(community.id);
            
            if (!latestHealth) {
              return {
                ...community,
                metrics: { members: 0, avgScore: 0, activeLoans: 0 }
              };
            }
            
            // Get scores for this community in the latest epoch
            const scores = await storage.getScoresByEpoch(latestHealth.epochId, community.id);
            const acceptedScores = scores.filter(s => s.tier !== 'Outlier');
            const acceptedMembers = acceptedScores.length;
            
            // Calculate average STS (only for accepted members, excluding Outliers)
            const avgScore = acceptedMembers > 0
              ? acceptedScores.reduce((sum, s) => sum + (s.sts || 0), 0) / acceptedMembers
              : 0;
            
            // Get loan count
            const loans = await storage.getLoansByCommunity(community.id);
            const activeLoans = loans.filter(l => l.status === "ACTIVE").length;
            
            return {
              ...community,
              metrics: {
                members: acceptedMembers,
                avgScore: Number(avgScore.toFixed(2)),
                activeLoans,
              }
            };
          } catch (error) {
            console.error(`Error fetching metrics for community ${community.id}:`, error);
            return {
              ...community,
              metrics: { members: 0, avgScore: 0, activeLoans: 0 }
            };
          }
        })
      );

      res.json({ communities: communitiesWithMetrics });
    } catch (error) {
      console.error("Error listing communities:", error);
      res.status(500).json({ error: "Failed to list communities" });
    }
  });

  // Get templates (must be before /:id route)
  app.get("/api/communities/templates", async (req, res) => {
    try {
      const { COMMUNITY_TEMPLATES } = await import("@shared/community-types");
      res.json({ templates: COMMUNITY_TEMPLATES });
    } catch (error) {
      console.error("Error getting templates:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  // Get user's communities (ones they're scored in, seeded in, or created)
  app.get("/api/communities/user/:address", async (req, res) => {
    try {
      const userAddress = req.params.address.toLowerCase();
      
      // Get all scores for this user across all communities
      const scores = await storage.getAllScoresForUser(userAddress);
      
      // Get all seeds for this user (communities they're a seed member of)
      const seeds = await storage.getSeedsByAddress(userAddress);
      
      // Get communities created by this user
      const createdCommunities = await storage.getCommunitiesByCreator(userAddress);
      
      // Combine all community IDs
      const scoreCommunityIds = scores.map(s => s.communityId);
      const seedCommunityIds = seeds.map(s => s.communityId);
      const createdCommunityIds = createdCommunities.map(c => c.id);
      
      const communityIds = Array.from(new Set([
        ...scoreCommunityIds,
        ...seedCommunityIds,
        ...createdCommunityIds
      ]));
      
      if (communityIds.length === 0) {
        return res.json({ communities: [] });
      }
      
      // Fetch community details
      const communities = await Promise.all(
        communityIds.map(id => storage.getCommunity(id))
      );

      // Filter out null results and return
      const validCommunities = communities.filter(c => c !== null);

      res.json({ communities: validCommunities });
    } catch (error) {
      console.error("Error getting user communities:", error);
      res.status(500).json({ error: "Failed to get user communities" });
    }
  });

  // Get a specific community
  app.get("/api/communities/:id/metrics", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      // Get all loans and assists for this community
      const communityLoans = await storage.getLoansByCommunity(id);
      const communityAssists = await storage.getAssistsByCommunity(id);
      
      // Count unique sponsors from assists
      const uniqueSponsors = new Set(
        communityAssists.map(a => a.supporterAddress.toLowerCase())
      );
      
      return res.json({
        sponsorsActive: uniqueSponsors.size,
        totalLoans: communityLoans.length,
        activeLoans: communityLoans.filter(l => l.status === "ACTIVE").length,
      });
    } catch (error: any) {
      console.error("Error fetching community metrics:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/communities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const community = await storage.getCommunity(id);

      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }

      // policyJson is already deserialized by Drizzle (JSONB type)
      const policy = community.policyJson;

      // Pass lending policy with raw arrays (don't convert to min/max/step)
      let lendingPolicyJson = community.lendingPolicyJson;
      if (lendingPolicyJson && typeof lendingPolicyJson === 'object') {
        const rawPolicy = lendingPolicyJson as any;
        
        // Keep the backend format but make it easier to consume
        // Frontend will use the raw arrays directly
        if (rawPolicy.loanButtonsUsdc && Array.isArray(rawPolicy.loanButtonsUsdc)) {
          lendingPolicyJson = {
            enabled: rawPolicy.enabled ?? true,
            currency: rawPolicy.currency || 'ARS',
            loanButtonsUsdc: rawPolicy.loanButtonsUsdc,
            tenorsMonths: rawPolicy.tenorsMonths || [],
            aprNominal: rawPolicy.aprNominal ?? 0,
            annualInterestRate: (rawPolicy.aprNominal ?? 0) * 100,
            subsidies: {
              ibdEnabled: rawPolicy.subsidy?.interestBuydown?.enabled ?? false,
              raEnabled: rawPolicy.subsidy?.repayAssist?.enabled ?? true,
              vouchersEnabled: rawPolicy.subsidy?.vouchers?.enabled ?? false,
              flgEnabled: rawPolicy.subsidy?.firstLossGuarantee?.enabled ?? false,
            },
            trustDeltas: {
              onTimePayment: rawPolicy.trustAdjust?.borrower?.onTimeMonthly ?? 0.02,
              latePayment: rawPolicy.trustAdjust?.borrower?.anyLate7d ?? -0.05,
              defaultEvent: rawPolicy.trustAdjust?.borrower?.default ?? -0.15,
              repayAssist: rawPolicy.trustAdjust?.supporter?.assistSuccess ?? 0.03,
              maxPerEpoch: rawPolicy.trustAdjust?.maxPerEpoch ?? 0.10,
            },
            eligibility: {
              ghiThreshold: rawPolicy.eligibility?.minGHI ?? 60,
              minCutThreshold: rawPolicy.eligibility?.minCut ?? 2,
            },
          };
        }
      }

      // Get seeds for this community
      const seeds = await storage.getSeeds(id);

      // Get latest epoch for this community
      const latestEpoch = await storage.getCurrentEpoch(id);

      res.json({
        community: {
          ...community,
          policy,
          lendingPolicyJson,
        },
        seeds,
        latestEpoch,
      });
    } catch (error) {
      console.error("Error getting community:", error);
      res.status(500).json({ error: "Failed to get community" });
    }
  });

  // Update community visibility (archive/unarchive)
  app.patch("/api/communities/:id/visibility", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { visibility } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      if (!visibility || !["public", "invite", "archived"].includes(visibility)) {
        return res.status(400).json({ error: "Invalid visibility. Must be 'public', 'invite', or 'archived'" });
      }

      const community = await storage.getCommunity(id);
      if (!community) {
        return res.status(404).json({ error: "Community not found" });
      }

      await storage.updateCommunityVisibility(id, visibility);

      res.json({ 
        success: true, 
        message: `Community visibility updated to ${visibility}` 
      });
    } catch (error) {
      console.error("Error updating community visibility:", error);
      res.status(500).json({ error: "Failed to update community visibility" });
    }
  });

  // EGO CONTEXT ENDPOINTS
  // Get or create ego context for a wallet address
  app.get("/api/ego/:address/context", async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      
      const egoContext = await storage.getOrCreateEgoContext(address);
      
      // Get co-seeds for this ego context
      const coSeeds = await storage.getCoSeeds(egoContext.id);
      
      res.json({
        context: egoContext,
        coSeeds,
        seedAddresses: [address, ...coSeeds.map(cs => cs.address)],
      });
    } catch (error) {
      console.error("Error getting ego context:", error);
      res.status(500).json({ error: "Failed to get ego context" });
    }
  });

  // Add co-seed to ego context (max 3)
  app.post("/api/ego/:address/co-seeds", async (req, res) => {
    try {
      const ownerAddress = req.params.address.toLowerCase();
      const { coSeedAddress } = req.body;
      
      if (!coSeedAddress) {
        return res.status(400).json({ error: "coSeedAddress is required" });
      }
      
      const egoContext = await storage.getEgoContext(ownerAddress);
      if (!egoContext) {
        return res.status(404).json({ error: "Ego context not found" });
      }
      
      // Check co-seed limit (max 3)
      const currentCount = await storage.getCoSeedCount(egoContext.id);
      if (currentCount >= 3) {
        return res.status(400).json({ error: "Maximum of 3 co-seeds allowed" });
      }
      
      // Add co-seed
      const coSeed = await storage.addCoSeed({
        contextId: egoContext.id,
        address: coSeedAddress.toLowerCase(),
      });
      
      res.json({ success: true, coSeed });
    } catch (error) {
      console.error("Error adding co-seed:", error);
      res.status(500).json({ error: "Failed to add co-seed" });
    }
  });

  // Remove co-seed from ego context
  app.delete("/api/ego/:address/co-seeds/:coSeedAddress", async (req, res) => {
    try {
      const ownerAddress = req.params.address.toLowerCase();
      const coSeedAddress = req.params.coSeedAddress.toLowerCase();
      
      const egoContext = await storage.getEgoContext(ownerAddress);
      if (!egoContext) {
        return res.status(404).json({ error: "Ego context not found" });
      }
      
      await storage.removeCoSeed(egoContext.id, coSeedAddress);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing co-seed:", error);
      res.status(500).json({ error: "Failed to remove co-seed" });
    }
  });

  // Get Local Health score for ego context (includes KUDOS boosts)
  // Uses cached network-wide scores for consistency with dashboard
  app.get("/api/ego/:address/score", async (req, res) => {
    try {
      const ownerAddress = req.params.address.toLowerCase();
      
      const egoContext = await storage.getOrCreateEgoContext(ownerAddress);
      const coSeeds = await storage.getCoSeeds(egoContext.id);
      
      // Pure Option 2: Use co-seeds only (never include ownerAddress as a seed)
      const seedAddresses = coSeeds.map(cs => cs.address.toLowerCase());
      
      // Use the cached LocalHealth score from the database (computed network-wide)
      // This ensures consistency with dashboard and other APIs
      const localHealth = egoContext.localHealth ?? 0;
      
      // Get vouches for metrics (these are still computed live for display)
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 100000
      });
      
      // Filter out revoked and expired vouches
      const { filterValidEndorsements } = await import("./services/vouchExpiration");
      const validEndorsements = await filterValidEndorsements(globalEndorsements);
      
      // Calculate metrics for display
      const incomingVouches = validEndorsements.filter(
        e => e.endorsee.toLowerCase() === ownerAddress
      );
      const acceptedUsers = incomingVouches.length;
      
      // Calculate some basic metrics for the response
      const avgResidualFlow = acceptedUsers > 0 ? 0.5 : 0;
      const medianMinCut = acceptedUsers * 1.5;
      const maxPossibleFlow = acceptedUsers * 0.5;
      
      // Build node details from incoming vouches
      const nodeDetails = incomingVouches.map((e, i) => ({
        address: e.endorser.toLowerCase(),
        distance: 1,
        capacity: 1,
        flow: 0.5,
        residualFlow: 0.5,
        minCut: 2.5,
      }));
      
      const result = {
        ownerAddress,
        localHealth,
        seedAddresses,
        metrics: {
          totalNodes: acceptedUsers + 1,
          acceptedUsers,
          avgResidualFlow,
          medianMinCut,
          maxPossibleFlow,
        },
        nodeDetails,
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error computing ego score:", error);
      res.status(500).json({ error: "Failed to compute ego score" });
    }
  });

  // Create global vouch (no community, no promptHash)
  app.post("/api/vouch", async (req, res) => {
    try {
      const { endorsement } = req.body;
      
      if (!endorsement) {
        return res.status(400).json({ error: "endorsement object required" });
      }
      
      // Convert numeric fields to BigInt for validation
      const endorsementWithBigInt = {
        ...endorsement,
        epoch: BigInt(endorsement.epoch),
        nonce: BigInt(endorsement.nonce),
      };
      
      // Validate signature and fields
      const isValid = await verifyEndorsementSignature(endorsementWithBigInt);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      // Validate fields
      const fieldsValidation = validateEndorsementFields(endorsementWithBigInt);
      if (!fieldsValidation.valid) {
        return res.status(400).json({ error: fieldsValidation.error || "Invalid endorsement fields" });
      }
      
      // Validate nonce
      const nonceValidation = await validateNonce(
        endorsementWithBigInt.endorser,
        Number(endorsementWithBigInt.epoch),
        endorsementWithBigInt.nonce
      );
      
      if (!nonceValidation.valid) {
        return res.status(400).json({ 
          error: nonceValidation.error || "Invalid nonce", 
          expectedNonce: nonceValidation.expectedNonce,
          providedNonce: endorsementWithBigInt.nonce 
        });
      }
      
      // Compute leaf hash
      const leafHash = computeLeafHash(endorsementWithBigInt);
      
      // Create global vouch (scope='global', no promptHash)
      const dbEndorsement = await storage.createEndorsement({
        communityId: 0,
        scope: 'global', // Mark as global vouch
        endorser: endorsementWithBigInt.endorser.toLowerCase(),
        endorsee: endorsementWithBigInt.endorsee.toLowerCase(),
        epoch: endorsementWithBigInt.epoch,
        nonce: endorsementWithBigInt.nonce,
        sig: endorsementWithBigInt.sig,
        leafHash,
        promptHash: null, // No prompt for global vouches
        note: endorsement.note || null,
      });
      
      // Update endorser's lastSignalActivityAt (vouch activity keeps incoming vouches alive)
      await storage.getOrCreateEgoContext(endorsementWithBigInt.endorser.toLowerCase());
      await storage.updateLastSignalActivity(endorsementWithBigInt.endorser.toLowerCase());
      
      // Note: LocalHealth scores are recalculated every 6 hours by the scheduler
      // On-vouch recalculation removed for performance (network-wide computation is expensive)
      
      res.status(201).json({ 
        success: true, 
        endorsement: dbEndorsement,
        message: "Global vouch created successfully"
      });
    } catch (error) {
      console.error("Error creating global vouch:", error);
      res.status(500).json({ error: "Failed to create global vouch" });
    }
  });

  // Revoke a vouch (create tombstone)
  // Requires signature from the original endorser to prove ownership
  app.delete("/api/vouch/:id", async (req, res) => {
    try {
      const endorsementId = parseInt(req.params.id);
      const { sig, address, reason } = req.body;
      
      if (isNaN(endorsementId)) {
        return res.status(400).json({ error: "Invalid endorsement ID" });
      }
      
      if (!sig || !address) {
        return res.status(400).json({ error: "Signature and address required" });
      }
      
      // Get the endorsement to verify ownership
      const endorsement = await storage.getEndorsement(endorsementId);
      if (!endorsement) {
        return res.status(404).json({ error: "Endorsement not found" });
      }
      
      // Verify the caller is the original endorser
      const normalizedAddress = address.toLowerCase();
      if (endorsement.endorser.toLowerCase() !== normalizedAddress) {
        return res.status(403).json({ error: "Only the original endorser can revoke this vouch" });
      }
      
      // Check if already revoked
      const isRevoked = await storage.isEndorsementRevoked(endorsementId);
      if (isRevoked) {
        return res.status(400).json({ error: "Endorsement already revoked" });
      }
      
      // Verify the signature (simple message signing for revocation)
      const { recoverAddress, hashMessage } = await import("viem");
      const message = `Revoke vouch #${endorsementId}`;
      const messageHash = hashMessage(message);
      
      try {
        const recoveredAddress = await recoverAddress({
          hash: messageHash,
          signature: sig as `0x${string}`,
        });
        
        if (recoveredAddress.toLowerCase() !== normalizedAddress) {
          return res.status(400).json({ error: "Invalid signature" });
        }
      } catch (sigError) {
        console.error("Signature verification failed:", sigError);
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      // Create the tombstone
      await storage.createEndorsementTombstone({
        endorsementId,
        reason: reason || null,
      });
      
      // Note: LocalHealth scores are recalculated every 6 hours by the scheduler
      // On-revocation recalculation removed for performance
      
      res.status(200).json({
        success: true,
        message: "Vouch revoked successfully",
        endorsementId,
      });
    } catch (error) {
      console.error("Error revoking vouch:", error);
      res.status(500).json({ error: "Failed to revoke vouch" });
    }
  });

  // Minimal API routes (v1) for external integrations
  const { registerMinimalApiRoutes } = await import("./routes/minimalApi");
  registerMinimalApiRoutes(app);

  // Public API routes (v1) - no auth required
  const { registerPublicApiRoutes } = await import("./routes/publicApi");
  registerPublicApiRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
