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

// Feature types
export type {
  FeatureRule,
  FeatureType,
} from './types/feature';

// Quote types
export type {
  QuoteFile,
  QuoteItem,
  Quote,
} from './types/quotes';

// Material types
export type {
  MaterialCosting,
  MaterialProperties,
  MachineMaterial,
  Material,
} from './types/material';

// DFM types
export type {
  DfmRule,
  DfmValidationIssue,
  DfmValidationResponse,
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
} from './dfm.types';

export { Severity } from './dfm.types';

// Pricing types from quotes.core
export type {
  PricingProfile,
  PriceResponse,
  PriceBreakdown,
  CncPriceRequest as CncPricingRequest,
  SheetMetalPriceRequest as SheetMetalPricingRequest,
  InjectionMoldingPriceRequest as InjectionMoldingPricingRequest,
  Finish,
  Tolerance,
} from "./types/quotes.core";

// Re-export Machine from quotes.core with different name to avoid conflicts
export type { Machine as QuoteMachine } from "./types/quotes.core";

// Create a namespace export for easier importing
export * as Types from './types.core';
export * as FeatureTypes from './types/feature';
export * as QuoteTypes from './types/quotes';
export * as MaterialTypes from './types/material';
export * as DfmTypes from './dfm.types';
