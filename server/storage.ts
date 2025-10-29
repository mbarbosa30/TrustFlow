import { type User, type InsertUser, type PublicEndorsement, type InsertPublicEndorsement, publicEndorsements, type EpochHealth, type InsertEpochHealth, epochHealth, type Seed, type InsertSeed, seeds, type Score, type InsertScore, scores, type Epoch, type InsertEpoch, epochs, type Community, type InsertCommunity, communities } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { and, eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Community operations
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunity(id: number): Promise<Community | undefined>;
  listCommunities(filters?: { visibility?: 'public' | 'invite'; creator?: string }): Promise<Community[]>;
  
  createEndorsement(endorsement: InsertPublicEndorsement): Promise<PublicEndorsement>;
  getEndorsements(filters?: {
    endorser?: string;
    endorsee?: string;
    epoch?: number;
    communityId?: number;
    limit?: number;
    offset?: number;
  }): Promise<PublicEndorsement[]>;
  getMaxNonce(endorser: string, epoch: number, communityId?: number): Promise<number>;
  
  createEpochHealth(health: InsertEpochHealth): Promise<EpochHealth>;
  getEpochHealth(epochId: number, communityId?: number): Promise<EpochHealth | undefined>;
  getLatestEpochHealth(communityId?: number): Promise<EpochHealth | undefined>;
  
  createSeed(seed: InsertSeed): Promise<Seed>;
  getSeeds(communityId?: number): Promise<Seed[]>;
  deleteSeed(address: string, communityId?: number): Promise<void>;
  isSeed(address: string, communityId?: number): Promise<boolean>;
  
  createScore(score: InsertScore): Promise<Score>;
  getScore(address: string, epochId: number, communityId?: number): Promise<Score | undefined>;
  getLatestScore(address: string, communityId?: number): Promise<Score | undefined>;
  getScoresByEpoch(epochId: number, communityId?: number): Promise<Score[]>;
  getAllScores(communityId?: number): Promise<Score[]>;
  deleteScoresByEpoch(epochId: number, communityId?: number): Promise<void>;
  
  getCurrentEpoch(communityId?: number): Promise<Epoch | undefined>;
  getEpoch(epochId: number, communityId?: number): Promise<Epoch | undefined>;
  createEpoch(epoch: InsertEpoch): Promise<Epoch>;
  closeEpoch(epochId: number, communityId?: number): Promise<void>;
  advanceEpoch(communityId?: number): Promise<Epoch>;
  deleteEpochData(epochId: number, communityId?: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createEndorsement(endorsement: InsertPublicEndorsement): Promise<PublicEndorsement> {
    // Normalize addresses to lowercase for consistent storage
    const normalizedEndorsement = {
      ...endorsement,
      endorser: endorsement.endorser.toLowerCase(),
      endorsee: endorsement.endorsee.toLowerCase(),
    };
    
    const [dbEndorsement] = await db
      .insert(publicEndorsements)
      .values(normalizedEndorsement)
      .returning();
    
    return dbEndorsement;
  }

  async getEndorsements(filters?: {
    endorser?: string;
    endorsee?: string;
    epoch?: number;
    communityId?: number;
    limit?: number;
    offset?: number;
  }): Promise<PublicEndorsement[]> {
    let query = db.select().from(publicEndorsements);
    
    const conditions = [];
    if (filters?.endorser) {
      conditions.push(eq(publicEndorsements.endorser, filters.endorser.toLowerCase()));
    }
    if (filters?.endorsee) {
      conditions.push(eq(publicEndorsements.endorsee, filters.endorsee.toLowerCase()));
    }
    if (filters?.epoch !== undefined) {
      conditions.push(eq(publicEndorsements.epoch, filters.epoch));
    }
    if (filters?.communityId !== undefined) {
      conditions.push(eq(publicEndorsements.communityId, filters.communityId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    
    const results = await query.limit(limit).offset(offset);
    return results;
  }

  async getMaxNonce(endorser: string, epoch: number, communityId: number = 0): Promise<number> {
    const normalizedEndorser = endorser.toLowerCase();
    const lastEndorsement = await db
      .select({ nonce: publicEndorsements.nonce })
      .from(publicEndorsements)
      .where(
        and(
          eq(publicEndorsements.endorser, normalizedEndorser),
          eq(publicEndorsements.epoch, epoch),
          eq(publicEndorsements.communityId, communityId)
        )
      )
      .orderBy(desc(publicEndorsements.nonce))
      .limit(1);

    if (lastEndorsement.length === 0) {
      return -1;
    }

    return Number(lastEndorsement[0].nonce);
  }

  async createEpochHealth(health: InsertEpochHealth): Promise<EpochHealth> {
    const [dbHealth] = await db
      .insert(epochHealth)
      .values(health)
      .returning();
    
    return dbHealth;
  }

  async getEpochHealth(epochId: number, communityId: number = 0): Promise<EpochHealth | undefined> {
    const results = await db
      .select()
      .from(epochHealth)
      .where(and(eq(epochHealth.epochId, epochId), eq(epochHealth.communityId, communityId)))
      .limit(1);
    
    return results[0];
  }

  async getLatestEpochHealth(communityId: number = 0): Promise<EpochHealth | undefined> {
    const results = await db
      .select()
      .from(epochHealth)
      .where(eq(epochHealth.communityId, communityId))
      .orderBy(desc(epochHealth.epochId))
      .limit(1);
    
    return results[0];
  }

  async createSeed(seed: InsertSeed): Promise<Seed> {
    // Normalize addresses to lowercase for consistent storage
    const normalizedSeed = {
      ...seed,
      address: seed.address.toLowerCase(),
      addedBy: seed.addedBy ? seed.addedBy.toLowerCase() : null,
    };
    
    const [dbSeed] = await db
      .insert(seeds)
      .values(normalizedSeed)
      .returning();
    
    return dbSeed;
  }

  async getSeeds(communityId: number = 0): Promise<Seed[]> {
    return await db
      .select()
      .from(seeds)
      .where(eq(seeds.communityId, communityId));
  }

  async deleteSeed(address: string, communityId: number = 0): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    await db.delete(seeds).where(and(eq(seeds.address, normalizedAddress), eq(seeds.communityId, communityId)));
  }

  async isSeed(address: string, communityId: number = 0): Promise<boolean> {
    const normalizedAddress = address.toLowerCase();
    const results = await db
      .select()
      .from(seeds)
      .where(and(eq(seeds.address, normalizedAddress), eq(seeds.communityId, communityId)))
      .limit(1);
    
    return results.length > 0;
  }

  async createScore(score: InsertScore): Promise<Score> {
    // Normalize address to lowercase for consistent storage
    const normalizedScore = {
      ...score,
      address: score.address.toLowerCase(),
    };
    
    const [dbScore] = await db
      .insert(scores)
      .values(normalizedScore)
      .returning();
    
    return dbScore;
  }

  async getScore(address: string, epochId: number, communityId: number = 0): Promise<Score | undefined> {
    const normalizedAddress = address.toLowerCase();
    const results = await db
      .select()
      .from(scores)
      .where(and(eq(scores.address, normalizedAddress), eq(scores.epochId, epochId), eq(scores.communityId, communityId)))
      .limit(1);
    
    return results[0];
  }

  async getLatestScore(address: string, communityId: number = 0): Promise<Score | undefined> {
    const normalizedAddress = address.toLowerCase();
    const results = await db
      .select()
      .from(scores)
      .where(and(eq(scores.address, normalizedAddress), eq(scores.communityId, communityId)))
      .orderBy(desc(scores.epochId))
      .limit(1);
    
    return results[0];
  }

  async getScoresByEpoch(epochId: number, communityId: number = 0): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .where(and(eq(scores.epochId, epochId), eq(scores.communityId, communityId)));
  }

  async getAllScores(communityId: number = 0): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .where(eq(scores.communityId, communityId))
      .orderBy(desc(scores.epochId));
  }

  async deleteScoresByEpoch(epochId: number, communityId: number = 0): Promise<void> {
    await db.delete(scores).where(and(eq(scores.epochId, epochId), eq(scores.communityId, communityId)));
  }

  async deleteEpochHealth(epochId: number, communityId: number = 0): Promise<void> {
    await db.delete(epochHealth).where(and(eq(epochHealth.epochId, epochId), eq(epochHealth.communityId, communityId)));
  }

  async deleteEpochData(epochId: number, communityId: number = 0): Promise<void> {
    await this.deleteScoresByEpoch(epochId, communityId);
    await this.deleteEpochHealth(epochId, communityId);
  }

  async getCurrentEpoch(communityId: number = 0): Promise<Epoch | undefined> {
    const results = await db
      .select()
      .from(epochs)
      .where(and(eq(epochs.status, "active"), eq(epochs.communityId, communityId)))
      .orderBy(desc(epochs.id))
      .limit(1);
    
    return results[0];
  }

  async getEpoch(epochId: number, communityId: number = 0): Promise<Epoch | undefined> {
    const results = await db
      .select()
      .from(epochs)
      .where(and(eq(epochs.id, epochId), eq(epochs.communityId, communityId)))
      .limit(1);
    
    return results[0];
  }

  async createEpoch(epoch: InsertEpoch): Promise<Epoch> {
    const [dbEpoch] = await db
      .insert(epochs)
      .values(epoch)
      .returning();
    
    return dbEpoch;
  }

  async closeEpoch(epochId: number, communityId: number = 0): Promise<void> {
    await db
      .update(epochs)
      .set({ 
        status: "closed",
        closedAt: new Date()
      })
      .where(and(eq(epochs.id, epochId), eq(epochs.communityId, communityId)));
  }

  async advanceEpoch(communityId: number = 0): Promise<Epoch> {
    // Get current epoch
    const currentEpoch = await this.getCurrentEpoch(communityId);
    
    if (currentEpoch) {
      // Close the current epoch
      await this.closeEpoch(Number(currentEpoch.id), communityId);
    }
    
    // Create next epoch (epoch 0 if none exists, or current + 1)
    const nextEpochId = currentEpoch ? Number(currentEpoch.id) + 1 : 0;
    
    return await this.createEpoch({
      id: nextEpochId,
      communityId: communityId,
      status: "active",
      graphRoot: null,
      seedRoot: null,
      paramsHash: null,
      scoresHash: null,
      signature: null,
      closedAt: null,
    });
  }

  // Community operations
  async createCommunity(community: InsertCommunity): Promise<Community> {
    // Normalize creator address to lowercase for consistent storage
    const normalizedCommunity = {
      ...community,
      creator: community.creator.toLowerCase(),
    };
    
    const [dbCommunity] = await db
      .insert(communities)
      .values(normalizedCommunity)
      .returning();
    
    return dbCommunity;
  }

  async getCommunity(id: number): Promise<Community | undefined> {
    const results = await db
      .select()
      .from(communities)
      .where(eq(communities.id, id))
      .limit(1);
    
    return results[0];
  }

  async listCommunities(filters?: { visibility?: 'public' | 'invite'; creator?: string }): Promise<Community[]> {
    let query = db.select().from(communities);
    
    const conditions = [];
    if (filters?.visibility) {
      conditions.push(eq(communities.visibility, filters.visibility));
    }
    if (filters?.creator) {
      conditions.push(eq(communities.creator, filters.creator.toLowerCase()));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query;
  }
}

export const storage = new MemStorage();
