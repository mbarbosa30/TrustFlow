export interface HealthMetrics {
  sizeN: number;
  cutN: number;
  churnN: number;
  rawAcceptedCount: number;
  rawAvgMinCut: number;
  rawChurnStability: number;
}

export function computeSizeMetric(acceptedCount: number, targetSize: number = 1000): number {
  if (acceptedCount <= 0) return 0;
  const normalized = Math.log(1 + acceptedCount) / Math.log(1 + targetSize);
  return Math.min(1, normalized) * 100;
}

export function computeAvgMinCutMetric(avgMinCut: number): number {
  const normalized = Math.min(1, avgMinCut / 3);
  return normalized * 100;
}

export function computeChurnStability(
  currentAccepted: Set<string>,
  previousAccepted: Set<string> | null
): number {
  if (!previousAccepted || previousAccepted.size === 0) {
    return 100;
  }

  const currentArr = Array.from(currentAccepted);
  const previousArr = Array.from(previousAccepted);
  const union = new Set([...currentArr, ...previousArr]);
  const intersection = new Set(
    currentArr.filter(x => previousAccepted.has(x))
  );
  
  const symmetricDiff = union.size - intersection.size;
  const jaccard = 1 - (symmetricDiff / union.size);
  
  return Math.max(0, Math.min(1, jaccard)) * 100;
}

export function computeHealthMetrics(
  acceptedUsers: string[],
  avgMinCut: number,
  previousAcceptedUsers: string[] | null
): HealthMetrics {
  const currentSet = new Set(acceptedUsers);
  const previousSet = previousAcceptedUsers ? new Set(previousAcceptedUsers) : null;

  const sizeN = computeSizeMetric(acceptedUsers.length);
  const cutN = computeAvgMinCutMetric(avgMinCut);
  const churnN = computeChurnStability(currentSet, previousSet);

  return {
    sizeN: Math.round(sizeN),
    cutN: Math.round(cutN),
    churnN: Math.round(churnN),
    rawAcceptedCount: acceptedUsers.length,
    rawAvgMinCut: Math.round(avgMinCut * 100) / 100,
    rawChurnStability: Math.round(churnN) / 100,
  };
}
