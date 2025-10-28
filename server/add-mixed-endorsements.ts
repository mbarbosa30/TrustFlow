import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

// Generate a random Ethereum address
function generateRandomAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

async function addMixedEndorsements() {
  console.log('Adding endorsements with mostly NEW addresses...');
  
  // Get some existing addresses from database (normalized to lowercase)
  const { db } = await import('./db');
  const { sql } = await import('drizzle-orm');
  
  const result = await db.execute(sql`
    SELECT DISTINCT LOWER(endorser) as address FROM public_endorsements 
    UNION 
    SELECT DISTINCT LOWER(endorsee) as address FROM public_endorsements 
    ORDER BY address
  `);
  
  const existingAddresses = result.rows.map((row: any) => row.address as string);
  console.log(`Found ${existingAddresses.length} existing addresses in database`);
  
  // Select only a subset of existing addresses (about 30%)
  const numExistingToUse = Math.floor(existingAddresses.length * 0.3);
  const selectedExisting = existingAddresses
    .sort(() => Math.random() - 0.5)
    .slice(0, numExistingToUse);
  
  console.log(`Using ${selectedExisting.length} existing addresses`);
  
  // Generate many new random addresses
  const numNewAddresses = 50;
  const newAddresses: string[] = [];
  for (let i = 0; i < numNewAddresses; i++) {
    newAddresses.push(generateRandomAddress());
  }
  console.log(`Generated ${newAddresses.length} new addresses`);
  
  // Combine all addresses
  const allAddresses = [...selectedExisting, ...newAddresses];
  console.log(`Total address pool: ${allAddresses.length} addresses`);
  
  // Get current epoch
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  // Get existing endorsements
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  console.log(`Found ${existingEndorsements.length} existing endorsements in epoch ${currentEpoch.id}`);
  
  let added = 0;
  const targetEndorsements = 200; // Add 200 endorsements
  
  // Add endorsements with weighted probability (70% new addresses, 30% existing)
  while (added < targetEndorsements) {
    // Pick random endorser and endorsee
    const endorserIdx = Math.floor(Math.random() * allAddresses.length);
    const endorseeIdx = Math.floor(Math.random() * allAddresses.length);
    
    // Skip self-endorsements
    if (endorserIdx === endorseeIdx) continue;
    
    const endorser = allAddresses[endorserIdx];
    const endorsee = allAddresses[endorseeIdx];
    const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
    
    // Skip if already exists
    if (existingPairs.has(pairKey)) continue;
    
    // Create endorsement
    const nonce = BigInt(Date.now() + added);
    const sig = '0x' + '00'.repeat(65);
    const leafHash = computeLeafHash({
      endorser,
      endorsee,
      epoch: BigInt(currentEpoch.id),
      nonce,
      sig,
    });
    
    await storage.createEndorsement({
      endorser,
      endorsee,
      epoch: currentEpoch.id,
      nonce,
      leafHash,
      sig,
    });
    
    existingPairs.add(pairKey);
    added++;
    
    if (added % 50 === 0) {
      console.log(`Added ${added}/${targetEndorsements} endorsements...`);
    }
  }
  
  console.log(`✅ Successfully added ${added} new endorsements to epoch ${currentEpoch.id}`);
  
  // Show final stats
  const finalEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  console.log(`Total endorsements in epoch ${currentEpoch.id}: ${finalEndorsements.length}`);
  
  // Count unique addresses
  const uniqueAddresses = new Set<string>();
  for (const e of finalEndorsements) {
    uniqueAddresses.add(e.endorser.toLowerCase());
    uniqueAddresses.add(e.endorsee.toLowerCase());
  }
  console.log(`Unique addresses in epoch ${currentEpoch.id}: ${uniqueAddresses.size}`);
}

addMixedEndorsements()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
