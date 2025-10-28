import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

async function addStrategicSeedEndorsements() {
  console.log('Adding strategic seed endorsements to current epoch...');
  
  // Get seeds
  const seeds = await storage.getSeeds();
  console.log(`Found ${seeds.length} seeds`);
  
  // Get current epoch
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  // Get all endorsements in current epoch
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  console.log(`Found ${existingEndorsements.length} existing endorsements`);
  
  // Extract all unique addresses (excluding seeds)
  const allAddresses = new Set<string>();
  const seedAddresses = new Set(seeds.map(s => s.address.toLowerCase()));
  
  existingEndorsements.forEach(e => {
    allAddresses.add(e.endorser.toLowerCase());
    allAddresses.add(e.endorsee.toLowerCase());
  });
  
  // Remove seeds from the address set
  seedAddresses.forEach(seed => allAddresses.delete(seed));
  
  const nonSeedAddresses = Array.from(allAddresses);
  console.log(`Found ${nonSeedAddresses.length} non-seed addresses`);
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  let added = 0;
  
  // Strategy 1: Each seed vouches for 15-25 random users
  console.log('\n=== Adding seed endorsements ===');
  for (const seed of seeds) {
    const numVouches = 15 + Math.floor(Math.random() * 11); // 15-25 vouches per seed
    const shuffled = [...nonSeedAddresses].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numVouches, shuffled.length); i++) {
      const endorsee = shuffled[i];
      const pairKey = `${seed.address.toLowerCase()}-${endorsee.toLowerCase()}`;
      
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added);
      const sig = '0x' + '00'.repeat(65);
      const leafHash = computeLeafHash({
        endorser: seed.address,
        endorsee,
        epoch: BigInt(currentEpoch.id),
        nonce,
        sig,
      });
      
      await storage.createEndorsement({
        endorser: seed.address,
        endorsee,
        epoch: currentEpoch.id,
        nonce,
        leafHash,
        sig,
      });
      
      existingPairs.add(pairKey);
      added++;
    }
    
    console.log(`  Seed ${seed.address.slice(0, 10)}... endorsed ${numVouches} users`);
  }
  
  // Strategy 2: Seeds vouch for each other
  console.log('\n=== Adding seed-to-seed endorsements ===');
  let seedToSeed = 0;
  for (const seed1 of seeds) {
    for (const seed2 of seeds) {
      if (seed1.address === seed2.address) continue;
      
      const pairKey = `${seed1.address.toLowerCase()}-${seed2.address.toLowerCase()}`;
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added + seedToSeed);
      const sig = '0x' + '00'.repeat(65);
      const leafHash = computeLeafHash({
        endorser: seed1.address,
        endorsee: seed2.address,
        epoch: BigInt(currentEpoch.id),
        nonce,
        sig,
      });
      
      await storage.createEndorsement({
        endorser: seed1.address,
        endorsee: seed2.address,
        epoch: currentEpoch.id,
        nonce,
        leafHash,
        sig,
      });
      
      existingPairs.add(pairKey);
      seedToSeed++;
    }
  }
  console.log(`  Added ${seedToSeed} seed-to-seed endorsements`);
  
  // Strategy 3: Create cross-endorsements between users to build stronger connectivity
  console.log('\n=== Adding user cross-endorsements ===');
  let crossEndorsements = 0;
  
  for (let i = 0; i < 30; i++) {
    const user1 = nonSeedAddresses[Math.floor(Math.random() * nonSeedAddresses.length)];
    const user2 = nonSeedAddresses[Math.floor(Math.random() * nonSeedAddresses.length)];
    
    if (user1 === user2) continue;
    
    // Create bidirectional endorsements
    for (const [endorser, endorsee] of [[user1, user2], [user2, user1]]) {
      const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added + seedToSeed + crossEndorsements);
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
      crossEndorsements++;
    }
  }
  console.log(`  Added ${crossEndorsements} cross-endorsements`);
  
  console.log(`\n✅ Total new endorsements added: ${added + seedToSeed + crossEndorsements}`);
  
  const finalEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  console.log(`Total endorsements in epoch ${currentEpoch.id}: ${finalEndorsements.length}`);
}

addStrategicSeedEndorsements()
  .then(() => {
    console.log('\nDone! Now run: npm run compute-scores');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
