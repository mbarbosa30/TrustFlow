import type { HealthMetrics } from './metrics';

export interface GHIWeights {
  sizeWeight: number;
  cutWeight: number;
  churnWeight: number;
}

const DEFAULT_WEIGHTS: GHIWeights = {
  sizeWeight: 0.30,
  cutWeight: 0.50,
  churnWeight: 0.20,
};

export function computeGHI(
  metrics: HealthMetrics,
  weights: GHIWeights = DEFAULT_WEIGHTS
): number {
  const ghi = 
    (weights.sizeWeight * metrics.sizeN) +
    (weights.cutWeight * metrics.cutN) +
    (weights.churnWeight * metrics.churnN);
  
  return Math.round(Math.max(0, Math.min(100, ghi)));
}

export function computeUserConfidence(
  ghi: number,
  userMinCut: number
): { percent: number; local: { mincutN: number } } {
  const mincutN = Math.min(1, userMinCut / 3);
  
  const confidence = ghi * (0.85 + 0.15 * mincutN);
  
  return {
    percent: Math.round(Math.max(0, Math.min(100, confidence))),
    local: {
      mincutN: Math.round(mincutN * 100)
    }
  };
}
