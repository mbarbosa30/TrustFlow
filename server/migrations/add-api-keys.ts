import { db } from '../db';
import { communities } from '@shared/schema';
import { generateApiKey } from '../utils/apikey';
import { eq, isNull } from 'drizzle-orm';

/**
 * Generate API keys for all communities that don't have one
 */
async function addApiKeys() {
  console.log('Generating API keys for communities...');
  
  // Find all communities without API keys
  const communitiesWithoutKeys = await db
    .select()
    .from(communities)
    .where(isNull(communities.apiKey));
  
  console.log(`Found ${communitiesWithoutKeys.length} communities without API keys`);
  
  for (const community of communitiesWithoutKeys) {
    const apiKey = generateApiKey();
    
    await db
      .update(communities)
      .set({ apiKey })
      .where(eq(communities.id, community.id));
    
    console.log(`Generated API key for community ${community.id} (${community.name}): ${apiKey}`);
  }
  
  console.log('✓ API key generation complete');
}

addApiKeys()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error generating API keys:', error);
    process.exit(1);
  });
