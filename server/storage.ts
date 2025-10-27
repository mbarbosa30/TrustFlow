import { type User, type InsertUser, type PublicEndorsement, type InsertPublicEndorsement } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private endorsements: PublicEndorsement[];

  constructor() {
    this.users = new Map();
    this.endorsements = [];
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
    const id = this.endorsements.length + 1;
    const newEndorsement: PublicEndorsement = {
      ...endorsement,
      id,
      createdAt: new Date(),
    };
    this.endorsements.push(newEndorsement);
    return newEndorsement;
  }

  async getEndorsements(filters?: {
    endorser?: string;
    endorsee?: string;
    epoch?: number;
    limit?: number;
    offset?: number;
  }): Promise<PublicEndorsement[]> {
    let filtered = this.endorsements;

    if (filters?.endorser) {
      filtered = filtered.filter(e => e.endorser.toLowerCase() === filters.endorser!.toLowerCase());
    }
    if (filters?.endorsee) {
      filtered = filtered.filter(e => e.endorsee.toLowerCase() === filters.endorsee!.toLowerCase());
    }
    if (filters?.epoch !== undefined) {
      filtered = filtered.filter(e => e.epoch === filters.epoch);
    }

    const offset = filters?.offset || 0;
    const limit = filters?.limit || filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  async getMaxNonce(endorser: string, epoch: number): Promise<number> {
    const endorsements = this.endorsements.filter(
      e => e.endorser.toLowerCase() === endorser.toLowerCase() && e.epoch === epoch
    );
    
    if (endorsements.length === 0) {
      return 0;
    }

    return Math.max(...endorsements.map(e => Number(e.nonce)));
  }
}

export const storage = new MemStorage();
