import { type User, type InsertUser, type WalletProfile, type InsertWalletProfile, type UpdateWalletProfile, walletProfiles, type PublicEndorsement, type InsertPublicEndorsement, publicEndorsements, type EpochHealth, type InsertEpochHealth, epochHealth, type Seed, type InsertSeed, seeds, type Score, type InsertScore, scores, type Epoch, type InsertEpoch, epochs, type Community, type InsertCommunity, communities, type Auth3009, type InsertAuth3009, auth3009, type Loan, type InsertLoan, loan, type Installment, type InsertInstallment, installment, type SubsidyLedger, type InsertSubsidyLedger, subsidyLedger, type Assist, type InsertAssist, assist, type FXQuote, type InsertFXQuote, fxQuote, guarantee, trustEvent, type PendingPayment, type InsertPendingPayment, pendingPayment, type LoanDonation, type InsertLoanDonation, loanDonation, type Context, type InsertContext, contexts, type CoSeed, type InsertCoSeed, coSeeds } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { and, eq, desc, sql, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wallet profile operations
  getWalletProfile(address: string): Promise<WalletProfile | undefined>;
  createWalletProfile(profile: InsertWalletProfile): Promise<WalletProfile>;
  updateWalletProfile(address: string, updates: UpdateWalletProfile): Promise<WalletProfile>;
  
  // Community operations
  createCommunity(community: InsertCommunity): Promise<Community>;
  getCommunity(id: number): Promise<Community | undefined>;
  listCommunities(filters?: { visibility?: 'public' | 'invite' | 'archived'; creator?: string }): Promise<Community[]>;
  getCommunitiesByCreator(creator: string): Promise<Community[]>;
  updateCommunityVisibility(id: number, visibility: 'public' | 'invite' | 'archived'): Promise<void>;
  
  // Context operations (ego and community trust contexts)
  createContext(context: InsertContext): Promise<Context>;
  getContext(id: number): Promise<Context | undefined>;
  getEgoContext(ownerAddress: string): Promise<Context | undefined>;
  getOrCreateEgoContext(ownerAddress: string): Promise<Context>;
  updateContext(id: number, updates: Partial<InsertContext>): Promise<void>;
  updateLocalHealth(ownerAddress: string, localHealth: number): Promise<void>;
  
  // Co-seed operations (additional seeds for ego contexts)
  addCoSeed(coSeed: InsertCoSeed): Promise<CoSeed>;
  removeCoSeed(contextId: number, address: string): Promise<void>;
  getCoSeeds(contextId: number): Promise<CoSeed[]>;
  getCoSeedCount(contextId: number): Promise<number>;
  
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
  getSeedsByAddress(address: string): Promise<Seed[]>;
  deleteSeed(address: string, communityId?: number): Promise<void>;
  isSeed(address: string, communityId?: number): Promise<boolean>;
  
  createScore(score: InsertScore): Promise<Score>;
  getScore(address: string, epochId: number, communityId?: number): Promise<Score | undefined>;
  getLatestScore(address: string, communityId?: number): Promise<Score | undefined>;
  getScoresByEpoch(epochId: number, communityId?: number): Promise<Score[]>;
  getAllScores(communityId?: number): Promise<Score[]>;
  getAllScoresForUser(address: string): Promise<Score[]>;
  deleteScoresByEpoch(epochId: number, communityId?: number): Promise<void>;
  
  getCurrentEpoch(communityId?: number): Promise<Epoch | undefined>;
  getEpoch(epochId: number, communityId?: number): Promise<Epoch | undefined>;
  createEpoch(epoch: InsertEpoch): Promise<Epoch>;
  closeEpoch(epochId: number, communityId?: number): Promise<void>;
  advanceEpoch(communityId?: number): Promise<Epoch>;
  deleteEpochData(epochId: number, communityId?: number): Promise<void>;
  
  createAuth3009(auth: InsertAuth3009): Promise<Auth3009>;
  getAuth3009(nonce: string): Promise<Auth3009 | undefined>;
  markAuth3009Used(nonce: string, txHash: string): Promise<void>;
  
  // Lending operations
  updateCommunityLendingPolicy(communityId: number, policy: any): Promise<void>;
  getLendingPolicy(communityId: number): Promise<any | null>;
  
  // Loan operations
  createLoan(loanData: InsertLoan): Promise<Loan>;
  createLoanWithInstallments(params: {
    loanData: InsertLoan;
    principalUsdc: number;
    aprNominal: number;
    tenorMonths: number;
  }): Promise<{ loan: Loan; installments: Installment[] }>;
  getLoan(id: number): Promise<Loan | undefined>;
  getLoansByBorrower(borrowerAddress: string, communityId?: number): Promise<Loan[]>;
  getLoansByCommunity(communityId: number): Promise<Loan[]>;
  updateLoanStatus(id: number, status: string): Promise<void>;
  
  // Installment operations
  createInstallment(installmentData: InsertInstallment): Promise<Installment>;
  createInstallments(installmentsData: InsertInstallment[]): Promise<Installment[]>;
  getInstallmentsByLoan(loanId: number): Promise<Installment[]>;
  getInstallment(loanId: number, idx: number): Promise<Installment | undefined>;
  getInstallmentById(id: number): Promise<Installment | undefined>;
  updateInstallmentPayment(loanId: number, idx: number, principalPaid: number, interestPaid: number): Promise<void>;
  updateInstallmentStatus(loanId: number, idx: number, status: string): Promise<void>;
  
  // Subsidy ledger operations
  createSubsidyLedger(subsidyData: InsertSubsidyLedger): Promise<SubsidyLedger>;
  getSubsidyLedger(loanId: number, installmentIdx: number): Promise<SubsidyLedger | undefined>;
  updateSubsidyLedger(id: number, updates: Partial<InsertSubsidyLedger>): Promise<void>;
  
  // Assist operations (USDC → Aave + ARS credit)
  createAssist(assistData: InsertAssist): Promise<Assist>;
  getAssist(id: number): Promise<Assist | undefined>;
  getAssistsByLoan(loanId: number): Promise<Assist[]>;
  getAssistsByCommunity(communityId: number): Promise<Assist[]>;
  getAssistsBySupporter(supporterAddress: string): Promise<Assist[]>;
  
  // FX Quote operations
  createFxQuote(quoteData: InsertFXQuote): Promise<FXQuote>;
  getFxQuote(id: string): Promise<FXQuote | undefined>;
  getValidFxQuote(id: string): Promise<FXQuote | undefined>;
  
  // Guarantee operations
  createGuarantee(guaranteeData: any): Promise<void>;
  getGuarantee(communityId: number): Promise<any | undefined>;
  updateGuarantee(communityId: number, updates: any): Promise<void>;
  
  // General installment update
  updateInstallment(id: number, updates: Partial<InsertInstallment>): Promise<void>;
  
  // Trust event operations
  createTrustEvent(eventData: any): Promise<void>;
  getPendingTrustEvents(communityId: number): Promise<any[]>;
  markTrustEventApplied(eventId: number, epochId: number): Promise<void>;
  getTrustEventsByUser(communityId: number, userAddress: string): Promise<any[]>;
  
  // Support API operations
  getActiveLoans(): Promise<any[]>;
  getLateInstallments(): Promise<any[]>;
  
  // Lending Dashboard operations
  getLendingStats(communityId: number): Promise<any>;
  getLendingActivity(communityId: number, limit?: number): Promise<any[]>;
  
  // Pending Payment operations
  createPendingPayment(paymentData: InsertPendingPayment): Promise<PendingPayment>;
  getPendingPayment(id: number): Promise<PendingPayment | undefined>;
  getPendingPaymentsByLoan(loanId: number): Promise<PendingPayment[]>;
  getPendingPaymentsByCommunity(communityId: number, status?: string): Promise<PendingPayment[]>;
  updatePendingPaymentStatus(id: number, status: string, reviewedBy: string, reviewNotes?: string): Promise<void>;
  
  // Loan Donation operations
  createLoanDonation(donationData: InsertLoanDonation): Promise<LoanDonation>;
  getLoanDonations(loanId: number): Promise<LoanDonation[]>;
  getLoanDonationsByCommunity(communityId: number): Promise<LoanDonation[]>;
  
  // Lending Policy Admin operations
  getLendingPolicy(communityId: number): Promise<any>;
  updateLendingPolicy(communityId: number, policy: any): Promise<void>;
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

  async getWalletProfile(address: string): Promise<WalletProfile | undefined> {
    const normalizedAddress = address.toLowerCase();
    const [profile] = await db
      .select()
      .from(walletProfiles)
      .where(eq(walletProfiles.address, normalizedAddress))
      .limit(1);
    return profile;
  }

  async createWalletProfile(profile: InsertWalletProfile): Promise<WalletProfile> {
    const normalizedProfile = {
      ...profile,
      address: profile.address.toLowerCase(),
    };
    const [created] = await db
      .insert(walletProfiles)
      .values(normalizedProfile)
      .returning();
    return created;
  }

  async updateWalletProfile(address: string, updates: UpdateWalletProfile): Promise<WalletProfile> {
    const normalizedAddress = address.toLowerCase();
    const [updated] = await db
      .update(walletProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(walletProfiles.address, normalizedAddress))
      .returning();
    return updated;
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
    
    // Allow large limits for batch operations (default to 1000 for safety)
    const limit = filters?.limit !== undefined ? filters.limit : 1000;
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

  async getSeedsByAddress(address: string): Promise<Seed[]> {
    const normalizedAddress = address.toLowerCase();
    return await db
      .select()
      .from(seeds)
      .where(eq(seeds.address, normalizedAddress));
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

  async getAllScoresForUser(address: string): Promise<Score[]> {
    const normalizedAddress = address.toLowerCase();
    return await db
      .select()
      .from(scores)
      .where(eq(scores.address, normalizedAddress))
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
    const { generateApiKey } = await import('./utils/apikey');
    
    // Normalize creator address to lowercase for consistent storage
    // Auto-generate API key for external integrations
    const normalizedCommunity = {
      ...community,
      creator: community.creator.toLowerCase(),
      apiKey: generateApiKey(),
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

  async listCommunities(filters?: { visibility?: 'public' | 'invite' | 'archived'; creator?: string }): Promise<Community[]> {
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

  async updateCommunityVisibility(id: number, visibility: 'public' | 'invite' | 'archived'): Promise<void> {
    await db
      .update(communities)
      .set({ visibility })
      .where(eq(communities.id, id));
  }

  async getCommunitiesByCreator(creator: string): Promise<Community[]> {
    const normalizedCreator = creator.toLowerCase();
    return await db
      .select()
      .from(communities)
      .where(eq(communities.creator, normalizedCreator));
  }

  async createContext(context: InsertContext): Promise<Context> {
    const normalized = {
      ...context,
      ownerAddress: context.ownerAddress ? context.ownerAddress.toLowerCase() : null,
    };
    
    const [dbContext] = await db
      .insert(contexts)
      .values(normalized)
      .returning();
    
    return dbContext;
  }

  async getContext(id: number): Promise<Context | undefined> {
    const results = await db
      .select()
      .from(contexts)
      .where(eq(contexts.id, id))
      .limit(1);
    
    return results[0];
  }

  async getEgoContext(ownerAddress: string): Promise<Context | undefined> {
    const normalizedAddress = ownerAddress.toLowerCase();
    const results = await db
      .select()
      .from(contexts)
      .where(
        and(
          eq(contexts.type, 'ego'),
          eq(contexts.ownerAddress, normalizedAddress)
        )
      )
      .limit(1);
    
    return results[0];
  }

  async getOrCreateEgoContext(ownerAddress: string): Promise<Context> {
    const normalizedAddress = ownerAddress.toLowerCase();
    
    // Try to get existing ego context
    const existing = await this.getEgoContext(normalizedAddress);
    if (existing) {
      return existing;
    }
    
    // Create new ego context with default policy
    const defaultPolicy = {
      minCutThreshold: 1,
      distanceCapacitySchedule: {
        0: Infinity,
        1: 4,
        2: 2,
        3: 1,
      },
      perEpochVouchCap: 5,
      warmupEpochs: 1,
      reciprocityBrake: true,
    };
    
    return await this.createContext({
      type: 'ego',
      ownerAddress: normalizedAddress,
      policyJson: defaultPolicy as any,
    });
  }

  async updateContext(id: number, updates: Partial<InsertContext>): Promise<void> {
    await db
      .update(contexts)
      .set(updates)
      .where(eq(contexts.id, id));
  }

  async updateLocalHealth(ownerAddress: string, localHealth: number): Promise<void> {
    const normalizedAddress = ownerAddress.toLowerCase();
    await db
      .update(contexts)
      .set({ 
        localHealth,
        localHealthUpdatedAt: new Date()
      })
      .where(
        and(
          eq(contexts.ownerAddress, normalizedAddress),
          eq(contexts.type, 'ego')
        )
      );
  }

  async addCoSeed(coSeed: InsertCoSeed): Promise<CoSeed> {
    const normalized = {
      ...coSeed,
      address: coSeed.address.toLowerCase(),
    };
    
    const [dbCoSeed] = await db
      .insert(coSeeds)
      .values(normalized)
      .returning();
    
    return dbCoSeed;
  }

  async removeCoSeed(contextId: number, address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    await db
      .delete(coSeeds)
      .where(
        and(
          eq(coSeeds.contextId, contextId),
          eq(coSeeds.address, normalizedAddress)
        )
      );
  }

  async getCoSeeds(contextId: number): Promise<CoSeed[]> {
    return await db
      .select()
      .from(coSeeds)
      .where(eq(coSeeds.contextId, contextId));
  }

  async getCoSeedCount(contextId: number): Promise<number> {
    const results = await db
      .select({ count: sql<number>`count(*)` })
      .from(coSeeds)
      .where(eq(coSeeds.contextId, contextId));
    
    return results[0]?.count || 0;
  }

  async createAuth3009(authData: InsertAuth3009): Promise<Auth3009> {
    // Normalize addresses to lowercase
    const normalized = {
      ...authData,
      fromAddress: authData.fromAddress.toLowerCase(),
      toAddress: authData.toAddress.toLowerCase(),
    };
    
    const [dbAuth] = await db
      .insert(auth3009)
      .values(normalized)
      .returning();
    
    return dbAuth;
  }

  async getAuth3009(nonce: string): Promise<Auth3009 | undefined> {
    const results = await db
      .select()
      .from(auth3009)
      .where(eq(auth3009.nonce, nonce))
      .limit(1);
    
    return results[0];
  }

  async markAuth3009Used(nonce: string, txHash: string): Promise<void> {
    await db
      .update(auth3009)
      .set({ used: true, txHash })
      .where(eq(auth3009.nonce, nonce));
  }

  async updateCommunityLendingPolicy(communityId: number, policy: any): Promise<void> {
    await db
      .update(communities)
      .set({ lendingPolicyJson: policy })
      .where(eq(communities.id, communityId));
  }

  async createLoan(loanData: InsertLoan): Promise<Loan> {
    const normalized = {
      ...loanData,
      borrowerAddress: loanData.borrowerAddress.toLowerCase(),
    };
    
    const [dbLoan] = await db
      .insert(loan)
      .values(normalized)
      .returning();
    
    return dbLoan;
  }

  async createLoanWithInstallments(_params: {
    loanData: InsertLoan;
    principalUsdc: number;
    aprNominal: number;
    tenorMonths: number;
  }): Promise<{ loan: Loan; installments: Installment[] }> {
    throw new Error("Lending feature has been removed");
  }

  async getLoan(id: number): Promise<Loan | undefined> {
    const results = await db
      .select()
      .from(loan)
      .where(eq(loan.id, id))
      .limit(1);
    
    return results[0];
  }

  async getLoansByBorrower(borrowerAddress: string, communityId?: number): Promise<Loan[]> {
    const normalized = borrowerAddress.toLowerCase();
    const conditions = [eq(loan.borrowerAddress, normalized)];
    
    if (communityId !== undefined) {
      conditions.push(eq(loan.communityId, communityId));
    }
    
    return await db
      .select()
      .from(loan)
      .where(and(...conditions))
      .orderBy(desc(loan.createdAt));
  }

  async getLoansByCommunity(communityId: number): Promise<Loan[]> {
    return await db
      .select()
      .from(loan)
      .where(eq(loan.communityId, communityId))
      .orderBy(desc(loan.createdAt));
  }

  async updateLoanStatus(id: number, status: string): Promise<void> {
    await db
      .update(loan)
      .set({ 
        status, 
        closedAt: status !== 'ACTIVE' && status !== 'PENDING_APPROVAL' ? new Date() : null,
        disbursedAt: status === 'ACTIVE' ? new Date() : undefined
      })
      .where(eq(loan.id, id));
  }

  async createInstallment(installmentData: InsertInstallment): Promise<Installment> {
    const [dbInstallment] = await db
      .insert(installment)
      .values(installmentData)
      .returning();
    
    return dbInstallment;
  }

  async createInstallments(installmentsData: InsertInstallment[]): Promise<Installment[]> {
    if (installmentsData.length === 0) {
      return [];
    }
    
    return await db
      .insert(installment)
      .values(installmentsData)
      .returning();
  }

  async getInstallmentsByLoan(loanId: number): Promise<Installment[]> {
    return await db
      .select()
      .from(installment)
      .where(eq(installment.loanId, loanId))
      .orderBy(installment.idx);
  }

  async getInstallment(loanId: number, idx: number): Promise<Installment | undefined> {
    const results = await db
      .select()
      .from(installment)
      .where(and(eq(installment.loanId, loanId), eq(installment.idx, idx)))
      .limit(1);
    
    return results[0];
  }

  async getInstallmentById(id: number): Promise<Installment | undefined> {
    const results = await db
      .select()
      .from(installment)
      .where(eq(installment.id, id))
      .limit(1);
    
    return results[0];
  }

  async updateInstallmentPayment(
    loanId: number,
    idx: number,
    principalPaid: number,
    interestPaid: number
  ): Promise<void> {
    const currentInstallment = await this.getInstallment(loanId, idx);
    
    if (!currentInstallment) {
      throw new Error(`Installment ${idx} not found for loan ${loanId}`);
    }
    
    const totalPaid = principalPaid + interestPaid;
    const isPaid = totalPaid >= currentInstallment.totalDue;
    
    await db
      .update(installment)
      .set({
        principalPaid,
        interestPaid,
        totalPaid,
        status: isPaid ? 'PAID' : currentInstallment.status,
        paidAt: isPaid ? new Date() : currentInstallment.paidAt,
      })
      .where(and(eq(installment.loanId, loanId), eq(installment.idx, idx)));
  }

  async updateInstallmentStatus(loanId: number, idx: number, status: string): Promise<void> {
    await db
      .update(installment)
      .set({ status })
      .where(and(eq(installment.loanId, loanId), eq(installment.idx, idx)));
  }

  async createSubsidyLedger(subsidyData: InsertSubsidyLedger): Promise<SubsidyLedger> {
    const [dbSubsidy] = await db
      .insert(subsidyLedger)
      .values(subsidyData)
      .returning();
    
    return dbSubsidy;
  }

  async getSubsidyLedger(loanId: number, installmentIdx: number): Promise<SubsidyLedger | undefined> {
    const results = await db
      .select()
      .from(subsidyLedger)
      .where(and(eq(subsidyLedger.loanId, loanId), eq(subsidyLedger.installmentIdx, installmentIdx)))
      .limit(1);
    
    return results[0];
  }

  async updateSubsidyLedger(id: number, updates: Partial<InsertSubsidyLedger>): Promise<void> {
    await db
      .update(subsidyLedger)
      .set(updates)
      .where(eq(subsidyLedger.id, id));
  }

  async updateInstallment(id: number, updates: Partial<InsertInstallment>): Promise<void> {
    await db
      .update(installment)
      .set(updates)
      .where(eq(installment.id, id));
  }

  async createAssist(assistData: InsertAssist): Promise<Assist> {
    const [result] = await db
      .insert(assist)
      .values(assistData)
      .returning();
    return result;
  }

  async getAssist(id: number): Promise<Assist | undefined> {
    const results = await db
      .select()
      .from(assist)
      .where(eq(assist.id, id))
      .limit(1);
    return results[0];
  }

  async getAssistsByLoan(loanId: number): Promise<Assist[]> {
    return db
      .select()
      .from(assist)
      .where(eq(assist.loanId, loanId))
      .orderBy(desc(assist.createdAt));
  }

  async getAssistsByCommunity(communityId: number): Promise<Assist[]> {
    return db
      .select()
      .from(assist)
      .where(eq(assist.communityId, communityId))
      .orderBy(desc(assist.createdAt));
  }

  async getAssistsBySupporter(supporterAddress: string): Promise<Assist[]> {
    return db
      .select()
      .from(assist)
      .where(eq(assist.supporterAddress, supporterAddress.toLowerCase()))
      .orderBy(desc(assist.createdAt));
  }

  async createFxQuote(quoteData: InsertFXQuote): Promise<FXQuote> {
    const [result] = await db
      .insert(fxQuote)
      .values(quoteData)
      .returning();
    return result;
  }

  async getFxQuote(id: string): Promise<FXQuote | undefined> {
    const results = await db
      .select()
      .from(fxQuote)
      .where(eq(fxQuote.id, id))
      .limit(1);
    return results[0];
  }

  async getValidFxQuote(id: string): Promise<FXQuote | undefined> {
    const quote = await this.getFxQuote(id);
    if (!quote) return undefined;
    
    // Check if expired
    if (quote.expiresAt < new Date()) {
      return undefined;
    }
    
    return quote;
  }

  async createGuarantee(guaranteeData: any): Promise<void> {
    await db.insert(guarantee).values(guaranteeData);
  }

  async getGuarantee(communityId: number): Promise<any | undefined> {
    const results = await db
      .select()
      .from(guarantee)
      .where(eq(guarantee.communityId, communityId))
      .limit(1);
    return results[0];
  }

  async updateGuarantee(communityId: number, updates: any): Promise<void> {
    await db
      .update(guarantee)
      .set(updates)
      .where(eq(guarantee.communityId, communityId));
  }

  async createTrustEvent(eventData: any): Promise<void> {
    await db.insert(trustEvent).values(eventData);
  }

  async getPendingTrustEvents(communityId: number): Promise<any[]> {
    return db
      .select()
      .from(trustEvent)
      .where(
        and(
          eq(trustEvent.communityId, communityId),
          isNull(trustEvent.appliedInEpoch)
        )
      );
  }

  async markTrustEventApplied(eventId: number, epochId: number): Promise<void> {
    await db
      .update(trustEvent)
      .set({ appliedInEpoch: epochId })
      .where(eq(trustEvent.id, eventId));
  }

  async getTrustEventsByUser(communityId: number, userAddress: string): Promise<any[]> {
    return db
      .select()
      .from(trustEvent)
      .where(
        and(
          eq(trustEvent.communityId, communityId),
          eq(trustEvent.userAddress, userAddress)
        )
      )
      .orderBy(desc(trustEvent.createdAt));
  }

  async getActiveLoans(): Promise<any[]> {
    return db
      .select()
      .from(loan)
      .where(eq(loan.status, "ACTIVE"))
      .orderBy(desc(loan.createdAt));
  }

  async getLateInstallments(): Promise<any[]> {
    const results = await db
      .select({
        installmentId: installment.id,
        loanId: installment.loanId,
        idx: installment.idx,
        borrowerAddress: loan.borrowerAddress,
        dueDate: installment.dueDate,
        totalDue: installment.totalDue,
        totalPaid: installment.totalPaid,
        status: installment.status,
      })
      .from(installment)
      .innerJoin(loan, eq(installment.loanId, loan.id))
      .where(eq(installment.status, "LATE"));

    return results.map((row) => ({
      ...row,
      outstandingAmount: row.totalDue - row.totalPaid,
      daysLate: Math.floor(
        (new Date().getTime() - new Date(row.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));
  }


  async getLendingStats(communityId: number): Promise<any> {
    // Get community info for GHI threshold and lending status
    const community = await this.getCommunity(communityId);
    const lendingPolicy = community?.lendingPolicyJson as any;
    
    // Get all loans for this community
    const allLoans = await db
      .select()
      .from(loan)
      .where(eq(loan.communityId, communityId));

    const totalLoansCount = allLoans.length;
    const totalDisbursed = allLoans.reduce((sum, l) => sum + l.principalUsdc, 0);
    
    const activeLoans = allLoans.filter(l => l.status === "ACTIVE");
    const activeLoansCount = activeLoans.length;
    
    // Calculate accurate outstanding volume for active loans (principal - sum of principalPaid)
    let activeVolume = 0;
    for (const activeLoan of activeLoans) {
      const installments = await db
        .select({ principalPaid: installment.principalPaid })
        .from(installment)
        .where(eq(installment.loanId, activeLoan.id));
      
      const totalPrincipalPaid = installments.reduce((sum, i) => sum + i.principalPaid, 0);
      const remainingPrincipal = activeLoan.principalUsdc - totalPrincipalPaid;
      activeVolume += remainingPrincipal;
    }
    
    const completedLoansCount = allLoans.filter(l => l.status === "COMPLETED").length;
    const defaultedLoansCount = allLoans.filter(l => l.status === "DEFAULTED").length;
    
    // Calculate repayment rate as: completed / (completed + defaulted)
    // Only considers resolved loans, not active ones
    const resolvedLoansCount = completedLoansCount + defaultedLoansCount;
    const repaymentRate = resolvedLoansCount > 0 
      ? (completedLoansCount / resolvedLoansCount) * 100 
      : 0;
    const defaultRate = resolvedLoansCount > 0 
      ? (defaultedLoansCount / resolvedLoansCount) * 100 
      : 0;

    // Get subsidy totals
    const subsidyLedgers = await db
      .select()
      .from(subsidyLedger)
      .innerJoin(loan, eq(subsidyLedger.loanId, loan.id))
      .where(eq(loan.communityId, communityId));

    const totalIbdApplied = subsidyLedgers.reduce(
      (sum, s) => sum + (s.subsidy_ledger.ibdApplied || 0), 
      0
    );
    const totalRaApplied = subsidyLedgers.reduce(
      (sum, s) => sum + (s.subsidy_ledger.assistCovered || 0), 
      0
    );
    const totalVouchersApplied = subsidyLedgers.reduce(
      (sum, s) => sum + (s.subsidy_ledger.voucherApplied || 0), 
      0
    );
    const totalSubsidies = totalIbdApplied + totalRaApplied + totalVouchersApplied;

    // Get unique supporters from assists only (pledge table removed)
    const assists = await db
      .select({ supporterAddress: assist.supporterAddress })
      .from(assist)
      .innerJoin(loan, eq(assist.loanId, loan.id))
      .where(eq(loan.communityId, communityId));

    const uniqueSupportersSet = new Set(
      assists.map(a => a.supporterAddress)
    );
    const uniqueSupporters = uniqueSupportersSet.size;

    // Calculate total supporter contributions (IBD + RA)
    const totalSupporterContributions = totalIbdApplied + totalRaApplied;

    // Mock GHI score for now (would come from actual computation)
    const ghiScore = 75.0;
    const ghiThreshold = lendingPolicy?.eligibility?.ghiThreshold || 60;
    const lendingEnabled = lendingPolicy?.enabled || false;

    return {
      totalLoansCount,
      totalDisbursed,
      activeLoansCount,
      activeVolume,
      completedLoansCount,
      defaultedLoansCount,
      repaymentRate,
      defaultRate,
      totalIbdApplied,
      totalRaApplied,
      totalVouchersApplied,
      totalSubsidies,
      uniqueSupporters,
      totalSupporterContributions,
      ghiScore,
      ghiThreshold,
      lendingEnabled,
    };
  }

  async getLendingActivity(communityId: number, limit: number = 20): Promise<any[]> {
    const activities: any[] = [];
    
    // Get loan creation events
    const loans = await db
      .select()
      .from(loan)
      .where(eq(loan.communityId, communityId))
      .orderBy(desc(loan.createdAt))
      .limit(limit);

    for (const loanItem of loans) {
      activities.push({
        id: `loan-${loanItem.id}`,
        type: "LOAN_CREATED",
        timestamp: loanItem.createdAt,
        description: `Loan #${loanItem.id} created for borrower`,
        amountUsdc: loanItem.principalUsdc,
        borrowerAddress: loanItem.borrowerAddress,
      });
    }

    // Get payment events from installments with any payment (including partial)
    const paidInstallments = await db
      .select({
        id: installment.id,
        loanId: installment.loanId,
        totalPaid: installment.totalPaid,
        paidAt: installment.paidAt,
        createdAt: installment.createdAt,
        borrowerAddress: loan.borrowerAddress,
      })
      .from(installment)
      .innerJoin(loan, eq(installment.loanId, loan.id))
      .where(
        and(
          eq(loan.communityId, communityId),
          sql`${installment.totalPaid} > 0`
        )
      )
      .orderBy(desc(installment.paidAt))
      .limit(limit);

    for (const inst of paidInstallments) {
      const paymentTimestamp = inst.paidAt || inst.createdAt;
      activities.push({
        id: `payment-${inst.id}`,
        type: "PAYMENT_MADE",
        timestamp: paymentTimestamp,
        description: `Payment made on Loan #${inst.loanId}`,
        amountUsdc: inst.totalPaid,
        borrowerAddress: inst.borrowerAddress,
      });
    }

    // Pledge table removed - skip IBD events
    
    // Get RA events (assist creation)
    const assistItems = await db
      .select({
        id: assist.id,
        loanId: assist.loanId,
        usdcAmount: assist.usdcAmount,
        createdAt: assist.createdAt,
        supporterAddress: assist.supporterAddress,
      })
      .from(assist)
      .innerJoin(loan, eq(assist.loanId, loan.id))
      .where(eq(loan.communityId, communityId))
      .orderBy(desc(assist.createdAt))
      .limit(limit);

    for (const a of assistItems) {
      activities.push({
        id: `ra-${a.id}`,
        type: "RA_COVERED",
        timestamp: a.createdAt,
        description: `Repay-Assist covered late installment on Loan #${a.loanId}`,
        amountUsdc: a.usdcAmount,
        supporterAddress: a.supporterAddress,
      });
    }

    // Sort all activities by timestamp (most recent first) and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getLendingPolicy(communityId: number): Promise<any> {
    const community = await this.getCommunity(communityId);
    
    if (!community || !community.lendingPolicyJson) {
      // Return default policy if none exists
      return {
        enabled: false,
        currency: "ARS",
        loanAmounts: {
          min: 160,
          max: 800,
          step: 80,
        },
        tenorMonths: {
          min: 6,
          max: 12,
          step: 1,
        },
        annualInterestRate: 40.0,
        subsidies: {
          ibdEnabled: true,
          raEnabled: true,
          vouchersEnabled: false,
          flgEnabled: false,
        },
        trustDeltas: {
          onTimePayment: 0.02,
          latePayment: -0.05,
          defaultEvent: -0.15,
          repayAssist: 0.03,
          maxPerEpoch: 0.10,
        },
        eligibility: {
          ghiThreshold: 60,
          minCutThreshold: 2,
        },
      };
    }

    const rawPolicy = community.lendingPolicyJson as any;
    
    // Convert old backend format to frontend format
    // Backend format: loanButtonsUsdc (array), tenorsMonths (array), aprNominal
    // Frontend format: loanAmounts { min, max, step }, tenorMonths { min, max, step }, annualInterestRate
    if (rawPolicy?.loanButtonsUsdc && Array.isArray(rawPolicy.loanButtonsUsdc)) {
      const loanButtons = rawPolicy.loanButtonsUsdc.sort((a: number, b: number) => a - b);
      const tenors = rawPolicy.tenorsMonths?.sort((a: number, b: number) => a - b) || [6, 9, 12];
      
      return {
        enabled: rawPolicy.enabled ?? false,
        currency: rawPolicy.currency || "ARS",
        loanAmounts: {
          min: loanButtons[0] || 160,
          max: loanButtons[loanButtons.length - 1] || 800,
          step: loanButtons.length > 1 ? loanButtons[1] - loanButtons[0] : 80,
        },
        tenorMonths: {
          min: tenors[0] || 6,
          max: tenors[tenors.length - 1] || 12,
          step: tenors.length > 1 ? tenors[1] - tenors[0] : 1,
        },
        annualInterestRate: (rawPolicy.aprNominal || 0.4) * 100,
        subsidies: {
          ibdEnabled: rawPolicy.subsidy?.interestBuydown?.enabled ?? true,
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

    // Already in frontend format
    return rawPolicy;
  }

  async updateLendingPolicy(communityId: number, policy: any): Promise<void> {
    await db
      .update(communities)
      .set({
        lendingPolicyJson: policy,
      })
      .where(eq(communities.id, communityId));
  }

  async createPendingPayment(paymentData: InsertPendingPayment): Promise<PendingPayment> {
    const [created] = await db
      .insert(pendingPayment)
      .values(paymentData)
      .returning();
    return created;
  }

  async getPendingPayment(id: number): Promise<PendingPayment | undefined> {
    const [payment] = await db
      .select()
      .from(pendingPayment)
      .where(eq(pendingPayment.id, id))
      .limit(1);
    return payment;
  }

  async getPendingPaymentsByLoan(loanId: number): Promise<PendingPayment[]> {
    return db
      .select()
      .from(pendingPayment)
      .where(eq(pendingPayment.loanId, loanId))
      .orderBy(desc(pendingPayment.submittedAt));
  }

  async getPendingPaymentsByCommunity(communityId: number, status?: string): Promise<PendingPayment[]> {
    const conditions = [eq(pendingPayment.communityId, communityId)];
    if (status) {
      conditions.push(eq(pendingPayment.status, status));
    }
    return db
      .select()
      .from(pendingPayment)
      .where(and(...conditions))
      .orderBy(desc(pendingPayment.submittedAt));
  }

  async updatePendingPaymentStatus(
    id: number,
    status: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    await db
      .update(pendingPayment)
      .set({
        status,
        reviewedBy,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      })
      .where(eq(pendingPayment.id, id));
  }

  // Loan Donation operations
  async createLoanDonation(donationData: InsertLoanDonation): Promise<LoanDonation> {
    const [created] = await db
      .insert(loanDonation)
      .values(donationData)
      .returning();
    return created;
  }

  async getLoanDonations(loanId: number): Promise<LoanDonation[]> {
    return db
      .select()
      .from(loanDonation)
      .where(eq(loanDonation.loanId, loanId))
      .orderBy(desc(loanDonation.createdAt));
  }

  async getLoanDonationsByCommunity(communityId: number): Promise<LoanDonation[]> {
    return db
      .select()
      .from(loanDonation)
      .where(eq(loanDonation.communityId, communityId))
      .orderBy(desc(loanDonation.createdAt));
  }
}

export const storage = new MemStorage();
