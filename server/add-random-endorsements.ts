import { storage } from './storage';
import { computeLeafHash } from './crypto/merkle';

const EXISTING_ADDRESSES = [
  '0x03c6fced478cbbc9a4fab34ef9f40767739d1ff7',
  '0x0a098eda01ce92ff4a4ccb7a4fffb5a43ebc70dc',
  '0x14723a09acff6d2a60dcdf7aa4aff308fddc160c',
  '0x17f6ad8ef982297579c203069c1dbffe4348c372',
  '0x1ae0ea34a72d944a8c7603ffb3ec30a6669e454c',
  '0x216844ef94d95279c6d1631875f2dd93fbbdfb61',
  '0x4b0897b0513fdc7c541b6d9d7e929c4e5364d2db',
  '0x4b20993bc481177ec7e8f571cecae8a9e22c02db',
  '0x583031d1113ad414f02576bd6afabfb302140225',
  '0x5b38da6a701c568545dcfcb03fcb875f56beddc4',
  '0x5c6b0f7bf3e7ce046039bd8fabdfd3f9f5021678',
  '0x617f2e2fd72fd9d5503197092ac168c91465e7f2',
  '0x742d35cc6634c0532925a3b844bc9e7595f0beb4',
  '0x78731d3ca6b7e34ac0f824c42a7cc18a495cabab',
  '0xab8483f64d9c6d1ecf9b849ae677dd3315835cb2',
  '0xca35b7d915458ef540ade6068dfe2f44e8fa733c',
  '0xdd870fa1b7c4700f2bd7f44238821c26f7392148',
];

async function addRandomEndorsements() {
  console.log('Adding random endorsements between existing addresses...');
  
  // Get current epoch
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  // Get existing endorsements to avoid duplicates
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  console.log(`Found ${existingEndorsements.length} existing endorsements`);
  
  let added = 0;
  const targetEndorsements = 100; // Add 100 new random endorsements
  
  while (added < targetEndorsements) {
    // Pick random endorser and endorsee
    const endorserIdx = Math.floor(Math.random() * EXISTING_ADDRESSES.length);
    const endorseeIdx = Math.floor(Math.random() * EXISTING_ADDRESSES.length);
    
    // Skip self-endorsements
    if (endorserIdx === endorseeIdx) continue;
    
    const endorser = EXISTING_ADDRESSES[endorserIdx];
    const endorsee = EXISTING_ADDRESSES[endorseeIdx];
    const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
    
    // Skip if already exists
    if (existingPairs.has(pairKey)) continue;
    
    // Create endorsement
    const nonce = BigInt(Date.now());
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
    
    if (added % 10 === 0) {
      console.log(`Added ${added}/${targetEndorsements} endorsements...`);
    }
  }
  
  console.log(`✅ Successfully added ${added} new random endorsements to epoch ${currentEpoch.id}`);
  
  // Show final stats
  const finalEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  console.log(`Total endorsements in epoch ${currentEpoch.id}: ${finalEndorsements.length}`);
}

addRandomEndorsements()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
