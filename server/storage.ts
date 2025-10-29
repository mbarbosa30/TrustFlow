import { type User, type InsertUser, type PublicEndorsement, type InsertPublicEndorsement, publicEndorsements, type EpochHealth, type InsertEpochHealth, epochHealth, type Seed, type InsertSeed, seeds, type Score, type InsertScore, scores, type Epoch, type InsertEpoch, epochs, type Community, type InsertCommunity, communities, type Budget, type InsertBudget, budget, type Allowance, type InsertAllowance, allowance, type Payment, type InsertPayment, payment, type Pledge, type InsertPledge, pledge, type Auth3009, type InsertAuth3009, auth3009, type Loan, type InsertLoan, loan, type Installment, type InsertInstallment, installment, type SubsidyLedger, type InsertSubsidyLedger, subsidyLedger } from "@shared/schema";
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
  getAllScoresForUser(address: string): Promise<Score[]>;
  deleteScoresByEpoch(epochId: number, communityId?: number): Promise<void>;
  
  getCurrentEpoch(communityId?: number): Promise<Epoch | undefined>;
  getEpoch(epochId: number, communityId?: number): Promise<Epoch | undefined>;
  createEpoch(epoch: InsertEpoch): Promise<Epoch>;
  closeEpoch(epochId: number, communityId?: number): Promise<void>;
  advanceEpoch(communityId?: number): Promise<Epoch>;
  deleteEpochData(epochId: number, communityId?: number): Promise<void>;
  
  // Economic layer operations
  createBudget(budget: InsertBudget): Promise<Budget>;
  getBudget(epochId: number, communityId?: number): Promise<Budget | undefined>;
  getLatestBudget(communityId?: number): Promise<Budget | undefined>;
  
  createAllowance(allowance: InsertAllowance): Promise<Allowance>;
  getAllowance(userAddress: string, epochId: number, communityId?: number): Promise<Allowance | undefined>;
  getLatestAllowance(userAddress: string, communityId?: number): Promise<Allowance | undefined>;
  getAllowancesByEpoch(epochId: number, communityId?: number): Promise<Allowance[]>;
  updateAllowanceClaimed(userAddress: string, epochId: number, claimedAmount: number, communityId?: number): Promise<void>;
  
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByUser(userAddress: string, communityId?: number): Promise<Payment[]>;
  updatePaymentStatus(id: number, status: string, txHash?: string): Promise<void>;
  
  createPledge(pledge: InsertPledge): Promise<Pledge>;
  getPledge(id: number): Promise<Pledge | undefined>;
  getPledgesByCommunity(communityId: number): Promise<Pledge[]>;
  getPledgesByDonor(donorAddress: string): Promise<Pledge[]>;
  updatePledgePaused(id: number, paused: boolean): Promise<void>;
  
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
  updateInstallmentPayment(loanId: number, idx: number, principalPaid: number, interestPaid: number): Promise<void>;
  updateInstallmentStatus(loanId: number, idx: number, status: string): Promise<void>;
  
  // Subsidy ledger operations
  createSubsidyLedger(subsidyData: InsertSubsidyLedger): Promise<SubsidyLedger>;
  getSubsidyLedger(loanId: number, installmentIdx: number): Promise<SubsidyLedger | undefined>;
  updateSubsidyLedger(id: number, updates: Partial<InsertSubsidyLedger>): Promise<void>;
  
  // Assist operations
  createAssist(assistData: any): Promise<number>;
  getAssist(id: number): Promise<any | undefined>;
  updateAssist(id: number, updates: any): Promise<void>;
  getAssistsByLoan(loanId: number): Promise<any[]>;
  
  // Guarantee operations
  createGuarantee(guaranteeData: any): Promise<void>;
  getGuarantee(communityId: number): Promise<any | undefined>;
  updateGuarantee(communityId: number, updates: any): Promise<void>;
  
  // General installment update
  updateInstallment(id: number, updates: Partial<InsertInstallment>): Promise<void>;
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

  // Economic layer implementations
  
  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    const [dbBudget] = await db
      .insert(budget)
      .values(budgetData)
      .returning();
    
    return dbBudget;
  }

  async getBudget(epochId: number, communityId: number = 0): Promise<Budget | undefined> {
    const results = await db
      .select()
      .from(budget)
      .where(and(eq(budget.epochId, epochId), eq(budget.communityId, communityId)))
      .limit(1);
    
    return results[0];
  }

  async getLatestBudget(communityId: number = 0): Promise<Budget | undefined> {
    const results = await db
      .select()
      .from(budget)
      .where(eq(budget.communityId, communityId))
      .orderBy(desc(budget.epochId))
      .limit(1);
    
    return results[0];
  }

  async createAllowance(allowanceData: InsertAllowance): Promise<Allowance> {
    // Normalize address to lowercase
    const normalized = {
      ...allowanceData,
      userAddress: allowanceData.userAddress.toLowerCase(),
    };
    
    const [dbAllowance] = await db
      .insert(allowance)
      .values(normalized)
      .returning();
    
    return dbAllowance;
  }

  async getAllowance(userAddress: string, epochId: number, communityId: number = 0): Promise<Allowance | undefined> {
    const normalizedAddress = userAddress.toLowerCase();
    const results = await db
      .select()
      .from(allowance)
      .where(and(
        eq(allowance.userAddress, normalizedAddress),
        eq(allowance.epochId, epochId),
        eq(allowance.communityId, communityId)
      ))
      .limit(1);
    
    return results[0];
  }

  async getLatestAllowance(userAddress: string, communityId: number = 0): Promise<Allowance | undefined> {
    const normalizedAddress = userAddress.toLowerCase();
    const results = await db
      .select()
      .from(allowance)
      .where(and(
        eq(allowance.userAddress, normalizedAddress),
        eq(allowance.communityId, communityId)
      ))
      .orderBy(desc(allowance.epochId))
      .limit(1);
    
    return results[0];
  }

  async getAllowancesByEpoch(epochId: number, communityId: number = 0): Promise<Allowance[]> {
    return await db
      .select()
      .from(allowance)
      .where(and(eq(allowance.epochId, epochId), eq(allowance.communityId, communityId)));
  }

  async updateAllowanceClaimed(userAddress: string, epochId: number, claimedAmount: number, communityId: number = 0): Promise<void> {
    const normalizedAddress = userAddress.toLowerCase();
    await db
      .update(allowance)
      .set({ claimedToday: claimedAmount })
      .where(and(
        eq(allowance.userAddress, normalizedAddress),
        eq(allowance.epochId, epochId),
        eq(allowance.communityId, communityId)
      ));
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    // Normalize addresses to lowercase
    const normalized = {
      ...paymentData,
      userAddress: paymentData.userAddress.toLowerCase(),
      payeeAddress: paymentData.payeeAddress.toLowerCase(),
    };
    
    const [dbPayment] = await db
      .insert(payment)
      .values(normalized)
      .returning();
    
    return dbPayment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const results = await db
      .select()
      .from(payment)
      .where(eq(payment.id, id))
      .limit(1);
    
    return results[0];
  }

  async getPaymentsByUser(userAddress: string, communityId?: number): Promise<Payment[]> {
    const normalizedAddress = userAddress.toLowerCase();
    
    if (communityId !== undefined) {
      return await db
        .select()
        .from(payment)
        .where(and(
          eq(payment.userAddress, normalizedAddress),
          eq(payment.communityId, communityId)
        ))
        .orderBy(desc(payment.createdAt));
    }
    
    return await db
      .select()
      .from(payment)
      .where(eq(payment.userAddress, normalizedAddress))
      .orderBy(desc(payment.createdAt));
  }

  async updatePaymentStatus(id: number, status: string, txHash?: string): Promise<void> {
    const updates: any = { status };
    if (txHash) {
      updates.txHash = txHash;
    }
    
    await db
      .update(payment)
      .set(updates)
      .where(eq(payment.id, id));
  }

  async createPledge(pledgeData: InsertPledge): Promise<Pledge> {
    // Normalize donor address to lowercase
    const normalized = {
      ...pledgeData,
      donorAddress: pledgeData.donorAddress.toLowerCase(),
    };
    
    const [dbPledge] = await db
      .insert(pledge)
      .values(normalized)
      .returning();
    
    return dbPledge;
  }

  async getPledge(id: number): Promise<Pledge | undefined> {
    const results = await db
      .select()
      .from(pledge)
      .where(eq(pledge.id, id))
      .limit(1);
    
    return results[0];
  }

  async getPledgesByCommunity(communityId: number): Promise<Pledge[]> {
    return await db
      .select()
      .from(pledge)
      .where(eq(pledge.communityId, communityId))
      .orderBy(desc(pledge.createdAt));
  }

  async getPledgesByDonor(donorAddress: string): Promise<Pledge[]> {
    const normalizedAddress = donorAddress.toLowerCase();
    return await db
      .select()
      .from(pledge)
      .where(eq(pledge.donorAddress, normalizedAddress))
      .orderBy(desc(pledge.createdAt));
  }

  async updatePledgePaused(id: number, paused: boolean): Promise<void> {
    await db
      .update(pledge)
      .set({ paused })
      .where(eq(pledge.id, id));
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

  async getLendingPolicy(communityId: number): Promise<any | null> {
    const results = await db
      .select()
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);
    
    if (results.length === 0) {
      return null;
    }
    
    return results[0].lendingPolicyJson;
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

  async createAssist(assistData: any): Promise<number> {
    const [result] = await db
      .insert(assist)
      .values(assistData)
      .returning();
    return result.id;
  }

  async getAssist(id: number): Promise<any | undefined> {
    const results = await db
      .select()
      .from(assist)
      .where(eq(assist.id, id))
      .limit(1);
    return results[0];
  }

  async updateAssist(id: number, updates: any): Promise<void> {
    await db
      .update(assist)
      .set(updates)
      .where(eq(assist.id, id));
  }

  async getAssistsByLoan(loanId: number): Promise<any[]> {
    return db
      .select()
      .from(assist)
      .where(eq(assist.loanId, loanId));
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
}

export const storage = new MemStorage();
