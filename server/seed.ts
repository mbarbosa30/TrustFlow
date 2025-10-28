import { storage } from "./storage";
import type { Address } from "viem";

/**
 * Seed script to populate database with realistic test data
 * Creates a network of wallet addresses with endorsements forming a trust graph
 */

// Realistic wallet addresses for testing
const WALLETS = [
  "0x216844eF94D95279c6d1631875F2dd93FbBdfB61", // Already exists (seed)
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4", // Seed candidate 2
  "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", // Seed candidate 3
  "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2", // Layer 1
  "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db", // Layer 1
  "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB", // Layer 1
  "0x617F2E2fD72FD9D5503197092aC168c91465E7f2", // Layer 2
  "0x17F6AD8Ef982297579C203069C1DbfFE4348c372", // Layer 2
  "0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678", // Layer 2
  "0x03C6FcED478cBbC9a4FAB34eF9f40767739D1Ff7", // Layer 3
  "0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C", // Layer 3
  "0x0A098Eda01Ce92ff4A4CCb7A4fFFb5A43EBC70DC", // Layer 3
  "0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c", // Layer 4
  "0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C", // Layer 4
  "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB", // Peripheral
  "0x583031D1113aD414F02576BD6afaBfb302140225", // Peripheral
  "0xdD870fA1b7C4700F2BD7f44238821C26f7392148", // Peripheral
] as Address[];

// Seeds: first 3 wallets
const SEED_ADDRESSES = WALLETS.slice(0, 3);

interface EndorsementEdge {
  endorser: Address;
  endorsee: Address;
}

// Create a realistic endorsement graph structure
const ENDORSEMENTS: EndorsementEdge[] = [
  // Seeds endorse each other (mutual trust)
  { endorser: WALLETS[0], endorsee: WALLETS[1] },
  { endorser: WALLETS[1], endorsee: WALLETS[0] },
  { endorser: WALLETS[1], endorsee: WALLETS[2] },
  { endorser: WALLETS[2], endorsee: WALLETS[1] },
  
  // Seeds endorse Layer 1 (1 hop from seeds)
  { endorser: WALLETS[0], endorsee: WALLETS[3] },
  { endorser: WALLETS[0], endorsee: WALLETS[4] },
  { endorser: WALLETS[1], endorsee: WALLETS[4] },
  { endorser: WALLETS[1], endorsee: WALLETS[5] },
  { endorser: WALLETS[2], endorsee: WALLETS[5] },
  
  // Layer 1 cross-endorsements (redundancy)
  { endorser: WALLETS[3], endorsee: WALLETS[4] },
  { endorser: WALLETS[4], endorsee: WALLETS[3] },
  { endorser: WALLETS[5], endorsee: WALLETS[4] },
  
  // Layer 1 endorses Layer 2 (2 hops from seeds)
  { endorser: WALLETS[3], endorsee: WALLETS[6] },
  { endorser: WALLETS[4], endorsee: WALLETS[6] },
  { endorser: WALLETS[4], endorsee: WALLETS[7] },
  { endorser: WALLETS[5], endorsee: WALLETS[7] },
  { endorser: WALLETS[5], endorsee: WALLETS[8] },
  
  // Layer 2 cross-endorsements
  { endorser: WALLETS[6], endorsee: WALLETS[7] },
  { endorser: WALLETS[7], endorsee: WALLETS[8] },
  
  // Layer 2 endorses Layer 3 (3 hops from seeds)
  { endorser: WALLETS[6], endorsee: WALLETS[9] },
  { endorser: WALLETS[7], endorsee: WALLETS[9] },
  { endorser: WALLETS[7], endorsee: WALLETS[10] },
  { endorser: WALLETS[8], endorsee: WALLETS[10] },
  { endorser: WALLETS[8], endorsee: WALLETS[11] },
  
  // Layer 3 cross-endorsements
  { endorser: WALLETS[9], endorsee: WALLETS[10] },
  { endorser: WALLETS[10], endorsee: WALLETS[11] },
  
  // Layer 3 endorses Layer 4 (4 hops from seeds)
  { endorser: WALLETS[9], endorsee: WALLETS[12] },
  { endorser: WALLETS[10], endorsee: WALLETS[12] },
  { endorser: WALLETS[10], endorsee: WALLETS[13] },
  { endorser: WALLETS[11], endorsee: WALLETS[13] },
  
  // Some peripheral endorsements (weaker connections)
  { endorser: WALLETS[12], endorsee: WALLETS[14] },
  { endorser: WALLETS[13], endorsee: WALLETS[14] },
  { endorser: WALLETS[6], endorsee: WALLETS[15] },
  { endorser: WALLETS[9], endorsee: WALLETS[16] },
  
  // Add some back-edges for redundancy (important for min-cut)
  { endorser: WALLETS[9], endorsee: WALLETS[3] }, // Layer 3 -> Layer 1
  { endorser: WALLETS[6], endorsee: WALLETS[2] }, // Layer 2 -> Seed
  { endorser: WALLETS[11], endorsee: WALLETS[4] }, // Layer 3 -> Layer 1
];

/**
 * Generate random endorsements between existing wallet addresses
 * Creates a denser network with more connections
 */
function generateRandomEndorsements(count: number): EndorsementEdge[] {
  const edges: EndorsementEdge[] = [];
  const usedPairs = new Set<string>();
  
  // Add existing endorsements to the set to avoid duplicates
  ENDORSEMENTS.forEach(edge => {
    usedPairs.add(`${edge.endorser.toLowerCase()}-${edge.endorsee.toLowerCase()}`);
  });
  
  let attempts = 0;
  const maxAttempts = count * 3; // Prevent infinite loops
  
  while (edges.length < count && attempts < maxAttempts) {
    attempts++;
    
    // Pick two random different wallets
    const endorserIdx = Math.floor(Math.random() * WALLETS.length);
    let endorseeIdx = Math.floor(Math.random() * WALLETS.length);
    
    // Ensure endorser and endorsee are different
    while (endorseeIdx === endorserIdx) {
      endorseeIdx = Math.floor(Math.random() * WALLETS.length);
    }
    
    const endorser = WALLETS[endorserIdx];
    const endorsee = WALLETS[endorseeIdx];
    const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
    
    // Only add if this pair hasn't been used yet
    if (!usedPairs.has(pairKey)) {
      edges.push({ endorser, endorsee });
      usedPairs.add(pairKey);
    }
  }
  
  return edges;
}

// Generate 50 additional random endorsements
const RANDOM_ENDORSEMENTS = generateRandomEndorsements(50);

// Combine all endorsements
const ALL_ENDORSEMENTS = [...ENDORSEMENTS, ...RANDOM_ENDORSEMENTS];

async function seedDatabase() {
  console.log("\n🌱 Starting database seed...\n");
  
  try {
    // Get current epoch
    const currentEpoch = await storage.getCurrentEpoch();
    
    if (!currentEpoch) {
      throw new Error("No current epoch found. Please ensure the application has initialized.");
    }
    
    console.log(`📅 Current epoch: ${currentEpoch.id}`);
    
    // Add seeds
    console.log("\n🌟 Adding seed addresses...");
    const existingSeeds = await storage.getSeeds();
    const existingSeedAddresses = new Set(existingSeeds.map(s => s.address.toLowerCase()));
    
    for (const seedAddress of SEED_ADDRESSES) {
      if (!existingSeedAddresses.has(seedAddress.toLowerCase())) {
        await storage.createSeed({ address: seedAddress });
        console.log(`  ✓ Added seed: ${seedAddress}`);
      } else {
        console.log(`  - Seed already exists: ${seedAddress}`);
      }
    }
    
    // Create endorsements
    console.log("\n🤝 Creating endorsements...");
    const existingEndorsements = await storage.getEndorsements({ 
      epoch: currentEpoch.id,
      limit: 10000 
    });
    
    const endorsementSet = new Set(
      existingEndorsements.map(e => 
        `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}-${e.epoch}`
      )
    );
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const edge of ALL_ENDORSEMENTS) {
      const key = `${edge.endorser.toLowerCase()}-${edge.endorsee.toLowerCase()}-${currentEpoch.id}`;
      
      if (!endorsementSet.has(key)) {
        // Create a mock signed endorsement
        // In production, these would come from actual EIP-712 signatures
        const maxNonce = await storage.getMaxNonce(edge.endorser, currentEpoch.id);
        const nextNonce = maxNonce + 1;
        
        // Generate a mock leaf hash (in production this would be computed from signature)
        const leafHash = `0x${Buffer.from(
          `${edge.endorser}-${edge.endorsee}-${currentEpoch.id}-${nextNonce}`
        ).toString('hex').slice(0, 64).padEnd(64, '0')}`;
        
        await storage.createEndorsement({
          endorser: edge.endorser,
          endorsee: edge.endorsee,
          epoch: currentEpoch.id,
          nonce: nextNonce,
          sig: `0x${'00'.repeat(65)}`, // Mock signature
          leafHash,
        });
        
        addedCount++;
        if (addedCount % 10 === 0) {
          console.log(`  ✓ Added ${addedCount} endorsements...`);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Seed complete!`);
    console.log(`  - Seeds: ${SEED_ADDRESSES.length} configured`);
    console.log(`  - Endorsements: ${addedCount} added, ${skippedCount} already existed`);
    console.log(`  - Total endorsements: ${ALL_ENDORSEMENTS.length} (${ENDORSEMENTS.length} structured + ${RANDOM_ENDORSEMENTS.length} random)`);
    console.log(`  - Total wallets: ${WALLETS.length}`);
    console.log(`  - Network depth: 4+ layers from seeds with random cross-connections`);
    console.log(`\n💡 Next steps:`);
    console.log(`  1. Go to the Seeds page`);
    console.log(`  2. Click "Compute Scores" to run max-flow algorithm`);
    console.log(`  3. View trust scores on Dashboard and Overview pages\n`);
    
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("🎉 Database seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed failed:", error);
      process.exit(1);
    });
}

export { seedDatabase, WALLETS, SEED_ADDRESSES, ENDORSEMENTS, ALL_ENDORSEMENTS };
