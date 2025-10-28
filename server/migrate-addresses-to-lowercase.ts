import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * One-time migration to normalize all Ethereum addresses to lowercase
 * 
 * This migration updates:
 * - public_endorsements (endorser, endorsee)
 * - seeds (address, addedBy)
 * - scores (address)
 * 
 * Run this once to ensure all existing data uses lowercase addresses
 */
async function migrateAddressesToLowercase() {
  console.log('=== Migrating Addresses to Lowercase ===\n');
  
  try {
    // Update public_endorsements table
    console.log('1. Updating public_endorsements...');
    const endorsementsResult = await db.execute(sql`
      UPDATE public_endorsements
      SET 
        endorser = LOWER(endorser),
        endorsee = LOWER(endorsee)
      WHERE 
        endorser != LOWER(endorser) 
        OR endorsee != LOWER(endorsee)
    `);
    console.log(`   ✓ Updated ${endorsementsResult.rowCount || 0} rows in public_endorsements\n`);
    
    // Update seeds table
    console.log('2. Updating seeds...');
    const seedsResult = await db.execute(sql`
      UPDATE seeds
      SET 
        address = LOWER(address),
        added_by = LOWER(added_by)
      WHERE 
        address != LOWER(address) 
        OR added_by != LOWER(added_by)
    `);
    console.log(`   ✓ Updated ${seedsResult.rowCount || 0} rows in seeds\n`);
    
    // Update scores table
    console.log('3. Updating scores...');
    const scoresResult = await db.execute(sql`
      UPDATE scores
      SET address = LOWER(address)
      WHERE address != LOWER(address)
    `);
    console.log(`   ✓ Updated ${scoresResult.rowCount || 0} rows in scores\n`);
    
    console.log('=== Migration Complete! ===');
    console.log('All addresses have been normalized to lowercase.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateAddressesToLowercase()
  .then(() => {
    console.log('\n✅ Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
