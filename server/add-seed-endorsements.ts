import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

const SEEDS = [
  '0x216844ef94d95279c6d1631875f2dd93fbbdfb61',
  '0x742d35cc6634c0532925a3b844bc9e7595f0beb4',
  '0x5b38da6a701c568545dcfcb03fcb875f56beddc4',
];

const NON_SEED_ADDRESSES = [
  '0x03c6fced478cbbc9a4fab34ef9f40767739d1ff7',
  '0x0a098eda01ce92ff4a4ccb7a4fffb5a43ebc70dc',
  '0x14723a09acff6d2a60dcdf7aa4aff308fddc160c',
  '0x17f6ad8ef982297579c203069c1dbffe4348c372',
  '0x1ae0ea34a72d944a8c7603ffb3ec30a6669e454c',
  '0x4b0897b0513fdc7c541b6d9d7e929c4e5364d2db',
  '0x4b20993bc481177ec7e8f571cecae8a9e22c02db',
  '0x583031d1113ad414f02576bd6afabfb302140225',
  '0x5c6b0f7bf3e7ce046039bd8fabdfd3f9f5021678',
  '0x617f2e2fd72fd9d5503197092ac168c91465e7f2',
  '0x78731d3ca6b7e34ac0f824c42a7cc18a495cabab',
  '0xab8483f64d9c6d1ecf9b849ae677dd3315835cb2',
  '0xca35b7d915458ef540ade6068dfe2f44e8fa733c',
  '0xdd870fa1b7c4700f2bd7f44238821c26f7392148',
];

async function addStrategicEndorsements() {
  console.log('Adding strategic endorsements from seeds...');
  
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  console.log(`Found ${existingEndorsements.length} existing endorsements`);
  
  let added = 0;
  
  // Strategy: Each seed vouches for 5-8 random users
  // This creates multiple paths from seeds to the network
  for (const seed of SEEDS) {
    const numVouches = 5 + Math.floor(Math.random() * 4); // 5-8 vouches per seed
    const shuffled = [...NON_SEED_ADDRESSES].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numVouches, shuffled.length); i++) {
      const endorsee = shuffled[i];
      const pairKey = `${seed.toLowerCase()}-${endorsee.toLowerCase()}`;
      
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added);
      const sig = '0x' + '00'.repeat(65);
      const leafHash = computeLeafHash({
        endorser: seed,
        endorsee,
        epoch: BigInt(currentEpoch.id),
        nonce,
        sig,
      });
      
      await storage.createEndorsement({
        endorser: seed,
        endorsee,
        epoch: currentEpoch.id,
        nonce,
        leafHash,
        sig,
      });
      
      existingPairs.add(pairKey);
      added++;
      console.log(`  Seed ${seed.slice(0, 10)}... → User ${endorsee.slice(0, 10)}...`);
    }
  }
  
  // Strategy 2: Create some cross-endorsements so users vouch back
  // This creates loops and stronger connectivity
  console.log('\nAdding reciprocal endorsements...');
  let reciprocal = 0;
  
  for (let i = 0; i < 20; i++) {
    const user1 = NON_SEED_ADDRESSES[Math.floor(Math.random() * NON_SEED_ADDRESSES.length)];
    const user2 = NON_SEED_ADDRESSES[Math.floor(Math.random() * NON_SEED_ADDRESSES.length)];
    
    if (user1 === user2) continue;
    
    // Create bidirectional endorsements
    for (const [endorser, endorsee] of [[user1, user2], [user2, user1]]) {
      const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added + reciprocal);
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
      reciprocal++;
    }
  }
  
  console.log(`\n✅ Added ${added} seed endorsements and ${reciprocal} reciprocal endorsements`);
  
  const finalEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  console.log(`Total endorsements in epoch ${currentEpoch.id}: ${finalEndorsements.length}`);
}

addStrategicEndorsements()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
