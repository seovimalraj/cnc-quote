export interface IsoFitRange {
  minDiameter: number; // inclusive (mm)
  maxDiameter: number; // exclusive (mm)
  upperMicrons: number;
  lowerMicrons: number;
}

export interface IsoFitTolerance {
  code: string;
  diameter: number;
  upperMicrons: number;
  lowerMicrons: number;
  upperMm: number;
  lowerMm: number;
  toleranceMm: number;
}

const ISO_FIT_DATA: Record<string, IsoFitRange[]> = {
  H7: [
    { minDiameter: 0, maxDiameter: 3, upperMicrons: 12, lowerMicrons: 0 },
    { minDiameter: 3, maxDiameter: 6, upperMicrons: 16, lowerMicrons: 0 },
    { minDiameter: 6, maxDiameter: 10, upperMicrons: 18, lowerMicrons: 0 },
    { minDiameter: 10, maxDiameter: 18, upperMicrons: 21, lowerMicrons: 0 },
    { minDiameter: 18, maxDiameter: 30, upperMicrons: 25, lowerMicrons: 0 },
    { minDiameter: 30, maxDiameter: 50, upperMicrons: 30, lowerMicrons: 0 },
  ],
  H6: [
    { minDiameter: 0, maxDiameter: 3, upperMicrons: 8, lowerMicrons: 0 },
    { minDiameter: 3, maxDiameter: 6, upperMicrons: 10, lowerMicrons: 0 },
    { minDiameter: 6, maxDiameter: 10, upperMicrons: 13, lowerMicrons: 0 },
    { minDiameter: 10, maxDiameter: 18, upperMicrons: 16, lowerMicrons: 0 },
    { minDiameter: 18, maxDiameter: 30, upperMicrons: 20, lowerMicrons: 0 },
    { minDiameter: 30, maxDiameter: 50, upperMicrons: 25, lowerMicrons: 0 },
  ],
  g6: [
    { minDiameter: 3, maxDiameter: 6, upperMicrons: -1, lowerMicrons: -7 },
    { minDiameter: 6, maxDiameter: 10, upperMicrons: -2, lowerMicrons: -9 },
    { minDiameter: 10, maxDiameter: 18, upperMicrons: -3, lowerMicrons: -11 },
    { minDiameter: 18, maxDiameter: 30, upperMicrons: -4, lowerMicrons: -13 },
    { minDiameter: 30, maxDiameter: 50, upperMicrons: -5, lowerMicrons: -16 },
  ],
};

const NORMALIZED_ALIASES: Record<string, string> = {
  "6H": "H6",
};

export function lookupIsoFitTolerance(code: string, diameterMm: number): IsoFitTolerance | null {
  if (!code) {
    return null;
  }
  const normalizedCode = normalizeCode(code);
  const ranges = ISO_FIT_DATA[normalizedCode];
  if (!ranges || diameterMm <= 0) {
    return null;
  }

  const range = ranges.find((entry) => diameterMm >= entry.minDiameter && diameterMm < entry.maxDiameter)
    ?? ranges[ranges.length - 1];

  if (!range) {
    return null;
  }

  const upperMicrons = range.upperMicrons;
  const lowerMicrons = range.lowerMicrons;
  const upperMm = upperMicrons / 1000;
  const lowerMm = lowerMicrons / 1000;
  const toleranceMm = Math.max(Math.abs(upperMm - lowerMm), Math.abs(upperMm), Math.abs(lowerMm));

  return {
    code: normalizedCode,
    diameter: diameterMm,
    upperMicrons,
    lowerMicrons,
    upperMm,
    lowerMm,
    toleranceMm,
  };
}

export function normalizeIsoFitTolerance(code: string, diameterMm: number): number | null {
  const result = lookupIsoFitTolerance(code, diameterMm);
  if (!result) {
    return null;
  }
  return Math.max(Math.abs(result.upperMm), Math.abs(result.lowerMm), result.toleranceMm);
}

function normalizeCode(code: string): string {
  const trimmed = code.trim();
  const alias = NORMALIZED_ALIASES[trimmed];
  if (alias) {
    return alias;
  }
  if (/^\d+[A-Za-z]$/.test(trimmed)) {
    // convert shaft fit like "6H" -> "H6"
    const grade = trimmed.replace(/\D/g, "");
    const letter = trimmed.replace(/[^A-Za-z]/g, "").toUpperCase();
    const canonical = `${letter}${grade}`;
    return NORMALIZED_ALIASES[canonical] ?? canonical;
  }
  return trimmed.toUpperCase();
}
