/**
 * Step 12: Capacity Ledger + Lead Time Classes
 * Shared TypeScript types and interfaces
 */

// Lead time class enum
export type LeadClass = 'econ' | 'standard' | 'express';

// Capacity day snapshot
export interface CapacityDay {
  day: string; // ISO date string (YYYY-MM-DD)
  capacityMinutes: number;
  bookedMinutes: number;
  utilization: number; // 0-1 range
  machineGroup: string;
  process: string;
}

// Lead time option for a single class
export interface LeadtimeOption {
  class: LeadClass;
  days: number; // Business days from today
  shipDate: string; // ISO date string
  priceDelta: number; // Amount to add/subtract from base price
  surgeApplied: boolean; // Whether surge multiplier was applied
  utilizationWindow: number; // P95 utilization across window (0-1)
  reasons: string[]; // Human-readable explanations
}

// Response from lead time calculation
export interface LeadtimeResponse {
  options: LeadtimeOption[];
  basePrice: number;
  currency: string;
  debug?: Record<string, unknown>;
}

// Input for pricing hook to calculate lead times
export interface PricingHookInput {
  process: string;
  orgId: string;
  basePrice: number;
  estimatedMinutes: number;
  machineGroup: string;
  desiredClass?: LeadClass;
}

// Lead time profile (DB model)
export interface LeadtimeProfile {
  id: string;
  orgId: string;
  process: string;
  econDays: number;
  stdDays: number;
  expressDays: number;
  surgeMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

// Capacity ledger entry (DB model)
export interface CapacityLedgerEntry {
  id: string;
  orgId: string;
  process: string;
  machineGroup: string;
  day: string; // Date only (YYYY-MM-DD)
  capacityMinutes: number;
  bookedMinutes: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lead time override (DB model)
export interface LeadtimeOverride {
  id: string;
  orgId: string;
  process: string;
  day: string; // Date only (YYYY-MM-DD)
  class: LeadClass;
  blocked: boolean;
  reason?: string;
  createdBy?: string;
  createdAt: Date;
}

// Bulk upsert request for capacity
export interface CapacityBulkUpsertDto {
  entries: Array<{
    orgId: string;
    process: string;
    machineGroup: string;
    day: string; // YYYY-MM-DD
    capacityMinutes: number;
    bookedMinutes?: number;
    notes?: string;
  }>;
}

// Capacity window query params
export interface CapacityWindowQuery {
  orgId: string;
  process: string;
  machineGroup: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

// Override upsert request
export interface LeadtimeOverrideDto {
  orgId: string;
  process: string;
  day: string; // YYYY-MM-DD
  class: LeadClass;
  blocked: boolean;
  reason?: string;
}

// Telemetry event payloads
export interface LeadtimeOptionsRequestedEvent {
  orgId: string;
  process: string;
  machineGroup: string;
  estimatedMinutes: number;
  timestamp: Date;
}

export interface LeadtimeClassSelectedEvent {
  quoteId: string;
  class: LeadClass;
  days: number;
  priceDelta: number;
  surgeApplied: boolean;
  utilizationWindow: number;
  timestamp: Date;
}

export interface CapacityBulkUpsertEvent {
  rows: number;
  actor: string;
  orgId: string;
  timestamp: Date;
}

export interface LeadtimeOverrideSetEvent {
  orgId: string;
  process: string;
  day: string;
  class: LeadClass;
  blocked: boolean;
  actor: string;
  timestamp: Date;
}

// Utility types
export interface BusinessDaysConfig {
  timezone: string;
  holidays?: string[]; // Array of YYYY-MM-DD date strings
}

export interface LeadtimeCalculationDebug {
  profile: LeadtimeProfile;
  capacityRows: CapacityDay[];
  p95Values: Record<LeadClass, number>;
  overrides: LeadtimeOverride[];
  blockedClasses: LeadClass[];
}
