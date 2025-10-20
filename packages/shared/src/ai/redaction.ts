import { createHash } from 'crypto';

const JSON_BYTE_LIMIT = 200_000;
const SENSITIVE_KEY_REGEX = /(token|secret|password|key|credential|email|phone|ssn|address|dob|birth)/i;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\+?[0-9][0-9\s().\-]{6,}[0-9]/g;
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,16}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const DOB_REGEX = /\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g;

function scrubText(value: string): string {
  return value
    .replace(EMAIL_REGEX, '[email]')
    .replace(PHONE_REGEX, '[phone]')
    .replace(CREDIT_CARD_REGEX, '[card]')
    .replace(SSN_REGEX, '[ssn]')
    .replace(DOB_REGEX, '[dob]');
}

function sanitizeString(value: string, previewLength = 128): string {
  const sanitized = scrubText(value ?? '').trim();
  if (sanitized.length > previewLength) {
    return `${sanitized.slice(0, previewLength / 2)}…${sanitized.slice(-previewLength / 2)} [truncated]`;
  }
  return sanitized;
}

function maskValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  return value;
}

export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(redactSensitive);
  }
  if (input && typeof input === 'object') {
    const entries = Object.entries(input as Record<string, unknown>).map(([key, value]) => {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        return [key, '[redacted]'] as const;
      }
      return [key, redactSensitive(value)] as const;
    });
    return Object.fromEntries(entries);
  }
  return maskValue(input);
}

export function toJsonWithLimit(value: unknown): unknown {
  const sanitized = redactSensitive(value);
  try {
    const serialized = JSON.stringify(sanitized ?? null);
    if (Buffer.byteLength(serialized, 'utf8') > JSON_BYTE_LIMIT) {
      return { truncated: true };
    }
    return JSON.parse(serialized);
  } catch {
    return { serializationError: true };
  }
}

export interface RedactedText {
  preview: string;
  digest: string;
  length: number;
}

export function redactPromptText(value: string, previewLength = 256): RedactedText {
  const sanitized = scrubText(value ?? '').trim();
  const preview = sanitized.length > previewLength ? `${sanitized.slice(0, previewLength)}…` : sanitized;
  const digest = createHash('sha256').update(sanitized).digest('hex');
  return {
    preview,
    digest,
    length: sanitized.length,
  };
}

export function buildPromptPayload(payload: unknown): unknown {
  return toJsonWithLimit(payload);
}

export function buildResponsePayload(payload: unknown): unknown {
  return toJsonWithLimit(payload);
}

export function sanitizePromptString(value: string): string {
  return scrubText(value ?? '').replace(/\s+/g, ' ').trim();
}
