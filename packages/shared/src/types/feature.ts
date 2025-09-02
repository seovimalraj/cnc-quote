export interface FeatureRule {
  id: string;
  feature_type_id: string;
  machine_id: string;
  complexity_bracket_id: string | null;
  min_dimension_mm: number | null;
  max_dimension_mm: number | null;
  time_minutes: number;
  multiplier: number;
  machine: {
    name: string;
    process_type: string;
  };
}

export interface FeatureType {
  id: string;
  name: string;
  type: string;
  description: string;
  machine_feature_rules: FeatureRule[];
  sheet_features: FeatureRule[];
  im_features: FeatureRule[];
}
