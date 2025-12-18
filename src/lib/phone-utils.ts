/**
 * Utility functions for international phone number formatting
 */

/**
 * Formats a phone number to international format with proper spacing
 * Supports multiple country formats
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return phone;
  
  // Try to detect country and format accordingly
  // Mozambique: +258 XX XXX XXXX (12 digits with country code)
  if (digits.startsWith('258') && digits.length >= 11) {
    const country = digits.slice(0, 3);
    const operator = digits.slice(3, 5);
    const part1 = digits.slice(5, 8);
    const part2 = digits.slice(8, 12);
    return `+${country} ${operator} ${part1} ${part2}`.trim();
  }
  
  // Portugal: +351 XXX XXX XXX (12 digits with country code)
  if (digits.startsWith('351') && digits.length >= 11) {
    const country = digits.slice(0, 3);
    const part1 = digits.slice(3, 6);
    const part2 = digits.slice(6, 9);
    const part3 = digits.slice(9, 12);
    return `+${country} ${part1} ${part2} ${part3}`.trim();
  }
  
  // Brazil: +55 XX XXXXX-XXXX (13 digits with country code for mobile)
  if (digits.startsWith('55') && digits.length >= 12) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `+${country} ${area} ${part1} ${part2}`.trim();
  }
  
  // US/Canada: +1 XXX XXX XXXX (11 digits with country code)
  if (digits.startsWith('1') && digits.length === 11) {
    const country = digits.slice(0, 1);
    const area = digits.slice(1, 4);
    const part1 = digits.slice(4, 7);
    const part2 = digits.slice(7, 11);
    return `+${country} ${area} ${part1} ${part2}`.trim();
  }
  
  // South Africa: +27 XX XXX XXXX (11 digits with country code)
  if (digits.startsWith('27') && digits.length >= 10) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const part1 = digits.slice(4, 7);
    const part2 = digits.slice(7, 11);
    return `+${country} ${area} ${part1} ${part2}`.trim();
  }
  
  // Angola: +244 XXX XXX XXX (12 digits with country code)
  if (digits.startsWith('244') && digits.length >= 11) {
    const country = digits.slice(0, 3);
    const part1 = digits.slice(3, 6);
    const part2 = digits.slice(6, 9);
    const part3 = digits.slice(9, 12);
    return `+${country} ${part1} ${part2} ${part3}`.trim();
  }
  
  // Generic international format for unknown countries
  // If starts with country code (detected by length > 10), format with spaces
  if (digits.length > 10) {
    // Assume first 2-3 digits are country code
    const countryCodeLength = digits.length > 12 ? 3 : 2;
    const countryCode = digits.slice(0, countryCodeLength);
    const rest = digits.slice(countryCodeLength);
    
    // Split remaining digits into groups of 3
    const groups = [];
    for (let i = 0; i < rest.length; i += 3) {
      groups.push(rest.slice(i, i + 3));
    }
    
    return `+${countryCode} ${groups.join(' ')}`.trim();
  }
  
  // Local number without country code - format in groups
  // Mozambique local: 84 XXX XXXX
  if (digits.length === 9 && (digits.startsWith('84') || digits.startsWith('85') || digits.startsWith('86') || digits.startsWith('87') || digits.startsWith('82') || digits.startsWith('83'))) {
    const operator = digits.slice(0, 2);
    const part1 = digits.slice(2, 5);
    const part2 = digits.slice(5, 9);
    return `${operator} ${part1} ${part2}`;
  }
  
  // Default: group digits in chunks of 3-4
  if (digits.length <= 4) {
    return hasPlus ? `+${digits}` : digits;
  }
  
  if (digits.length <= 7) {
    return `${hasPlus ? '+' : ''}${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  
  if (digits.length <= 10) {
    return `${hasPlus ? '+' : ''}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  // For longer numbers, format with country code assumption
  return `${hasPlus ? '+' : ''}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`.trim();
}

/**
 * Formats phone input as user types
 * Less aggressive than display formatting - allows free typing
 */
export function formatPhoneInput(value: string): string {
  // Allow typing freely but clean up multiple spaces
  return value.replace(/\s+/g, ' ');
}

/**
 * Cleans phone number to raw digits for storage
 */
export function cleanPhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}
