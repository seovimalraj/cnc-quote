// DFM taxonomy canonical contracts (v1)

export type DfmSeverityV1 = 'info' | 'warn' | 'critical';

export type DfmIssueCategoryV1 =
  | 'undercut'
  | 'thin_wall'
  | 'deep_hole'
  | 'bend_radius'
  | 'tolerance_risk'
  | 'material_flag'
  | 'feature_density'
  | 'surface_finish_risk'
  | 'geometry_complexity';

export interface DfmIssueRefV1 {
  feature_ids?: string[];
  face_ids?: string[];
  note?: string;
}

export interface DfmIssueV1 {
  id: string;
  severity: DfmSeverityV1;
  category: DfmIssueCategoryV1;
  message: string;
  recommendation?: string;
  refs?: DfmIssueRefV1;
  auto_fixable?: boolean;
}

export interface DfmResultV1 {
  part_id: string;
  status: 'pending' | 'complete' | 'failed';
  issues: DfmIssueV1[];
  generated_at?: string;
}
