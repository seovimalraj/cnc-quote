/**
 * Step 17: Marketplace v0 - Shared Types
 * Types for suppliers, capabilities, routing rules, and order assignment
 */

// Enums
export type Certification = 
  | 'ISO9001' 
  | 'AS9100' 
  | 'ITAR' 
  | 'ISO13485' 
  | 'IATF16949' 
  | 'NONE';

export type Process = 
  | 'CNC_MILLING' 
  | 'CNC_TURNING' 
  | 'SHEET_METAL' 
  | 'INJECTION_MOLDING' 
  | 'CASTING' 
  | 'ADDITIVE' 
  | 'URETHANE';

// Process envelope and capability
export interface ProcessEnvelope {
  maxX: number;
  maxY: number;
  maxZ: number;
  maxMassKg?: number;
  tolerances?: {
    general?: number;
    hole?: number;
  };
  threadSupport?: boolean;
}

export interface Capability {
  id?: string;
  process: Process;
  envelope: ProcessEnvelope;
  materials: string[];
  finishes?: string[];
  minQty?: number;
  maxQty?: number;
  leadtimeDaysMin?: number;
  leadtimeDaysMax?: number;
  unitCostIndex?: number;
}

// Supplier profile
export interface SupplierProfile {
  id: string;
  orgId: string;
  name: string;
  regions: string[];
  certifications: Certification[];
  rating: number;
  active: boolean;
  notes?: string;
  capabilities?: Capability[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierDto {
  name: string;
  regions: string[];
  certifications?: Certification[];
  rating?: number;
  active?: boolean;
  notes?: string;
  capabilities?: Omit<Capability, 'id'>[];
}

export interface UpdateSupplierDto {
  name?: string;
  regions?: string[];
  certifications?: Certification[];
  rating?: number;
  active?: boolean;
  notes?: string;
}

// Routing rules
export type RuleOperator = 
  | 'EQ' 
  | 'NEQ' 
  | 'IN' 
  | 'NIN' 
  | 'GTE' 
  | 'LTE' 
  | 'GT' 
  | 'LT' 
  | 'HAS_ALL' 
  | 'HAS_ANY' 
  | 'CONTAINS';

export interface Comparison {
  field: string;
  op: RuleOperator;
  value: any;
}

export interface RuleAst {
  all?: RuleAst[];
  any?: RuleAst[];
  not?: RuleAst;
  expr?: Comparison;
}

export interface RoutingRule {
  id: string;
  orgId: string;
  name: string;
  priority: number;
  active: boolean;
  rule: RuleAst;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutingRuleDto {
  name: string;
  priority?: number;
  rule: RuleAst;
  active?: boolean;
}

// Candidate scoring
export interface CandidateScore {
  supplierId: string;
  supplierName: string;
  supplierRegions?: string[];
  supplierCertifications?: Certification[];
  supplierRating?: number;
  score: number;
  reasons: string[];
  hardBlocks: string[];
  softPenalties: string[];
  penalties?: string[]; // Alias for softPenalties (backward compat)
  capability?: Capability;
}

export interface GetCandidatesDto {
  orderId: string;
  process: Process;
  material: string;
  quantity: number;
  region?: string;
  geometry?: {
    bbox: {
      x: number;
      y: number;
      z: number;
    };
    massKg?: number;
    threads?: boolean;
  };
  flags?: string[];
  tolerances?: {
    general?: number;
    hole?: number;
  };
  finishes?: string[];
}

export interface CandidatesResponse {
  candidates: CandidateScore[];
  orderId: string;
  totalEvaluated: number;
  matchCount: number;
}

// Order assignment
export interface AssignSupplierDto {
  supplierId: string;
  note?: string;
}

export interface AssignSupplierResponse {
  status: 'ok';
  orderId: string;
  supplierId: string;
  routedAt: string;
  routedBy: string;
}

// Supplier files
export type FileKind = 'NDA' | 'MSA' | 'CERT' | 'ISO' | 'OTHER';

export interface SupplierFile {
  id: string;
  supplierId: string;
  fileId: string;
  kind: FileKind;
  createdAt: string;
  fileName?: string;
  fileUrl?: string;
}

export interface AttachFileDto {
  fileId: string;
  kind: FileKind;
}

// Websocket events
export interface OrderRoutedEvent {
  orderId: string;
  supplierId: string;
  supplierName: string;
  routedBy: string;
  routedAt: string;
}
