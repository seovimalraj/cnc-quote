/**
 * Validation utilities for CNC Quote web application
 */

// List of free/disposable email domains to block
const BLOCKED_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'live.com',
  'me.com',
  'msn.com',
  'protonmail.com',
  'mail.com',
  'yandex.com',
  'zoho.com',
  'gmx.com',
  'tutanota.com',
  'dispostable.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwaway.email'
]);

/**
 * Validates if an email domain is allowed for business use
 * Blocks free/disposable email providers
 */
export function isBusinessEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return !BLOCKED_DOMAINS.has(domain);
}

/**
 * Validates email format and business domain requirements
 */
export function validateBusinessEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!email.includes('@')) {
    return { isValid: false, error: 'Invalid email format' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (!isBusinessEmail(email)) {
    return {
      isValid: false,
      error: 'Please use a business email address. Free email providers are not allowed.'
    };
  }

  return { isValid: true };
}

/**
 * Validates phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's a valid length (10-15 digits for international)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
}
