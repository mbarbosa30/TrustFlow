import { storage } from "../storage";
import type { InsertLoan, InsertInstallment, InsertSubsidyLedger, Loan, Installment } from "@shared/schema";

export interface LoanRequest {
  communityId: number;
  borrowerAddress: string;
  principalUsdc: number; // Amount (despite name, can be ARS/USDC/etc)
  currency?: string; // 'ARS' | 'USDC' | 'USD' | etc (defaults to ARS)
  tenorMonths: number;
  aprNominal: number;
  notes?: string | null; // Borrower's explanation for loan purpose
}

export interface LoanWithInstallments {
  loan: Loan;
  installments: Installment[];
}

/**
 * Calculate equal monthly installment using amortization formula
 * 
 * Formula: PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
 * Where:
 *   P = principal
 *   r = monthly interest rate (APR / 12)
 *   n = number of months
 */
function calculateMonthlyPayment(
  principal: number,
  aprNominal: number,
  tenorMonths: number
): number {
  const monthlyRate = aprNominal / 12;
  
  if (monthlyRate === 0) {
    return principal / tenorMonths;
  }
  
  const denominator = Math.pow(1 + monthlyRate, tenorMonths) - 1;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, tenorMonths);
  
  return principal * (numerator / denominator);
}

/**
 * Calculate current debt including accrued interest to date
 * Returns the remaining principal plus interest that has accumulated
 */
function calculateCurrentDebt(
  principal: number,
  aprNominal: number,
  tenorMonths: number,
  disbursedAt: Date,
  totalPaid: number
): {
  currentDebt: number;
  principalRemaining: number;
  interestAccrued: number;
  totalExpected: number;
} {
  const schedule = generateInstallmentSchedule(principal, aprNominal, tenorMonths, disbursedAt);
  const monthlyPayment = calculateMonthlyPayment(principal, aprNominal, tenorMonths);
  const now = new Date();
  
  // Apply payments in order (interest first for due installments, principal only for future ones)
  let remainingPayment = totalPaid;
  let totalPrincipalPaid = 0;
  let interestPaidOnDueInstallments = 0;
  let totalInterestDue = 0;
  
  for (const installment of schedule) {
    const isDue = installment.dueDate <= now;
    
    if (isDue) {
      totalInterestDue += installment.interestDue;
    }
    
    if (remainingPayment <= 0) continue;
    
    if (isDue) {
      // For due installments: pay interest first, then principal
      const interestPayment = Math.min(remainingPayment, installment.interestDue);
      interestPaidOnDueInstallments += interestPayment;
      remainingPayment -= interestPayment;
      
      if (remainingPayment > 0) {
        const principalPayment = Math.min(remainingPayment, installment.principalDue);
        totalPrincipalPaid += principalPayment;
        remainingPayment -= principalPayment;
      }
    } else {
      // For future installments: apply surplus to principal only (advance payment)
      const principalPayment = Math.min(remainingPayment, installment.principalDue);
      totalPrincipalPaid += principalPayment;
      remainingPayment -= principalPayment;
    }
  }
  
  // Principal remaining = original principal - all principal paid (including advance payments)
  const principalRemaining = Math.max(0, principal - totalPrincipalPaid);
  
  // Interest accrued = interest due to date - interest paid on due installments
  const interestAccrued = Math.max(0, totalInterestDue - interestPaidOnDueInstallments);
  
  // Current debt = unpaid principal + accrued unpaid interest
  const currentDebt = principalRemaining + interestAccrued;
  
  const totalExpected = monthlyPayment * tenorMonths;
  
  return {
    currentDebt: Math.round(currentDebt * 100) / 100,
    principalRemaining: Math.round(principalRemaining * 100) / 100,
    interestAccrued: Math.round(interestAccrued * 100) / 100,
    totalExpected: Math.round(totalExpected * 100) / 100,
  };
}

/**
 * Calculate loan health metrics for risk assessment
 */
function calculateLoanHealth(
  loan: Loan,
  totalPaid: number
): {
  healthScore: number; // 0-100, higher is better
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  paymentProgress: number; // 0-1, percentage of expected payments made
  timeProgress: number; // 0-1, percentage of loan term elapsed
  isAtRisk: boolean;
} {
  if (!loan.disbursedAt) {
    return {
      healthScore: 0,
      riskLevel: 'critical',
      paymentProgress: 0,
      timeProgress: 0,
      isAtRisk: true,
    };
  }
  
  const schedule = generateInstallmentSchedule(
    loan.principalUsdc,
    loan.aprNominal,
    loan.tenorMonths,
    new Date(loan.disbursedAt)
  );
  
  const totalExpected = schedule.reduce((sum, inst) => sum + inst.totalDue, 0);
  const paymentProgress = Math.min(1, totalPaid / totalExpected);
  
  const startDate = new Date(loan.disbursedAt);
  const endDate = schedule[schedule.length - 1].dueDate;
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = Date.now() - startDate.getTime();
  const timeProgress = Math.min(1, Math.max(0, elapsed / totalDuration));
  
  // Health score: payment progress should match or exceed time progress
  // If paymentProgress >= timeProgress, score is 80-100
  // If paymentProgress < timeProgress, score decreases proportionally
  const progressRatio = timeProgress > 0 ? paymentProgress / timeProgress : 1;
  let healthScore = Math.min(100, Math.max(0, progressRatio * 100));
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (healthScore >= 80) riskLevel = 'low';
  else if (healthScore >= 60) riskLevel = 'medium';
  else if (healthScore >= 40) riskLevel = 'high';
  else riskLevel = 'critical';
  
  // At risk if payment progress is significantly behind time progress
  const isAtRisk = paymentProgress < timeProgress * 0.8;
  
  return {
    healthScore: Math.round(healthScore),
    riskLevel,
    paymentProgress,
    timeProgress,
    isAtRisk,
  };
}

/**
 * Generate installment schedule with principal/interest breakdown
 */
export function generateInstallmentSchedule(
  principal: number,
  aprNominal: number,
  tenorMonths: number,
  startDate: Date = new Date()
): Array<{
  idx: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  remainingBalance: number;
}> {
  const monthlyPayment = calculateMonthlyPayment(principal, aprNominal, tenorMonths);
  const monthlyRate = aprNominal / 12;
  
  let remainingBalance = principal;
  const schedule = [];
  
  for (let i = 0; i < tenorMonths; i++) {
    // Interest on remaining balance
    const interestDue = remainingBalance * monthlyRate;
    
    // Principal = payment - interest
    let principalDue = monthlyPayment - interestDue;
    
    // Last payment: adjust for rounding
    if (i === tenorMonths - 1) {
      principalDue = remainingBalance;
    }
    
    // Due date is (i+1) months from start
    // Normalize to avoid month-end overflow (e.g., Jan 31 → Mar 3)
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, startDate.getDate());
    
    // If we overflowed into next month (e.g., Jan 31 → Mar 3), go back to last day of previous month
    if (dueDate.getDate() !== startDate.getDate()) {
      dueDate.setDate(0); // Go to last day of previous month
    }
    
    schedule.push({
      idx: i,
      dueDate,
      principalDue: Math.round(principalDue * 100) / 100,
      interestDue: Math.round(interestDue * 100) / 100,
      totalDue: Math.round((principalDue + interestDue) * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    });
    
    remainingBalance -= principalDue;
  }
  
  return schedule;
}

/**
 * Create a new loan with installment schedule in a single transaction
 * Note: This does NOT disburse funds - that happens separately via EIP-3009
 */
export async function createLoan(
  request: LoanRequest
): Promise<LoanWithInstallments> {
  const { communityId, borrowerAddress, principalUsdc, currency = 'ARS', tenorMonths, aprNominal, notes } = request;
  
  // Use a transaction to ensure atomicity - either both loan and installments are created, or neither
  return await storage.createLoanWithInstallments({
    loanData: {
      communityId,
      borrowerAddress: borrowerAddress.toLowerCase(),
      principalUsdc,
      currency,
      aprNominal,
      tenorMonths,
      status: 'PENDING_APPROVAL', // Loan requires manager approval before activation
      notes: notes || null,
      disbursedAt: null, // Will be set when approved
    },
    principalUsdc,
    aprNominal,
    tenorMonths,
  });
}

/**
 * Approve a loan application and activate it
 */
export async function approveLoan(loanId: number, reviewerAddress: string): Promise<Loan> {
  const existingLoan = await storage.getLoan(loanId);
  if (!existingLoan) {
    throw new Error("Loan not found");
  }
  
  if (existingLoan.status !== 'PENDING_APPROVAL') {
    throw new Error("Loan is not pending approval");
  }
  
  // Update loan status to ACTIVE and set disbursement date
  await storage.updateLoanStatus(loanId, 'ACTIVE');
  
  // Get updated loan
  const updatedLoan = await storage.getLoan(loanId);
  if (!updatedLoan) {
    throw new Error("Failed to retrieve updated loan");
  }
  
  return updatedLoan;
}

/**
 * Reject a loan application
 */
export async function rejectLoan(loanId: number, reviewerAddress: string, reason?: string): Promise<void> {
  const existingLoan = await storage.getLoan(loanId);
  if (!existingLoan) {
    throw new Error("Loan not found");
  }
  
  if (existingLoan.status !== 'PENDING_APPROVAL') {
    throw new Error("Loan is not pending approval");
  }
  
  // Update loan status to REJECTED
  await storage.updateLoanStatus(loanId, 'REJECTED');
}

export {
  calculateMonthlyPayment,
  calculateCurrentDebt,
  calculateLoanHealth,
};
