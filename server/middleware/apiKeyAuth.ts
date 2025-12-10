import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { communities } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Single-flight lock for admin operations
let recalculationInProgress = false;

export function isRecalculationInProgress(): boolean {
  return recalculationInProgress;
}

export function setRecalculationInProgress(value: boolean): void {
  recalculationInProgress = value;
}

/**
 * Middleware to authenticate admin API requests using ADMIN_API_KEY
 * Validates the X-Admin-Key header against the environment variable
 */
export function validateAdminApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const adminKey = req.headers['x-admin-key'] as string;
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (!expectedKey) {
    console.warn("ADMIN_API_KEY not configured - admin endpoints are disabled");
    return res.status(503).json({ 
      error: "ADMIN_DISABLED",
      message: "Admin endpoints are not configured. Set ADMIN_API_KEY secret to enable."
    });
  }
  
  if (!adminKey) {
    return res.status(401).json({ 
      error: "MISSING_ADMIN_KEY",
      message: "X-Admin-Key header is required"
    });
  }
  
  if (adminKey !== expectedKey) {
    return res.status(403).json({ 
      error: "INVALID_ADMIN_KEY",
      message: "Invalid admin API key"
    });
  }
  
  next();
}

/**
 * Middleware to prevent concurrent recalculations (single-flight lock)
 */
export function singleFlightRecalculation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (recalculationInProgress) {
    return res.status(409).json({
      error: "RECALCULATION_IN_PROGRESS",
      message: "A network recalculation is already in progress. Please wait and try again later."
    });
  }
  next();
}

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
