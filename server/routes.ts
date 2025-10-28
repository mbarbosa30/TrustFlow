import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { verifyEndorsementSignature, validateEndorsementFields, type SignedEndorsement } from "./crypto/eip712";
import { validateNonce } from "./crypto/nonce";
import { computeLeafHash } from "./crypto/merkle";
import { insertPublicEndorsementSchema, publicEndorsements } from "@shared/schema";
import { computeUserConfidence } from "./health/ghi";
import { sql } from "drizzle-orm";
import { verifyMessage } from "viem";
import type { Address, Hex } from "viem";
import { epochComputation } from "./algorithm/compute";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/endorse", async (req, res) => {
    try {
      const body = req.body;

      const endorsement: SignedEndorsement = {
        endorser: body.endorser as Address,
        endorsee: body.endorsee as Address,
        epoch: BigInt(body.epoch),
        nonce: BigInt(body.nonce),
        sig: body.sig as Hex,
      };

      const fieldValidation = validateEndorsementFields(endorsement);
      if (!fieldValidation.valid) {
        return res.status(400).json({ error: fieldValidation.error });
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
        endorser: endorsement.endorser,
        endorsee: endorsement.endorsee,
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
        filters.endorser = endorser;
      }
      if (endorsee && typeof endorsee === "string") {
        filters.endorsee = endorsee;
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
      const maxNonce = await storage.getMaxNonce(endorser, parseInt(epoch));
      
      return res.status(200).json({ 
        maxNonce,
        nextNonce: maxNonce + 1 
      });
    } catch (error) {
      console.error("Error fetching nonce:", error);
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
      const did = req.params.did;

      const latestHealth = await storage.getLatestEpochHealth();

      if (!latestHealth) {
        return res.status(404).json({ error: "No epoch health data available" });
      }

      const userScore = await storage.getScore(did, latestHealth.epochId);

      if (!userScore) {
        return res.status(404).json({ 
          error: "No score computed for this user",
          message: "User either has no endorsements or epoch computation has not run yet"
        });
      }

      const confidence = computeUserConfidence(latestHealth.ghi, userScore.minCut);

      return res.status(200).json({
        did,
        epoch: latestHealth.epochId,
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
          global: {
            GHI: latestHealth.ghi,
            sizeN: latestHealth.sizeN,
            cutN: latestHealth.cutN,
            churnN: latestHealth.churnN,
          },
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

      // Get trusted users (accepted via Levien criteria: min-cut >= 2, seed-coverage >= 2, edge-disjoint paths >= 2)
      const latestHealth = await storage.getLatestEpochHealth();
      let trustedUsers = 0;
      let avgScore = 0;

      if (latestHealth) {
        const scores = await storage.getScoresByEpoch(latestHealth.epochId);
        const acceptedScores = scores.filter(s => s.isAccepted);
        trustedUsers = acceptedScores.length;
        
        if (acceptedScores.length > 0) {
          const totalSts = acceptedScores.reduce((sum, s) => sum + s.sts, 0);
          avgScore = totalSts / acceptedScores.length;
        }
      }

      return res.status(200).json({
        totalUsers: allParticipants.size,
        totalEndorsements: totalEndorsements[0]?.count || 0,
        totalEndorsers: uniqueEndorsers[0]?.count || 0,
        totalEndorsees: uniqueEndorsees[0]?.count || 0,
        trustedUsers,
        avgScore: Math.round(avgScore * 100) / 100,
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
      const { address } = req.params;
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
      const allEndorsements = await storage.getEndorsements({ limit: 10000 });
      const allParticipants = new Set<string>();
      allEndorsements.forEach(e => {
        allParticipants.add(e.endorser);
        allParticipants.add(e.endorsee);
      });

      const latestHealth = await storage.getLatestEpochHealth();
      let acceptedCount = 0;
      
      if (latestHealth) {
        const scores = await storage.getScoresByEpoch(latestHealth.epochId);
        acceptedCount = scores.filter(s => s.isAccepted).length;
      }

      const data = [
        {
          epoch: "Epoch 0",
          totalUsers: allParticipants.size,
          activeUsers: acceptedCount,
        }
      ];

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching network growth:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/endorsement-velocity", async (req, res) => {
    try {
      const allEndorsements = await storage.getEndorsements({ limit: 10000 });
      
      const data = [
        {
          epoch: "Epoch 0",
          newEndorsements: allEndorsements.length,
          revokedEndorsements: 0,
        }
      ];

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching endorsement velocity:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/score-components", async (req, res) => {
    try {
      const latestHealth = await storage.getLatestEpochHealth();
      
      if (!latestHealth) {
        return res.status(200).json({ data: [] });
      }

      const scores = await storage.getScoresByEpoch(latestHealth.epochId);
      const acceptedScores = scores.filter(s => s.isAccepted);
      
      if (acceptedScores.length === 0) {
        return res.status(200).json({ data: [] });
      }

      const avgFlow = acceptedScores.reduce((sum, s) => sum + s.flow, 0) / acceptedScores.length;
      const avgMinCut = acceptedScores.reduce((sum, s) => sum + s.minCut, 0) / acceptedScores.length;
      const avgStability = acceptedScores.reduce((sum, s) => sum + s.stability, 0) / acceptedScores.length;
      const avgDepth = acceptedScores.reduce((sum, s) => sum + s.depth, 0) / acceptedScores.length;

      const data = [
        {
          epoch: `Epoch ${latestHealth.epochId}`,
          flow: parseFloat((avgFlow * 100).toFixed(2)),
          cut: parseFloat((avgMinCut * 100).toFixed(2)),
          stability: parseFloat((avgStability * 100).toFixed(2)),
          depth: parseFloat((avgDepth * 100).toFixed(2)),
        }
      ];

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching score components:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/average-sts", async (req, res) => {
    try {
      const latestHealth = await storage.getLatestEpochHealth();
      
      if (!latestHealth) {
        return res.status(200).json({ data: [] });
      }

      const scores = await storage.getScoresByEpoch(latestHealth.epochId);
      const acceptedScores = scores.filter(s => s.isAccepted);
      
      if (acceptedScores.length === 0) {
        return res.status(200).json({ data: [] });
      }

      const stsValues = acceptedScores.map(s => s.sts).sort((a, b) => a - b);
      const mean = stsValues.reduce((sum, v) => sum + v, 0) / stsValues.length;
      const median = stsValues[Math.floor(stsValues.length * 0.50)] || 0;
      const p25 = stsValues[Math.floor(stsValues.length * 0.25)] || 0;
      const p75 = stsValues[Math.floor(stsValues.length * 0.75)] || 0;

      const data = [
        {
          epoch: `Epoch ${latestHealth.epochId}`,
          mean: parseFloat(mean.toFixed(2)),
          median: parseFloat(median.toFixed(2)),
          p25: parseFloat(p25.toFixed(2)),
          p75: parseFloat(p75.toFixed(2)),
        }
      ];

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching average STS:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/network-density", async (req, res) => {
    try {
      const allEndorsements = await storage.getEndorsements({ limit: 10000 });
      const latestHealth = await storage.getLatestEpochHealth();
      
      if (!latestHealth || allEndorsements.length === 0) {
        return res.status(200).json({ data: [] });
      }

      const scores = await storage.getScoresByEpoch(latestHealth.epochId);
      const acceptedScores = scores.filter(s => s.isAccepted);
      
      if (acceptedScores.length === 0) {
        return res.status(200).json({ data: [] });
      }

      const allParticipants = new Set<string>();
      allEndorsements.forEach(e => {
        allParticipants.add(e.endorser);
        allParticipants.add(e.endorsee);
      });

      const endorsementsPerUser = allEndorsements.length / allParticipants.size;
      const avgDepth = acceptedScores.reduce((sum, s) => sum + s.depth, 0) / acceptedScores.length;

      const data = [
        {
          epoch: `Epoch ${latestHealth.epochId}`,
          endorsementsPerUser: parseFloat(endorsementsPerUser.toFixed(2)),
          avgPathLength: parseFloat(avgDepth.toFixed(2)),
        }
      ];

      return res.status(200).json({ data });
    } catch (error) {
      console.error("Error fetching network density:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/path-diversity", async (req, res) => {
    try {
      return res.status(200).json({ data: [] });
    } catch (error) {
      console.error("Error fetching path diversity:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
