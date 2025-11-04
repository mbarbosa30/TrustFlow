import { Router } from "express";
import { storage } from "../storage";
import { checkLoanEligibility } from "../lending/eligibility";
import { createLoan, approveLoan, rejectLoan, calculateLoanHealth } from "../lending/loan";
import { processLoanPayment, processInstallmentPayment, getLoanPaymentStatus, checkLateInstallments } from "../lending/payment";
import { applyInterestBuyDown, applyInterestVoucher, createRepayAssist, initializeGuaranteePool } from "../lending/subsidies";
import { getUserTrustEventHistory } from "../lending/trust_events";

const router = Router();

// ===== LOAN ENDPOINTS =====

/**
 * Check loan eligibility for a user
 * GET /api/loans/eligibility/:communityId/:userAddress
 */
router.get("/eligibility/:communityId/:userAddress", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const userAddress = req.params.userAddress;

    const result = await checkLoanEligibility(communityId, userAddress);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all active loans for a user across all communities
 * GET /api/loans/user/:userAddress/active
 */
router.get("/user/:userAddress/active", async (req, res) => {
  try {
    const userAddress = req.params.userAddress.toLowerCase();

    // Get all loans for this user across all communities (no communityId filter)
    const allLoans = await storage.getLoansByBorrower(userAddress);
    
    // Filter for active loans only
    const activeLoans = allLoans.filter((loan) => loan.status === "ACTIVE");

    res.json({ 
      hasActiveLoans: activeLoans.length > 0,
      activeLoans 
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get loans by borrower (MUST come before /:loanId to avoid route collision)
 * GET /api/loans/borrower/:communityId/:userAddress
 */
router.get("/borrower/:communityId/:userAddress", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const userAddress = req.params.userAddress.toLowerCase();

    const loans = await storage.getLoansByBorrower(userAddress, communityId);

    res.json({ loans });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all loans for a community (MUST come before /:loanId)
 * GET /api/loans/community/:communityId
 */
router.get("/community/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);

    const loans = await storage.getLoansByCommunity(communityId);

    res.json({ loans });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create a new loan
 * POST /api/loans/:communityId
 * Body: { userAddress, borrowerName, amount, tenorMonths }
 * Amount is in the community's currency (automatically determined)
 */
router.post("/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const { userAddress, borrowerName, amount, amountUsdc, tenorMonths, notes } = req.body;

    // Support both 'amount' (new) and 'amountUsdc' (legacy) for backwards compatibility
    const loanAmount = amount || amountUsdc;

    if (!userAddress || !loanAmount || !tenorMonths) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!borrowerName || !borrowerName.trim()) {
      return res.status(400).json({ error: "Borrower name is required" });
    }

    // Save borrower name to wallet profile (create or update)
    const existingProfile = await storage.getWalletProfile(userAddress);
    if (existingProfile) {
      await storage.updateWalletProfile(userAddress, { name: borrowerName.trim() });
    } else {
      await storage.createWalletProfile({ address: userAddress, name: borrowerName.trim() });
    }

    // Get community to determine currency and lending policy
    const community = await storage.getCommunity(communityId);
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }
    
    const policy = community.lendingPolicyJson as any;
    
    if (!policy || !policy.enabled) {
      return res.status(400).json({ error: "Lending not enabled for this community" });
    }
    
    // Use community's currency
    const currency = community.currency || 'USD';
    
    // Convert APR from percentage to decimal (40 -> 0.40)
    const aprNominal = policy.annualInterestRate ? policy.annualInterestRate / 100 : (policy.aprNominal || 0.40);
    
    const result = await createLoan({
      communityId,
      borrowerAddress: userAddress,
      principalUsdc: loanAmount, // Note: field name is legacy, stores amount in community currency
      currency,
      tenorMonths,
      aprNominal,
      notes: notes || null,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve a pending loan application
 * POST /api/loans/:loanId/approve
 * Body: { reviewerAddress }
 * 
 * SECURITY WARNING: reviewerAddress is currently UNAUTHENTICATED
 * TODO: Add authentication to verify reviewer is community manager
 */
router.post("/:loanId/approve", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const { reviewerAddress } = req.body;

    if (!reviewerAddress) {
      return res.status(400).json({ error: "reviewerAddress is required" });
    }

    // TODO: Verify reviewerAddress is community manager/admin

    const approvedLoan = await approveLoan(loanId, reviewerAddress.toLowerCase());

    res.json({
      success: true,
      message: "Loan application approved",
      loan: approvedLoan
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject a pending loan application
 * POST /api/loans/:loanId/reject
 * Body: { reviewerAddress, reason? }
 * 
 * SECURITY WARNING: reviewerAddress is currently UNAUTHENTICATED
 * TODO: Add authentication to verify reviewer is community manager
 */
router.post("/:loanId/reject", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const { reviewerAddress, reason } = req.body;

    if (!reviewerAddress) {
      return res.status(400).json({ error: "reviewerAddress is required" });
    }

    // TODO: Verify reviewerAddress is community manager/admin

    await rejectLoan(loanId, reviewerAddress.toLowerCase(), reason);

    res.json({
      success: true,
      message: "Loan application rejected"
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get loan details with payment status
 * GET /api/loans/:loanId
 * NOTE: This MUST come after specific routes like /borrower and /community
 */
router.get("/:loanId", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);

    const result = await getLoanPaymentStatus(loanId);

    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Submit a payment for approval
 * POST /api/loans/:loanId/pay
 * Body: { installmentId, amount, payerAddress, proofUrl?, notes? }
 * Amount is in the loan's currency (determined by community)
 * 
 * Creates a pending payment record that requires management approval before application to loan
 * 
 * SECURITY WARNING: payerAddress is currently UNAUTHENTICATED - client can claim any address
 * 
 * TODO: Add wallet signature verification or session-based authentication
 * Production implementation should:
 * 1. Verify EIP-712 signature from payerAddress proving control of private key
 * 2. Or use session middleware that validates authenticated wallet matches payerAddress
 * 3. Current implementation trusts client-provided address - vulnerable to spoofing
 */
router.post("/:loanId/pay", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const { installmentId, amount, amountUsdc, payerAddress, proofUrl, notes } = req.body;

    // Support both 'amount' (new) and 'amountUsdc' (legacy) for backwards compatibility
    const paymentAmount = amount || amountUsdc;

    if (!installmentId || !paymentAmount || !payerAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // TODO: Add signature verification here
    // Example: await verifyEIP712Signature(payerAddress, signature, message)

    // Get loan and installment to verify ownership
    const loan = await storage.getLoan(loanId);
    const installment = await storage.getInstallmentById(installmentId);

    if (!loan || !installment) {
      return res.status(404).json({ error: "Loan or installment not found" });
    }

    if (installment.loanId !== loanId) {
      return res.status(400).json({ error: "Installment does not belong to this loan" });
    }

    // Verify payer is borrower or has an active assist on this installment
    // NOTE: This check is incomplete without signature verification
    const normalizedPayer = payerAddress.toLowerCase();
    const normalizedBorrower = loan.borrowerAddress.toLowerCase();

    if (normalizedPayer !== normalizedBorrower) {
      // Check if payer is a supporter with an active assist
      const allAssists = await storage.getAssistsByLoan(loanId);
      const hasActiveAssist = allAssists.some(
        (a: any) => a.installmentId === installmentId && a.supporterAddress.toLowerCase() === normalizedPayer && a.repaidAt === null
      );

      if (!hasActiveAssist) {
        return res.status(403).json({ 
          error: "Unauthorized: Only the borrower or supporters with active assists can make payments" 
        });
      }
    }

    // Create pending payment record
    const pendingPayment = await storage.createPendingPayment({
      communityId: loan.communityId,
      loanId: loan.id,
      installmentId: installment.id,
      payerAddress: normalizedPayer,
      amount: paymentAmount,
      currency: loan.currency,
      proofUrl: proofUrl || null,
      notes: notes || null,
      status: "PENDING",
    });

    res.json({
      success: true,
      pendingPayment,
      message: "Payment submitted successfully. Awaiting management approval."
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== SUBSIDY ENDPOINTS =====

/**
 * Apply Interest Buy-Down to an installment
 * POST /api/subsidies/ibd
 * Body: { loanId, installmentIdx, amountUsdc }
 */
router.post("/subsidies/ibd", async (req, res) => {
  try {
    const { loanId, installmentIdx, amountUsdc } = req.body;

    if (loanId === undefined || installmentIdx === undefined || !amountUsdc) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await applyInterestBuyDown({ loanId, installmentIdx, amountUsdc });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Apply Interest Voucher to an installment
 * POST /api/subsidies/voucher
 * Body: { loanId, installmentIdx, amountUsdc }
 */
router.post("/subsidies/voucher", async (req, res) => {
  try {
    const { loanId, installmentIdx, amountUsdc } = req.body;

    if (loanId === undefined || installmentIdx === undefined || !amountUsdc) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await applyInterestVoucher({ loanId, installmentIdx, amountUsdc });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create Repay-Assist intervention
 * POST /api/subsidies/assist
 * Body: { installmentId, supporterAddress, amountUsdc, premiumRate }
 */
router.post("/subsidies/assist", async (req, res) => {
  try {
    const { installmentId, supporterAddress, amountUsdc, premiumRate } = req.body;

    if (!installmentId || !supporterAddress || !amountUsdc || premiumRate === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const assistId = await createRepayAssist({
      installmentId,
      supporterAddress,
      amountUsdc,
      premiumRate,
    });

    res.json({ success: true, assistId });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Initialize First-Loss Guarantee pool
 * POST /api/subsidies/guarantee
 * Body: { communityId, capUsdc }
 */
router.post("/subsidies/guarantee", async (req, res) => {
  try {
    const { communityId, capUsdc } = req.body;

    if (!communityId || !capUsdc) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await initializeGuaranteePool(communityId, capUsdc);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== STATISTICS ENDPOINTS =====

/**
 * Get lending statistics for a community
 * GET /api/lending/stats/:communityId
 */
router.get("/stats/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);

    const loans = await storage.getLoansByCommunity(communityId);
    const community = await storage.getCommunity(communityId);
    
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    const totalLoansCount = loans.length;
    const activeLoansCount = loans.filter((l) => l.status === "ACTIVE").length;
    const completedLoansCount = loans.filter((l) => l.status === "PAID").length;
    const defaultedLoansCount = loans.filter((l) => l.status === "DEFAULTED").length;

    const totalDisbursed = loans.reduce((sum, l) => sum + l.principalUsdc, 0);
    const activeVolume = loans
      .filter((l) => l.status === "ACTIVE")
      .reduce((sum, l) => sum + l.principalUsdc, 0);

    // Calculate repayment rate
    let totalDue = 0;
    let totalPaid = 0;
    let totalIbdApplied = 0;
    let totalRaApplied = 0;
    let totalVouchersApplied = 0;

    for (const loan of loans) {
      const installments = await storage.getInstallmentsByLoan(loan.id);
      totalDue += installments.reduce((sum, i) => sum + i.totalDue, 0);
      totalPaid += installments.reduce((sum, i) => sum + i.totalPaid, 0);
      totalIbdApplied += installments.reduce((sum, i) => sum + (i.ibdApplied || 0), 0);
      totalRaApplied += installments.reduce((sum, i) => sum + (i.raApplied || 0), 0);
      totalVouchersApplied += installments.reduce((sum, i) => sum + (i.vouchers || 0), 0);
    }

    const repaymentRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    const defaultRate = totalLoansCount > 0 ? (defaultedLoansCount / totalLoansCount) * 100 : 0;

    // Calculate total subsidies from subsidy ledger
    let totalSubsidies = totalIbdApplied + totalRaApplied;
    const uniqueSupporters = 0; // TODO: Track supporters when subsidy contribution tracking is implemented
    const totalSupporterContributions = totalSubsidies;

    // Get GHI score (Global Health Index) - use community's health gate
    const policy = community.lendingPolicyJson as any;
    const ghiThreshold = policy?.eligibility?.ghiThreshold || 0;
    const ghiScore = ghiThreshold; // Simplified - in production would calculate actual GHI
    const lendingEnabled = policy?.enabled || false;

    res.json({
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
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get comprehensive lending dashboard metrics for a community
 * GET /api/lending/dashboard/:communityId
 * 
 * Returns:
 * - Basic stats (total loans, disbursed, active, completed, defaulted)
 * - Status distribution
 * - Risk distribution (low/medium/high/critical)
 * - At-risk loans with health metrics
 * - Recent loan activity
 * - Default rate trends
 */
router.get("/dashboard/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);

    const loans = await storage.getLoansByCommunity(communityId);
    const community = await storage.getCommunity(communityId);
    
    if (!community) {
      return res.status(404).json({ error: "Community not found" });
    }

    // Basic counts by status
    const statusDistribution = {
      PENDING_APPROVAL: loans.filter(l => l.status === "PENDING_APPROVAL").length,
      ACTIVE: loans.filter(l => l.status === "ACTIVE").length,
      PAID: loans.filter(l => l.status === "PAID").length,
      DEFAULTED: loans.filter(l => l.status === "DEFAULTED").length,
      REJECTED: loans.filter(l => l.status === "REJECTED").length,
    };

    // Calculate volume metrics
    const totalDisbursed = loans
      .filter(l => l.disbursedAt) // Only count actually disbursed loans
      .reduce((sum, l) => sum + l.principalUsdc, 0);
    
    const activeVolume = loans
      .filter(l => l.status === "ACTIVE")
      .reduce((sum, l) => sum + l.principalUsdc, 0);

    // Calculate repayment and default rates
    let totalDue = 0;
    let totalPaid = 0;
    
    for (const loan of loans.filter(l => l.status === "ACTIVE" || l.status === "PAID" || l.status === "DEFAULTED")) {
      const installments = await storage.getInstallmentsByLoan(loan.id);
      totalDue += installments.reduce((sum, i) => sum + i.totalDue, 0);
      totalPaid += installments.reduce((sum, i) => sum + i.totalPaid, 0);
    }

    const repaymentRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    const totalLoansCount = statusDistribution.ACTIVE + statusDistribution.PAID + statusDistribution.DEFAULTED;
    const defaultRate = totalLoansCount > 0 ? (statusDistribution.DEFAULTED / totalLoansCount) * 100 : 0;

    // Risk distribution and at-risk loans analysis
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    
    const atRiskLoans: any[] = [];
    
    for (const loan of loans.filter(l => l.status === "ACTIVE")) {
      try {
        const installments = await storage.getInstallmentsByLoan(loan.id);
        const loanTotalPaid = installments.reduce((sum, i) => sum + i.totalPaid, 0);
        
        const health = calculateLoanHealth(loan, loanTotalPaid);
        
        // Count by risk level
        riskDistribution[health.riskLevel]++;
        
        // Track at-risk loans (medium or higher)
        if (health.isAtRisk) {
          atRiskLoans.push({
            loanId: loan.id,
            borrowerAddress: loan.borrowerAddress,
            principalUsdc: loan.principalUsdc,
            currency: loan.currency,
            disbursedAt: loan.disbursedAt,
            healthScore: health.healthScore,
            riskLevel: health.riskLevel,
            paymentProgress: health.paymentProgress,
            timeProgress: health.timeProgress,
          });
        }
      } catch (error) {
        console.error(`Error calculating health for loan ${loan.id}:`, error);
      }
    }

    // Sort at-risk loans by health score (lowest first = most at risk)
    atRiskLoans.sort((a, b) => a.healthScore - b.healthScore);

    // Recent loan activity (last 10 disbursed loans)
    const recentLoans = loans
      .filter(l => l.disbursedAt)
      .sort((a, b) => new Date(b.disbursedAt!).getTime() - new Date(a.disbursedAt!).getTime())
      .slice(0, 10)
      .map(l => ({
        loanId: l.id,
        borrowerAddress: l.borrowerAddress,
        principalUsdc: l.principalUsdc,
        currency: l.currency,
        tenorMonths: l.tenorMonths,
        disbursedAt: l.disbursedAt,
        status: l.status,
      }));

    // Get lending policy info
    const policy = community.lendingPolicyJson as any;
    const lendingEnabled = policy?.enabled || false;
    const ghiThreshold = policy?.eligibility?.ghiThreshold || 0;

    res.json({
      // Basic metrics
      totalLoans: loans.length,
      totalDisbursed,
      activeLoans: statusDistribution.ACTIVE,
      activeVolume,
      completedLoans: statusDistribution.PAID,
      defaultedLoans: statusDistribution.DEFAULTED,
      pendingApproval: statusDistribution.PENDING_APPROVAL,
      
      // Rates
      repaymentRate: Math.round(repaymentRate * 100) / 100,
      defaultRate: Math.round(defaultRate * 100) / 100,
      
      // Distributions
      statusDistribution,
      riskDistribution,
      
      // At-risk analysis
      atRiskLoans,
      atRiskCount: atRiskLoans.length,
      
      // Recent activity
      recentLoans,
      
      // Community settings
      lendingEnabled,
      ghiThreshold,
      currency: community.currency || 'USD',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get trust event history for a user
 * GET /api/lending/trust-events/:communityId/:userAddress
 */
router.get("/trust-events/:communityId/:userAddress", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const userAddress = req.params.userAddress;

    const events = await getUserTrustEventHistory(communityId, userAddress);

    res.json({ events });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Run late installment check (typically called by cron)
 * POST /api/lending/check-late/:communityId
 */
router.post("/check-late/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);

    const results = await checkLateInstallments(communityId);

    res.json({ results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== PENDING PAYMENT APPROVAL ENDPOINTS =====

/**
 * Get pending payments for a community
 * GET /api/lending/pending-payments/:communityId?status=PENDING
 */
router.get("/pending-payments/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const status = req.query.status as string | undefined;

    const payments = await storage.getPendingPaymentsByCommunity(communityId, status);

    res.json({ payments });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve a pending payment
 * POST /api/lending/pending-payments/:id/approve
 * Body: { reviewerAddress, reviewNotes? }
 * 
 * SECURITY WARNING: reviewerAddress is currently UNAUTHENTICATED
 * TODO: Add authentication to verify reviewer is community manager
 */
router.post("/pending-payments/:id/approve", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { reviewerAddress, reviewNotes } = req.body;

    if (!reviewerAddress) {
      return res.status(400).json({ error: "reviewerAddress is required" });
    }

    // Get pending payment
    const pendingPayment = await storage.getPendingPayment(paymentId);
    if (!pendingPayment) {
      return res.status(404).json({ error: "Pending payment not found" });
    }

    if (pendingPayment.status !== "PENDING") {
      return res.status(400).json({ error: "Payment has already been reviewed" });
    }

    // TODO: Verify reviewerAddress is community manager/admin

    // Update pending payment status
    await storage.updatePendingPaymentStatus(
      paymentId,
      "APPROVED",
      reviewerAddress.toLowerCase(),
      reviewNotes
    );

    // Process the actual payment across multiple installments if needed
    // This allows borrowers to pay more than one installment at a time
    const result = await processLoanPayment(
      pendingPayment.loanId,
      pendingPayment.amount
    );

    res.json({
      success: true,
      message: "Payment approved and processed",
      result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all payment submissions for a specific loan
 * GET /api/loans/:loanId/payments
 */
router.get("/:loanId/payments", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    
    const payments = await storage.getPendingPaymentsByLoan(loanId);
    
    res.json({ payments });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject a pending payment
 * POST /api/lending/pending-payments/:id/reject
 * Body: { reviewerAddress, reviewNotes? }
 * 
 * SECURITY WARNING: reviewerAddress is currently UNAUTHENTICATED
 * TODO: Add authentication to verify reviewer is community manager
 */
router.post("/pending-payments/:id/reject", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const { reviewerAddress, reviewNotes } = req.body;

    if (!reviewerAddress) {
      return res.status(400).json({ error: "reviewerAddress is required" });
    }

    // Get pending payment
    const pendingPayment = await storage.getPendingPayment(paymentId);
    if (!pendingPayment) {
      return res.status(404).json({ error: "Pending payment not found" });
    }

    if (pendingPayment.status !== "PENDING") {
      return res.status(400).json({ error: "Payment has already been reviewed" });
    }

    // TODO: Verify reviewerAddress is community manager/admin

    // Update pending payment status
    await storage.updatePendingPaymentStatus(
      paymentId,
      "REJECTED",
      reviewerAddress.toLowerCase(),
      reviewNotes
    );

    res.json({
      success: true,
      message: "Payment rejected"
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ===== DONATION ENDPOINTS =====

/**
 * Submit a donation toward a loan
 * POST /api/loans/:loanId/donate
 */
router.post("/:loanId/donate", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const { donorAddress, amount, currency, txHash, isAnonymous, message } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid donation amount is required" });
    }

    if (!currency || !["USDC", "USDT", "cUSD"].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: "Currency must be USDC, USDT, or cUSD" });
    }

    // Get loan details
    const loan = await storage.getLoan(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "ACTIVE") {
      return res.status(400).json({ error: "Loan is not active" });
    }

    // Import exchange rate utility and db
    const { usdcToLocal } = await import("../lending/exchange_rate");
    const { db } = await import("../db");

    // Convert donation amount to loan currency
    // Assuming USDC/USDT/cUSD are all 1:1 with USD
    const conversion = await usdcToLocal(amount, loan.currency);

    // Get current loan status to calculate outstanding balance
    const paymentStatus = await getLoanPaymentStatus(loanId);
    const outstandingBalance = paymentStatus.totalDue - paymentStatus.totalPaid;

    // Validate loan has outstanding balance
    if (outstandingBalance <= 0) {
      return res.status(400).json({ error: "Loan is already fully paid" });
    }

    // For MVP, reject overpayments to keep logic simple
    if (conversion.amountLocal > outstandingBalance) {
      return res.status(400).json({ 
        error: "Donation amount exceeds outstanding balance",
        outstandingBalance,
        currency: loan.currency,
        message: `Please donate no more than ${outstandingBalance.toFixed(2)} ${loan.currency} (${(outstandingBalance / conversion.rate).toFixed(2)} ${currency.toUpperCase()})`
      });
    }

    const actualCreditedAmount = conversion.amountLocal;

    // NOTE: For MVP, donation creation and installment crediting are NOT in a transaction
    // This is a known limitation - proper transaction support requires refactoring payment processing
    // Risk: if installment update fails, donation record exists without credited payments (rare edge case)
    
    // Create donation record
    const donation = await storage.createLoanDonation({
      loanId,
      communityId: loan.communityId,
      donorAddress: isAnonymous ? null : donorAddress?.toLowerCase() || null,
      amount,
      currency: currency.toUpperCase(),
      creditedAmount: actualCreditedAmount,
      txHash: txHash || null,
      isAnonymous: isAnonymous || false,
      message: message || null,
    });

    // Apply donation to loan (credit the installments)
    let remainingCredit = actualCreditedAmount;
    const installments = await storage.getInstallmentsByLoan(loanId);
    
    // Sort by due date to pay off earliest installments first
    const unpaidInstallments = installments
      .filter(inst => inst.status !== "PAID")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    for (const installment of unpaidInstallments) {
      if (remainingCredit <= 0) break;

      const amountDue = installment.totalDue - installment.totalPaid;
      const paymentAmount = Math.min(remainingCredit, amountDue);

      // Apply payment to installment
      await processInstallmentPayment(installment.id, paymentAmount);
      
      remainingCredit -= paymentAmount;
    }

    // Check if loan is fully paid (outside transaction)
    await checkLateInstallments(loanId);
    const updatedPaymentStatus = await getLoanPaymentStatus(loanId);
    
    if (updatedPaymentStatus.totalPaid >= updatedPaymentStatus.totalDue) {
      await storage.updateLoanStatus(loanId, "PAID");
    }

    res.json({
      success: true,
      donation,
      credited: actualCreditedAmount,
      currency: loan.currency,
      loanStatus: updatedPaymentStatus.totalPaid >= updatedPaymentStatus.totalDue ? "PAID" : "ACTIVE",
    });
  } catch (error: any) {
    console.error("Error processing donation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get donations for a loan
 * GET /api/loans/:loanId/donations
 */
router.get("/:loanId/donations", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);

    const donations = await storage.getLoanDonations(loanId);

    // Hide donor address for anonymous donations
    const sanitizedDonations = donations.map(d => ({
      ...d,
      donorAddress: d.isAnonymous ? null : d.donorAddress,
    }));

    res.json({ donations: sanitizedDonations });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
