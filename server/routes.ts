import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { IStorage } from "./storage";
import { db } from "./db";
import { verifyEndorsementSignature, validateEndorsementFields, type SignedEndorsement } from "./crypto/eip712";
import { validateNonce } from "./crypto/nonce";
import { computeLeafHash } from "./crypto/merkle";
import { insertPublicEndorsementSchema, publicEndorsements, scores, contexts, type Community, type PublicEndorsement, type Score } from "@shared/schema";
import { computeUserConfidence } from "./health/ghi";
import { sql, eq } from "drizzle-orm";
import { verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { epochComputation } from "./algorithm/compute";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/endorse", async (req, res) => {
    try {
      const body = req.body;

      // Validate required fields exist
      if (!body.endorser || !body.endorsee || !body.epoch || !body.nonce || !body.sig) {
        return res.status(400).json({ error: "Missing required fields" });
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

      const fieldValidation = validateEndorsementFields(endorsement);
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

      const signatureValid = await verifyEndorsementSignature(endorsement);
      if (!signatureValid) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      const leafHash = computeLeafHash({
        endorser: endorsement.endorser,
        endorsee: endorsement.endorsee,
        epoch: endorsement.epoch,
        nonce: endorsement.nonce,
        sig: endorsement.sig,
      });

      const insertData = insertPublicEndorsementSchema.parse({
        endorser: endorsement.endorser.toLowerCase(),
        endorsee: endorsement.endorsee.toLowerCase(),
        epoch: Number(endorsement.epoch),
        nonce: Number(endorsement.nonce),
        sig: endorsement.sig,
        leafHash,
        note: body.note || null,
        communityId,
        promptHash: expectedPromptHash,
      });

      const created = await storage.createEndorsement(insertData);

      return res.status(201).json({
        endorsement: created,
        leafHash,
      });
    } catch (error) {
      console.error("Error creating endorsement:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

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

  // Network recalculation endpoint (admin function)
  app.post("/api/admin/recalculate-network", async (req, res) => {
    try {
      const { NetworkRecalculationService } = await import("./services/networkRecalculation");
      const recalcService = new NetworkRecalculationService();
      
      console.log("Starting network recalculation...");
      const result = await recalcService.recalculateAllScores();
      
      return res.status(200).json({
        message: "Network recalculation complete",
        result,
      });
    } catch (error) {
      console.error("Error recalculating network:", error);
      return res.status(500).json({ 
        error: "Network recalculation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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

  // LocalHealth statistics endpoint
  app.get("/api/stats/local-health", async (req, res) => {
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

      return res.status(200).json({
        totalUsers: scores.length,
        avgLocalHealth: Math.round(avgLocalHealth * 100) / 100,
        distribution,
      });
    } catch (error) {
      console.error("Error fetching LocalHealth stats:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Graph data endpoint for LocalHealth network visualization
  app.get("/api/graph/local-health", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const communityId = parseInt(req.query.communityId as string) || 0;

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
          localHealth: result?.localHealth || 0,
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

      return res.status(200).json({
        nodes,
        links
      });
    } catch (error) {
      console.error("Error fetching graph data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/stats", async (req, res) => {
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

      return res.status(200).json({
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
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
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
  app.get("/api/ego/:address/score", async (req, res) => {
    try {
      const ownerAddress = req.params.address.toLowerCase();
      
      const egoContext = await storage.getOrCreateEgoContext(ownerAddress);
      const coSeeds = await storage.getCoSeeds(egoContext.id);
      
      // Pure Option 2: Use co-seeds only (never include ownerAddress as a seed)
      const seedAddresses = coSeeds.map(cs => cs.address.toLowerCase());
      
      const globalEndorsements = await storage.getEndorsements({
        communityId: 0,
        limit: 100000
      });
      
      const formattedVouches = globalEndorsements.map(e => ({
        endorser: e.endorser.toLowerCase() as `0x${string}`,
        endorsee: e.endorsee.toLowerCase() as `0x${string}`,
      }));
      
      const { EgoScorer } = await import("./algorithm/egoScoring");
      const scorer = new EgoScorer();
      
      // Use iterative algorithm for recursive trust weighting (co-seeds not used for LocalHealth)
      const results = scorer.computeLocalHealthIterative(
        [ownerAddress as `0x${string}`],
        formattedVouches
      );
      
      const result = results.get(ownerAddress);
      if (!result) {
        return res.status(500).json({ error: "Failed to compute score" });
      }
      
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
      
      // Trigger LocalHealth recalculation for both endorser and endorsee
      const { localHealthService } = await import('./services/localHealthService');
      localHealthService.recalculateMultipleLocalHealth([
        endorsementWithBigInt.endorser.toLowerCase(),
        endorsementWithBigInt.endorsee.toLowerCase()
      ]).catch(err => {
        console.error('Failed to recalculate LocalHealth after global vouch:', err);
      });
      
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

  // Minimal API routes (v1) for external integrations
  const { registerMinimalApiRoutes } = await import("./routes/minimalApi");
  registerMinimalApiRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
