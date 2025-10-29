import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { verifyEndorsementSignature, validateEndorsementFields, type SignedEndorsement } from "./crypto/eip712";
import { validateNonce } from "./crypto/nonce";
import { computeLeafHash } from "./crypto/merkle";
import { insertPublicEndorsementSchema, publicEndorsements, scores } from "@shared/schema";
import { computeUserConfidence } from "./health/ghi";
import { sql } from "drizzle-orm";
import { verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { epochComputation } from "./algorithm/compute";
import lendingRouter from "./routes/lending";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/endorse", async (req, res) => {
    try {
      const body = req.body;

      // Validate required fields exist
      if (!body.endorser || !body.endorsee || !body.epoch || !body.nonce || !body.timestamp || !body.sig) {
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
          timestamp: BigInt(body.timestamp),
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

  app.get("/api/stats", async (req, res) => {
    try {
      const totalEndorsements = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(publicEndorsements);

      const uniqueEndorsers = await db
        .select({ count: sql<number>`count(distinct endorser)::int` })
        .from(publicEndorsements);

      const uniqueEndorsees = await db
        .select({ count: sql<number>`count(distinct endorsee)::int` })
        .from(publicEndorsements);

      const allParticipants = new Set<string>();
      const endorsements = await storage.getEndorsements({ limit: 10000 });
      endorsements.forEach(e => {
        allParticipants.add(e.endorser);
        allParticipants.add(e.endorsee);
      });

      // Calculate trusted users and average STS using LATEST epoch score per user
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

      // Count unique trusted users (those with isAccepted in their latest epoch)
      const latestScores = Array.from(latestScoresByUser.values());
      const trustedUsers = latestScores.filter(s => s.isAccepted).length;
      
      // Calculate average STS using only latest epoch scores
      let avgScore = 0;
      const acceptedLatestScores = latestScores.filter(s => s.isAccepted);
      if (acceptedLatestScores.length > 0) {
        const totalSts = acceptedLatestScores.reduce((sum, s) => sum + s.sts, 0);
        avgScore = totalSts / acceptedLatestScores.length;
      }

      return res.status(200).json({
        totalUsers: allParticipants.size,
        totalEndorsements: totalEndorsements[0]?.count || 0,
        totalEndorsers: uniqueEndorsers[0]?.count || 0,
        totalEndorsees: uniqueEndorsees[0]?.count || 0,
        trustedUsers,
        avgScore: Math.round(avgScore * 100) / 100,
        avgSTS: Math.round(avgScore * 100) / 100,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/seeds", async (req, res) => {
    try {
      const seeds = await storage.getSeeds();
      return res.status(200).json({ seeds });
    } catch (error) {
      console.error("Error fetching seeds:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/seeds", async (req, res) => {
    try {
      const { address, walletSignature, note } = req.body;

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
        note 
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
      const { walletSignature } = req.body;

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

      await storage.deleteSeed(address);
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
      const latestHealth = await storage.getLatestEpochHealth();
      
      if (!latestHealth) {
        return res.status(200).json({
          distribution: [],
          percentiles: { p25: 0, p50: 0, p75: 0, p95: 0 }
        });
      }

      const scores = await storage.getScoresByEpoch(latestHealth.epochId);
      const acceptedScores = scores.filter(s => s.isAccepted);
      
      if (acceptedScores.length === 0) {
        return res.status(200).json({
          distribution: [],
          percentiles: { p25: 0, p50: 0, p75: 0, p95: 0 }
        });
      }

      const stsValues = acceptedScores.map(s => s.sts).sort((a, b) => a - b);
      
      const bins = [
        { bin: "0-10", count: stsValues.filter(s => s >= 0 && s < 10).length },
        { bin: "10-20", count: stsValues.filter(s => s >= 10 && s < 20).length },
        { bin: "20-30", count: stsValues.filter(s => s >= 20 && s < 30).length },
        { bin: "30-40", count: stsValues.filter(s => s >= 30 && s < 40).length },
        { bin: "40-50", count: stsValues.filter(s => s >= 40 && s < 50).length },
        { bin: "50-60", count: stsValues.filter(s => s >= 50 && s < 60).length },
        { bin: "60-70", count: stsValues.filter(s => s >= 60 && s < 70).length },
        { bin: "70-80", count: stsValues.filter(s => s >= 70 && s < 80).length },
        { bin: "80-90", count: stsValues.filter(s => s >= 80 && s < 90).length },
        { bin: "90-100", count: stsValues.filter(s => s >= 90 && s <= 100).length },
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
      const latestHealth = await storage.getLatestEpochHealth();
      
      if (!latestHealth) {
        return res.status(200).json({ distribution: [] });
      }

      const scores = await storage.getScoresByEpoch(latestHealth.epochId);
      const acceptedScores = scores.filter(s => s.isAccepted);
      
      const tierCounts = {
        apprentice: acceptedScores.filter(s => s.tier === 'apprentice').length,
        journeyer: acceptedScores.filter(s => s.tier === 'journeyer').length,
        master: acceptedScores.filter(s => s.tier === 'master').length,
      };

      const total = acceptedScores.length || 1;

      const distribution = [
        {
          level: 'Apprentice' as const,
          count: tierCounts.apprentice,
          percentage: Math.round((tierCounts.apprentice / total) * 100),
        },
        {
          level: 'Journeyer' as const,
          count: tierCounts.journeyer,
          percentage: Math.round((tierCounts.journeyer / total) * 100),
        },
        {
          level: 'Master' as const,
          count: tierCounts.master,
          percentage: Math.round((tierCounts.master / total) * 100),
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
      const currentEpoch = await storage.getCurrentEpoch();
      if (!currentEpoch) {
        return res.status(200).json({
          seedSaturation: null,
          pathDiversity: null,
          avgMinCut: null,
        });
      }

      const [healthData, scores] = await Promise.all([
        storage.getEpochHealth(currentEpoch.id),
        storage.getScoresByEpoch(currentEpoch.id),
      ]);

      const acceptedScores = scores.filter(s => s.isAccepted);

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
        seedSaturation: healthData?.maxSeedShare 
          ? {
              maxShare: Math.round((healthData.maxSeedShare || 0) * 100),
              maxSeedAddress: healthData.maxSeedAddress,
              status: (healthData.maxSeedShare || 0) > 0.5 ? 'warning' : (healthData.maxSeedShare || 0) > 0.4 ? 'caution' : 'healthy'
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
        epochId: currentEpoch.id,
      });
    } catch (error) {
      console.error("Error fetching security health:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/path-diversity", async (req, res) => {
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

      // Calculate percentiles helper
      const calculatePercentile = (values: number[], percentile: number): number => {
        const index = Math.ceil(values.length * percentile) - 1;
        return values[Math.max(0, index)] || 0;
      };

      const data = Object.keys(scoresByEpoch)
        .sort((a, b) => Number(a) - Number(b))
        .map(epochId => {
          const epochScores = scoresByEpoch[Number(epochId)];
          const accepted = epochScores.filter(s => s.isAccepted);
          
          if (accepted.length === 0) {
            return null;
          }

          // Calculate path diversity index for each user: minCut / max(flow, 1)
          // This represents the fraction of flow that is redundant/diverse
          const diversityValues = accepted
            .map(s => {
              const flow = s.flow || 1;
              const minCut = s.minCut || 0;
              // Cap at 1.0 since diversity can't exceed 100%
              return Math.min(minCut / Math.max(flow, 1), 1.0);
            })
            .sort((a, b) => a - b);

          return {
            epoch: `Epoch ${epochId}`,
            min: diversityValues[0] || 0,
            p25: calculatePercentile(diversityValues, 0.25),
            median: calculatePercentile(diversityValues, 0.50),
            p75: calculatePercentile(diversityValues, 0.75),
            max: diversityValues[diversityValues.length - 1] || 0,
          };
        })
        .filter(d => d !== null);

      return res.status(200).json({ data });
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

  app.post("/api/bluesky/analyze", async (req, res) => {
    try {
      const { identifier } = req.body;
      
      if (!identifier) {
        return res.status(400).json({ error: "identifier (DID or handle) is required" });
      }

      const { BskyAgent } = await import('@atproto/api');
      const agent = new BskyAgent({ service: 'https://public.api.bsky.app' });

      // Resolve handle to DID if needed
      let did: string;
      try {
        const profile = await agent.getProfile({ actor: identifier });
        did = profile.data.did;
      } catch (error) {
        return res.status(404).json({ error: `Could not find Bluesky user: ${identifier}` });
      }

      // Helper to paginate through all results
      async function fetchAllPages<T>(
        fetchFn: (cursor?: string) => Promise<{ data: { follows?: T[]; followers?: T[]; cursor?: string } }>
      ): Promise<T[]> {
        const results: T[] = [];
        let cursor: string | undefined;
        let pageCount = 0;
        const maxPages = 50; // Safety limit: 50 pages * 100 items = 5000 max
        
        do {
          const response = await fetchFn(cursor);
          const items = (response.data.follows || response.data.followers || []) as T[];
          results.push(...items);
          cursor = response.data.cursor;
          pageCount++;
          
          // Add small delay to avoid rate limiting
          if (cursor && pageCount < maxPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } while (cursor && pageCount < maxPages);
        
        return results;
      }

      // Fetch ALL followers using pagination (1st hop from seed)
      // Focus on followers only = who trusts you (more meaningful for trust measurement)
      const followers = await fetchAllPages<{ did: string }>(cursor => 
        agent.getFollowers({ actor: did, limit: 100, cursor })
      );

      const followerDids = followers.map(f => f.did);
      
      // Use only followers as 1st-hop peers (trust inbound, not outbound)
      const firstHopPeers = new Set(followerDids);
      console.log(`Found ${firstHopPeers.size} 1st-hop followers for ${did}`);

      // Fetch 2nd hop: get followers for each 1st-hop peer
      // This builds the complete network graph
      const endorsements: Array<{ endorser: string; endorsee: string; epoch: number }> = [];
      const allDiscoveredUsers = new Set<string>(firstHopPeers);
      
      // Add bidirectional edges connecting seed to ALL 1st-hop peers
      // This ensures flow can reach everyone regardless of follow direction
      for (const peerDid of firstHopPeers) {
        const peerDidLower = peerDid.toLowerCase();
        const seedDidLower = did.toLowerCase();
        
        // Seed → peer (outbound)
        endorsements.push({
          endorser: seedDidLower,
          endorsee: peerDidLower,
          epoch: 0
        });
        
        // Peer → seed (inbound)
        endorsements.push({
          endorser: peerDidLower,
          endorsee: seedDidLower,
          epoch: 0
        });
      }
      
      let processedPeers = 0;
      for (const peerDid of firstHopPeers) {
        try {
          const peerDidLower = peerDid.toLowerCase();
          
          // Fetch up to 30 followers per peer
          const peerFollowersResponse = await agent.getFollowers({ 
            actor: peerDid, 
            limit: 30 
          });
          const peerFollowers = peerFollowersResponse.data.followers;
          
          // Fetch full profiles in batch to get follower counts
          let sortedFollowers = peerFollowers;
          if (peerFollowers.length > 0) {
            try {
              const followerDids = peerFollowers.map(f => f.did);
              const profilesResponse = await agent.getProfiles({ actors: followerDids });
              
              // Create map of DID -> followersCount
              const followerCounts = new Map<string, number>();
              for (const profile of profilesResponse.data.profiles) {
                // ProfileViewDetailed includes followersCount
                const followersCount = (profile as any).followersCount || 0;
                followerCounts.set(profile.did, followersCount);
              }
              
              // Sort by follower count (most influential first) and take top 10
              sortedFollowers = peerFollowers
                .sort((a, b) => {
                  const countA = followerCounts.get(a.did) || 0;
                  const countB = followerCounts.get(b.did) || 0;
                  return countB - countA;
                })
                .slice(0, 10);
            } catch (error) {
              console.warn(`Failed to fetch profiles for ${peerDid} followers, using first 10`);
              sortedFollowers = peerFollowers.slice(0, 10);
            }
          }
          
          // Add BIDIRECTIONAL edges for top influential followers
          for (const follower of sortedFollowers) {
            const followerDid = follower.did.toLowerCase();
            allDiscoveredUsers.add(followerDid);
            
            // Follower → peer
            endorsements.push({
              endorser: followerDid,
              endorsee: peerDidLower,
              epoch: 0
            });
            
            // Peer → follower (allows flow to reach follower)
            endorsements.push({
              endorser: peerDidLower,
              endorsee: followerDid,
              epoch: 0
            });
          }
          
          processedPeers++;
          
          // Progress logging every 10 peers
          if (processedPeers % 10 === 0) {
            console.log(`Processed ${processedPeers}/${firstHopPeers.size} peers...`);
          }
        } catch (error) {
          console.warn(`Failed to fetch connections for ${peerDid}:`, error);
          // Continue with other peers even if one fails
        }
      }
      
      console.log(`Built 2-hop graph with ${endorsements.length} edges among ${allDiscoveredUsers.size} users`);

      // === SELECTIVE 3RD HOP: Fetch followers for top influential depth-2 users ===
      // This increases network depth while keeping size manageable
      
      // Identify depth-2 users (all users except seed and depth-1)
      const depth2Users = Array.from(allDiscoveredUsers).filter(
        userDid => userDid !== did.toLowerCase() && !firstHopPeers.has(userDid)
      );
      
      if (depth2Users.length > 0) {
        console.log(`Analyzing ${depth2Users.length} depth-2 users to find most influential...`);
        
        // Fetch profiles for depth-2 users to get follower counts (in batches of 25)
        const depth2FollowerCounts = new Map<string, number>();
        const batchSize = 25;
        
        for (let i = 0; i < depth2Users.length; i += batchSize) {
          const batch = depth2Users.slice(i, Math.min(i + batchSize, depth2Users.length));
          try {
            const profilesResponse = await agent.getProfiles({ actors: batch });
            for (const profile of profilesResponse.data.profiles) {
              const followersCount = (profile as any).followersCount || 0;
              depth2FollowerCounts.set(profile.did.toLowerCase(), followersCount);
            }
            // Small delay to avoid rate limiting
            if (i + batchSize < depth2Users.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.warn(`Failed to fetch profiles for depth-2 batch ${i}-${i + batchSize}`);
          }
        }
        
        // Sort depth-2 users by follower count and take top 25 most influential
        const influentialDepth2 = depth2Users
          .map(userDid => ({
            did: userDid,
            followersCount: depth2FollowerCounts.get(userDid) || 0
          }))
          .sort((a, b) => b.followersCount - a.followersCount)
          .slice(0, 25);
        
        console.log(`Fetching 3rd hop for top ${influentialDepth2.length} influential depth-2 users...`);
        
        // Fetch top 5 followers for each influential depth-2 user
        let processed3rdHop = 0;
        for (const { did: depth2Did } of influentialDepth2) {
          try {
            // Fetch up to 20 followers, then select top 5 most influential
            const followersResponse = await agent.getFollowers({ 
              actor: depth2Did, 
              limit: 20 
            });
            const followers = followersResponse.data.followers;
            
            // Get profiles to find most influential followers
            let topFollowers = followers;
            if (followers.length > 0) {
              try {
                const followerDids = followers.map(f => f.did);
                const profilesResponse = await agent.getProfiles({ actors: followerDids });
                
                const followerCounts = new Map<string, number>();
                for (const profile of profilesResponse.data.profiles) {
                  const followersCount = (profile as any).followersCount || 0;
                  followerCounts.set(profile.did, followersCount);
                }
                
                // Sort by influence and take top 5
                topFollowers = followers
                  .sort((a, b) => {
                    const countA = followerCounts.get(a.did) || 0;
                    const countB = followerCounts.get(b.did) || 0;
                    return countB - countA;
                  })
                  .slice(0, 5);
              } catch (error) {
                console.warn(`Failed to fetch profiles for ${depth2Did} followers, using first 5`);
                topFollowers = followers.slice(0, 5);
              }
            }
            
            // Add BIDIRECTIONAL edges for depth-3 followers
            for (const follower of topFollowers) {
              const followerDid = follower.did.toLowerCase();
              allDiscoveredUsers.add(followerDid);
              
              // Follower → depth-2 user
              endorsements.push({
                endorser: followerDid,
                endorsee: depth2Did,
                epoch: 0
              });
              
              // Depth-2 user → follower
              endorsements.push({
                endorser: depth2Did,
                endorsee: followerDid,
                epoch: 0
              });
            }
            
            processed3rdHop++;
            
            // Progress logging every 5 users
            if (processed3rdHop % 5 === 0) {
              console.log(`  Processed ${processed3rdHop}/${influentialDepth2.length} depth-3 expansions...`);
            }
          } catch (error) {
            console.warn(`Failed to fetch 3rd hop for ${depth2Did}:`, error);
          }
        }
        
        console.log(`Added 3rd hop: now ${endorsements.length} edges among ${allDiscoveredUsers.size} users`);
      }
      
      console.log(`Final graph: ${endorsements.length} edges among ${allDiscoveredUsers.size} users`);

      // Use the seed as the seed for scoring
      const seeds = [did.toLowerCase()];

      // Run TrustFlow scoring algorithm in-memory
      const { TrustScorer } = await import('./algorithm/scoring');
      const scorer = new TrustScorer();
      const results = scorer.computeScores(
        endorsements as any,
        seeds as any,
        0
      );

      // Calculate basic stats (excluding the seed from all analysis)
      const seedDid = did.toLowerCase();
      const allScoresExcludingSeed = Array.from(results.scores.entries())
        .filter(([address]) => address.toLowerCase() !== seedDid);
      
      const totalUsers = allScoresExcludingSeed.length;
      const acceptedScores = allScoresExcludingSeed
        .map(([, score]) => score)
        .filter(s => s.tier !== null);
      const acceptedUsers = acceptedScores.length;
      const scores = allScoresExcludingSeed.map(([, score]) => score);
      const avgSTS = scores.length > 0 
        ? scores.reduce((sum, s) => sum + s.sts, 0) / scores.length 
        : 0;

      // Advanced network analysis: Identify bottlenecks and centralization risks
      // Bottleneck = users with low min-cut relative to their flow (vulnerable single points)
      const bottlenecks = acceptedScores
        .filter(s => s.components.flow > 0)
        .map(s => ({
          address: s.address,
          minCut: s.components.minCut,
          flow: s.components.flow,
          vulnerabilityScore: s.components.minCut / s.components.flow, // Lower = more vulnerable
          sts: s.sts,
        }))
        .filter(b => b.vulnerabilityScore < 0.5) // Significant bottleneck
        .sort((a, b) => a.vulnerabilityScore - b.vulnerabilityScore)
        .slice(0, 10);

      // Centralization: Check flow concentration among accepted users
      const flowValues = acceptedScores.map(s => s.components.flow).sort((a, b) => b - a);
      const totalFlow = flowValues.reduce((sum, f) => sum + f, 0);
      const top10FlowShare = flowValues.slice(0, Math.min(10, flowValues.length))
        .reduce((sum, f) => sum + f, 0) / totalFlow;

      // Identify high-influence nodes (high flow relative to depth)
      const influentialNodes = acceptedScores
        .map(s => ({
          address: s.address,
          flow: s.components.flow,
          depth: s.components.depth,
          influence: s.components.flow / Math.max(1, s.components.depth), // Flow per hop
          sts: s.sts,
        }))
        .sort((a, b) => b.influence - a.influence)
        .slice(0, 10);

      // Network Health Metrics
      const connectivityRate = totalUsers > 0 ? acceptedUsers / totalUsers : 0;
      const depths = acceptedScores.map(s => s.components.depth).filter(d => d > 0);
      const avgPathLength = depths.length > 0 
        ? depths.reduce((sum, d) => sum + d, 0) / depths.length 
        : 0;
      const networkDiameter = depths.length > 0 ? Math.max(...depths) : 0;
      
      // Graph density: actual edges / possible edges (excluding seed)
      const uniqueUsersExcludingSeed = Array.from(firstHopPeers);
      const possibleEdges = uniqueUsersExcludingSeed.length * (uniqueUsersExcludingSeed.length - 1);
      const graphDensity = possibleEdges > 0 ? endorsements.length / possibleEdges : 0;

      // Robustness Metrics
      const minCutValues = acceptedScores.map(s => s.components.minCut).filter(mc => mc > 0);
      const redundancyScore = minCutValues.length > 0
        ? minCutValues.reduce((sum, mc) => sum + mc, 0) / minCutValues.length
        : 0;

      // Gini coefficient for flow inequality (0=perfect equality, 1=complete inequality)
      const sortedFlows = flowValues.slice().sort((a, b) => a - b);
      let giniSum = 0;
      let totalFlowForGini = 0;
      for (let i = 0; i < sortedFlows.length; i++) {
        giniSum += (i + 1) * sortedFlows[i];
        totalFlowForGini += sortedFlows[i];
      }
      const giniCoefficient = sortedFlows.length > 0 && totalFlowForGini > 0
        ? (2 * giniSum) / (sortedFlows.length * totalFlowForGini) - (sortedFlows.length + 1) / sortedFlows.length
        : 0;

      // Clustering coefficient (how interconnected are neighbors)
      // For each accepted user, count triangles (mutual connections)
      const adjacencyMap = new Map<string, Set<string>>();
      for (const edge of endorsements) {
        if (!adjacencyMap.has(edge.endorser)) {
          adjacencyMap.set(edge.endorser, new Set());
        }
        adjacencyMap.get(edge.endorser)!.add(edge.endorsee);
      }

      let totalClustering = 0;
      let nodesWithNeighbors = 0;
      for (const score of acceptedScores) {
        const neighbors = adjacencyMap.get(score.address.toLowerCase()) || new Set();
        if (neighbors.size > 1) {
          let triangles = 0;
          const neighborsArray = Array.from(neighbors);
          for (let i = 0; i < neighborsArray.length; i++) {
            for (let j = i + 1; j < neighborsArray.length; j++) {
              const neighborNeighbors = adjacencyMap.get(neighborsArray[i]) || new Set();
              if (neighborNeighbors.has(neighborsArray[j])) {
                triangles++;
              }
            }
          }
          const possibleTriangles = (neighbors.size * (neighbors.size - 1)) / 2;
          totalClustering += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
          nodesWithNeighbors++;
        }
      }
      const clusteringCoefficient = nodesWithNeighbors > 0 
        ? totalClustering / nodesWithNeighbors 
        : 0;

      // Calculate health score (composite metric 0-100)
      const healthScore = Math.round(
        (connectivityRate * 25) + // 25% weight on connectivity
        (Math.min(redundancyScore / 3, 1) * 25) + // 25% weight on redundancy (target min-cut ~3)
        ((1 - Math.min(giniCoefficient, 1)) * 25) + // 25% weight on equality
        (clusteringCoefficient * 25) // 25% weight on clustering
      );

      // Depth distribution for visualization
      const depthDistribution = new Map<number, number>();
      for (const score of acceptedScores) {
        const depth = score.components.depth;
        depthDistribution.set(depth, (depthDistribution.get(depth) || 0) + 1);
      }

      // Min-cut distribution for visualization
      const minCutDistribution = new Map<number, number>();
      for (const score of acceptedScores) {
        const minCut = score.components.minCut;
        minCutDistribution.set(minCut, (minCutDistribution.get(minCut) || 0) + 1);
      }

      // Resolve DIDs to handles for all users in the network
      const allDids = Array.from(results.scores.keys());
      const handleMap = new Map<string, string>();
      
      // Batch resolve DIDs to handles (getProfiles supports up to 25 actors at once)
      const batchSize = 25;
      for (let i = 0; i < allDids.length; i += batchSize) {
        const batch = allDids.slice(i, i + batchSize);
        try {
          const profiles = await agent.getProfiles({ actors: batch });
          for (const profile of profiles.data.profiles) {
            handleMap.set(profile.did.toLowerCase(), profile.handle);
          }
          // Small delay to avoid rate limiting
          if (i + batchSize < allDids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Failed to resolve batch ${i}-${i + batchSize}:`, error);
          // Continue with other batches even if one fails
        }
      }

      // Return ALL scores (excluding seed), not just top 50
      const allScores = allScoresExcludingSeed.map(([address, score]) => ({
        address,
        handle: handleMap.get(address.toLowerCase()) || null,
        sts: Math.round(score.sts * 10) / 10,
        tier: score.tier,
        flow: Math.round(score.components.flow * 100) / 100,
        minCut: score.components.minCut,
        depth: score.components.depth,
        stability: Math.round(score.components.stability * 100) / 100,
      })).sort((a, b) => b.sts - a.sts);

      return res.status(200).json({
        identifier,
        did,
        stats: {
          followers: followerDids.length,
          totalUsers,
          acceptedUsers,
          avgSTS: Math.round(avgSTS * 10) / 10,
        },
        networkMetrics: results.networkMetrics,
        healthMetrics: {
          healthScore,
          connectivityRate: Math.round(connectivityRate * 100) / 100,
          avgPathLength: Math.round(avgPathLength * 100) / 100,
          networkDiameter,
          graphDensity: Math.round(graphDensity * 1000) / 1000,
        },
        robustnessMetrics: {
          redundancyScore: Math.round(redundancyScore * 100) / 100,
          giniCoefficient: Math.round(giniCoefficient * 100) / 100,
          clusteringCoefficient: Math.round(clusteringCoefficient * 100) / 100,
        },
        distributions: {
          depth: Array.from(depthDistribution.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([depth, count]) => ({ depth, count })),
          minCut: Array.from(minCutDistribution.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([minCut, count]) => ({ minCut, count })),
        },
        advancedAnalysis: {
          bottlenecks: bottlenecks.map(b => ({
            address: b.address,
            handle: handleMap.get(b.address.toLowerCase()) || null,
            minCut: b.minCut,
            flow: Math.round(b.flow * 100) / 100,
            vulnerabilityScore: Math.round(b.vulnerabilityScore * 100) / 100,
            sts: Math.round(b.sts * 10) / 10,
          })),
          centralization: {
            top10FlowShare: Math.round(top10FlowShare * 100) / 100,
            status: top10FlowShare > 0.7 ? 'high' : top10FlowShare > 0.5 ? 'moderate' : 'low',
          },
          influentialNodes: influentialNodes.map(n => ({
            address: n.address,
            handle: handleMap.get(n.address.toLowerCase()) || null,
            flow: Math.round(n.flow * 100) / 100,
            depth: n.depth,
            influence: Math.round(n.influence * 100) / 100,
            sts: Math.round(n.sts * 10) / 10,
          })),
        },
        scores: allScores,
      });
    } catch (error) {
      console.error("Error analyzing Bluesky network:", error);
      return res.status(500).json({ 
        error: "Failed to analyze Bluesky network",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================================================
  // COMMUNITY ROUTES
  // ============================================================================

  // Create a new community
  app.post("/api/communities", async (req, res) => {
    try {
      const { name, description, promptText, templateId, visibility, creator } = req.body;

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

      // Create community (policyJson will be stored as JSONB)
      const community = await storage.createCommunity({
        name,
        description: description || null,
        promptText,
        promptHash,
        policyId: policy.policyId,
        policyJson: policyWithHash as any, // Will be stored as JSONB
        visibility: visibility || "public",
        creator: creator.toLowerCase(),
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
        visibility?: "public" | "invite";
        creator?: string;
      } = {};

      if (visibility && (visibility === "public" || visibility === "invite")) {
        filters.visibility = visibility;
      }
      if (creator && typeof creator === "string") {
        filters.creator = creator.toLowerCase();
      }

      const communities = await storage.listCommunities(filters);

      res.json({ communities });
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

  // Get user's communities (ones they're scored in)
  app.get("/api/communities/user/:address", async (req, res) => {
    try {
      const userAddress = req.params.address.toLowerCase();
      
      // Get all scores for this user across all communities
      const scores = await storage.getAllScoresForUser(userAddress);
      
      if (scores.length === 0) {
        return res.json({ communities: [] });
      }
      
      // Get unique community IDs
      const communityIds = Array.from(new Set(scores.map(s => s.communityId)));
      
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

      // Get seeds for this community
      const seeds = await storage.getSeeds(id);

      // Get latest epoch for this community
      const latestEpoch = await storage.getCurrentEpoch(id);

      res.json({
        community: {
          ...community,
          policy,
        },
        seeds,
        latestEpoch,
      });
    } catch (error) {
      console.error("Error getting community:", error);
      res.status(500).json({ error: "Failed to get community" });
    }
  });

  // ECONOMIC LAYER ENDPOINTS

  // Get latest budget for a community
  app.get("/api/budget/:communityId", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const budget = await storage.getLatestBudget(communityId);
      
      if (!budget) {
        return res.status(404).json({ error: "No budget found for this community" });
      }

      res.json({ budget });
    } catch (error) {
      console.error("Error getting budget:", error);
      res.status(500).json({ error: "Failed to get budget" });
    }
  });

  // Get user allowance for a community
  app.get("/api/allowance/:communityId/:userAddress", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      const userAddress = req.params.userAddress;
      
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const allowance = await storage.getLatestAllowance(userAddress, communityId);
      
      if (!allowance) {
        return res.status(404).json({ 
          error: "No allowance found. User may not be accepted in this community." 
        });
      }

      res.json({ allowance });
    } catch (error) {
      console.error("Error getting allowance:", error);
      res.status(500).json({ error: "Failed to get allowance" });
    }
  });

  // Get user's payment history
  app.get("/api/payments/:userAddress", async (req, res) => {
    try {
      const userAddress = req.params.userAddress;
      const communityId = req.query.communityId ? parseInt(req.query.communityId as string) : undefined;

      const payments = await storage.getPaymentsByUser(userAddress, communityId);

      res.json({ payments });
    } catch (error) {
      console.error("Error getting payments:", error);
      res.status(500).json({ error: "Failed to get payments" });
    }
  });

  // Claim daily allowance (generates EIP-3009 authorization)
  app.post("/api/claim", async (req, res) => {
    try {
      const { communityId, userAddress } = req.body;

      if (communityId === undefined || !userAddress) {
        return res.status(400).json({ error: "Missing communityId or userAddress" });
      }

      const parsedCommunityId = parseInt(communityId);
      if (isNaN(parsedCommunityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      // Get current epoch and allowance
      const currentEpoch = await storage.getCurrentEpoch(parsedCommunityId);
      if (!currentEpoch) {
        return res.status(404).json({ error: "No active epoch for this community" });
      }

      const allowance = await storage.getAllowance(userAddress, Number(currentEpoch.id), parsedCommunityId);
      if (!allowance) {
        return res.status(404).json({ error: "No allowance found for this user" });
      }

      // Check if already claimed
      const remainingAllowance = allowance.allowanceAmount - allowance.claimedToday;
      if (remainingAllowance <= 0) {
        return res.status(400).json({ 
          error: "Daily allowance already claimed",
          allowance: allowance.allowanceAmount,
          claimed: allowance.claimedToday,
          remaining: 0
        });
      }

      // Create payment record
      const payment = await storage.createPayment({
        communityId: parsedCommunityId,
        epochId: Number(currentEpoch.id),
        userAddress,
        payeeAddress: userAddress, // claiming to self
        amount: remainingAllowance,
        source: "TREASURY",
        status: "APPROVED",
        memo: "Daily allowance claim",
      });

      // Update claimed amount
      await storage.updateAllowanceClaimed(
        userAddress,
        Number(currentEpoch.id),
        allowance.allowanceAmount,
        parsedCommunityId
      );

      // Generate EIP-3009 authorization
      const { createTransferAuthMessage, parseUSDC, createDeterministicNonce } = await import("./utils/celo-usdc");
      
      // SECURITY: Use deterministic nonce to prevent replay attacks
      const treasuryAddress = "0x0000000000000000000000000000000000000000";
      const nonce = createDeterministicNonce(
        parsedCommunityId,
        Number(currentEpoch.id),
        treasuryAddress,
        userAddress,
        remainingAllowance
      );

      // Check if authorization already exists (server-side replay protection)
      const existingAuth = await storage.getAuth3009(nonce);
      if (existingAuth) {
        return res.status(400).json({ 
          error: "Claim already processed for this epoch",
          authId: existingAuth.id
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const validAfter = 0;
      const validBefore = now + 3600; // 1 hour validity

      const authMessage = createTransferAuthMessage({
        from: treasuryAddress,
        to: userAddress,
        value: parseUSDC(remainingAllowance),
        validAfter,
        validBefore,
        nonce,
      });

      // Store authorization (signature will be added when treasury signs)
      const auth = await storage.createAuth3009({
        communityId: parsedCommunityId,
        epochId: Number(currentEpoch.id),
        fromAddress: treasuryAddress,
        toAddress: userAddress,
        amount: remainingAllowance,
        validAfter,
        validBefore,
        nonce,
        signature: "", // Will be signed by treasury backend
        used: false,
      });

      res.json({
        payment,
        authorization: authMessage,
        authId: auth.id,
        message: "Claim approved. Authorization pending treasury signature.",
      });
    } catch (error) {
      console.error("Error claiming allowance:", error);
      res.status(500).json({ error: "Failed to claim allowance" });
    }
  });

  // Pay merchant using allowance
  app.post("/api/pay", async (req, res) => {
    try {
      const { communityId, userAddress, merchantAddress, amount, memo } = req.body;

      if (communityId === undefined || !userAddress || !merchantAddress || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const parsedCommunityId = parseInt(communityId);
      const parsedAmount = parseFloat(amount);
      
      if (isNaN(parsedCommunityId) || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid community ID or amount" });
      }

      // Get current epoch and allowance
      const currentEpoch = await storage.getCurrentEpoch(parsedCommunityId);
      if (!currentEpoch) {
        return res.status(404).json({ error: "No active epoch for this community" });
      }

      const allowance = await storage.getAllowance(userAddress, Number(currentEpoch.id), parsedCommunityId);
      if (!allowance) {
        return res.status(404).json({ error: "No allowance found for this user" });
      }

      // Check remaining balance
      const remainingAllowance = allowance.allowanceAmount - allowance.claimedToday;
      if (remainingAllowance < parsedAmount) {
        return res.status(400).json({ 
          error: "Insufficient allowance",
          available: remainingAllowance,
          requested: parsedAmount
        });
      }

      // Apply per-transaction cap ($5)
      const PER_TX_CAP = 5.0;
      if (parsedAmount > PER_TX_CAP) {
        return res.status(400).json({ 
          error: "Amount exceeds per-transaction cap",
          cap: PER_TX_CAP,
          requested: parsedAmount
        });
      }

      // Create payment record
      const payment = await storage.createPayment({
        communityId: parsedCommunityId,
        epochId: Number(currentEpoch.id),
        userAddress,
        payeeAddress: merchantAddress,
        amount: parsedAmount,
        source: "TREASURY",
        status: "APPROVED",
        memo: memo || `Payment to ${merchantAddress}`,
      });

      // Update claimed amount
      await storage.updateAllowanceClaimed(
        userAddress,
        Number(currentEpoch.id),
        allowance.claimedToday + parsedAmount,
        parsedCommunityId
      );

      // Generate EIP-3009 authorization
      const { createTransferAuthMessage, parseUSDC, createDeterministicNonce } = await import("./utils/celo-usdc");
      
      // SECURITY: Use deterministic nonce to prevent replay attacks
      const treasuryAddress = "0x0000000000000000000000000000000000000000";
      const nonce = createDeterministicNonce(
        parsedCommunityId,
        Number(currentEpoch.id),
        treasuryAddress,
        merchantAddress,
        parsedAmount
      );

      // Check if authorization already exists (server-side replay protection)
      const existingAuth = await storage.getAuth3009(nonce);
      if (existingAuth) {
        return res.status(400).json({ 
          error: "This exact payment has already been authorized",
          authId: existingAuth.id
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const validAfter = 0;
      const validBefore = now + 3600; // 1 hour validity

      const authMessage = createTransferAuthMessage({
        from: treasuryAddress,
        to: merchantAddress,
        value: parseUSDC(parsedAmount),
        validAfter,
        validBefore,
        nonce,
      });

      // Store authorization
      const auth = await storage.createAuth3009({
        communityId: parsedCommunityId,
        epochId: Number(currentEpoch.id),
        fromAddress: treasuryAddress,
        toAddress: merchantAddress,
        amount: parsedAmount,
        validAfter,
        validBefore,
        nonce,
        signature: "",
        used: false,
      });

      res.json({
        payment,
        authorization: authMessage,
        authId: auth.id,
        message: "Payment approved. Authorization pending treasury signature.",
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Create pledge
  app.post("/api/pledges", async (req, res) => {
    try {
      const { communityId, donorAddress, dailyCap, perTxCap, totalCap, allowlist, validUntil } = req.body;

      if (communityId === undefined || !donorAddress || !dailyCap || !perTxCap) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const parsedCommunityId = parseInt(communityId);
      const parsedDailyCap = parseFloat(dailyCap);
      const parsedPerTxCap = parseFloat(perTxCap);
      const parsedTotalCap = totalCap ? parseFloat(totalCap) : null;
      
      if (isNaN(parsedCommunityId) || isNaN(parsedDailyCap) || isNaN(parsedPerTxCap)) {
        return res.status(400).json({ error: "Invalid numeric values" });
      }

      const pledge = await storage.createPledge({
        communityId: parsedCommunityId,
        donorAddress,
        dailyCap: parsedDailyCap,
        perTxCap: parsedPerTxCap,
        totalCap: parsedTotalCap,
        allowlist: allowlist || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        paused: false,
      });

      res.status(201).json({ pledge });
    } catch (error) {
      console.error("Error creating pledge:", error);
      res.status(500).json({ error: "Failed to create pledge" });
    }
  });

  // Get pledges for a community
  app.get("/api/pledges/:communityId", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const pledges = await storage.getPledgesByCommunity(communityId);

      res.json({ pledges });
    } catch (error) {
      console.error("Error getting pledges:", error);
      res.status(500).json({ error: "Failed to get pledges" });
    }
  });

  // Get pledges by donor
  app.get("/api/pledges/donor/:donorAddress", async (req, res) => {
    try {
      const donorAddress = req.params.donorAddress;
      const pledges = await storage.getPledgesByDonor(donorAddress);

      res.json({ pledges });
    } catch (error) {
      console.error("Error getting donor pledges:", error);
      res.status(500).json({ error: "Failed to get pledges" });
    }
  });

  // Update pledge status (pause/unpause)
  app.patch("/api/pledges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paused } = req.body;
      
      if (isNaN(id) || typeof paused !== "boolean") {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      await storage.updatePledgePaused(id, paused);

      res.json({ message: "Pledge updated successfully" });
    } catch (error) {
      console.error("Error updating pledge:", error);
      res.status(500).json({ error: "Failed to update pledge" });
    }
  });

  // Lending Dashboard API endpoints
  // Get lending statistics for a community
  app.get("/api/lending/stats/:communityId", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const stats = await storage.getLendingStats(communityId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting lending stats:", error);
      res.status(500).json({ error: "Failed to get lending stats" });
    }
  });

  // Get recent lending activity for a community
  app.get("/api/lending/activity/:communityId", async (req, res) => {
    try {
      const communityId = parseInt(req.params.communityId);
      
      if (isNaN(communityId)) {
        return res.status(400).json({ error: "Invalid community ID" });
      }

      const activities = await storage.getLendingActivity(communityId);
      res.json(activities);
    } catch (error) {
      console.error("Error getting lending activity:", error);
      res.status(500).json({ error: "Failed to get lending activity" });
    }
  });

  // Support API endpoints
  // Get active loans available for Interest Buy-Down support
  app.get("/api/support/available-loans", async (req, res) => {
    try {
      const loans = await storage.getActiveLoans();
      res.json(loans);
    } catch (error) {
      console.error("Error getting available loans:", error);
      res.status(500).json({ error: "Failed to get available loans" });
    }
  });

  // Get late installments that need Repay-Assist support
  app.get("/api/support/late-installments", async (req, res) => {
    try {
      const lateInstallments = await storage.getLateInstallments();
      res.json(lateInstallments);
    } catch (error) {
      console.error("Error getting late installments:", error);
      res.status(500).json({ error: "Failed to get late installments" });
    }
  });

  // Get supporter's portfolio (pledges and assists)
  app.get("/api/support/portfolio/:address", async (req, res) => {
    try {
      const address = req.params.address.toLowerCase();
      
      const pledges = await storage.getPledgesBySupporter(address);
      const assists = await storage.getAssistsBySupporter(address);

      res.json({ pledges, assists });
    } catch (error) {
      console.error("Error getting support portfolio:", error);
      res.status(500).json({ error: "Failed to get support portfolio" });
    }
  });

  // Lending routes
  app.use("/api/loans", lendingRouter);

  const httpServer = createServer(app);

  return httpServer;
}
