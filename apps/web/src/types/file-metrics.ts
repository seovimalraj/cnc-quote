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
}
