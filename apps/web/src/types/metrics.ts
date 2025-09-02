export interface Metrics {
  volume: number;
  surface_area: number;
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  primitive_features: {
    holes: number;
    pockets: number;
    slots: number;
    faces: number;
  };
}

export interface CadAnalysisResult {
  success: boolean;
  metrics?: Metrics;
  error?: string;
}
