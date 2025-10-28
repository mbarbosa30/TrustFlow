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

async function addOrganicGrowth() {
  console.log('=== Organic Network Growth (No Seed Intervention) ===\n');
  
  // Get current epoch
  const currentEpoch = await storage.getCurrentEpoch();
  if (!currentEpoch) {
    throw new Error('No current epoch found');
  }
  
  console.log(`Current epoch: ${currentEpoch.id}`);
  
  // Get the previous epoch
  const previousEpoch = await storage.getEpoch(currentEpoch.id - 1);
  if (!previousEpoch) {
    console.log('No previous epoch found - this must be the first epoch');
    console.log('Use seeds to bootstrap the initial network');
    process.exit(1);
  }
  
  console.log(`Previous epoch: ${previousEpoch.id} (${previousEpoch.status})`);
  
  // Get all accepted users from previous epoch
  const previousScores = await storage.getScoresByEpoch(previousEpoch.id);
  const acceptedUsers = previousScores
    .filter(s => s.isAccepted)
    .map(s => s.address.toLowerCase());
  
  console.log(`\nFound ${acceptedUsers.length} accepted users in epoch ${previousEpoch.id}`);
  console.log('These users form the trusted network that will grow organically\n');
  
  // Get existing endorsements in current epoch
  const existingEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  const existingPairs = new Set(
    existingEndorsements.map(e => `${e.endorser.toLowerCase()}-${e.endorsee.toLowerCase()}`)
  );
  
  console.log(`Current epoch ${currentEpoch.id} has ${existingEndorsements.length} existing endorsements`);
  
  let added = 0;
  
  // STEP 1: Accepted users vouch for each other (strengthen network)
  console.log('\n--- Step 1: Peer vouches between accepted users ---');
  let peerVouches = 0;
  const targetPeerVouches = Math.min(100, acceptedUsers.length * 3); // Each user vouches for ~3 others
  
  while (peerVouches < targetPeerVouches) {
    const endorser = acceptedUsers[Math.floor(Math.random() * acceptedUsers.length)];
    const endorsee = acceptedUsers[Math.floor(Math.random() * acceptedUsers.length)];
    
    if (endorser === endorsee) continue;
    
    const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
    if (existingPairs.has(pairKey)) continue;
    
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
    peerVouches++;
    added++;
  }
  
  console.log(`  Added ${peerVouches} peer vouches between accepted users`);
  
  // STEP 2: Organic growth - accepted users invite new members
  console.log('\n--- Step 2: Accepted users invite new members ---');
  const newMembers: string[] = [];
  const numNewMembers = Math.max(5, Math.floor(acceptedUsers.length * 0.3)); // 30% growth rate
  
  console.log(`  Generating ${numNewMembers} new addresses...`);
  for (let i = 0; i < numNewMembers; i++) {
    newMembers.push(generateRandomAddress());
  }
  
  // Each new member gets vouched for by 2-4 existing accepted users
  let invitations = 0;
  for (const newMember of newMembers) {
    const numInvites = 2 + Math.floor(Math.random() * 3); // 2-4 invites
    const shuffledAccepted = [...acceptedUsers].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numInvites, shuffledAccepted.length); i++) {
      const endorser = shuffledAccepted[i];
      const pairKey = `${endorser.toLowerCase()}-${newMember.toLowerCase()}`;
      
      if (existingPairs.has(pairKey)) continue;
      
      const nonce = BigInt(Date.now() + added);
      const sig = '0x' + '00'.repeat(65);
      const leafHash = computeLeafHash({
        endorser,
        endorsee: newMember,
        epoch: BigInt(currentEpoch.id),
        nonce,
        sig,
      });
      
      await storage.createEndorsement({
        endorser,
        endorsee: newMember,
        epoch: currentEpoch.id,
        nonce,
        leafHash,
        sig,
      });
      
      existingPairs.add(pairKey);
      invitations++;
      added++;
    }
  }
  
  console.log(`  Added ${invitations} invitations (${newMembers.length} new members invited)`);
  
  // STEP 3: Some new members vouch for each other (building social connections)
  console.log('\n--- Step 3: New members vouch for each other ---');
  let newMemberVouches = 0;
  const targetNewMemberVouches = Math.min(30, newMembers.length * 2);
  
  while (newMemberVouches < targetNewMemberVouches) {
    const endorser = newMembers[Math.floor(Math.random() * newMembers.length)];
    const endorsee = newMembers[Math.floor(Math.random() * newMembers.length)];
    
    if (endorser === endorsee) continue;
    
    const pairKey = `${endorser.toLowerCase()}-${endorsee.toLowerCase()}`;
    if (existingPairs.has(pairKey)) continue;
    
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
    newMemberVouches++;
    added++;
  }
  
  console.log(`  Added ${newMemberVouches} vouches between new members`);
  
  // Summary
  const finalEndorsements = await storage.getEndorsements({ 
    epoch: currentEpoch.id,
    limit: 10000 
  });
  
  console.log('\n=== Summary ===');
  console.log(`✅ Total new endorsements added: ${added}`);
  console.log(`   - Peer vouches: ${peerVouches}`);
  console.log(`   - Invitations: ${invitations}`);
  console.log(`   - New member vouches: ${newMemberVouches}`);
  console.log(`\nTotal endorsements in epoch ${currentEpoch.id}: ${finalEndorsements.length}`);
  console.log(`New members invited: ${newMembers.length}`);
  console.log(`\n🔬 Expected network size: ${acceptedUsers.length + newMembers.length} users`);
  console.log('\nNOTE: No seed endorsements were added!');
  console.log('New members get trust through existing accepted users only.');
}

addOrganicGrowth()
  .then(() => {
    console.log('\n✅ Done! Run POST /api/epoch/{id}/compute to calculate scores.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
