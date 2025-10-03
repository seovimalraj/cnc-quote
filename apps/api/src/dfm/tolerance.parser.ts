import { lookupIsoFitTolerance, normalizeIsoFitTolerance } from "../materials/iso-fits";
import type {
  ToleranceAppliesTo,
  ToleranceFeatureType,
  ToleranceUnit,
} from "../pricing/repositories/tolerance-cost-book.repo";

export type StructuredToleranceInput = StructuredToleranceEntry[];

export interface StructuredToleranceEntry {
  featureId?: string;
  featureType: ToleranceFeatureType;
  appliesTo: LooseAppliesTo;
  value: number;
  unit: ToleranceUnit;
}

export type NormalizedToleranceSource = "structured" | "free_text" | "iso_fit";

export interface NormalizedTolerance {
  featureId?: string;
  featureType: ToleranceFeatureType;
  appliesTo: LooseAppliesTo;
  unit: "mm" | "deg";
  value: number;
  valueRounded: number;
  rawValue: number;
  rawUnit: ToleranceUnit;
  source: NormalizedToleranceSource;
  reviewRequired?: boolean;
  fitCode?: string;
  notes?: string;
}

export type NormalizedToleranceMap = Record<string, NormalizedTolerance>;

type LooseAppliesTo = ToleranceAppliesTo | (string & Record<never, never>);
type UnitHint = "mm" | "um" | "deg";

interface ParsedFreeTextTolerance {
  key?: string;
  featureType: ToleranceFeatureType;
  appliesTo: LooseAppliesTo;
  value: number;
  unit: ToleranceUnit;
  source: NormalizedToleranceSource;
  notes?: string;
  fitCode?: string;
  contextKey?: string;
}

const MAX_TOLERANCE_ENTRIES = 500;
const MIN_TOLERANCE_MM = 0.001;
const MAX_TOLERANCE_MM = 1.0;
const MIN_TOLERANCE_DEG = 0.01;
const MAX_TOLERANCE_DEG = 5;

const ISO_FIT_CODES = new Set(["H7", "H6", "G6", "g6"]);

const HTML_TAG_REGEX = /<[^>]*>/g;
const PLUS_MINUS_REGEX = /(?:±|\+\/-)\s*(\d+(?:\.\d+)?)(?:\s*(mm|µm|um|deg))?/gi;
const TRUE_POSITION_REGEX = /(?:TP|True\s*Position)\s*(\d+(?:\.\d+)?)(?:\s*(mm|µm|um))?/gi;
const FLATNESS_REGEX = /flatness\s*(\d+(?:\.\d+)?)(?:\s*(mm|µm|um))?/gi;
const ISO_FIT_CODE_REGEX = /(?:[A-Za-z]{1,2}\d{1,2}|\d{1,2}[A-Za-z]{1,2})/g;
const DIAMETER_LOOKBEHIND_REGEX = /[Ø⌀]\s*(\d+(?:\.\d+)?)/gi;

export function parseTolerances(
  input: StructuredToleranceInput | string | null | undefined,
  unitsHint: UnitHint = "mm",
): NormalizedToleranceMap {
  if (!input) {
    return {};
  }

  if (Array.isArray(input)) {
    return normalizeStructuredInput(input);
  }

  const sanitized = sanitizeFreeText(input);
  if (!sanitized) {
    return {};
  }

  const parsedEntries = parseFreeText(sanitized, unitsHint);
  return collapseParsedEntries(parsedEntries);
}

function normalizeStructuredInput(entries: StructuredToleranceInput): NormalizedToleranceMap {
  const result: NormalizedToleranceMap = {};
  const limited = entries.slice(0, MAX_TOLERANCE_ENTRIES);

  limited.forEach((entry, index) => {
    if (!Number.isFinite(entry.value) || entry.value <= 0) {
      return;
    }

    const normalized = normalizeValue(entry.value, entry.unit);
    const key = entry.featureId ?? buildAutoKey(entry.featureType, entry.appliesTo, index);
    result[key] = {
      featureId: entry.featureId,
      featureType: entry.featureType,
      appliesTo: entry.appliesTo,
      unit: inferOutputUnit(entry.unit),
      value: normalized.normalized,
      valueRounded: normalized.rounded,
      rawValue: entry.value,
      rawUnit: entry.unit,
      source: "structured",
      reviewRequired: normalized.reviewRequired,
    };
  });

  return result;
}

function sanitizeFreeText(input: string): string {
  if (!input) {
    return "";
  }
  return input.trim().slice(0, 32768).replace(HTML_TAG_REGEX, "");
}

function parseFreeText(note: string, unitsHint: UnitHint): ParsedFreeTextTolerance[] {
  const seenNumericContexts = new Set<string>();
  const entries: ParsedFreeTextTolerance[] = [];

  extractPlusMinus(note, unitsHint).forEach((entry) => {
    entries.push(entry);
    if (entry.contextKey) {
      seenNumericContexts.add(entry.contextKey);
    }
  });

  entries.push(...extractTruePosition(note, unitsHint));
  entries.push(...extractFlatness(note, unitsHint));
  entries.push(...extractIsoFits(note, seenNumericContexts));

  return assignKeys(entries);
}

function extractPlusMinus(note: string, unitsHint: UnitHint): ParsedFreeTextTolerance[] {
  const results: ParsedFreeTextTolerance[] = [];
  PLUS_MINUS_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PLUS_MINUS_REGEX.exec(note)) !== null) {
    const diameterStr = match[1];
    const valueStr = match[2];
    const unitStr = match[3];

    if (!valueStr) {
      continue;
    }

    const value = Number(valueStr);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    const unit = normalizeUnit(unitStr, unitsHint);
    const featureType: ToleranceFeatureType = diameterStr ? "hole" : "profile";
    const appliesTo: LooseAppliesTo = diameterStr ? "diameter" : "generic";

    results.push({
      featureType,
      appliesTo,
      value,
      unit,
      source: "free_text",
      contextKey: diameterStr ? keyFromContext(featureType, appliesTo, diameterStr) : undefined,
    });
  }

  return results;
}

function extractTruePosition(note: string, unitsHint: UnitHint): ParsedFreeTextTolerance[] {
  const results: ParsedFreeTextTolerance[] = [];
  TRUE_POSITION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TRUE_POSITION_REGEX.exec(note)) !== null) {
    const valueStr = match[1];
    if (!valueStr) {
      continue;
    }
    const value = Number(valueStr);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    const unit = normalizeUnit(match[2], unitsHint === "deg" ? "mm" : unitsHint);
    results.push({
      featureType: "position",
      appliesTo: "true_position",
      value,
      unit,
      source: "free_text",
      notes: "true position",
    });
  }

  return results;
}

function extractFlatness(note: string, unitsHint: UnitHint): ParsedFreeTextTolerance[] {
  const results: ParsedFreeTextTolerance[] = [];
  FLATNESS_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FLATNESS_REGEX.exec(note)) !== null) {
    const valueStr = match[1];
    if (!valueStr) {
      continue;
    }
    const value = Number(valueStr);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    const unit = normalizeUnit(match[2], unitsHint);
    results.push({
      featureType: "flatness",
      appliesTo: "flatness",
      value,
      unit,
      source: "free_text",
      notes: "flatness",
    });
  }

  return results;
}

function extractIsoFits(note: string, seenNumericContexts: Set<string>): ParsedFreeTextTolerance[] {
  const results: ParsedFreeTextTolerance[] = [];
  ISO_FIT_CODE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ISO_FIT_CODE_REGEX.exec(note)) !== null) {
    const codeRaw = match[0];
    const diameterStr = findDiameterBefore(note, match.index ?? 0);
    if (!codeRaw || !diameterStr) {
      continue;
    }

    const normalizedCode = codeRaw.trim().toUpperCase();
    if (!ISO_FIT_CODES.has(normalizedCode)) {
      continue;
    }

    const diameter = Number(diameterStr);
    if (!Number.isFinite(diameter) || diameter <= 0) {
      continue;
    }

  const contextKey = keyFromContext("hole", "diameter", diameterStr);
    if (seenNumericContexts.has(contextKey)) {
      continue;
    }

    const toleranceMm = normalizeIsoFitTolerance(normalizedCode, diameter);
    if (toleranceMm === null) {
      continue;
    }

    results.push({
      featureType: "hole",
      appliesTo: "diameter",
      value: toleranceMm,
      unit: "mm",
      source: "iso_fit",
      fitCode: normalizedCode,
      notes: createIsoFitNote(normalizedCode, diameter),
    });
  }

  return results;
}

function assignKeys(entries: ParsedFreeTextTolerance[]): ParsedFreeTextTolerance[] {
  const keyed: ParsedFreeTextTolerance[] = [];
  let counter = 0;

  entries.forEach((entry) => {
    if (!entry.key) {
      entry.key = buildAutoKey(entry.featureType, entry.appliesTo, counter);
      counter += 1;
    }
    keyed.push(entry);
  });

  return keyed.slice(0, MAX_TOLERANCE_ENTRIES);
}

function collapseParsedEntries(entries: ParsedFreeTextTolerance[]): NormalizedToleranceMap {
  const map: NormalizedToleranceMap = {};
  const priority: Record<NormalizedToleranceSource, number> = {
    structured: 3,
    free_text: 2,
    iso_fit: 1,
  };

  entries.forEach((entry) => {
    const normalized = normalizeValue(entry.value, entry.unit);
    const outputUnit = inferOutputUnit(entry.unit);
    const key = entry.key ?? buildAutoKey(entry.featureType, entry.appliesTo, 0);
    const next: NormalizedTolerance = {
      featureType: entry.featureType,
      appliesTo: entry.appliesTo,
      unit: outputUnit,
      value: normalized.normalized,
      valueRounded: normalized.rounded,
      rawValue: entry.value,
      rawUnit: entry.unit,
      source: entry.source,
      reviewRequired: normalized.reviewRequired,
      fitCode: entry.fitCode,
      notes: entry.notes,
    };

    const existing = map[key];
    if (!existing || priority[entry.source] >= priority[existing.source]) {
      map[key] = next;
    }
  });

  return map;
}

function buildAutoKey(featureType: ToleranceFeatureType, appliesTo: LooseAppliesTo, index: number): string {
  return `${featureType}:${appliesTo}:${index}`;
}

function keyFromContext(featureType: ToleranceFeatureType, appliesTo: LooseAppliesTo, suffix: string): string {
  return `${featureType}|${appliesTo}|${suffix}`;
}

function normalizeUnit(unit: string | undefined, hint: "mm" | "um" | "deg"): ToleranceUnit {
  if (!unit) {
    return hint as ToleranceUnit;
  }
  const normalized = unit.toLowerCase();
  if (normalized === "mm" || normalized === "deg") {
    return normalized as ToleranceUnit;
  }
  if (normalized === "µm" || normalized === "um" || normalized === "micron" || normalized === "microns") {
    return "um";
  }
  return hint as ToleranceUnit;
}

function inferOutputUnit(unit: ToleranceUnit): "mm" | "deg" {
  return unit === "deg" ? "deg" : "mm";
}

function normalizeValue(value: number, unit: ToleranceUnit): {
  normalized: number;
  rounded: number;
  reviewRequired: boolean;
} {
  const baseValue = unit === "um" ? value / 1000 : value;
  const clamp = clampTolerance(baseValue, unit);
  return {
    normalized: clamp.value,
    rounded: Number(clamp.value.toFixed(3)),
    reviewRequired: clamp.reviewRequired,
  };
}

function clampTolerance(value: number, unit: ToleranceUnit): { value: number; reviewRequired: boolean } {
  if (!Number.isFinite(value) || value <= 0) {
    return {
      value: unit === "deg" ? MIN_TOLERANCE_DEG : MIN_TOLERANCE_MM,
      reviewRequired: true,
    };
  }

  const min = unit === "deg" ? MIN_TOLERANCE_DEG : MIN_TOLERANCE_MM;
  const max = unit === "deg" ? MAX_TOLERANCE_DEG : MAX_TOLERANCE_MM;

  if (value < min) {
    return { value: min, reviewRequired: true };
  }
  if (value > max) {
    return { value: max, reviewRequired: true };
  }

  return { value, reviewRequired: false };
}

function createIsoFitNote(code: string, diameter: number): string {
  const details = lookupIsoFitTolerance(code, diameter);
  if (!details) {
    return `ISO ${code}`;
  }
  const upper = details.upperMicrons.toFixed(0);
  const lower = details.lowerMicrons.toFixed(0);
  return `ISO ${code} @ Ø${diameter}mm (+${upper}µm / ${lower}µm)`;
}

function findDiameterBefore(note: string, index: number): string | null {
  if (index <= 0) {
    return null;
  }

  const windowStart = Math.max(0, index - 48);
  const snippet = note.slice(windowStart, index);
  if (!snippet) {
    return null;
  }

  let match: RegExpExecArray | null;
  let last: string | null = null;
  DIAMETER_LOOKBEHIND_REGEX.lastIndex = 0;
  while ((match = DIAMETER_LOOKBEHIND_REGEX.exec(snippet)) !== null) {
    if (match[1]) {
      last = match[1];
    }
  }

  return last;
}
