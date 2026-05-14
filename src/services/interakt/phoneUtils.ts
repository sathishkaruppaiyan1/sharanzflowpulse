// Default country code — India. Customer phones in our DB usually arrive
// without a country code (10 digits, sometimes with a leading 0), so we
// hard-prepend `91` whenever we detect a bare Indian-style number. Change
// this constant if the business expands to another primary market.
const DEFAULT_COUNTRY_CODE = '91';

// Function to format phone number for Interakt BSP
export const formatPhoneForInterakt = (phoneNumber: string): string => {
  // Strip everything except digits ("+91 (999) 490-1826" → "919994901826")
  let digits = (phoneNumber || '').replace(/[^\d]/g, '');

  console.log('Phone formatting debug:', {
    original: phoneNumber,
    digitsOnly: digits,
    length: digits.length,
  });

  if (!digits) {
    console.log('No valid digits found in phone number');
    return '';
  }

  // Drop leading zeros (common Indian local format like "09994901826")
  digits = digits.replace(/^0+/, '');
  if (!digits) return '';

  // Already in full international form (e.g. "919994901826").
  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return digits;
  }

  // 13 digits with country-code prefix → trailing typo, truncate to 12.
  if (digits.length === 13 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    const formatted = digits.substring(0, 12);
    console.log('13-digit number truncated to 12:', formatted);
    return formatted;
  }

  // Plain 10-digit Indian mobile → hard-prepend 91.
  if (digits.length === 10) {
    const formatted = `${DEFAULT_COUNTRY_CODE}${digits}`;
    console.log('Hard-prepended 91 to 10-digit number:', formatted);
    return formatted;
  }

  // 11 digits — either dropped a digit or has a stray prefix. Take the last
  // 10 and prepend 91 so we always end up with a 12-digit Interakt number.
  if (digits.length === 11) {
    const formatted = `${DEFAULT_COUNTRY_CODE}${digits.slice(-10)}`;
    console.log('11-digit normalized to 12 with 91 prefix:', formatted);
    return formatted;
  }

  // Anything longer with the right tail also gets snapped to 91 + last 10.
  if (digits.length > 12) {
    const formatted = `${DEFAULT_COUNTRY_CODE}${digits.slice(-10)}`;
    console.log('Long number trimmed to 91 + last 10 digits:', formatted);
    return formatted;
  }

  // Too short (<10 digits) — refuse rather than send a broken request.
  console.log('Phone too short to format, rejecting:', digits);
  return '';
};
