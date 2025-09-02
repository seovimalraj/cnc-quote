export interface MaterialCosting {
  id: string;
  material_id: string;
  supplier: string;
  grade: string;
  cost_per_kg: number;
  moq_kg: number;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialProperties {
  id: string;
  material_id: string;
  key: string;
  value: string | number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineMaterial {
  id: string;
  material_id: string;
  machine_id: string;
  cutting_speed_m_min?: number;
  feed_rate_mm_rev?: number;
  depth_of_cut_mm?: number;
  machine: {
    id: string;
    name: string;
    process_type: string;
  };
}

export interface Material {
  id: string;
  name: string;
  category: 'metal' | 'plastic' | 'composite';
  density: number;
  cost_per_kg: number;
  material_costing?: MaterialCosting[];
  machine_materials?: MachineMaterial[];
  created_at: string;
  updated_at: string;
}
