export const REGION_OPTIONS = ['US', 'EU', 'IN', 'UK', 'CA', 'AU'] as const

export type RegionCode = typeof REGION_OPTIONS[number]

export function formatRegionMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(multiplier < 1 ? 3 : 2)}`
}
