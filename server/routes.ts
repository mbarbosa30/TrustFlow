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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/endorse", async (req, res) => {
    try {
      const body = req.body;

      // Validate required fields exist
      if (!body.endorser || !body.endorsee || !body.epoch || !body.nonce || !body.timestamp || !body.sig) {
        return res.status(400).json({ error: "Missing required fields" });
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
        },
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
      
      if (isNaN(epochId) || epochId < 0) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      const alreadyComputed = await epochComputation.hasComputedScores(epochId);
      
      if (alreadyComputed) {
        return res.status(400).json({ 
          error: "Epoch already computed",
          message: "Delete existing scores first if you want to recompute"
        });
      }

      await epochComputation.computeEpochScores(epochId);
      
      const summary = await epochComputation.getComputationSummary(epochId);
      
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
      
      if (isNaN(epochId) || epochId < 0) {
        return res.status(400).json({ error: "Invalid epoch ID" });
      }

      const summary = await epochComputation.getComputationSummary(epochId);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
