/**
 * Step 16: Revision Diff Utility
 * Deep JSON diff computation for quote snapshots
 */

export interface FieldChange {
  path: string; // JSON Pointer path
  from: any;
  to: any;
}

export interface FactorDelta {
  factor: string;
  delta: number;
  pct: number;
  from?: number;
  to?: number;
}

export interface LineDelta {
  line_id: string;
  price_from: number | null;
  price_to: number | null;
  factor_deltas: FactorDelta[];
}

export interface DiffSummary {
  total_delta_amount: number;
  total_delta_pct: number;
}

export interface RevisionDiff {
  summary: DiffSummary;
  by_factor: FactorDelta[];
  fields: FieldChange[];
  lines: LineDelta[];
}

// Fields to ignore in diff computation
const IGNORE_PATHS = [
  '/quote/header/updated_at',
  '/quote/header/created_at',
  '/quote/lines/*/outputs/trace_id',
  '/quote/lines/*/outputs/observability',
  '/snapshot_json/timestamp',
];

/**
 * Check if path should be ignored in diff
 */
function shouldIgnorePath(path: string): boolean {
  return IGNORE_PATHS.some((ignorePath) => {
    if (ignorePath.includes('*')) {
      const regex = new RegExp(ignorePath.replace(/\*/g, '[^/]+'));
      return regex.test(path);
    }
    return path === ignorePath;
  });
}

/**
 * Normalize object keys to sorted order for deterministic comparison
 */
function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortKeys(obj[key]);
      return sorted;
    }, {} as any);
}

/**
 * Deep diff two objects and return field-level changes
 */
export function computeFieldChanges(
  oldSnapshot: any,
  newSnapshot: any,
  basePath: string = ''
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Handle null/undefined
  if (oldSnapshot === null || oldSnapshot === undefined) {
    if (newSnapshot !== null && newSnapshot !== undefined) {
      changes.push({ path: basePath || '/', from: null, to: newSnapshot });
    }
    return changes;
  }

  if (newSnapshot === null || newSnapshot === undefined) {
    changes.push({ path: basePath || '/', from: oldSnapshot, to: null });
    return changes;
  }

  // Handle primitives
  if (typeof oldSnapshot !== 'object' || typeof newSnapshot !== 'object') {
    if (oldSnapshot !== newSnapshot && !shouldIgnorePath(basePath)) {
      changes.push({ path: basePath, from: oldSnapshot, to: newSnapshot });
    }
    return changes;
  }

  // Handle arrays
  if (Array.isArray(oldSnapshot) || Array.isArray(newSnapshot)) {
    if (Array.isArray(oldSnapshot) && Array.isArray(newSnapshot)) {
      const maxLen = Math.max(oldSnapshot.length, newSnapshot.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${basePath}/${i}`;
        changes.push(...computeFieldChanges(oldSnapshot[i], newSnapshot[i], itemPath));
      }
    } else {
      if (!shouldIgnorePath(basePath)) {
        changes.push({ path: basePath, from: oldSnapshot, to: newSnapshot });
      }
    }
    return changes;
  }

  // Handle objects - get all keys from both
  const allKeys = new Set([
    ...Object.keys(oldSnapshot),
    ...Object.keys(newSnapshot),
  ]);

  for (const key of allKeys) {
    const fieldPath = basePath ? `${basePath}/${key}` : `/${key}`;
    
    if (shouldIgnorePath(fieldPath)) {
      continue;
    }

    const oldValue = oldSnapshot[key];
    const newValue = newSnapshot[key];

    // Recurse for nested objects
    if (
      typeof oldValue === 'object' &&
      oldValue !== null &&
      typeof newValue === 'object' &&
      newValue !== null &&
      !Array.isArray(oldValue) &&
      !Array.isArray(newValue)
    ) {
      changes.push(...computeFieldChanges(oldValue, newValue, fieldPath));
    } else if (oldValue !== newValue) {
      changes.push({ path: fieldPath, from: oldValue, to: newValue });
    }
  }

  return changes;
}

/**
 * Compute factor-level deltas from pricing outputs
 */
export function computeFactorDeltas(
  oldFactors: Record<string, number>,
  newFactors: Record<string, number>
): FactorDelta[] {
  const deltas: FactorDelta[] = [];
  const allFactors = new Set([
    ...Object.keys(oldFactors || {}),
    ...Object.keys(newFactors || {}),
  ]);

  for (const factor of allFactors) {
    const oldValue = oldFactors?.[factor] || 0;
    const newValue = newFactors?.[factor] || 0;
    const delta = newValue - oldValue;

    if (Math.abs(delta) > 0.001) {
      // Only include if meaningful change
      const pct = oldValue !== 0 ? delta / oldValue : 0;
      deltas.push({
        factor,
        delta,
        pct,
        from: oldValue,
        to: newValue,
      });
    }
  }

  return deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Compute line-level deltas
 */
export function computeLineDeltas(
  oldLines: any[],
  newLines: any[]
): LineDelta[] {
  const deltas: LineDelta[] = [];

  // Match lines by line_id or index
  const lineMap = new Map<string, { old?: any; new?: any }>();

  oldLines?.forEach((line, idx) => {
    const lineId = line.line_id || `line_${idx}`;
    lineMap.set(lineId, { old: line, new: undefined });
  });

  newLines?.forEach((line, idx) => {
    const lineId = line.line_id || `line_${idx}`;
    const existing = lineMap.get(lineId);
    if (existing) {
      existing.new = line;
    } else {
      lineMap.set(lineId, { old: undefined, new: line });
    }
  });

  for (const [lineId, { old, new: newLine }] of lineMap) {
    const oldPrice = old?.outputs?.unit_price || null;
    const newPrice = newLine?.outputs?.unit_price || null;

    if (oldPrice !== newPrice || (old && newLine)) {
      const factorDeltas = computeFactorDeltas(
        old?.outputs?.factor_breakdown || {},
        newLine?.outputs?.factor_breakdown || {}
      );

      deltas.push({
        line_id: lineId,
        price_from: oldPrice,
        price_to: newPrice,
        factor_deltas: factorDeltas,
      });
    }
  }

  return deltas;
}

/**
 * Compute full revision diff
 */
export function computeRevisionDiff(
  oldSnapshot: any,
  newSnapshot: any
): RevisionDiff {
  // Normalize snapshots
  const normalizedOld = sortKeys(oldSnapshot);
  const normalizedNew = sortKeys(newSnapshot);

  // Compute field changes
  const fields = computeFieldChanges(normalizedOld, normalizedNew);

  // Compute line deltas
  const oldLines = normalizedOld?.quote?.lines || [];
  const newLines = normalizedNew?.quote?.lines || [];
  const lines = computeLineDeltas(oldLines, newLines);

  // Aggregate factor deltas across all lines
  const factorMap = new Map<string, { delta: number; count: number }>();
  lines.forEach((line) => {
    line.factor_deltas.forEach((fd) => {
      const existing = factorMap.get(fd.factor) || { delta: 0, count: 0 };
      existing.delta += fd.delta;
      existing.count += 1;
      factorMap.set(fd.factor, existing);
    });
  });

  const by_factor: FactorDelta[] = Array.from(factorMap.entries())
    .map(([factor, { delta, count }]) => ({
      factor,
      delta,
      pct: 0, // Aggregate percentage not meaningful, use absolute
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Compute summary
  const oldTotal =
    oldLines.reduce((sum, line) => sum + (line.outputs?.unit_price || 0), 0) || 0;
  const newTotal =
    newLines.reduce((sum, line) => sum + (line.outputs?.unit_price || 0), 0) || 0;
  const total_delta_amount = newTotal - oldTotal;
  const total_delta_pct = oldTotal !== 0 ? total_delta_amount / oldTotal : 0;

  return {
    summary: {
      total_delta_amount,
      total_delta_pct,
    },
    by_factor,
    fields,
    lines,
  };
}

/**
 * Format field change for human reading
 */
export function formatFieldChange(change: FieldChange): string {
  const { path, from, to } = change;
  const field = path.split('/').pop() || path;
  
  if (from === null || from === undefined) {
    return `${field}: added "${to}"`;
  }
  if (to === null || to === undefined) {
    return `${field}: removed "${from}"`;
  }
  
  return `${field}: "${from}" → "${to}"`;
}

/**
 * Format factor delta for human reading
 */
export function formatFactorDelta(delta: FactorDelta): string {
  const sign = delta.delta > 0 ? '+' : '';
  const pctStr = (delta.pct * 100).toFixed(1);
  return `${delta.factor}: ${sign}${delta.delta.toFixed(2)} (${sign}${pctStr}%)`;
}
