import { AdminPricingConfig } from './admin-pricing.types';
import { hashDeterministic } from './hash.util';

function stripVersion(config: AdminPricingConfig): AdminPricingConfig {
  const clone = JSON.parse(JSON.stringify(config)) as AdminPricingConfig;
  if ('version' in clone) {
    // Preserve version history separately; digest focuses on structural changes
    (clone as Record<string, unknown>).version = 'v-*';
  }
  return clone;
}

export function computeAdminPricingProposalDigest(config: AdminPricingConfig): string {
  return hashDeterministic(stripVersion(config));
}
