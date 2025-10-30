import { db } from '../db';
import { communities } from '../../shared/schema';
import { GLOBAL_POLICY } from '../../shared/community-types';
import { eq, sql } from 'drizzle-orm';
import { createPromptHash } from '../crypto/keccak';
import { generateApiKey } from '../utils/apikey';

// Initialize Community 0 (Global) for backward compatibility
export async function initializeCommunityZero() {
  try {
    console.log('Checking for Community 0...');
    
    const existing = await db.select().from(communities).where(eq(communities.id, 0));
    
    if (existing.length > 0) {
      console.log('Community 0 already exists');
      return existing[0];
    }
    
    console.log('Creating Community 0 (Global)...');
    
    const promptText = "I trust this person";
    const promptHash = createPromptHash(promptText);
    const apiKey = generateApiKey();
    
    const globalPolicy = {
      ...GLOBAL_POLICY,
      promptHash,
    };
    
    // Insert with explicit ID = 0 - use JSONB for policy
    await db.execute(sql`
      INSERT INTO communities (id, name, description, prompt_text, prompt_hash, policy_id, policy_json, visibility, creator, api_key, created_at)
      VALUES (
        0,
        'Global MaxFlow',
        'The original global trust network',
        ${promptText},
        ${promptHash},
        'global-v1',
        ${globalPolicy}::jsonb,
        'public',
        '0x0000000000000000000000000000000000000000',
        ${apiKey},
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('Community 0 initialized successfully');
    
    const created = await db.select().from(communities).where(eq(communities.id, 0));
    return created[0];
  } catch (error) {
    console.error('Error initializing Community 0:', error);
    throw error;
  }
}
