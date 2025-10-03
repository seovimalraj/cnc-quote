export function applyRiskMargin(baseMargin: number, riskScore?: number, maxUplift = 0.08): number {
  if (riskScore === undefined || isNaN(riskScore) || riskScore <= 0) return baseMargin;
  const clamped = Math.min(1, Math.max(0, riskScore));
  return +(baseMargin + maxUplift * clamped).toFixed(4);
}
