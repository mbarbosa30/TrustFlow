import { Router } from "express";
import { storage } from "../storage";
import { checkLoanEligibility } from "../lending/eligibility";
import { createLoan } from "../lending/loan";
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
    const { userAddress, borrowerName, amount, amountUsdc, tenorMonths } = req.body;

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
    });

    res.json(result);
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

    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === "ACTIVE").length;
    const paidLoans = loans.filter((l) => l.status === "PAID").length;
    const defaultedLoans = loans.filter((l) => l.status === "DEFAULTED").length;

    const totalDisbursed = loans.reduce((sum, l) => sum + l.principalUsdc, 0);

    // Calculate repayment rate
    let totalDue = 0;
    let totalPaid = 0;

    for (const loan of loans) {
      const installments = await storage.getInstallmentsByLoan(loan.id);
      totalDue += installments.reduce((sum, i) => sum + i.totalDue, 0);
      totalPaid += installments.reduce((sum, i) => sum + i.totalPaid, 0);
    }

    const repaymentRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;

    res.json({
      totalLoans,
      activeLoans,
      paidLoans,
      defaultedLoans,
      totalDisbursed,
      repaymentRate,
      defaultRate,
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

export default router;
