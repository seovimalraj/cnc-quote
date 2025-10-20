import { createHash } from 'crypto';

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortDeep(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortDeep(val)] as const);

    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }

  return value;
}

export function deterministicStringify(value: unknown): string {
  const sorted = sortDeep(value);
  return JSON.stringify(sorted);
}

export function hashDeterministic(value: unknown): string {
  const payload = deterministicStringify(value);
  return createHash('sha256').update(payload).digest('hex');
}
