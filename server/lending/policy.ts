export interface LendingPolicy {
  enabled: boolean;
  eligibility: {
    minCut: number;
    vertexDisjoint: number;
    minSeedCount: number;
    perSeedMinShare: number;
    minGHI: number; // Graph Health Index threshold (0-100)
  };
  loanButtonsUsdc: number[]; // Available loan amounts
  tenorsMonths: number[]; // Available loan durations
  aprNominal: number; // Annual percentage rate (e.g., 0.40 for 40%)
  late: {
    graceDays: number;
    lateFeeMonthly: number; // Additional monthly fee rate
    defaultAfterDaysLate: number;
  };
  subsidy: {
    interestBuydown: {
      enabled: boolean;
      priority: number;
    };
    repayAssist: {
      enabled: boolean;
      premium: number; // e.g., 0.06 for 6% premium
      priority: number;
    };
    vouchers: {
      enabled: boolean;
      monthsFree: number[]; // e.g., [1, 2] for 1 or 2 months
    };
    firstLossGuarantee: {
      enabled: boolean;
      capUsdc: number;
    };
  };
  trustAdjust: {
    borrower: {
      onTimeMonthly: number; // +delta per on-time payment
      anyLate7d: number; // -delta if any payment >7 days late
      default: number; // -delta on loan default
    };
    supporter: {
      assistSuccess: number; // +delta when RA is repaid
      assistLoss: number; // -delta when RA is lost
      guaranteeMonthly: number; // +delta for active guarantee
    };
    maxPerEpoch: number; // Cap total trust adjustment per epoch
  };
}

export const DEFAULT_LENDING_POLICY: LendingPolicy = {
  enabled: false, // Disabled by default until community admin enables
  eligibility: {
    // IMPORTANT: These thresholds MUST match the community's scoring policy thresholds
    // The scoring algorithm (server/algorithm/compute.ts) enforces:
    //   - min-cut ≥ 2
    //   - vertex-disjoint paths ≥ 2
    //   - per-seed share ≥ 0.30 for at least 2 seeds
    // Users who pass are marked isAccepted=true
    //
    // Since vertex-disjoint and per-seed metrics are not stored per-user,
    // lending policy thresholds cannot be stricter than scoring thresholds.
    // To enforce stricter lending requirements, first update the community's
    // scoring policy and re-score the network.
    minCut: 2,  // Must match scoring policy
    vertexDisjoint: 2,  // Must match scoring policy
    minSeedCount: 2,  // Must match scoring policy
    perSeedMinShare: 0.30,  // Must match scoring policy
    minGHI: 60, // Require healthy network
  },
  loanButtonsUsdc: [160, 240, 400, 600, 800], // USDC amounts (equivalent to ARS 160k-800k at ~1000 ARS/USD)
  tenorsMonths: [6, 9, 12],
  aprNominal: 0.40, // 40% annual
  late: {
    graceDays: 5,
    lateFeeMonthly: 0.01, // 1% monthly late fee
    defaultAfterDaysLate: 60,
  },
  subsidy: {
    interestBuydown: {
      enabled: true,
      priority: 1, // Applied first
    },
    repayAssist: {
      enabled: true,
      premium: 0.06, // 6% premium for covering late payments
      priority: 2,
    },
    vouchers: {
      enabled: true,
      monthsFree: [1, 2], // Supporters can waive 1 or 2 months of interest
    },
    firstLossGuarantee: {
      enabled: true,
      capUsdc: 2000, // $2k default guarantee pool
    },
  },
  trustAdjust: {
    borrower: {
      onTimeMonthly: 0.3, // Small positive boost per on-time payment
      anyLate7d: -1.0, // Modest penalty if any payment is late
      default: -12.0, // Significant penalty for default
    },
    supporter: {
      assistSuccess: 0.5, // Reward for successful assist
      assistLoss: -0.7, // Modest penalty for assist loss
      guaranteeMonthly: 0.1, // Small reward for providing guarantee
    },
    maxPerEpoch: 2.0, // Limit total trust adjustment to ±2.0 per epoch
  },
};

// Policy templates for different use cases
export const LENDING_POLICY_TEMPLATES = {
  hiring: {
    ...DEFAULT_LENDING_POLICY,
    loanButtonsUsdc: [100, 200, 300, 500], // Smaller amounts for hiring vouches
    aprNominal: 0.30, // Lower rate for professional context
  },
  marketplace: {
    ...DEFAULT_LENDING_POLICY,
    loanButtonsUsdc: [50, 100, 200, 400], // Smaller amounts for marketplace trust
    late: {
      graceDays: 3,
      lateFeeMonthly: 0.02,
      defaultAfterDaysLate: 30, // Faster default for commerce
    },
  },
  microcredit: {
    ...DEFAULT_LENDING_POLICY, // Use defaults for general microcredit
  },
};

export function validateLendingPolicy(policy: any): policy is LendingPolicy {
  return (
    typeof policy === "object" &&
    typeof policy.enabled === "boolean" &&
    typeof policy.eligibility === "object" &&
    typeof policy.eligibility.minGHI === "number" &&
    Array.isArray(policy.loanButtonsUsdc) &&
    Array.isArray(policy.tenorsMonths) &&
    typeof policy.aprNominal === "number"
  );
}
