export interface QapDocumentInput {
  templateId: string;
  orderId: string;
  orderItemId: string;
  orgId: string;
  userId: string;
  documentData: QapDocumentData;
}

export interface QapDocumentData extends Record<string, unknown> {
  part: {
    name: string;
    material: string;
    quantity: number;
  };
  measurements: Array<{
    id: string;
    name: string;
    nominal: number;
    tolerance: number;
    actual?: number;
    result?: string;
  }>;
  inspection: {
    inspector: string;
    date: string;
    result: string;
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
  result?: "PASS" | "FAIL";
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
