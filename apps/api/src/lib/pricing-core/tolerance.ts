// Tolerance band definitions and cost mappings
export type ToleranceBand =
  | 'coarse' | 'medium' | 'fine' | 'precision' | 'ultra_precision';

export type ToleranceCategory =
  | 'linear' | 'angular' | 'flatness' | 'parallelism' | 'perpendicularity'
  | 'concentricity' | 'runout' | 'profile' | 'surface_finish';

export interface ToleranceSpec {
  band: ToleranceBand;
  category: ToleranceCategory;
  value_um?: number; // tolerance value in micrometers
  featureCategory?: string; // e.g., 'hole', 'slot', 'surface'
}

export interface ToleranceCostMapping {
  band: ToleranceBand;
  category: ToleranceCategory;
  baseMultiplier: number; // multiplier for machining time/cost
  setupMultiplier: number; // additional setup time multiplier
  inspectionMultiplier: number; // additional inspection cost multiplier
}

// Standard tolerance bands with typical ranges (micrometers)
export const TOLERANCE_BANDS = {
  coarse: { range_um: [100, 500], description: '±0.1-0.5mm' },
  medium: { range_um: [50, 100], description: '±0.05-0.1mm' },
  fine: { range_um: [10, 50], description: '±0.01-0.05mm' },
  precision: { range_um: [1, 10], description: '±0.001-0.01mm' },
  ultra_precision: { range_um: [0.1, 1], description: '<±0.001mm' },
} as const;

// Cost multipliers by tolerance band and category
export const TOLERANCE_COST_MAPPINGS: ToleranceCostMapping[] = [
  // Linear dimensions
  { band: 'coarse', category: 'linear', baseMultiplier: 1.0, setupMultiplier: 1.0, inspectionMultiplier: 1.0 },
  { band: 'medium', category: 'linear', baseMultiplier: 1.1, setupMultiplier: 1.05, inspectionMultiplier: 1.1 },
  { band: 'fine', category: 'linear', baseMultiplier: 1.3, setupMultiplier: 1.15, inspectionMultiplier: 1.3 },
  { band: 'precision', category: 'linear', baseMultiplier: 1.8, setupMultiplier: 1.4, inspectionMultiplier: 1.8 },
  { band: 'ultra_precision', category: 'linear', baseMultiplier: 2.5, setupMultiplier: 2.0, inspectionMultiplier: 3.0 },

  // Angular dimensions
  { band: 'coarse', category: 'angular', baseMultiplier: 1.0, setupMultiplier: 1.0, inspectionMultiplier: 1.0 },
  { band: 'medium', category: 'angular', baseMultiplier: 1.15, setupMultiplier: 1.1, inspectionMultiplier: 1.2 },
  { band: 'fine', category: 'angular', baseMultiplier: 1.4, setupMultiplier: 1.2, inspectionMultiplier: 1.5 },
  { band: 'precision', category: 'angular', baseMultiplier: 2.0, setupMultiplier: 1.5, inspectionMultiplier: 2.2 },
  { band: 'ultra_precision', category: 'angular', baseMultiplier: 3.0, setupMultiplier: 2.5, inspectionMultiplier: 4.0 },

  // Form tolerances (flatness, etc.)
  { band: 'coarse', category: 'flatness', baseMultiplier: 1.05, setupMultiplier: 1.02, inspectionMultiplier: 1.1 },
  { band: 'medium', category: 'flatness', baseMultiplier: 1.2, setupMultiplier: 1.1, inspectionMultiplier: 1.3 },
  { band: 'fine', category: 'flatness', baseMultiplier: 1.5, setupMultiplier: 1.3, inspectionMultiplier: 1.8 },
  { band: 'precision', category: 'flatness', baseMultiplier: 2.2, setupMultiplier: 1.8, inspectionMultiplier: 2.5 },
  { band: 'ultra_precision', category: 'flatness', baseMultiplier: 3.5, setupMultiplier: 2.8, inspectionMultiplier: 5.0 },

  // Orientation tolerances
  { band: 'coarse', category: 'parallelism', baseMultiplier: 1.1, setupMultiplier: 1.05, inspectionMultiplier: 1.2 },
  { band: 'medium', category: 'parallelism', baseMultiplier: 1.25, setupMultiplier: 1.15, inspectionMultiplier: 1.4 },
  { band: 'fine', category: 'parallelism', baseMultiplier: 1.6, setupMultiplier: 1.3, inspectionMultiplier: 1.9 },
  { band: 'precision', category: 'parallelism', baseMultiplier: 2.3, setupMultiplier: 1.9, inspectionMultiplier: 2.8 },
  { band: 'ultra_precision', category: 'parallelism', baseMultiplier: 3.8, setupMultiplier: 3.0, inspectionMultiplier: 6.0 },

  // Location tolerances
  { band: 'coarse', category: 'concentricity', baseMultiplier: 1.15, setupMultiplier: 1.1, inspectionMultiplier: 1.3 },
  { band: 'medium', category: 'concentricity', baseMultiplier: 1.35, setupMultiplier: 1.2, inspectionMultiplier: 1.6 },
  { band: 'fine', category: 'concentricity', baseMultiplier: 1.8, setupMultiplier: 1.4, inspectionMultiplier: 2.2 },
  { band: 'precision', category: 'concentricity', baseMultiplier: 2.6, setupMultiplier: 2.1, inspectionMultiplier: 3.5 },
  { band: 'ultra_precision', category: 'concentricity', baseMultiplier: 4.2, setupMultiplier: 3.5, inspectionMultiplier: 7.0 },

  // Runout
  { band: 'coarse', category: 'runout', baseMultiplier: 1.2, setupMultiplier: 1.15, inspectionMultiplier: 1.4 },
  { band: 'medium', category: 'runout', baseMultiplier: 1.4, setupMultiplier: 1.25, inspectionMultiplier: 1.7 },
  { band: 'fine', category: 'runout', baseMultiplier: 1.9, setupMultiplier: 1.5, inspectionMultiplier: 2.4 },
  { band: 'precision', category: 'runout', baseMultiplier: 2.8, setupMultiplier: 2.3, inspectionMultiplier: 3.8 },
  { band: 'ultra_precision', category: 'runout', baseMultiplier: 4.5, setupMultiplier: 3.8, inspectionMultiplier: 8.0 },

  // Profile/surface
  { band: 'coarse', category: 'profile', baseMultiplier: 1.1, setupMultiplier: 1.05, inspectionMultiplier: 1.2 },
  { band: 'medium', category: 'profile', baseMultiplier: 1.3, setupMultiplier: 1.2, inspectionMultiplier: 1.5 },
  { band: 'fine', category: 'profile', baseMultiplier: 1.7, setupMultiplier: 1.4, inspectionMultiplier: 2.1 },
  { band: 'precision', category: 'profile', baseMultiplier: 2.4, setupMultiplier: 2.0, inspectionMultiplier: 3.2 },
  { band: 'ultra_precision', category: 'profile', baseMultiplier: 4.0, setupMultiplier: 3.2, inspectionMultiplier: 6.5 },

  // Surface finish
  { band: 'coarse', category: 'surface_finish', baseMultiplier: 1.0, setupMultiplier: 1.0, inspectionMultiplier: 1.0 },
  { band: 'medium', category: 'surface_finish', baseMultiplier: 1.05, setupMultiplier: 1.02, inspectionMultiplier: 1.1 },
  { band: 'fine', category: 'surface_finish', baseMultiplier: 1.15, setupMultiplier: 1.05, inspectionMultiplier: 1.3 },
  { band: 'precision', category: 'surface_finish', baseMultiplier: 1.3, setupMultiplier: 1.1, inspectionMultiplier: 1.8 },
  { band: 'ultra_precision', category: 'surface_finish', baseMultiplier: 1.6, setupMultiplier: 1.2, inspectionMultiplier: 2.5 },
];

// Map ISO tolerance classes to our bands
export const ISO_TO_TOLERANCE_BAND: Record<string, ToleranceBand> = {
  'ISO2768-c': 'coarse',
  'ISO2768-m': 'medium',
  'ISO2768-f': 'fine',
  'ASMEB89-general': 'medium',
  'ASMEB89-precision': 'precision',
  'ASMEB89-ultra': 'ultra_precision',
};

// Feature category mappings for enhanced cost calculation
export const FEATURE_TOLERANCE_MULTIPLIERS: Record<string, number> = {
  'hole': 1.2,      // Holes are harder to tolerance
  'slot': 1.1,      // Slots moderately harder
  'pocket': 1.15,   // Pockets complex
  'boss': 1.1,      // Bosses moderately complex
  'surface': 1.0,   // Base surface tolerance
  'thread': 1.3,    // Threads very precise
  'gear': 1.4,      // Gears complex
  'keyway': 1.25,   // Keyways precise
};

export const TOLERANCE_CLASS_TO_BAND: Record<string, ToleranceBand> = {
  standard: 'medium',
  loose: 'coarse',
  fine: 'fine',
  tight: 'precision',
  precision: 'precision',
  high: 'precision',
  critical: 'ultra_precision',
  custom: 'fine',
};

export const TOLERANCE_ID_TO_BAND: Record<string, ToleranceBand> = {
  'iso-2768-c': 'coarse',
  'iso-2768-m': 'medium',
  'iso-2768-f': 'fine',
  'precision-001': 'precision',
  'precision-005': 'ultra_precision',
  'ansi b4.1': 'precision',
  'ansi-b4.1': 'precision',
  'standard': 'medium',
  'loose': 'coarse',
  'tight': 'precision',
  'critical': 'ultra_precision',
  'std': 'medium',
  'tighten': 'precision',
};

const DEFAULT_TOLERANCE_BAND: ToleranceBand = 'medium';

const DEFAULT_CATEGORY_MAP: Record<string, ToleranceCategory> = {
  hole: 'linear',
  holes: 'linear',
  pocket: 'linear',
  pockets: 'linear',
  slot: 'linear',
  slots: 'linear',
  thread: 'linear',
  threads: 'linear',
  face: 'flatness',
  faces: 'flatness',
  surface: 'flatness',
  bends: 'parallelism',
  bend: 'parallelism',
};

function mapToleranceIdToBand(id: string | undefined | null): ToleranceBand | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return TOLERANCE_ID_TO_BAND[normalized];
}

function mapToleranceClassToBand(toleranceClass: string | undefined | null): ToleranceBand | undefined {
  if (!toleranceClass) return undefined;
  const normalized = toleranceClass.trim().toLowerCase();
  return TOLERANCE_CLASS_TO_BAND[normalized];
}

export function resolveToleranceCategory(
  featureCategory?: string,
  defaultCategory: ToleranceCategory = 'linear',
): ToleranceCategory {
  if (!featureCategory) return defaultCategory;
  const normalized = featureCategory.trim().toLowerCase();
  return DEFAULT_CATEGORY_MAP[normalized] || defaultCategory;
}

export function resolveToleranceMapping(options: {
  toleranceIds?: string[] | null;
  toleranceClass?: string | null;
  featureCategory?: string | null;
  defaultCategory?: ToleranceCategory;
}): {
  band: ToleranceBand;
  category: ToleranceCategory;
  mapping: ToleranceCostMapping;
  source: 'id' | 'class' | 'default';
} {
  const { toleranceIds, toleranceClass, featureCategory, defaultCategory = 'linear' } = options;

  let band: ToleranceBand | undefined;
  let source: 'id' | 'class' | 'default' = 'default';

  if (toleranceIds && toleranceIds.length > 0) {
    for (const id of toleranceIds) {
      const mapped = mapToleranceIdToBand(id);
      if (mapped) {
        band = mapped;
        source = 'id';
        break;
      }
    }
  }

  if (!band) {
    const mappedClass = mapToleranceClassToBand(toleranceClass);
    if (mappedClass) {
      band = mappedClass;
      source = 'class';
    }
  }

  const resolvedBand = band || DEFAULT_TOLERANCE_BAND;
  const resolvedCategory = resolveToleranceCategory(featureCategory || undefined, defaultCategory);

  const mapping =
    TOLERANCE_COST_MAPPINGS.find(m => m.band === resolvedBand && m.category === resolvedCategory) ||
    TOLERANCE_COST_MAPPINGS.find(m => m.band === resolvedBand && m.category === 'linear') ||
    TOLERANCE_COST_MAPPINGS.find(m => m.band === DEFAULT_TOLERANCE_BAND && m.category === 'linear') ||
    TOLERANCE_COST_MAPPINGS[0];

  if (!mapping) {
    throw new Error(`No tolerance mapping found for band=${resolvedBand}`);
  }

  const finalCategory = mapping.category;

  return {
    band: resolvedBand,
    category: finalCategory,
    mapping,
    source,
  };
}
