
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get phone number from order
export const getPhoneNumber = (order: any) => {
  // First try shipping address phone, then customer phone
  return order.shipping_address?.phone || order.customer?.phone || null;
};

// Enhanced barcode generation for better scanning
export const generateTrackingBarcode = (orderNumber: string) => {
  // Clean the order number and create a more standardized format
  let cleanOrderNumber = orderNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Ensure minimum length for better scanning
  if (cleanOrderNumber.length < 8) {
    cleanOrderNumber = cleanOrderNumber.padEnd(8, '0');
  }
  
  // Limit to reasonable length for barcode
  if (cleanOrderNumber.length > 16) {
    cleanOrderNumber = cleanOrderNumber.substring(0, 16);
  }
  
  return cleanOrderNumber;
};

// Generate HTML barcode that's more standardized
export const generateBarcodeHTML = (text: string) => {
  const cleanText = generateTrackingBarcode(text);
  
  // Use Code 128 inspired pattern for better scanning
  const startPattern = [2, 1, 1, 4, 1, 2]; // Start pattern
  const endPattern = [2, 3, 3, 1, 1, 1, 2]; // End pattern
  
  const bars = [...startPattern];
  
  // Generate bars based on character codes
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText.charCodeAt(i);
    const pattern = char % 8; // Use modulo 8 for 8 different patterns
    
    switch (pattern) {
      case 0: bars.push(3, 1, 1, 1, 2, 3); break;
      case 1: bars.push(2, 1, 1, 3, 1, 3); break;
      case 2: bars.push(1, 3, 1, 1, 2, 3); break;
      case 3: bars.push(1, 1, 3, 1, 2, 3); break;
      case 4: bars.push(2, 3, 1, 1, 1, 3); break;
      case 5: bars.push(3, 1, 2, 1, 1, 3); break;
      case 6: bars.push(1, 2, 3, 1, 1, 3); break;
      case 7: bars.push(1, 1, 1, 3, 2, 3); break;
    }
  }
  
  bars.push(...endPattern);
  
  return bars.map((width, index) => 
    `<div style="display: inline-block; background-color: ${index % 2 === 0 ? '#000' : '#fff'}; width: ${width * 1.5}px; height: 60px; min-width: ${width * 1.5}px; vertical-align: bottom;"></div>`
  ).join('');
};
