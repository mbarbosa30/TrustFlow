import { storage } from "../storage";
import type { InsertLoan, InsertInstallment, InsertSubsidyLedger, Loan, Installment } from "@shared/schema";

export interface LoanRequest {
  communityId: number;
  borrowerAddress: string;
  principalUsdc: number; // Amount (despite name, can be ARS/USDC/etc)
  currency?: string; // 'ARS' | 'USDC' | 'USD' | etc (defaults to ARS)
  tenorMonths: number;
  aprNominal: number;
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
  const { communityId, borrowerAddress, principalUsdc, currency = 'ARS', tenorMonths, aprNominal } = request;
  
  // Use a transaction to ensure atomicity - either both loan and installments are created, or neither
  return await storage.createLoanWithInstallments({
    loanData: {
      communityId,
      borrowerAddress: borrowerAddress.toLowerCase(),
      principalUsdc,
      currency,
      aprNominal,
      tenorMonths,
      status: 'ACTIVE',
      disbursedAt: new Date(),
    },
    principalUsdc,
    aprNominal,
    tenorMonths,
  });
}

export {
  calculateMonthlyPayment,
};
