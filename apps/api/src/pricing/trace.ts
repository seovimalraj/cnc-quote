import { createHash } from 'crypto';
import { TraceEntry } from './types';

// Stable stringify for consistent hashing
export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

// SHA-256 hash of input
export function hashInput(input: unknown): string {
  const str = stableStringify(input);
  return createHash('sha256').update(str).digest('hex');
}

// Create a trace entry
export function createTraceEntry(
  factor: string,
  input: unknown,
  output: Record<string, unknown>,
  note?: string
): TraceEntry {
  return {
    at: new Date().toISOString(),
    factor,
    inputHash: hashInput(input),
    output,
    note,
  };
}

// Validate trace entries (basic sanity check)
export function validateTrace(trace: TraceEntry[]): boolean {
  if (!Array.isArray(trace)) return false;
  return trace.every(entry =>
    entry.at &&
    entry.factor &&
    entry.inputHash &&
    entry.output &&
    typeof entry.output === 'object'
  );
}