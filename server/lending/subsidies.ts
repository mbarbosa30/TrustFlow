import { storage } from "../storage";
import type { InsertSubsidyLedger, InsertAssist, InsertGuarantee } from "@shared/schema";

export interface IBDContribution {
  loanId: number;
  installmentIdx: number;
  amountUsdc: number; // Amount to apply to interest
}

export interface RAIntervention {
  installmentId: number;
  supporterAddress: string;
  amountUsdc: number; // Amount to cover
  premiumRate: number; // e.g., 0.06 for 6%
}

export interface VoucherApplication {
  loanId: number;
  installmentIdx: number;
  amountUsdc: number; // Interest amount to waive
}

/**
 * Apply Interest Buy-Down (IBD) to an installment
 * Reduces the effective interest rate by applying subsidy funds
 */
export async function applyInterestBuyDown(
  contribution: IBDContribution
): Promise<void> {
  const { loanId, installmentIdx, amountUsdc } = contribution;

  // Get or create subsidy ledger for this installment
  let ledger = await storage.getSubsidyLedger(loanId, installmentIdx);

  if (!ledger) {
    const newLedger: InsertSubsidyLedger = {
      loanId,
      installmentIdx,
      ibdApplied: amountUsdc,
      voucherApplied: 0,
      assistCovered: 0,
      assistPremium: 0,
    };
    await storage.createSubsidyLedger(newLedger);
  } else {
    await storage.updateSubsidyLedger(ledger.id, {
      ibdApplied: ledger.ibdApplied + amountUsdc,
    });
  }

  // TODO: Transfer USDC from IBD pool to loan account via EIP-3009
}

/**
 * Apply Interest Voucher to an installment
 * Waives interest entirely (typically first N months)
 */
export async function applyInterestVoucher(
  voucher: VoucherApplication
): Promise<void> {
  const { loanId, installmentIdx, amountUsdc } = voucher;

  // Get or create subsidy ledger for this installment
  let ledger = await storage.getSubsidyLedger(loanId, installmentIdx);

  if (!ledger) {
    const newLedger: InsertSubsidyLedger = {
      loanId,
      installmentIdx,
      ibdApplied: 0,
      voucherApplied: amountUsdc,
      assistCovered: 0,
      assistPremium: 0,
    };
    await storage.createSubsidyLedger(newLedger);
  } else {
    await storage.updateSubsidyLedger(ledger.id, {
      voucherApplied: ledger.voucherApplied + amountUsdc,
    });
  }
}

/**
 * Create Repay-Assist intervention when supporter covers late installment
 * Records the intervention and updates installment status
 */
export async function createRepayAssist(
  intervention: RAIntervention
): Promise<number> {
  const { installmentId, supporterAddress, amountUsdc, premiumRate } = intervention;

  const installment = await storage.getInstallmentById(installmentId);
  
  if (!installment) {
    throw new Error(`Installment ${installmentId} not found`);
  }

  if (installment.status !== "LATE") {
    throw new Error(`Installment is not late (status: ${installment.status})`);
  }

  const normalizedAddress = supporterAddress.toLowerCase();
  const totalClaim = amountUsdc * (1 + premiumRate);

  // Create assist record
  const assistRecord: InsertAssist = {
    loanId: installment.loanId,
    installmentIdx: installment.idx,
    supporterAddress: normalizedAddress,
    amountUsdc,
    premiumRate,
    totalClaim,
    amountRepaid: 0,
    status: "OPEN",
  };

  const assistId = await storage.createAssist(assistRecord);

  // Update subsidy ledger
  let ledger = await storage.getSubsidyLedger(
    installment.loanId,
    installment.idx
  );

  if (!ledger) {
    const newLedger: InsertSubsidyLedger = {
      loanId: installment.loanId,
      installmentIdx: installment.idx,
      ibdApplied: 0,
      voucherApplied: 0,
      assistCovered: amountUsdc,
      assistPremium: totalClaim - amountUsdc,
    };
    await storage.createSubsidyLedger(newLedger);
  } else {
    await storage.updateSubsidyLedger(ledger.id, {
      assistCovered: ledger.assistCovered + amountUsdc,
      assistPremium: ledger.assistPremium + (totalClaim - amountUsdc),
    });
  }

  // Mark installment as paid (covered by assist)
  await storage.updateInstallment(installmentId, {
    totalPaid: installment.totalDue,
    principalPaid: installment.principalDue,
    interestPaid: installment.interestDue,
    status: "PAID",
    paidAt: new Date(),
  });

  // TODO: Transfer USDC from supporter to loan account via EIP-3009

  return assistId;
}

/**
 * Initialize First-Loss Guarantee pool for a community
 * Creates a safety net that covers defaults before affecting the general pool
 */
export async function initializeGuaranteePool(
  communityId: number,
  capUsdc: number
): Promise<void> {
  const existing = await storage.getGuarantee(communityId);
  
  if (existing) {
    throw new Error(`Guarantee pool already exists for community ${communityId}`);
  }

  const guaranteeRecord: InsertGuarantee = {
    communityId,
    capUsdc,
    capRemaining: capUsdc,
  };

  await storage.createGuarantee(guaranteeRecord);

  // TODO: Lock USDC in guarantee escrow via EIP-3009
}

/**
 * Use guarantee pool to cover default losses
 * Called when a loan defaults - waterfall: Guarantee → RA claims → Pool loss
 */
export async function useGuaranteePool(
  communityId: number,
  amountUsdc: number
): Promise<{
  covered: number;
  remaining: number;
}> {
  const guarantee = await storage.getGuarantee(communityId);
  
  if (!guarantee) {
    return { covered: 0, remaining: amountUsdc };
  }

  const covered = Math.min(guarantee.capRemaining, amountUsdc);
  const newRemaining = guarantee.capRemaining - covered;

  await storage.updateGuarantee(communityId, {
    capRemaining: newRemaining,
  });

  return {
    covered,
    remaining: amountUsdc - covered,
  };
}

/**
 * Calculate effective interest after subsidies for an installment
 * Applies IBD and Vouchers in order
 */
export async function calculateEffectiveInterest(
  loanId: number,
  installmentIdx: number,
  baseInterest: number
): Promise<{
  effectiveInterest: number;
  ibdApplied: number;
  voucherApplied: number;
}> {
  const ledger = await storage.getSubsidyLedger(loanId, installmentIdx);

  if (!ledger) {
    return {
      effectiveInterest: baseInterest,
      ibdApplied: 0,
      voucherApplied: 0,
    };
  }

  // Vouchers waive interest entirely (applied first)
  if (ledger.voucherApplied > 0) {
    return {
      effectiveInterest: 0,
      ibdApplied: 0,
      voucherApplied: baseInterest,
    };
  }

  // IBD reduces interest
  const ibdApplied = Math.min(ledger.ibdApplied, baseInterest);
  const effectiveInterest = baseInterest - ibdApplied;

  return {
    effectiveInterest,
    ibdApplied,
    voucherApplied: 0,
  };
}

/**
 * Repay Repay-Assist claim when borrower makes payment
 * Priority: RA claims get repaid first (with premium)
 */
export async function repayAssistClaim(
  assistId: number,
  amountUsdc: number
): Promise<{
  repaid: number;
  remaining: number;
}> {
  const assistRecord = await storage.getAssist(assistId);
  
  if (!assistRecord) {
    throw new Error(`Assist record ${assistId} not found`);
  }

  if (assistRecord.status !== "OPEN") {
    throw new Error(`Assist is not open (status: ${assistRecord.status})`);
  }

  const outstanding = assistRecord.totalClaim - assistRecord.amountRepaid;
  const toRepay = Math.min(amountUsdc, outstanding);
  const newAmountRepaid = assistRecord.amountRepaid + toRepay;

  const newStatus = newAmountRepaid >= assistRecord.totalClaim ? "REPAID" : "OPEN";

  await storage.updateAssist(assistId, {
    amountRepaid: newAmountRepaid,
    status: newStatus,
    ...(newStatus === "REPAID" && { repaidAt: new Date() }),
  });

  // TODO: Transfer USDC to supporter via EIP-3009

  return {
    repaid: toRepay,
    remaining: amountUsdc - toRepay,
  };
}

/**
 * Execute waterfall when loan defaults
 * Order: First-Loss Guarantee → RA claims marked as lost → Pool absorbs remainder
 */
export async function executeDefaultWaterfall(
  loanId: number,
  communityId: number,
  totalLoss: number
): Promise<{
  guaranteeCovered: number;
  raWriteOff: number;
  poolLoss: number;
}> {
  let remainingLoss = totalLoss;
  let guaranteeCovered = 0;
  let raWriteOff = 0;

  // Step 1: Apply First-Loss Guarantee
  const guaranteeResult = await useGuaranteePool(communityId, remainingLoss);
  guaranteeCovered = guaranteeResult.covered;
  remainingLoss = guaranteeResult.remaining;

  // Step 2: Write off RA claims
  if (remainingLoss > 0) {
    const assists = await storage.getAssistsByLoan(loanId);
    const openAssists = assists.filter((a) => a.status === "OPEN");

    for (const assist of openAssists) {
      if (remainingLoss <= 0) break;

      const outstanding = assist.totalClaim - assist.amountRepaid;
      const writeOff = Math.min(outstanding, remainingLoss);

      await storage.updateAssist(assist.id, {
        status: "LOST",
      });

      raWriteOff += writeOff;
      remainingLoss -= writeOff;
    }
  }

  // Step 3: Pool absorbs remaining loss
  const poolLoss = remainingLoss;

  return {
    guaranteeCovered,
    raWriteOff,
    poolLoss,
  };
}
