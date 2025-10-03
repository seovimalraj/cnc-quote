// Manufacturing feature types and their properties
export type FeatureType =
  | 'hole' | 'thread' | 'pocket' | 'boss' | 'rib' | 'undercut'
  | 'thin_wall' | 'fillet' | 'chamfer' | 'slot' | 'groove'
  | 'boss_hole' | 'counterbore' | 'countersink';

export interface FeatureLocation {
  position: [number, number, number]; // XYZ coordinates in mm
  orientation?: [number, number, number]; // Normal vector or axis direction
}

export interface FeatureDimensions {
  diameter?: number; // For cylindrical features (holes, bosses)
  depth?: number; // For depth-based features
  width?: number; // For rectangular features
  height?: number; // For height-based features
  length?: number; // For linear features
  radius?: number; // For curved features
  angle?: number; // For angled features (chamfers, etc.)
}

export interface FeatureProperties {
  type: FeatureType;
  location: FeatureLocation;
  dimensions: FeatureDimensions;
  tolerance?: {
    diameter?: number; // Tolerance on diameter in mm
    position?: number; // Positional tolerance in mm
    perpendicularity?: number; // Angular tolerance in degrees
  };
  surface_finish?: string; // Required surface finish
  thread_spec?: {
    pitch: number; // Thread pitch in mm
    type: 'metric' | 'unified' | 'acme' | 'buttress';
    class: 'coarse' | 'fine' | 'extra_fine';
  };
  material_removal?: number; // Volume of material to remove in mm³
  machining_difficulty: number; // 1-10 scale of machining complexity
  dff_issues?: string[]; // Design for manufacturability issues
}

export interface FeatureExtractionResult {
  features: FeatureProperties[];
  summary: {
    total_features: number;
    feature_counts: Record<FeatureType, number>;
    total_material_removal: number;
    complexity_score: number; // 1-10 overall part complexity
    dff_violations: string[]; // Major DFM issues found
  };
  metadata: {
    extraction_method: string;
    confidence_score: number; // 0-1 confidence in results
    processing_time_ms: number;
    version: string;
  };
}

// Feature extraction configuration
export interface FeatureExtractionConfig {
  min_hole_diameter: number; // Minimum hole diameter to detect (mm)
  min_feature_size: number; // Minimum feature size to consider (mm)
  tolerance_sensitivity: number; // How sensitive to detect tight tolerances
  surface_finish_detection: boolean; // Whether to analyze surface finishes
  thread_detection: boolean; // Whether to detect threads
  undercut_detection: boolean; // Whether to detect undercuts
}

// DFM rules for feature validation
export interface DFMRule {
  feature_type: FeatureType;
  condition: (feature: FeatureProperties) => boolean;
  severity: 'warning' | 'error' | 'info';
  message: string;
  suggestion?: string;
}

export const DFM_RULES: DFMRule[] = [
  {
    feature_type: 'hole',
    condition: (f) => (f.dimensions.diameter || 0) < 1.0,
    severity: 'error',
    message: 'Hole diameter too small for standard drills',
    suggestion: 'Increase diameter to ≥1.0mm or use micro-drilling'
  },
  {
    feature_type: 'hole',
    condition: (f) => (f.dimensions.depth || 0) / (f.dimensions.diameter || 1) > 10,
    severity: 'warning',
    message: 'Deep hole (depth:diameter ratio > 10:1)',
    suggestion: 'Consider peck drilling or gun drilling'
  },
  {
    feature_type: 'thin_wall',
    condition: (f) => (f.dimensions.height || 0) < 0.5,
    severity: 'error',
    message: 'Wall thickness too thin for machining',
    suggestion: 'Increase wall thickness to ≥0.5mm'
  },
  {
    feature_type: 'thread',
    condition: (f) => (f.dimensions.diameter || 0) < 3.0,
    severity: 'warning',
    message: 'Small diameter thread may be difficult to machine',
    suggestion: 'Consider larger diameter or alternative fastening'
  },
  {
    feature_type: 'undercut',
    condition: () => true, // All undercuts are problematic
    severity: 'warning',
    message: 'Undercut feature detected',
    suggestion: 'Redesign to eliminate undercut or use EDM'
  },
  {
    feature_type: 'boss',
    condition: (f) => (f.dimensions.diameter || 0) / (f.dimensions.height || 1) < 1.5,
    severity: 'info',
    message: 'Boss may be prone to vibration during machining',
    suggestion: 'Increase diameter or add support features'
  }
];