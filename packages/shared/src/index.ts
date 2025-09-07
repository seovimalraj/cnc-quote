// Export all types and interfaces explicitly to ensure proper module resolution

// Core types from types.core
export type {
  Technology,
  ProcessType,
  Machine,
  MachineSpec,
  MachineLimit,
  MachineMessage,
} from './types.core';

// Order workcenter types
export type {
  Order,
  OrderTotals,
  Address,
  WorkOrder,
  Package,
  Shipment,
  DocRef,
  AuditEvent,
} from './types/schema';

// Feature types
export type {
  FeatureRule,
  FeatureType,
} from './types/feature';

// Material types
export type {
  MaterialCosting,
  MaterialProperties,
  MachineMaterial,
  Material,
} from './types/material';

// Core types
export type {
  User,
  Organization,
  TeamMember,
  ApiToken,
  FileUpload,
  Order,
  OrderStatus,
  Payment,
  Customer,
  AdminUser,
} from './types/core';

// Feature types
export type {
  FeatureFlag,
  FeatureToggle,
} from './types/feature';

// DFM types
export type {
  DfmRule,
  DfmValidationResponse,
  Severity,
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
  DfmValidationRequest,
  DfmBatchValidation,
  DfmBatchValidationResponse,
  DfmRuleResult,
  DfmRuleEvaluationContext,
} from './dfm.types';

// Create a namespace export for easier importing
export * as Types from './types.core';
export * as FeatureTypes from './types/feature';
export * as MaterialTypes from './types/material';
