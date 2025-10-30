import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { communities } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to authenticate API requests using Community API keys
 * Validates the X-Community-Key header and attaches community context to request
 */
export async function validateCommunityApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-community-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: "MISSING_API_KEY" });
  }
  
  // Validate API key format (mxf_live_xxxxx)
  if (!apiKey.startsWith('mxf_live_')) {
    return res.status(401).json({ error: "INVALID_API_KEY_FORMAT" });
  }
  
  try {
    // Find community with matching API key
    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.apiKey, apiKey))
      .limit(1);
    
    if (!community) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    
    // Attach community to request for downstream handlers
    (req as any).community = community;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
