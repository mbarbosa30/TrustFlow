import { db } from "../db";
import { 
  kudosBalances, 
  kudosTransfers, 
  kudosClaims, 
  kudosDailyStats,
  type InsertKudosTransfer,
  type InsertKudosClaim,
  type KudosBalance,
  type KudosTransfer
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const TRANSFER_FEE_RATE = 0.01; // 1% total fee
const BURN_RATE = 0.005; // 0.5% burned
const POOL_RATE = 0.005; // 0.5% to pool
const DAILY_CLAIM_CAP = 1000; // 1000 KUDOS per day
const CLAIM_COOLDOWN_DAYS = 7; // 7 days between claims
const EDGE_BOOST_HALFLIFE_DAYS = 180; // 180 days for edge boost decay

export class KudosService {
  /**
   * Transfer KUDOS from one address to another with 1% fee
   * - 0.5% burned (deflationary)
   * - 0.5% goes to daily pool for future claims
   */
  async transfer(params: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    note?: string;
  }): Promise<{ success: boolean; transfer?: KudosTransfer; error?: string }> {
    const { fromAddress, toAddress, amount, note } = params;

    // Normalize addresses to lowercase
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();

    // Validate inputs
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    if (from === to) {
      return { success: false, error: "Cannot send KUDOS to yourself" };
    }

    try {
      return await db.transaction(async (tx) => {
        // Get sender balance
        let senderBalance = await tx
          .select()
          .from(kudosBalances)
          .where(eq(kudosBalances.address, from))
          .limit(1)
          .then(rows => rows[0]);

        if (!senderBalance) {
          return { success: false, error: "Sender has no KUDOS balance" };
        }

        if (senderBalance.balance < amount) {
          return { success: false, error: "Insufficient KUDOS balance" };
        }

        // Calculate fees
        const feeBurned = amount * BURN_RATE;
        const feeToPool = amount * POOL_RATE;
        const netAmount = amount - feeBurned - feeToPool;

        // Update sender balance
        await tx
          .update(kudosBalances)
          .set({
            balance: sql`${kudosBalances.balance} - ${amount}`,
            totalSent: sql`${kudosBalances.totalSent} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(kudosBalances.address, from));

        // Ensure receiver has a balance record
        let receiverBalance = await tx
          .select()
          .from(kudosBalances)
          .where(eq(kudosBalances.address, to))
          .limit(1)
          .then(rows => rows[0]);

        if (!receiverBalance) {
          await tx.insert(kudosBalances).values({
            address: to,
            balance: netAmount,
            totalReceived: netAmount,
          });
        } else {
          await tx
            .update(kudosBalances)
            .set({
              balance: sql`${kudosBalances.balance} + ${netAmount}`,
              totalReceived: sql`${kudosBalances.totalReceived} + ${netAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(kudosBalances.address, to));
        }

        // Record transfer
        const [transfer] = await tx
          .insert(kudosTransfers)
          .values({
            fromAddress: from,
            toAddress: to,
            amount: netAmount,
            feeBurned,
            feeToPool,
            note,
          })
          .returning();

        // Update daily stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingStats = await tx
          .select()
          .from(kudosDailyStats)
          .where(eq(kudosDailyStats.date, today))
          .limit(1)
          .then(rows => rows[0]);

        if (existingStats) {
          await tx
            .update(kudosDailyStats)
            .set({
              totalBurned: sql`${kudosDailyStats.totalBurned} + ${feeBurned}`,
              poolAmount: sql`${kudosDailyStats.poolAmount} + ${feeToPool}`,
              transferVolume: sql`${kudosDailyStats.transferVolume} + ${amount}`,
            })
            .where(eq(kudosDailyStats.date, today));
        } else {
          await tx.insert(kudosDailyStats).values({
            date: today,
            totalBurned: feeBurned,
            poolAmount: feeToPool,
            transferVolume: amount,
          });
        }

        return { success: true, transfer };
      });
    } catch (error) {
      console.error("KUDOS transfer error:", error);
      return { success: false, error: "Transfer failed" };
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<KudosBalance | null> {
    const normalized = address.toLowerCase();
    const balance = await db
      .select()
      .from(kudosBalances)
      .where(eq(kudosBalances.address, normalized))
      .limit(1)
      .then(rows => rows[0] || null);

    return balance;
  }

  /**
   * Get or create balance for an address
   */
  async ensureBalance(address: string): Promise<KudosBalance> {
    const normalized = address.toLowerCase();
    let balance = await this.getBalance(normalized);

    if (!balance) {
      await db.insert(kudosBalances).values({
        address: normalized,
        balance: 0,
      });
      balance = await this.getBalance(normalized);
    }

    return balance!;
  }

  /**
   * Get transfer history for an address
   */
  async getTransferHistory(params: {
    address: string;
    limit?: number;
    offset?: number;
  }): Promise<KudosTransfer[]> {
    const { address, limit = 50, offset = 0 } = params;
    const normalized = address.toLowerCase();

    const transfers = await db
      .select()
      .from(kudosTransfers)
      .where(
        sql`${kudosTransfers.fromAddress} = ${normalized} OR ${kudosTransfers.toAddress} = ${normalized}`
      )
      .orderBy(desc(kudosTransfers.createdAt))
      .limit(limit)
      .offset(offset);

    return transfers;
  }

  /**
   * Get global transfer feed
   */
  async getGlobalTransferFeed(params: {
    limit?: number;
    offset?: number;
  }): Promise<KudosTransfer[]> {
    const { limit = 50, offset = 0 } = params;

    const transfers = await db
      .select()
      .from(kudosTransfers)
      .orderBy(desc(kudosTransfers.createdAt))
      .limit(limit)
      .offset(offset);

    return transfers;
  }

  /**
   * Calculate weighted KUDOS transfers for edge boosting
   * Uses exponential decay: weight = amount * e^(-age_days / halflife)
   */
  async calculateEdgeWeights(params: {
    fromAddress: string;
    toAddress: string;
  }): Promise<number> {
    const { fromAddress, toAddress } = params;
    const from = fromAddress.toLowerCase();
    const to = toAddress.toLowerCase();

    // Get all transfers from -> to
    const transfers = await db
      .select()
      .from(kudosTransfers)
      .where(
        and(
          eq(kudosTransfers.fromAddress, from),
          eq(kudosTransfers.toAddress, to)
        )
      );

    if (transfers.length === 0) {
      return 0;
    }

    const now = Date.now();
    const halfliveMs = EDGE_BOOST_HALFLIFE_DAYS * 24 * 60 * 60 * 1000;

    // Calculate weighted sum with exponential decay
    let totalWeight = 0;
    for (const transfer of transfers) {
      const ageMs = now - transfer.createdAt.getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const decayFactor = Math.exp(-ageDays / EDGE_BOOST_HALFLIFE_DAYS);
      totalWeight += transfer.amount * decayFactor;
    }

    return totalWeight;
  }

  /**
   * Get daily stats for a specific date
   */
  async getDailyStats(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    const stats = await db
      .select()
      .from(kudosDailyStats)
      .where(eq(kudosDailyStats.date, normalized))
      .limit(1)
      .then(rows => rows[0] || null);

    return stats;
  }

  /**
   * Get available claim amount for today
   */
  async getAvailableClaimAmount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.getDailyStats(today);
    
    if (!stats) {
      return DAILY_CLAIM_CAP;
    }

    return Math.max(0, DAILY_CLAIM_CAP - stats.dailyCapUsed + stats.poolAmount);
  }

  /**
   * Check if an address can claim KUDOS
   */
  async canClaim(address: string): Promise<{
    canClaim: boolean;
    reason?: string;
    nextClaimDate?: Date;
  }> {
    const normalized = address.toLowerCase();
    const balance = await this.getBalance(normalized);

    if (!balance || !balance.lastClaimAt) {
      return { canClaim: true };
    }

    const lastClaimDate = new Date(balance.lastClaimAt);
    const now = new Date();
    const daysSinceLastClaim =
      (now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastClaim < CLAIM_COOLDOWN_DAYS) {
      const nextClaimDate = new Date(lastClaimDate);
      nextClaimDate.setDate(nextClaimDate.getDate() + CLAIM_COOLDOWN_DAYS);
      
      return {
        canClaim: false,
        reason: `Must wait ${CLAIM_COOLDOWN_DAYS} days between claims`,
        nextClaimDate,
      };
    }

    return { canClaim: true };
  }

  /**
   * Claim KUDOS based on LocalHealth score (computed server-side)
   * Amount = min(score^2 / 100, availableToday)
   */
  async claim(params: {
    address: string;
  }): Promise<{
    success: boolean;
    claimed?: number;
    localHealthScore?: number;
    error?: string;
  }> {
    const { address } = params;
    const normalized = address.toLowerCase();

    // Check cooldown
    const claimCheck = await this.canClaim(normalized);
    if (!claimCheck.canClaim) {
      return { success: false, error: claimCheck.reason };
    }

    // Compute LocalHealth score server-side
    const { storage } = await import("../storage");
    const { EgoScorer } = await import("../algorithm/egoScoring");
    const { publicEndorsements } = await import("@shared/schema");
    
    try {
      // Get or create ego context
      const egoContext = await storage.getOrCreateEgoContext(normalized);
      
      // Get seeds (owner + co-seeds)
      const coSeeds = await storage.getCoSeeds(egoContext.id);
      const seedAddresses = [
        normalized,
        ...coSeeds.map(cs => cs.address.toLowerCase())
      ];

      // Get global endorsements
      const endorsements = await db
        .select()
        .from(publicEndorsements)
        .where(eq(publicEndorsements.scope, 'global'))
        .then(rows => 
          rows.map(e => ({
            endorser: e.endorser.toLowerCase() as any,
            endorsee: e.endorsee.toLowerCase() as any,
          }))
        );

      // Calculate KUDOS boosts for all edges
      const uniqueEdges = new Set<string>();
      for (const e of endorsements) {
        uniqueEdges.add(`${e.endorser}->${e.endorsee}`);
      }

      const kudosBoosts = [];
      for (const edgeKey of Array.from(uniqueEdges)) {
        const [from, to] = edgeKey.split('->');
        const weight = await this.calculateEdgeWeights({ fromAddress: from, toAddress: to });
        if (weight > 0) {
          kudosBoosts.push({ fromAddress: from as any, toAddress: to as any, weight });
        }
      }

      // Compute LocalHealth
      const scorer = new EgoScorer();
      const result = scorer.computeLocalHealth(
        normalized as any,
        seedAddresses as any,
        endorsements,
        kudosBoosts
      );

      const localHealthScore = result.localHealth;

      // Validate score
      if (localHealthScore < 0 || localHealthScore > 100) {
        return { success: false, error: "Invalid LocalHealth score computed" };
      }

      // Calculate claimable amount: score^2 / 100
      const baseClaimAmount = (localHealthScore * localHealthScore) / 100;

      if (baseClaimAmount <= 0) {
        return { success: false, error: "Score too low to claim" };
      }

      // Execute claim transaction
      return await db.transaction(async (tx) => {
        // Get available claim amount
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let stats = await tx
          .select()
          .from(kudosDailyStats)
          .where(eq(kudosDailyStats.date, today))
          .limit(1)
          .then(rows => rows[0] || null);

        // Calculate available (cap + pool - used)
        const capRemaining = DAILY_CLAIM_CAP - (stats?.dailyCapUsed || 0);
        const poolAmount = stats?.poolAmount || 0;
        const available = capRemaining + poolAmount;

        if (available <= 0) {
          return { success: false, error: "Daily claim cap reached" };
        }

        // Actual claim amount (capped by available)
        const claimedAmount = Math.min(baseClaimAmount, available);

        // Update or create balance
        let balance = await tx
          .select()
          .from(kudosBalances)
          .where(eq(kudosBalances.address, normalized))
          .limit(1)
          .then(rows => rows[0]);

        if (balance) {
          await tx
            .update(kudosBalances)
            .set({
              balance: sql`${kudosBalances.balance} + ${claimedAmount}`,
              totalClaimed: sql`${kudosBalances.totalClaimed} + ${claimedAmount}`,
              lastClaimAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(kudosBalances.address, normalized));
        } else {
          await tx.insert(kudosBalances).values({
            address: normalized,
            balance: claimedAmount,
            totalClaimed: claimedAmount,
            lastClaimAt: new Date(),
          });
        }

        // Record claim
        await tx.insert(kudosClaims).values({
          address: normalized,
          amount: claimedAmount,
          localHealthScore,
          claimDate: new Date(),
        });

        // Update daily stats
        if (stats) {
          // Deduct from pool first, then from cap
          const fromPool = Math.min(claimedAmount, poolAmount);
          const fromCap = claimedAmount - fromPool;

          await tx
            .update(kudosDailyStats)
            .set({
              totalMinted: sql`${kudosDailyStats.totalMinted} + ${claimedAmount}`,
              dailyCapUsed: sql`${kudosDailyStats.dailyCapUsed} + ${fromCap}`,
              poolAmount: sql`${kudosDailyStats.poolAmount} - ${fromPool}`,
              uniqueClaimers: sql`${kudosDailyStats.uniqueClaimers} + 1`,
            })
            .where(eq(kudosDailyStats.date, today));
        } else {
          await tx.insert(kudosDailyStats).values({
            date: today,
            totalMinted: claimedAmount,
            dailyCapUsed: claimedAmount,
            uniqueClaimers: 1,
          });
        }

        return { success: true, claimed: claimedAmount, localHealthScore };
      });
    } catch (error) {
      console.error("KUDOS claim error:", error);
      return { success: false, error: "Claim failed" };
    }
  }

  /**
   * Get claim history for an address
   */
  async getClaimHistory(params: {
    address: string;
    limit?: number;
    offset?: number;
  }) {
    const { address, limit = 50, offset = 0 } = params;
    const normalized = address.toLowerCase();

    const claims = await db
      .select()
      .from(kudosClaims)
      .where(eq(kudosClaims.address, normalized))
      .orderBy(desc(kudosClaims.claimDate))
      .limit(limit)
      .offset(offset);

    return claims;
  }
}

export const kudosService = new KudosService();
