import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

async function addPeerEndorsements() {
  console.log('Adding peer-to-peer endorsements between existing addresses...');
  
  // Get current epoch
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  // Get all endorsements from ALL epochs to build address pool
  const allHistoricalEndorsements = await storage.getEndorsements({ 
    limit: 10000 
  });
  
  console.log(`Found ${allHistoricalEndorsements.length} total historical endorsements`);
  
  // Extract all unique addresses (endorsers and endorsees) from entire history
  const allAddresses = new Set<string>();
  allHistoricalEndorsements.forEach(e => {
    allAddresses.add(e.endorser.toLowerCase());
    allAddresses.add(e.endorsee.toLowerCase());
  });
  
  const addressList = Array.from(allAddresses);
  console.log(`Found ${addressList.length} unique addresses across all epochs`);
  
  // Get existing endorsements in current epoch to avoid duplicates
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  console.log(`Current epoch ${currentEpoch.id} has ${existingEndorsements.length} existing endorsements`);
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  let added = 0;
  const targetEndorsements = 150; // Add 150 peer endorsements
  
  // Strategy: Random peer-to-peer endorsements
  console.log('\n=== Adding random peer endorsements ===');
  while (added < targetEndorsements) {
    // Pick two random addresses
    const idx1 = Math.floor(Math.random() * addressList.length);
    const idx2 = Math.floor(Math.random() * addressList.length);
    
    // Skip self-endorsements
    if (idx1 === idx2) continue;
    
    const endorser = addressList[idx1];
    const endorsee = addressList[idx2];
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
    
    if (added % 30 === 0) {
      console.log(`  Added ${added}/${targetEndorsements} endorsements...`);
    }
  }
  
  console.log(`\n✅ Successfully added ${added} peer endorsements`);
  
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

addPeerEndorsements()
  .then(() => {
    console.log('\nDone! Run POST /api/epoch/{id}/compute to recalculate scores.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
