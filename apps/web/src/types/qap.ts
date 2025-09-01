export interface QapTemplate {
  id: string;
  name: string;
  description?: string;
  template_html: string;
  process_type: 'cnc' | 'sheet' | 'im';
  schema_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QapPreviewData {
  part: {
    name: string;
    material: string;
    quantity: number;
  };
  measurements: Array<{
    dimension: string;
    nominal: number;
    tolerance: string;
    actual: number;
  }>;
  inspection: {
    inspector: string;
    date: string;
    result: 'PASS' | 'FAIL';
  };
}
