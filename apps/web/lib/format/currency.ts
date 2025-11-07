/**
 * Currency formatting utilities
 * @ownership web-platform
 */

/**
 * Format a number as currency with locale support
 * @param value - The numeric value to format
 * @param currency - The currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format currency for compact display (e.g., $1.2K, $3.4M)
 * @param value - The numeric value to format
 * @param currency - The currency code (default: 'USD')
 * @returns Compact currency string
 */
export function formatCurrencyCompact(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format currency without symbol (just the number)
 * @param value - The numeric value to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Alias for formatCurrency - kept for backward compatibility
 * @deprecated Use formatCurrency instead
 */
export const formatMoney = formatCurrency;
