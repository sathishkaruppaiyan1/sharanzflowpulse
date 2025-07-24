import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateTrackingBarcode = (orderNumber: string) => {
  // Remove # and any special characters, keep only alphanumeric
  const cleanOrderNumber = orderNumber.replace(/[^A-Za-z0-9]/g, '');
  return cleanOrderNumber.toUpperCase();
};

export const generateCode128Barcode = (data: string) => {
  // Simple Code 128 barcode generation using HTML/CSS
  const barcodeData = data.toUpperCase();
  
  // Create a simple barcode representation
  const bars = barcodeData.split('').map((char, index) => {
    const charCode = char.charCodeAt(0);
    const width = (charCode % 4) + 1; // Width between 1-4
    const isBar = index % 2 === 0;
    
    return `<rect x="${index * 8}" y="0" width="${width * 2}" height="40" fill="${isBar ? '#000' : '#fff'}" />`;
  }).join('');
  
  return `
    <svg width="200" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="40" fill="white"/>
      ${bars}
    </svg>
  `;
};

export const getPhoneNumber = (order: any): string | null => {
  console.log('getPhoneNumber debug for order:', order.order_number || order.id);
  
  // Check multiple sources for phone number
  const sources = [
    order.customer?.phone,
    order.shipping_address?.phone,
    order.shipping_address?.phone_number,
    // For orders synced from Shopify, the customer phone might be in the shipping address
    order.customer?.phone_number,
    // Check if it's a nested structure (from Supabase)
    order.shipping_address?.customer?.phone,
    // Check the raw Shopify structure
    order.phone,
    // Check if phone is directly on the order
    order.customer_phone,
    order.shipping_phone
  ];
  
  console.log('- customer.phone:', order.customer?.phone);
  console.log('- shipping_address exists:', !!order.shipping_address);
  console.log('- shipping_address.phone:', order.shipping_address?.phone);
  console.log('- shipping_address.phone_number:', order.shipping_address?.phone_number);
  console.log('- order.phone:', order.phone);
  
  // Find the first non-null, non-empty phone number
  for (const source of sources) {
    if (source && typeof source === 'string' && source.trim().length > 0) {
      // Clean the phone number (remove spaces, dashes, etc.)
      const cleanPhone = source.replace(/[\s\-\(\)]/g, '');
      console.log('- found phone from source:', cleanPhone);
      return cleanPhone;
    }
  }
  
  // If no phone found in standard places, try to extract from order data
  if (order.line_items && Array.isArray(order.line_items)) {
    for (const item of order.line_items) {
      if (item.properties && Array.isArray(item.properties)) {
        const phoneProperty = item.properties.find((prop: any) => 
          prop.name && prop.name.toLowerCase().includes('phone')
        );
        if (phoneProperty && phoneProperty.value) {
          console.log('- found phone from line item properties:', phoneProperty.value);
          return phoneProperty.value;
        }
      }
    }
  }
  
  console.log('- no phone number found, returning null');
  return null;
};
