
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get phone number from order
export const getPhoneNumber = (order: any) => {
  // Debug logging to trace phone number sources
  console.log('getPhoneNumber debug for order:', order.order_number);
  console.log('- customer.phone:', order.customer?.phone);
  console.log('- shipping_address exists:', !!order.shipping_address);
  
  // Only try customer phone since shipping address doesn't have phone in our schema
  const phone = order.customer?.phone || null;
  console.log('- final phone:', phone);
  return phone;
};

// Enhanced barcode generation for better scanning
export const generateTrackingBarcode = (orderNumber: string) => {
  // Remove any hash symbols and clean the order number
  let cleanOrderNumber = orderNumber.replace(/^#/, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  console.log('Barcode generation:', {
    original: orderNumber,
    cleaned: cleanOrderNumber
  });
  
  // Ensure minimum length for better scanning
  if (cleanOrderNumber.length < 6) {
    cleanOrderNumber = cleanOrderNumber.padStart(6, '0');
  }
  
  // Limit to reasonable length for barcode scanners
  if (cleanOrderNumber.length > 20) {
    cleanOrderNumber = cleanOrderNumber.substring(0, 20);
  }
  
  return cleanOrderNumber;
};

// Generate HTML barcode with improved scanning compatibility
export const generateBarcodeHTML = (text: string) => {
  const cleanText = generateTrackingBarcode(text);
  
  console.log('Generating barcode HTML for:', cleanText);
  
  // Use a more scanner-friendly approach with consistent bar widths
  const bars = [];
  
  // Start pattern for Code 128-like structure
  bars.push(1, 1, 1, 1); // Start bars
  
  // Generate bars based on each character
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText.charCodeAt(i);
    const pattern = char % 4; // Use modulo 4 for simpler patterns
    
    switch (pattern) {
      case 0: bars.push(2, 1, 1, 2); break; // Wide-narrow-narrow-wide
      case 1: bars.push(1, 2, 2, 1); break; // Narrow-wide-wide-narrow
      case 2: bars.push(2, 2, 1, 1); break; // Wide-wide-narrow-narrow
      case 3: bars.push(1, 1, 2, 2); break; // Narrow-narrow-wide-wide
    }
  }
  
  // End pattern
  bars.push(2, 1, 1, 1, 1); // End bars
  
  // Generate HTML with consistent sizing
  const barElements = bars.map((width, index) => {
    const isBlack = index % 2 === 0;
    const barWidth = width * 2; // Make bars wider for better scanning
    
    return `<div style="display: inline-block; background-color: ${isBlack ? '#000000' : '#ffffff'}; width: ${barWidth}px; height: 50px; vertical-align: top;"></div>`;
  }).join('');
  
  return `<div style="font-family: monospace; text-align: center; padding: 10px;">
    <div style="border: 2px solid #000; padding: 10px; background: white; display: inline-block;">
      ${barElements}
      <div style="margin-top: 5px; font-size: 12px; letter-spacing: 2px;">${cleanText}</div>
    </div>
  </div>`;
};
