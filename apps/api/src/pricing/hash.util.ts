import { createHash } from "crypto";

interface ComputeHashOptions {
  prefix?: string;
  hashLength?: number;
  lowercaseKeys?: Set<string>;
  lowercaseArrayKeys?: Set<string>;
}

const DEFAULT_HASH_LENGTH = 12;
const DEFAULT_PREFIX = "pc";

const DEFAULT_LOWERCASE_KEYS = new Set([
  "process",
  "process_type",
  "material_code",
  "material_id",
  "leadtime_profile",
  "lead_time_option",
  "ship_to_region",
  "catalog_version",
  "pricing_factors_version",
]);

const DEFAULT_LOWERCASE_ARRAY_KEYS = new Set([
  "finishes",
  "finish_ids",
  "tolerances",
  "secondary_operations",
]);

type Primitive = string | number | boolean;
type CanonicalValue = Primitive | CanonicalValue[] | { [key: string]: CanonicalValue };

export function canonicalizeForHash(
  value: unknown,
  keyPath: readonly string[] = [],
  options?: Pick<ComputeHashOptions, "lowercaseKeys" | "lowercaseArrayKeys">
): CanonicalValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return roundNumber(value);
  }

  if (typeof value === "string") {
    return canonicalizeString(value, keyPath, options);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return canonicalizeArray(value, keyPath, options);
  }

  if (typeof value === "object") {
    return canonicalizeObject(value as Record<string, unknown>, keyPath, options);
  }

  return undefined;
}

function canonicalizeString(
  value: string,
  keyPath: readonly string[],
  options?: Pick<ComputeHashOptions, "lowercaseKeys" | "lowercaseArrayKeys">
): string {
  const currentKey = keyPath[keyPath.length - 1];
  const lowercaseKeys = options?.lowercaseKeys ?? DEFAULT_LOWERCASE_KEYS;
  if (currentKey && lowercaseKeys.has(currentKey)) {
    return value.toLowerCase();
  }
  return value;
}

function canonicalizeArray(
  value: unknown[],
  keyPath: readonly string[],
  options?: Pick<ComputeHashOptions, "lowercaseKeys" | "lowercaseArrayKeys">
): CanonicalValue {
  const parentKey = keyPath[keyPath.length - 1];
  const lowercaseArrayKeys = options?.lowercaseArrayKeys ?? DEFAULT_LOWERCASE_ARRAY_KEYS;

  const canonicalItems = value
    .map((item) => canonicalizeForHash(item, keyPath, options))
    .filter((item): item is CanonicalValue => item !== undefined);

  if (canonicalItems.length === 0) {
    return [];
  }

  if (parentKey && lowercaseArrayKeys.has(parentKey)) {
    for (let index = 0; index < canonicalItems.length; index += 1) {
      const next = canonicalItems[index];
      if (typeof next === "string") {
        canonicalItems[index] = next.toLowerCase();
      }
    }
  }

  if (arePrimitiveArray(canonicalItems)) {
    return canonicalItems.slice().sort(primitiveComparator) as CanonicalValue;
  }

  return canonicalItems
    .map((item) => ({
      item,
      key: typeof item === "object" ? JSON.stringify(item) : String(item),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => entry.item) as CanonicalValue;
}

function canonicalizeObject(
  value: Record<string, unknown>,
  keyPath: readonly string[],
  options?: Pick<ComputeHashOptions, "lowercaseKeys" | "lowercaseArrayKeys">
): CanonicalValue {
  const result: Record<string, CanonicalValue> = {};
  const sortedKeys = Object.keys(value)
    .filter((key) => value[key] !== null && value[key] !== undefined)
    .sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    const nextValue = canonicalizeForHash(value[key], [...keyPath, key], options);
    if (nextValue !== undefined) {
      result[key] = nextValue;
    }
  }

  return result;
}

export function toCanonicalJson(
  value: unknown,
  options?: Pick<ComputeHashOptions, "lowercaseKeys" | "lowercaseArrayKeys">
): string {
  const canonical = canonicalizeForHash(value, [], options) ?? null;
  return JSON.stringify(canonical);
}

export interface StableHashResult {
  canonicalJson: string;
  sha256Hex: string;
  base32: string;
  redisKey: string;
}

export function computeStableHash(
  orgId: string,
  version: string,
  payload: unknown,
  options?: ComputeHashOptions,
): StableHashResult {
    const canonicalJson = toCanonicalJson(payload, options);
    const digest = createHash("sha256").update(canonicalJson, "utf8").digest();
    const sha256Hex = digest.toString("hex");
    const base32 = toBase32(digest).slice(0, options?.hashLength ?? DEFAULT_HASH_LENGTH);
    const prefix = options?.prefix ?? DEFAULT_PREFIX;
    const redisKey = `${prefix}:${orgId}:${version}:${base32}`;

    return {
      canonicalJson,
      sha256Hex,
      base32,
      redisKey,
    };
}

export function toBase32(buffer: Buffer): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const index = (value >>> (bits - 5)) & 0b11111;
      output += alphabet[index];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const index = (value << (5 - bits)) & 0b11111;
    output += alphabet[index];
  }

  return output;
}

function roundNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function isPrimitive(value: CanonicalValue): value is string | number | boolean {
  const valueType = typeof value;
  return valueType === "string" || valueType === "number" || valueType === "boolean";
}

function arePrimitiveArray(values: CanonicalValue[]): values is Primitive[] {
  return values.every(isPrimitive);
}

function primitiveComparator(a: Primitive, b: Primitive): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }

  return normalizePrimitive(a).localeCompare(normalizePrimitive(b));
}

function normalizePrimitive(value: Primitive): string {
  if (typeof value === "string") {
    return `s:${value}`;
  }
  if (typeof value === "number") {
    return `n:${value}`;
  }
  return value ? "b:1" : "b:0";
}
