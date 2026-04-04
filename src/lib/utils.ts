import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced helper function to get phone number from order with better fallback logic
export const getPhoneNumber = (order: any) => {
  // Debug logging to trace phone number sources
  console.log('getPhoneNumber debug for order:', order.order_number || order.name || order.id);
  
  let phone = null;
  
  // Check multiple sources for phone number
  if (order.customer?.phone) {
    console.log('- Found customer.phone:', order.customer.phone);
    phone = order.customer.phone;
  } else if (order.shipping_address?.phone) {
    console.log('- Found shipping_address.phone:', order.shipping_address.phone);
    phone = order.shipping_address.phone;
  } else if (order.phone) {
    console.log('- Found order.phone:', order.phone);
    phone = order.phone;
  }
  
  // Clean up phone number format
  if (phone) {
    phone = phone.toString().trim();
    // Remove empty strings
    if (phone === '' || phone === 'null' || phone === 'undefined') {
      phone = null;
    }
  }
  
  console.log('- Final phone result:', phone || 'N/A');
  return phone || 'N/A';
};

// Code 128 character set and encoding patterns
const CODE128_PATTERNS = {
  // Start patterns
  START_A: [2, 1, 1, 4, 1, 2],
  START_B: [2, 1, 1, 2, 1, 4],
  START_C: [2, 1, 1, 2, 3, 2],
  
  // Stop pattern
  STOP: [2, 3, 3, 1, 1, 1, 2],
  
  // Character patterns for subset B (0-127 ASCII)
  CHARS: [
    [2, 1, 2, 2, 2, 2], // 0
    [2, 2, 2, 1, 2, 2], // 1
    [2, 2, 2, 2, 2, 1], // 2
    [1, 2, 1, 2, 2, 3], // 3
    [1, 2, 1, 3, 2, 2], // 4
    [1, 3, 1, 2, 2, 2], // 5
    [1, 2, 2, 2, 1, 3], // 6
    [1, 2, 2, 3, 1, 2], // 7
    [1, 3, 2, 2, 1, 2], // 8
    [2, 2, 1, 2, 1, 3], // 9
    [2, 2, 1, 3, 1, 2], // 10
    [2, 3, 1, 2, 1, 2], // 11
    [1, 1, 2, 2, 3, 2], // 12
    [1, 2, 2, 1, 3, 2], // 13
    [1, 2, 2, 2, 3, 1], // 14
    [1, 1, 3, 2, 2, 2], // 15
    [1, 2, 3, 1, 2, 2], // 16
    [1, 2, 3, 2, 2, 1], // 17
    [2, 2, 3, 2, 1, 1], // 18
    [2, 2, 1, 1, 3, 2], // 19
    [2, 2, 1, 2, 3, 1], // 20
    [2, 1, 3, 2, 1, 2], // 21
    [2, 2, 3, 1, 1, 2], // 22
    [3, 1, 2, 1, 3, 1], // 23
    [3, 1, 1, 2, 2, 2], // 24
    [3, 2, 1, 1, 2, 2], // 25
    [3, 2, 1, 2, 2, 1], // 26
    [3, 1, 2, 2, 1, 2], // 27
    [3, 2, 2, 1, 1, 2], // 28
    [3, 2, 2, 2, 1, 1], // 29
    [2, 1, 2, 1, 2, 3], // 30
    [2, 1, 2, 3, 2, 1], // 31
    [2, 3, 2, 1, 2, 1], // 32 (space)
    [1, 1, 1, 3, 2, 3], // 33 (!)
    [1, 3, 1, 1, 2, 3], // 34 (")
    [1, 3, 1, 3, 2, 1], // 35 (#)
    [1, 1, 2, 3, 1, 3], // 36 ($)
    [1, 3, 2, 1, 1, 3], // 37 (%)
    [1, 3, 2, 3, 1, 1], // 38 (&)
    [2, 1, 1, 3, 1, 3], // 39 (')
    [2, 3, 1, 1, 1, 3], // 40 (()
    [2, 3, 1, 3, 1, 1], // 41 ())
    [1, 1, 2, 1, 3, 3], // 42 (*)
    [1, 1, 2, 3, 3, 1], // 43 (+)
    [1, 3, 2, 1, 3, 1], // 44 (,)
    [1, 1, 3, 1, 2, 3], // 45 (-)
    [1, 1, 3, 3, 2, 1], // 46 (.)
    [1, 3, 3, 1, 2, 1], // 47 (/)
    [3, 1, 3, 1, 2, 1], // 48 (0)
    [2, 1, 1, 3, 3, 1], // 49 (1)
    [2, 3, 1, 1, 3, 1], // 50 (2)
    [2, 1, 3, 1, 1, 3], // 51 (3)
    [2, 1, 3, 3, 1, 1], // 52 (4)
    [2, 1, 3, 1, 3, 1], // 53 (5)
    [3, 1, 1, 1, 2, 3], // 54 (6)
    [3, 1, 1, 3, 2, 1], // 55 (7)
    [3, 3, 1, 1, 2, 1], // 56 (8)
    [3, 1, 2, 1, 1, 3], // 57 (9)
    [3, 1, 2, 3, 1, 1], // 58 (:)
    [3, 3, 2, 1, 1, 1], // 59 (;)
    [3, 1, 4, 1, 1, 1], // 60 (<)
    [2, 2, 1, 4, 1, 1], // 61 (=)
    [4, 3, 1, 1, 1, 1], // 62 (>)
    [1, 1, 1, 2, 2, 4], // 63 (?)
    [1, 1, 1, 4, 2, 2], // 64 (@)
    [1, 2, 1, 1, 2, 4], // 65 (A)
    [1, 2, 1, 4, 2, 1], // 66 (B)
    [1, 4, 1, 1, 2, 2], // 67 (C)
    [1, 4, 1, 2, 2, 1], // 68 (D)
    [1, 1, 2, 2, 1, 4], // 69 (E)
    [1, 1, 2, 4, 1, 2], // 70 (F)
    [1, 2, 2, 1, 1, 4], // 71 (G)
    [1, 2, 2, 4, 1, 1], // 72 (H)
    [1, 4, 2, 1, 1, 2], // 73 (I)
    [1, 4, 2, 2, 1, 1], // 74 (J)
    [2, 4, 1, 2, 1, 1], // 75 (K)
    [2, 2, 1, 1, 1, 4], // 76 (L)
    [4, 1, 3, 1, 1, 1], // 77 (M)
    [2, 4, 1, 1, 1, 2], // 78 (N)
    [1, 3, 4, 1, 1, 1], // 79 (O)
    [1, 1, 1, 2, 4, 2], // 80 (P)
    [1, 2, 1, 1, 4, 2], // 81 (Q)
    [1, 2, 1, 2, 4, 1], // 82 (R)
    [1, 1, 4, 2, 1, 2], // 83 (S)
    [1, 2, 4, 1, 1, 2], // 84 (T)
    [1, 2, 4, 2, 1, 1], // 85 (U)
    [4, 1, 1, 2, 1, 2], // 86 (V)
    [4, 2, 1, 1, 1, 2], // 87 (W)
    [4, 2, 1, 2, 1, 1], // 88 (X)
    [2, 1, 2, 1, 4, 1], // 89 (Y)
    [2, 1, 4, 1, 2, 1], // 90 (Z)
    [4, 1, 2, 1, 2, 1], // 91 ([)
    [1, 1, 1, 1, 4, 3], // 92 (\)
    [1, 1, 1, 3, 4, 1], // 93 (])
    [1, 3, 1, 1, 4, 1], // 94 (^)
    [1, 1, 4, 1, 1, 3], // 95 (_)
  ]
};

// Clean tracking/order number for barcode — no padding, exact value
export const generateTrackingBarcode = (orderNumber: string) => {
  // Remove leading # and any non-alphanumeric characters, uppercase
  const clean = orderNumber.replace(/^#/, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Limit to 30 chars max for barcode scanners
  return clean.length > 30 ? clean.substring(0, 30) : clean;
};

// Generate Code 128 barcode SVG
export const generateCode128Barcode = (text: string, barWidth = 2, barHeight = 50) => {
  // text is already cleaned — use as-is (no double processing)
  const cleanText = text.replace(/[^\x20-\x7E]/g, '').substring(0, 30);
  console.log('Generating Code 128 barcode for:', cleanText);

  try {
    // Calculate checksum
    let checksum = 104; // Start B value
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i) - 32; // ASCII to Code 128 value
      checksum += charCode * (i + 1);
    }
    checksum = checksum % 103;

    // Build the pattern array
    const patterns = [];

    // Start B
    patterns.push(...CODE128_PATTERNS.START_B);

    // Data characters
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i) - 32;
      if (charCode >= 0 && charCode < CODE128_PATTERNS.CHARS.length) {
        patterns.push(...CODE128_PATTERNS.CHARS[charCode]);
      }
    }

    // Checksum
    if (checksum < CODE128_PATTERNS.CHARS.length) {
      patterns.push(...CODE128_PATTERNS.CHARS[checksum]);
    }

    // Stop
    patterns.push(...CODE128_PATTERNS.STOP);

    // Generate SVG bars
    let x = 0;
    let bars = '';

    for (let i = 0; i < patterns.length; i++) {
      const width = patterns[i] * barWidth;
      const isBlack = i % 2 === 0;

      if (isBlack) {
        bars += `<rect x="${x}" y="0" width="${width}" height="${barHeight}" fill="black"/>`;
      }
      x += width;
    }

    const totalWidth = x;

    return `<svg width="${totalWidth}" height="${barHeight + 20}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${totalWidth}" height="${barHeight + 20}" fill="white"/>
      ${bars}
      <text x="${totalWidth / 2}" y="${barHeight + 15}" text-anchor="middle" font-family="Arial" font-size="12" fill="black">${cleanText}</text>
    </svg>`;

  } catch (error) {
    console.error('Error generating Code 128 barcode:', error);
    // Fallback to simple barcode
    return generateBarcodeHTML(cleanText);
  }
};

// Generate HTML barcode with improved scanning compatibility (fallback)
export const generateBarcodeHTML = (text: string) => {
  const cleanText = text.replace(/[^\x20-\x7E]/g, '').substring(0, 30);
  
  console.log('Generating fallback barcode HTML for:', cleanText);
  
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
