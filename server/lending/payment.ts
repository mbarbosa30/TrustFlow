import { storage } from "../storage";
import type { Loan, Installment } from "@shared/schema";
import { calculateEffectiveInterest, executeDefaultWaterfall } from "./subsidies";

export interface PaymentResult {
  installmentId: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  subsidiesApplied: {
    ibdApplied: number;
    voucherApplied: number;
  };
  assistRepaymentsProcessed: {
    assistId: number;
    amountRepaid: number;
  }[];
  newStatus: string;
  remainingBalance: number;
}

export interface LateCheck {
  installmentId: number;
  daysOverdue: number;
  status: "GRACE" | "LATE" | "DEFAULT";
  actionTaken: string;
}

const GRACE_PERIOD_DAYS = 5;
const LATE_THRESHOLD_DAYS = 7;
const DEFAULT_THRESHOLD_DAYS = 60;

/**
 * Process payment for an installment
 * Applies subsidies, handles RA repayments, updates status
 */
export async function processInstallmentPayment(
  installmentId: number,
  paymentAmountUsdc: number
): Promise<PaymentResult> {
  const installment = await storage.getInstallmentById(installmentId);
  
  if (!installment) {
    throw new Error(`Installment ${installmentId} not found`);
  }

  if (installment.status === "PAID") {
    throw new Error("Installment is already paid");
  }

  // Calculate effective interest after subsidies
  const effectiveInterest = await calculateEffectiveInterest(
    installment.loanId,
    installment.idx,
    installment.interestDue
  );

  // Calculate what borrower actually owes
  const borrowerInterest = effectiveInterest.effectiveInterest;
  const totalDueFromBorrower = installment.principalDue + borrowerInterest;
  const alreadyPaid = installment.totalPaid;
  const remainingDue = totalDueFromBorrower - alreadyPaid;

  let amountToApply = Math.min(paymentAmountUsdc, remainingDue);
  let remainingPayment = amountToApply;

  // NOTE: Old Repay-Assist repayment logic removed
  // New USDC assists apply credits directly to subsidy_ledger.ibdApplied
  // which is already accounted for in calculateEffectiveInterest()
  
  // Pay installment (principal + interest)
  let principalPaid = 0;
  let interestPaid = 0;

  if (remainingPayment > 0) {
    // Pay interest first, then principal
    const interestRemaining = borrowerInterest - installment.interestPaid;
    interestPaid = Math.min(remainingPayment, interestRemaining);
    remainingPayment -= interestPaid;

    if (remainingPayment > 0) {
      const principalRemaining = installment.principalDue - installment.principalPaid;
      principalPaid = Math.min(remainingPayment, principalRemaining);
      remainingPayment -= principalPaid;
    }
  }

  // Update installment
  const newPrincipalPaid = installment.principalPaid + principalPaid;
  const newInterestPaid = installment.interestPaid + interestPaid;
  const newTotalPaid = newPrincipalPaid + newInterestPaid;

  const isPaid = newTotalPaid >= totalDueFromBorrower;
  const newStatus = isPaid ? "PAID" : installment.status;

  // Set paidAt on first payment (partial or full), preserve existing paidAt for subsequent payments
  const shouldSetPaidAt = !installment.paidAt && (principalPaid > 0 || interestPaid > 0);

  await storage.updateInstallment(installmentId, {
    principalPaid: newPrincipalPaid,
    interestPaid: newInterestPaid,
    totalPaid: newTotalPaid,
    status: newStatus,
    ...(shouldSetPaidAt && { paidAt: new Date() }),
  });

  return {
    installmentId,
    amountPaid: amountToApply,
    principalPaid,
    interestPaid,
    subsidiesApplied: {
      ibdApplied: effectiveInterest.ibdApplied,
      voucherApplied: effectiveInterest.voucherApplied,
    },
    assistRepaymentsProcessed: [], // Old RA model removed - assists apply via subsidy ledger
    newStatus,
    remainingBalance: totalDueFromBorrower - newTotalPaid,
  };
}

/**
 * Check all installments for late/default status
 * Run this daily via cron job
 */
export async function checkLateInstallments(
  communityId: number
): Promise<LateCheck[]> {
  const activeLoans = await storage.getLoansByCommunity(communityId);
  const results: LateCheck[] = [];

  const now = new Date();

  for (const loan of activeLoans) {
    if (loan.status !== "ACTIVE") continue;

    const installments = await storage.getInstallmentsByLoan(loan.id);

    for (const installment of installments) {
      if (installment.status === "PAID") continue;

      const daysOverdue = Math.floor(
        (now.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) continue; // Not due yet

      let newStatus = installment.status;
      let actionTaken = "none";

      if (daysOverdue >= DEFAULT_THRESHOLD_DAYS && installment.status !== "DEFAULTED") {
        // Trigger default
        newStatus = "DEFAULTED";
        actionTaken = "marked_defaulted";

        await storage.updateInstallment(installment.id, {
          status: "DEFAULTED",
        });

        await storage.updateLoanStatus(loan.id, "DEFAULTED");

        // Execute waterfall
        const totalDue = installments.reduce((sum, i) => sum + i.totalDue, 0);
        const totalPaid = installments.reduce((sum, i) => sum + i.totalPaid, 0);
        const totalLoss = totalDue - totalPaid;

        if (totalLoss > 0) {
          await executeDefaultWaterfall(loan.id, loan.communityId, totalLoss);
        }
      } else if (daysOverdue >= LATE_THRESHOLD_DAYS && installment.status === "PENDING") {
        // Mark as late
        newStatus = "LATE";
        actionTaken = "marked_late";

        await storage.updateInstallment(installment.id, {
          status: "LATE",
        });
      } else if (daysOverdue > 0 && daysOverdue < GRACE_PERIOD_DAYS) {
        actionTaken = "grace_period";
      }

      results.push({
        installmentId: installment.id,
        daysOverdue,
        status:
          daysOverdue >= DEFAULT_THRESHOLD_DAYS
            ? "DEFAULT"
            : daysOverdue >= LATE_THRESHOLD_DAYS
            ? "LATE"
            : "GRACE",
        actionTaken,
      });
    }
  }

  return results;
}

export interface InstallmentWithSubsidies extends Installment {
  subsidies: {
    ibdApplied: number;
    voucherApplied: number;
    effectiveInterest: number;
    originalInterest: number;
  };
}

/**
 * Get loan status with payment progress and subsidy information
 */
export async function getLoanPaymentStatus(loanId: number): Promise<{
  loan: Loan;
  totalDue: number; // Subsidized total (what borrower actually owes)
  totalDueOriginal: number; // Original total before subsidies
  totalPaid: number;
  remainingBalance: number; // Based on subsidized total
  nextInstallment: InstallmentWithSubsidies | null;
  daysOverdue: number;
  installments: InstallmentWithSubsidies[];
}> {
  const loan = await storage.getLoan(loanId);
  
  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const installments = await storage.getInstallmentsByLoan(loanId);

  // Enrich installments with subsidy information
  const enrichedInstallments: InstallmentWithSubsidies[] = await Promise.all(
    installments.map(async (inst) => {
      const effectiveInterest = await calculateEffectiveInterest(
        loanId,
        inst.idx,
        inst.interestDue
      );

      return {
        ...inst,
        subsidies: {
          ibdApplied: effectiveInterest.ibdApplied,
          voucherApplied: effectiveInterest.voucherApplied,
          effectiveInterest: effectiveInterest.effectiveInterest,
          originalInterest: inst.interestDue,
        },
      };
    })
  );

  // Calculate totals both with and without subsidies
  const totalDueOriginal = installments.reduce((sum, i) => sum + i.totalDue, 0);
  const totalPaid = installments.reduce((sum, i) => sum + i.totalPaid, 0);
  
  // Calculate subsidized total (what borrower actually owes)
  const totalDueSubsidized = enrichedInstallments.reduce(
    (sum, i) => sum + i.principalDue + i.subsidies.effectiveInterest, 
    0
  );
  
  // Remaining balance should be based on subsidized total
  const remainingBalance = totalDueSubsidized - totalPaid;

  const nextInstallment = enrichedInstallments
    .filter((i) => i.status !== "PAID")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] || null;

  let daysOverdue = 0;
  if (nextInstallment) {
    daysOverdue = Math.max(
      0,
      Math.floor(
        (new Date().getTime() - nextInstallment.dueDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  return {
    loan,
    totalDue: totalDueSubsidized, // What borrower actually owes
    totalDueOriginal, // Original amount before subsidies
    totalPaid,
    remainingBalance, // Based on subsidized total
    nextInstallment,
    daysOverdue,
    installments: enrichedInstallments,
  };
}

/**
 * Mark loan as paid when all installments are complete
 */
export async function checkLoanCompletion(loanId: number): Promise<boolean> {
  const loan = await storage.getLoan(loanId);
  
  if (!loan || loan.status !== "ACTIVE") {
    return false;
  }

  const installments = await storage.getInstallmentsByLoan(loanId);
  const allPaid = installments.every((i) => i.status === "PAID");

  if (allPaid) {
    await storage.updateLoanStatus(loanId, "PAID");
    return true;
  }

  return false;
}
