import { db } from "./db";
import { kudosBalances } from "@shared/schema";

async function seedKudos() {
  console.log("Seeding KUDOS balances...");

  const testAddresses = [
    "0x216844ef94d95279c6d1631875f2dd93fbbdfb61", // Test wallet 1
    "0x742d35cc6634c0532925a3b844bc9e7595f0beb0", // Test wallet 2
    "0x388c818ca8b9251b393131c08a736a67ccb19297", // Test wallet 3
  ];

  for (const address of testAddresses) {
    const normalized = address.toLowerCase();
    
    // Check if balance already exists
    const existing = await db
      .select()
      .from(kudosBalances)
      .where(eq(kudosBalances.address, normalized))
      .limit(1)
      .then(rows => rows[0]);

    if (!existing) {
      await db.insert(kudosBalances).values({
        address: normalized,
        balance: 1000,
        totalClaimed: 1000,
        totalSent: 0,
        totalReceived: 0,
        lastClaimAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      });
      console.log(`✓ Seeded ${normalized} with 1000 KUDOS`);
    } else {
      console.log(`  ${normalized} already has KUDOS balance`);
    }
  }

  console.log("KUDOS seeding complete!");
}

// Import eq from drizzle-orm
import { eq } from "drizzle-orm";

seedKudos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding KUDOS:", error);
    process.exit(1);
  });
