// Function to format phone number for Interakt BSP
export const formatPhoneForInterakt = (phoneNumber: string): string => {
  // Remove all non-digits
  const digits = phoneNumber.replace(/[^\d]/g, '');
  
  console.log('Phone formatting debug:', {
    original: phoneNumber,
    digitsOnly: digits,
    length: digits.length
  });
  
  // Handle empty or invalid inputs
  if (!digits || digits.length === 0) {
    console.log('No valid digits found in phone number');
    return '';
  }
  
  // For Indian numbers starting with 6-9 and having 10 digits, add 91 prefix
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    const formatted = `91${digits}`;
    console.log('Formatted 10-digit Indian number:', formatted);
    return formatted;
  }
  
  // If it already has 91 prefix and is 12 digits, use as is
  if (digits.length === 12 && digits.startsWith('91')) {
    console.log('Already has 91 prefix:', digits);
    return digits;
  }
  
  // For 11-digit numbers starting with 91, assume they're Indian numbers missing a digit
  if (digits.length === 11 && digits.startsWith('91')) {
    console.log('11-digit number with 91 prefix, using as is:', digits);
    return digits;
  }
  
  // For 13-digit numbers starting with 91, remove extra digit
  if (digits.length === 13 && digits.startsWith('91')) {
    const formatted = digits.substring(0, 12);
    console.log('13-digit number truncated to 12:', formatted);
    return formatted;
  }
  
  // Otherwise return digits only
  console.log('Returning digits as is:', digits);
  return digits;
};
