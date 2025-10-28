import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

async function addMoreEndorsements() {
  console.log('Adding more endorsements using existing addresses...');
  
  // Get all unique addresses from database (normalized to lowercase)
  const { db } = await import('./db');
  const { publicEndorsements } = await import('@shared/schema');
  const { sql } = await import('drizzle-orm');
  
  const result = await db.execute(sql`
    SELECT DISTINCT LOWER(endorser) as address FROM public_endorsements 
    UNION 
    SELECT DISTINCT LOWER(endorsee) as address FROM public_endorsements 
    ORDER BY address
  `);
  
  const allAddresses = result.rows.map((row: any) => row.address as string);
  console.log(`Found ${allAddresses.length} unique addresses in database`);
  
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
  const targetEndorsements = 150; // Add 150 random endorsements
  
  // Add random endorsements between existing addresses
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
    
    if (added % 25 === 0) {
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
}

addMoreEndorsements()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
