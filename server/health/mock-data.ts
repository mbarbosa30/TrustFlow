import { storage } from "../storage";
import { computeHealthMetrics } from "./metrics";
import { computeGHI } from "./ghi";

export async function generateMockEpochHealth(epochId: number = 0) {
  const mockAcceptedUsers = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x1234567890abcdef1234567890abcdef12345678",
    "0x987fEdCbA6543210987fEdCbA6543210987fEdCb",
    "0xaBcDeF1234567890aBcDeF1234567890aBcDeF12",
    "0x5678901234abcdef5678901234abcdef56789012",
  ];

  const mockPreviousAccepted = epochId > 0 ? [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x1234567890abcdef1234567890abcdef12345678",
    "0x987fEdCbA6543210987fEdCbA6543210987fEdCb",
  ] : null;

  const mockAvgMinCut = 2.3;

  const metrics = computeHealthMetrics(
    mockAcceptedUsers,
    mockAvgMinCut,
    mockPreviousAccepted
  );

  const ghi = computeGHI(metrics);

  const health = await storage.createEpochHealth({
    epochId,
    ghi,
    sizeN: metrics.sizeN,
    cutN: metrics.cutN,
    churnN: metrics.churnN,
    rawAcceptedCount: metrics.rawAcceptedCount,
    rawAvgMinCut: metrics.rawAvgMinCut,
    rawChurnStability: metrics.rawChurnStability,
  });

  console.log(`Created epoch health for epoch ${epochId}:`, {
    ghi,
    metrics,
  });

  return health;
}

export async function initializeMockData() {
  try {
    const existing = await storage.getLatestEpochHealth();
    
    if (existing) {
      console.log("Mock epoch health data already exists");
      return;
    }

    await generateMockEpochHealth(0);
    console.log("Mock epoch health data initialized successfully");
  } catch (error) {
    console.error("Error initializing mock data:", error);
  }
}
