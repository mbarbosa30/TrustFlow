import { db } from "../db";
import { contexts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface ExternalSybilFlag {
  address: string;
  score: number;
  signals: string[];
  matchCount?: number;
}

export interface ExternalSybilResponse {
  flagged: ExternalSybilFlag[];
  total: number;
  threshold: number;
  generatedAt: string;
  cached: boolean;
}

const NANOPAY_API_URL = "https://nanopay.replit.app/api/public/v1/flagged-wallets";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes (matches server cache)

let cachedFlags: Map<string, ExternalSybilFlag> = new Map();
let lastFetchTime: Date | null = null;

export class ExternalSybilService {
  
  async fetchFlaggedWallets(): Promise<Map<string, ExternalSybilFlag>> {
    const now = new Date();
    
    if (lastFetchTime && (now.getTime() - lastFetchTime.getTime()) < CACHE_DURATION_MS) {
      console.log(`[ExternalSybil] Using cached flags (${cachedFlags.size} addresses)`);
      return cachedFlags;
    }
    
    try {
      console.log(`[ExternalSybil] Fetching flagged wallets from NanoPay...`);
      const response = await fetch(NANOPAY_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`[ExternalSybil] Rate limited, using cached data`);
          return cachedFlags;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: ExternalSybilResponse = await response.json();
      
      cachedFlags = new Map();
      for (const flag of data.flagged) {
        const normalizedAddress = flag.address.toLowerCase();
        cachedFlags.set(normalizedAddress, {
          ...flag,
          address: normalizedAddress,
        });
      }
      
      lastFetchTime = now;
      console.log(`[ExternalSybil] Fetched ${data.total} flagged wallets (threshold: ${data.threshold})`);
      
      return cachedFlags;
    } catch (error) {
      console.error(`[ExternalSybil] Failed to fetch:`, error);
      return cachedFlags;
    }
  }
  
  async syncFlagsToDatabase(): Promise<number> {
    const flags = await this.fetchFlaggedWallets();
    let updated = 0;
    
    for (const [address, flag] of flags) {
      try {
        const existing = await db
          .select()
          .from(contexts)
          .where(
            and(
              eq(contexts.ownerAddress, address),
              eq(contexts.type, 'ego')
            )
          )
          .limit(1);
        
        if (existing.length > 0) {
          await db
            .update(contexts)
            .set({
              externalSybilScore: flag.score,
              externalSybilSignals: flag.signals,
              externalSybilFlaggedAt: new Date(),
            })
            .where(eq(contexts.id, existing[0].id));
          updated++;
        }
      } catch (error) {
        console.error(`[ExternalSybil] Failed to sync ${address}:`, error);
      }
    }
    
    console.log(`[ExternalSybil] Synced ${updated} flags to database`);
    return updated;
  }
  
  getFlag(address: string): ExternalSybilFlag | undefined {
    return cachedFlags.get(address.toLowerCase());
  }
  
  getCachedFlags(): Map<string, ExternalSybilFlag> {
    return cachedFlags;
  }
  
  getLastFetchTime(): Date | null {
    return lastFetchTime;
  }
}

export const externalSybilService = new ExternalSybilService();

export function computeExternalFlagPenalty(sybilScore: number | null | undefined): number {
  if (sybilScore === null || sybilScore === undefined || sybilScore < 3) {
    return 1.0;
  }
  
  if (sybilScore >= 6) {
    return 0.30;
  }
  
  if (sybilScore >= 4.5) {
    return 0.40;
  }
  
  return 0.50;
}
