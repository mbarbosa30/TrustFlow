import { type User, type InsertUser, type PublicEndorsement, type InsertPublicEndorsement, publicEndorsements, type EpochHealth, type InsertEpochHealth, epochHealth, type Seed, type InsertSeed, seeds, type Score, type InsertScore, scores, type Epoch, type InsertEpoch, epochs } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { and, eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createEndorsement(endorsement: InsertPublicEndorsement): Promise<PublicEndorsement>;
  getEndorsements(filters?: {
    endorser?: string;
    endorsee?: string;
    epoch?: number;
    limit?: number;
    offset?: number;
  }): Promise<PublicEndorsement[]>;
  getMaxNonce(endorser: string, epoch: number): Promise<number>;
  
  createEpochHealth(health: InsertEpochHealth): Promise<EpochHealth>;
  getEpochHealth(epochId: number): Promise<EpochHealth | undefined>;
  getLatestEpochHealth(): Promise<EpochHealth | undefined>;
  
  createSeed(seed: InsertSeed): Promise<Seed>;
  getSeeds(): Promise<Seed[]>;
  deleteSeed(address: string): Promise<void>;
  isSeed(address: string): Promise<boolean>;
  
  createScore(score: InsertScore): Promise<Score>;
  getScore(address: string, epochId: number): Promise<Score | undefined>;
  getLatestScore(address: string): Promise<Score | undefined>;
  getScoresByEpoch(epochId: number): Promise<Score[]>;
  getAllScores(): Promise<Score[]>;
  deleteScoresByEpoch(epochId: number): Promise<void>;
  
  getCurrentEpoch(): Promise<Epoch | undefined>;
  getEpoch(epochId: number): Promise<Epoch | undefined>;
  createEpoch(epoch: InsertEpoch): Promise<Epoch>;
  closeEpoch(epochId: number): Promise<void>;
  advanceEpoch(): Promise<Epoch>;
  deleteEpochData(epochId: number): Promise<void>;
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
    const [dbEndorsement] = await db
      .insert(publicEndorsements)
      .values(endorsement)
      .returning();
    
    return dbEndorsement;
  }

  async getEndorsements(filters?: {
    endorser?: string;
    endorsee?: string;
    epoch?: number;
    limit?: number;
    offset?: number;
  }): Promise<PublicEndorsement[]> {
    let query = db.select().from(publicEndorsements);
    
    const conditions = [];
    if (filters?.endorser) {
      conditions.push(eq(publicEndorsements.endorser, filters.endorser));
    }
    if (filters?.endorsee) {
      conditions.push(eq(publicEndorsements.endorsee, filters.endorsee));
    }
    if (filters?.epoch !== undefined) {
      conditions.push(eq(publicEndorsements.epoch, filters.epoch));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    
    const results = await query.limit(limit).offset(offset);
    return results;
  }

  async getMaxNonce(endorser: string, epoch: number): Promise<number> {
    const lastEndorsement = await db
      .select({ nonce: publicEndorsements.nonce })
      .from(publicEndorsements)
      .where(
        and(
          eq(publicEndorsements.endorser, endorser),
          eq(publicEndorsements.epoch, epoch)
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

  async getEpochHealth(epochId: number): Promise<EpochHealth | undefined> {
    const results = await db
      .select()
      .from(epochHealth)
      .where(eq(epochHealth.epochId, epochId))
      .limit(1);
    
    return results[0];
  }

  async getLatestEpochHealth(): Promise<EpochHealth | undefined> {
    const results = await db
      .select()
      .from(epochHealth)
      .orderBy(desc(epochHealth.epochId))
      .limit(1);
    
    return results[0];
  }

  async createSeed(seed: InsertSeed): Promise<Seed> {
    const [dbSeed] = await db
      .insert(seeds)
      .values(seed)
      .returning();
    
    return dbSeed;
  }

  async getSeeds(): Promise<Seed[]> {
    return await db.select().from(seeds);
  }

  async deleteSeed(address: string): Promise<void> {
    await db.delete(seeds).where(eq(seeds.address, address));
  }

  async isSeed(address: string): Promise<boolean> {
    const results = await db
      .select()
      .from(seeds)
      .where(eq(seeds.address, address))
      .limit(1);
    
    return results.length > 0;
  }

  async createScore(score: InsertScore): Promise<Score> {
    const [dbScore] = await db
      .insert(scores)
      .values(score)
      .returning();
    
    return dbScore;
  }

  async getScore(address: string, epochId: number): Promise<Score | undefined> {
    const results = await db
      .select()
      .from(scores)
      .where(and(eq(scores.address, address), eq(scores.epochId, epochId)))
      .limit(1);
    
    return results[0];
  }

  async getLatestScore(address: string): Promise<Score | undefined> {
    const results = await db
      .select()
      .from(scores)
      .where(eq(scores.address, address))
      .orderBy(desc(scores.epochId))
      .limit(1);
    
    return results[0];
  }

  async getScoresByEpoch(epochId: number): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .where(eq(scores.epochId, epochId));
  }

  async getAllScores(): Promise<Score[]> {
    return await db
      .select()
      .from(scores)
      .orderBy(desc(scores.epochId));
  }

  async deleteScoresByEpoch(epochId: number): Promise<void> {
    await db.delete(scores).where(eq(scores.epochId, epochId));
  }

  async deleteEpochHealth(epochId: number): Promise<void> {
    await db.delete(epochHealth).where(eq(epochHealth.epochId, epochId));
  }

  async deleteEpochData(epochId: number): Promise<void> {
    await this.deleteScoresByEpoch(epochId);
    await this.deleteEpochHealth(epochId);
  }

  async getCurrentEpoch(): Promise<Epoch | undefined> {
    const results = await db
      .select()
      .from(epochs)
      .where(eq(epochs.status, "active"))
      .orderBy(desc(epochs.id))
      .limit(1);
    
    return results[0];
  }

  async getEpoch(epochId: number): Promise<Epoch | undefined> {
    const results = await db
      .select()
      .from(epochs)
      .where(eq(epochs.id, epochId))
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

  async closeEpoch(epochId: number): Promise<void> {
    await db
      .update(epochs)
      .set({ 
        status: "closed",
        closedAt: new Date()
      })
      .where(eq(epochs.id, epochId));
  }

  async advanceEpoch(): Promise<Epoch> {
    // Get current epoch
    const currentEpoch = await this.getCurrentEpoch();
    
    if (currentEpoch) {
      // Close the current epoch
      await this.closeEpoch(Number(currentEpoch.id));
    }
    
    // Create next epoch (epoch 0 if none exists, or current + 1)
    const nextEpochId = currentEpoch ? Number(currentEpoch.id) + 1 : 0;
    
    return await this.createEpoch({
      id: BigInt(nextEpochId),
      status: "active",
      graphRoot: null,
      seedRoot: null,
      paramsHash: null,
      scoresHash: null,
      signature: null,
      closedAt: null,
    });
  }
}

export const storage = new MemStorage();
