import { storage } from "../storage";
import type { Loan, Installment } from "@shared/schema";
import { calculateEffectiveInterest, repayAssistClaim, executeDefaultWaterfall } from "./subsidies";

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

  // Priority 1: Repay outstanding RA claims first (with premium)
  const assists = await storage.getAssistsByLoan(installment.loanId);
  const installmentAssists = assists.filter(
    (a) => a.installmentIdx === installment.idx && a.status === "OPEN"
  );

  const assistRepayments: { assistId: number; amountRepaid: number }[] = [];

  for (const assist of installmentAssists) {
    if (remainingPayment <= 0) break;

    const repayResult = await repayAssistClaim(assist.id, remainingPayment);
    
    assistRepayments.push({
      assistId: assist.id,
      amountRepaid: repayResult.repaid,
    });

    remainingPayment = repayResult.remaining;
  }

  // Priority 2: Pay remaining installment (principal + interest)
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

  await storage.updateInstallment(installmentId, {
    principalPaid: newPrincipalPaid,
    interestPaid: newInterestPaid,
    totalPaid: newTotalPaid,
    status: newStatus,
    ...(isPaid && { paidAt: new Date() }),
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
    assistRepaymentsProcessed: assistRepayments,
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

/**
 * Get loan status with payment progress
 */
export async function getLoanPaymentStatus(loanId: number): Promise<{
  loan: Loan;
  totalDue: number;
  totalPaid: number;
  remainingBalance: number;
  nextInstallment: Installment | null;
  daysOverdue: number;
  installments: Installment[];
}> {
  const loan = await storage.getLoan(loanId);
  
  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  const installments = await storage.getInstallmentsByLoan(loanId);

  const totalDue = installments.reduce((sum, i) => sum + i.totalDue, 0);
  const totalPaid = installments.reduce((sum, i) => sum + i.totalPaid, 0);
  const remainingBalance = totalDue - totalPaid;

  const nextInstallment = installments
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
    totalDue,
    totalPaid,
    remainingBalance,
    nextInstallment,
    daysOverdue,
    installments,
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
