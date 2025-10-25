/**
 * Step 15: Pricing Diff Utility
 * Compares old vs new pricing breakdowns and generates factor-level diffs
 */

import { PricingBreakdown, PricingDiff, PricingDiffLineItem } from '../entities/revision.entity';

export interface DiffMetadata {
  old_pricing_version: string;
  new_pricing_version: string;
  catalog_changed?: boolean;
  tolerance_book_changed?: boolean;
}

/**
 * Generate pricing diff comparing old and new breakdowns
 */
export function generatePricingDiff(
  oldBreakdown: PricingBreakdown,
  newBreakdown: PricingBreakdown,
  metadata: DiffMetadata,
): PricingDiff {
  const lineItems: PricingDiffLineItem[] = [];
  const warnings: string[] = [];

  // Compare each factor
  const factors: Array<keyof PricingBreakdown> = [
    'setup_time_cost',
    'machine_time_cost',
    'material_cost',
    'finish_cost',
    'risk_markup',
    'tolerance_multiplier_cost',
    'overhead_cost',
    'margin_amount',
    'tax',
  ];

  for (const factor of factors) {
    const oldValue = oldBreakdown[factor] || 0;
    const newValue = newBreakdown[factor] || 0;
    const delta = newValue - oldValue;

    if (delta !== 0) {
      const deltaPct = oldValue !== 0 ? (delta / oldValue) * 100 : 100;
      let reason: string | null = null;

      // Annotate reasons for significant changes
      if (factor === 'tolerance_multiplier_cost' && metadata.tolerance_book_changed) {
        reason = 'Tolerance cost book updated';
      }

      if (Math.abs(deltaPct) > 10) {
        reason = reason || `${Math.abs(deltaPct).toFixed(1)}% change`;
      }

      lineItems.push({
        factor: factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        old: oldValue,
        new: newValue,
        delta,
        delta_pct: deltaPct,
        reason,
      });
    }
  }

  // Calculate totals
  const totalDelta = newBreakdown.total - oldBreakdown.total;
  const pctDelta = oldBreakdown.total !== 0 
    ? (totalDelta / oldBreakdown.total) * 100 
    : 100;

  // Lead time delta
  const leadTimeDeltaDays = 
    (newBreakdown.lead_time_days ?? 0) - (oldBreakdown.lead_time_days ?? 0);

  // Tax delta
  const taxDelta = (newBreakdown.tax || 0) - (oldBreakdown.tax || 0);

  // Add warnings
  if (metadata.old_pricing_version !== metadata.new_pricing_version) {
    warnings.push(
      `Catalog upgraded from ${metadata.old_pricing_version} → ${metadata.new_pricing_version}`
    );
  }

  if (metadata.catalog_changed) {
    warnings.push('Pricing catalog has been updated since quote creation');
  }

  if (Math.abs(pctDelta) > 20) {
    warnings.push('⚠️ Price change exceeds 20% - review recommended');
  }

  if (leadTimeDeltaDays > 5) {
    warnings.push(`Lead time increased by ${leadTimeDeltaDays} days`);
  }

  return {
    total_delta: totalDelta,
    pct_delta: pctDelta,
    line_items: lineItems,
    lead_time_delta_days: leadTimeDeltaDays || null,
    tax_delta: taxDelta || null,
    warnings,
    old_pricing_version: metadata.old_pricing_version,
    new_pricing_version: metadata.new_pricing_version,
  };
}

/**
 * Format diff for human-readable display
 */
export function formatDiff(diff: PricingDiff): string {
  const sign = diff.total_delta >= 0 ? '+' : '';
  const lines = [
    `Total Change: ${sign}$${diff.total_delta.toFixed(2)} (${sign}${diff.pct_delta.toFixed(2)}%)`,
    '',
    'Factor Changes:',
  ];

  for (const item of diff.line_items) {
    const itemSign = item.delta >= 0 ? '+' : '';
    lines.push(
      `  ${item.factor}: $${item.old.toFixed(2)} → $${item.new.toFixed(2)} (${itemSign}$${item.delta.toFixed(2)})`
    );
    if (item.reason) {
      lines.push(`    Reason: ${item.reason}`);
    }
  }

  if (diff.warnings.length > 0) {
    lines.push('', 'Warnings:');
    diff.warnings.forEach(w => lines.push(`  - ${w}`));
  }

  return lines.join('\n');
}

/**
 * Check if diff represents a significant change
 */
export function isSignificantChange(diff: PricingDiff, threshold: number = 5): boolean {
  return Math.abs(diff.pct_delta) >= threshold;
}

/**
 * Validate pricing breakdowns before diff
 */
export function validateBreakdowns(
  oldBreakdown: PricingBreakdown,
  newBreakdown: PricingBreakdown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!oldBreakdown || typeof oldBreakdown.total !== 'number') {
    errors.push('Invalid old breakdown: missing total');
  }

  if (!newBreakdown || typeof newBreakdown.total !== 'number') {
    errors.push('Invalid new breakdown: missing total');
  }

  if (oldBreakdown.total < 0) {
    errors.push('Old total cannot be negative');
  }

  if (newBreakdown.total < 0) {
    errors.push('New total cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
