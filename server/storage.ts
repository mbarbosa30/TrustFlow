import { type User, type InsertUser, type WalletProfile, type InsertWalletProfile, type UpdateWalletProfile, walletProfiles, type PublicEndorsement, type InsertPublicEndorsement, publicEndorsements, type EpochHealth, type InsertEpochHealth, epochHealth, type Seed, type InsertSeed, seeds, type Score, type InsertScore, scores, type Epoch, type InsertEpoch, epochs, type Community, type InsertCommunity, communities, type Auth3009, type InsertAuth3009, auth3009, type Loan, type InsertLoan, loan, type Installment, type InsertInstallment, installment, type SubsidyLedger, type InsertSubsidyLedger, subsidyLedger, type Assist, type InsertAssist, assist, type FXQuote, type InsertFXQuote, fxQuote, guarantee, trustEvent } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { and, eq, desc } from "drizzle-orm";

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
  listCommunities(filters?: { visibility?: 'public' | 'invite'; creator?: string }): Promise<Community[]>;
  getCommunitiesByCreator(creator: string): Promise<Community[]>;
  
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

  async getCommunitiesByCreator(creator: string): Promise<Community[]> {
    const normalizedCreator = creator.toLowerCase();
    return await db
      .select()
      .from(communities)
      .where(eq(communities.creator, normalizedCreator));
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

  async createLoanWithInstallments(params: {
    loanData: InsertLoan;
    principalUsdc: number;
    aprNominal: number;
    tenorMonths: number;
  }): Promise<{ loan: Loan; installments: Installment[] }> {
    const { loanData, principalUsdc, aprNominal, tenorMonths } = params;
    
    // Import dynamically to avoid circular dependencies
    const { generateInstallmentSchedule } = await import("./lending/loan");
    
    // Execute in transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // 1. Create loan
      const normalized = {
        ...loanData,
        borrowerAddress: loanData.borrowerAddress.toLowerCase(),
      };
      
      const [newLoan] = await tx
        .insert(loan)
        .values(normalized)
        .returning();
      
      // 2. Generate installment schedule
      const schedule = generateInstallmentSchedule(principalUsdc, aprNominal, tenorMonths);
      
      // 3. Create installments
      const installmentsData: InsertInstallment[] = schedule.map((item) => ({
        loanId: newLoan.id,
        idx: item.idx,
        dueDate: item.dueDate,
        principalDue: item.principalDue,
        interestDue: item.interestDue,
        totalDue: item.totalDue,
        status: 'PENDING',
      }));
      
      const installments = await tx
        .insert(installment)
        .values(installmentsData)
        .returning();
      
      return {
        loan: newLoan,
        installments,
      };
    });
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
      .set({ status, closedAt: status !== 'ACTIVE' ? new Date() : null })
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
          eq(trustEvent.appliedInEpoch, null)
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

    // Get payment events from installments that have been paid
    const paidInstallments = await db
      .select({
        id: installment.id,
        loanId: installment.loanId,
        totalPaid: installment.totalPaid,
        paidAt: installment.paidAt,
        borrowerAddress: loan.borrowerAddress,
      })
      .from(installment)
      .innerJoin(loan, eq(installment.loanId, loan.id))
      .where(
        and(
          eq(loan.communityId, communityId),
          eq(installment.status, "PAID")
        )
      )
      .orderBy(desc(installment.paidAt))
      .limit(limit);

    for (const inst of paidInstallments) {
      if (inst.paidAt) {
        activities.push({
          id: `payment-${inst.id}`,
          type: "PAYMENT_MADE",
          timestamp: inst.paidAt,
          description: `Payment made on Loan #${inst.loanId}`,
          amountUsdc: inst.totalPaid,
          borrowerAddress: inst.borrowerAddress,
        });
      }
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

    return community.lendingPolicyJson;
  }

  async updateLendingPolicy(communityId: number, policy: any): Promise<void> {
    await db
      .update(communities)
      .set({
        lendingPolicyJson: policy,
      })
      .where(eq(communities.id, communityId));
  }
}

export const storage = new MemStorage();
