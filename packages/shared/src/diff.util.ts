const REDACTED_FIELDS = new Set(['password', 'token', 'secret', 'mfa_secret']);

function redact(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key in copy) {
    if (REDACTED_FIELDS.has(key)) {
      copy[key] = '[REDACTED]';
    } else {
      copy[key] = redact(copy[key]);
    }
  }
  return copy;
}

type DiffLeaf = [any] | [any, any] | [any, 0, 0];

export type DiffResult = DiffLeaf | DiffMap;

interface DiffMap {
  [key: string]: DiffResult;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function createDiff(before: any, after: any): DiffResult | null {
  if (deepEqual(before, after)) {
    return null;
  }

  const beforeDefined = before !== undefined;
  const afterDefined = after !== undefined;

  if (beforeDefined && !afterDefined) {
    return [before, 0, 0];
  }

  if (!beforeDefined && afterDefined) {
    return [after];
  }

  if ((isObject(before) && isObject(after)) || (isArray(before) && isArray(after))) {
    if (isArray(before) && isArray(after)) {
      return [before, after];
    }

    const result: DiffMap = {};
    const beforeObj = (before ?? {}) as Record<string, any>;
    const afterObj = (after ?? {}) as Record<string, any>;
  const keys = new Set<string>([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  for (const key of Array.from(keys)) {
      const childDiff = createDiff(beforeObj[key], afterObj[key]);
      if (childDiff !== null) {
        result[key] = childDiff;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  return [before, after];
}

export function buildDiff(before: any, after: any): DiffResult | null {
  if (!before && !after) return null;
  const redactedBefore = before ? redact(before) : undefined;
  const redactedAfter = after ? redact(after) : undefined;
  return createDiff(redactedBefore, redactedAfter);
}