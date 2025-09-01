export interface QapDocumentInput {
  templateId: string;
  orderId: string;
  orderItemId: string;
  orgId: string;
  userId: string;
  documentData: QapDocumentData;
}

export interface QapDocumentData {
  part: {
    name: string;
    material: string;
    quantity: number;
  };
  measurements: QapMeasurement[];
  inspection: {
    inspector: string;
    date: string;
    result: 'PENDING' | 'PASS' | 'FAIL';
  };
}

export interface QapMeasurement {
  name: string;
  nominal: number;
  tolerance: {
    upper: number;
    lower: number;
  };
  actual?: number;
  result?: 'PASS' | 'FAIL';
}

export interface QapValidationResult {
  valid: boolean;
  errors: string[];
}

export interface QapPdfOptions {
  title?: string;
  logo?: string;
  footer?: string;
  fonts?: Record<string, Buffer>;
}
