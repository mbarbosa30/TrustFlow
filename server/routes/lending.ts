import { Router } from "express";
import { storage } from "../storage";
import { checkLoanEligibility } from "../lending/eligibility";
import { createLoan } from "../lending/loan";
import { processInstallmentPayment, getLoanPaymentStatus, checkLateInstallments } from "../lending/payment";
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
 * Create a new loan
 * POST /api/loans/:communityId
 * Body: { userAddress, amountUsdc, tenorMonths }
 */
router.post("/:communityId", async (req, res) => {
  try {
    const communityId = parseInt(req.params.communityId);
    const { userAddress, amountUsdc, tenorMonths } = req.body;

    if (!userAddress || !amountUsdc || !tenorMonths) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await createLoan(communityId, userAddress, amountUsdc, tenorMonths);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get loan details with payment status
 * GET /api/loans/:loanId
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
 * Get loans by borrower
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
 * Get all loans for a community
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
 * Make a payment on an installment
 * POST /api/loans/:loanId/pay
 * Body: { installmentId, amountUsdc }
 */
router.post("/:loanId/pay", async (req, res) => {
  try {
    const loanId = parseInt(req.params.loanId);
    const { installmentId, amountUsdc } = req.body;

    if (!installmentId || !amountUsdc) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await processInstallmentPayment(installmentId, amountUsdc);

    res.json(result);
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

export default router;
