/**
 * Step 12: Business Days Utility
 * Calculates business days considering weekends and holidays
 */

import { DateTime } from 'luxon';

export interface BusinessDaysConfig {
  timezone: string;
  holidays?: string[]; // Array of YYYY-MM-DD date strings
  weekendDays?: number[]; // 0 = Sunday, 6 = Saturday (default: [0, 6])
}

/**
 * Add N business days to a date, skipping weekends and holidays
 */
export function addBusinessDays(
  startDate: Date | string,
  days: number,
  config: BusinessDaysConfig,
): Date {
  const { timezone = 'UTC', holidays = [], weekendDays = [0, 6] } = config;
  
  let current = DateTime.fromJSDate(
    typeof startDate === 'string' ? new Date(startDate) : startDate,
  ).setZone(timezone);

  let businessDaysAdded = 0;

  while (businessDaysAdded < days) {
    current = current.plus({ days: 1 });

    // Skip weekends
    if (weekendDays.includes(current.weekday % 7)) {
      continue;
    }

    // Skip holidays
    const dateStr = current.toISODate();
    if (dateStr && holidays.includes(dateStr)) {
      continue;
    }

    businessDaysAdded++;
  }

  return current.toJSDate();
}

/**
 * Calculate business days between two dates
 */
export function countBusinessDays(
  startDate: Date | string,
  endDate: Date | string,
  config: BusinessDaysConfig,
): number {
  const { timezone = 'UTC', holidays = [], weekendDays = [0, 6] } = config;

  let start = DateTime.fromJSDate(
    typeof startDate === 'string' ? new Date(startDate) : startDate,
  ).setZone(timezone);

  const end = DateTime.fromJSDate(
    typeof endDate === 'string' ? new Date(endDate) : endDate,
  ).setZone(timezone);

  let businessDays = 0;

  while (start < end) {
    start = start.plus({ days: 1 });

    // Skip weekends
    if (weekendDays.includes(start.weekday % 7)) {
      continue;
    }

    // Skip holidays
    const dateStr = start.toISODate();
    if (dateStr && holidays.includes(dateStr)) {
      continue;
    }

    businessDays++;
  }

  return businessDays;
}

/**
 * Get array of business days between two dates (inclusive)
 */
export function getBusinessDaysWindow(
  startDate: Date | string,
  endDate: Date | string,
  config: BusinessDaysConfig,
): string[] {
  const { timezone = 'UTC', holidays = [], weekendDays = [0, 6] } = config;

  let current = DateTime.fromJSDate(
    typeof startDate === 'string' ? new Date(startDate) : startDate,
  ).setZone(timezone);

  const end = DateTime.fromJSDate(
    typeof endDate === 'string' ? new Date(endDate) : endDate,
  ).setZone(timezone);

  const businessDays: string[] = [];

  while (current <= end) {
    // Skip weekends
    if (!weekendDays.includes(current.weekday % 7)) {
      // Skip holidays
      const dateStr = current.toISODate();
      if (dateStr && !holidays.includes(dateStr)) {
        businessDays.push(dateStr);
      }
    }

    current = current.plus({ days: 1 });
  }

  return businessDays;
}

/**
 * Check if a date is a business day
 */
export function isBusinessDay(
  date: Date | string,
  config: BusinessDaysConfig,
): boolean {
  const { timezone = 'UTC', holidays = [], weekendDays = [0, 6] } = config;

  const dt = DateTime.fromJSDate(
    typeof date === 'string' ? new Date(date) : date,
  ).setZone(timezone);

  // Check if weekend
  if (weekendDays.includes(dt.weekday % 7)) {
    return false;
  }

  // Check if holiday
  const dateStr = dt.toISODate();
  if (dateStr && holidays.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * Get next business day from a given date
 */
export function getNextBusinessDay(
  date: Date | string,
  config: BusinessDaysConfig,
): Date {
  return addBusinessDays(date, 1, config);
}

/**
 * Calculate P95 (95th percentile) from an array of numbers
 */
export function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate P99 (99th percentile) from an array of numbers
 */
export function calculateP99(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.99) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate median from an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Format date as YYYY-MM-DD in specified timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
): string {
  const dt = DateTime.fromJSDate(
    typeof date === 'string' ? new Date(date) : date,
  ).setZone(timezone);

  return dt.toISODate() || dt.toFormat('yyyy-MM-dd');
}

/**
 * Get today's date in specified timezone as YYYY-MM-DD
 */
export function getTodayInTimezone(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate() || 
         DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');
}
