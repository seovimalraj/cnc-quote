export interface QapDocumentInput {
  templateId: string;
  orderId: string;
  orderItemId: string;
  orgId: string;
  userId: string;
  documentData: QapDocumentData;
}

export interface QapDocumentData extends Record<string, unknown> {
  // Cover page data
  cover?: {
    partName: string;
    company: string;
    date: string;
    dfmRequestId: string;
  };

  // Summary data
  summary?: {
    criticality: string;
    industry: string;
    certifications: string[];
    checkCounts: {
      pass: number;
      warning: number;
      fail: number;
    };
  };

  // DFM findings
  dfmFindings?: {
    checks: Array<{
      id: string;
      name: string;
      status: string;
      message: string;
      category: string;
      severity: string;
    }>;
    criticalChecks: Array<{
      name: string;
      issue: string;
      recommendation: string;
    }>;
  };

  // Quality plan
  qualityPlan?: {
    inspectionMethods: string[];
    samplingPlan: string;
    instruments: string[];
  };

  // Process controls
  processControls?: {
    workholding: string;
    toolAccess: string;
    coolant: string;
    deburr: string;
    specialHandling: string[];
  };

  // Material and finish controls
  materialControls?: {
    traceability: string;
    finishSpec: string;
    capacityNotes: string;
  };

  // Acceptance criteria
  acceptanceCriteria?: {
    tolerancePack: string;
    surfaceRoughness: string;
    dimensionalTolerance: string;
  };

  // Measurement plan (if applicable)
  measurementPlan?: {
    method: string;
    frequency: string;
    instruments: string[];
  };

  // Sign-off sections
  signOff?: {
    supplierSignature: {
      name: string;
      title: string;
      date: string;
      company: string;
    };
    customerSignature: {
      name: string;
      title: string;
      date: string;
      company: string;
    };
  };

  // Legacy fields for backward compatibility
  part?: {
    name: string;
    material: string;
    quantity: number;
  };
  measurements?: Array<{
    id: string;
    name: string;
    nominal: number;
    tolerance: number;
    actual?: number;
    result?: string;
  }>;
  inspection?: {
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
