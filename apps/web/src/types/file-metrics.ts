export interface FileMetrics {
  volume: number;
  surface_area: number;
  bbox: {
    min: {
      x: number;
      y: number;
      z: number;
    };
    max: {
      x: number;
      y: number;
      z: number;
    };
  };
  primitive_features: {
    holes: number;
    pockets: number;
    slots: number;
    faces: number;
  };
  feature_summary?: {
    total?: number;
    counts: Record<string, number>;
    dominant_feature?: string;
    risk_flags?: string[];
  };
}
