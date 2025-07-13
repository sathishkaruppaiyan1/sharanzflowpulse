// Function to format phone number for WATI
export const formatPhoneForWati = (phoneNumber: string): string => {
  // Remove all non-digits
  const digits = phoneNumber.replace(/[^\d]/g, '');
  
  console.log('Phone formatting debug:', {
    original: phoneNumber,
    digitsOnly: digits,
    length: digits.length
  });
  
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
  
  // Otherwise return digits only
  console.log('Returning digits as is:', digits);
  return digits;
};
