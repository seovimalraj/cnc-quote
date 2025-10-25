export interface ProcessType {
  type: "milling" | "turning" | "laser_cutting" | "press_brake" | "injection";
}

export interface CncDfmParams {
  processType: "milling" | "turning";
  volume_cc: number;
  surface_area_cm2: number;
  min_wall_thickness: number;
  max_depth: number;
  aspect_ratio: number;
  features: {
    holes: number;
    pockets: number;
    slots: number;
    faces: number;
  };
}

export interface SheetMetalDfmParams {
  processType: "laser_cutting" | "press_brake";
  thickness_mm: number;
  min_bend_radius: number;
  min_hole_diameter: number;
  min_distance_between_features: number;
  features: {
    bends: number;
    holes: number;
    slots: number;
    corners: number;
  };
}

export interface InjectionMoldingDfmParams {
  processType: "injection";
  part_volume_cc: number;
  shot_weight_g: number;
  cycle_time_s: number;
  cavity_count: number;
  mold_complexity: number;
  features: {
    undercuts: number;
    side_actions: number;
    textures: number;
  };
}
