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

// Generate Code 128 barcode SVG — scanner-friendly:
//  • SVG sized in millimetres (real physical units) so printers don't rasterize
//    bars inconsistently
//  • Quiet zones of at least 10× X-dimension on each side (Code 128 standard)
//  • shape-rendering="crispEdges" so bars stay sharp at any DPI
//  • X-dimension chosen adaptively to keep the barcode ≤90mm wide while
//    staying ≥0.25mm (ISO scanner-readable minimum)
//
// The legacy (barWidth, barHeight) args are accepted for backward
// compatibility but ignored — proper dimensions are computed from text length.
export const generateCode128Barcode = (text: string, _legacyBarWidth = 2, _legacyBarHeight = 50) => {
  void _legacyBarWidth; void _legacyBarHeight;
  const cleanText = text.replace(/[^\x20-\x7E]/g, '').substring(0, 30);
  console.log('Generating Code 128 barcode for:', cleanText);

  try {
    // Calculate checksum
    let checksum = 104; // Start B value
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i) - 32;
      checksum += charCode * (i + 1);
    }
    checksum = checksum % 103;

    // Build patterns
    const patterns: number[] = [];
    patterns.push(...CODE128_PATTERNS.START_B);
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i) - 32;
      if (charCode >= 0 && charCode < CODE128_PATTERNS.CHARS.length) {
        patterns.push(...CODE128_PATTERNS.CHARS[charCode]);
      }
    }
    if (checksum < CODE128_PATTERNS.CHARS.length) {
      patterns.push(...CODE128_PATTERNS.CHARS[checksum]);
    }
    patterns.push(...CODE128_PATTERNS.STOP);

    // Total module-units across the symbol (sum of all pattern values).
    const totalModules = patterns.reduce((s, n) => s + n, 0);

    // Pick X-dimension so symbol+quiet zones fit on a 4-inch thermal label
    // (printable area ~ 90mm after safe margins), but never narrower than
    // 0.25mm — below that, consumer scanners struggle.
    const maxSymbolWidthMm = 88; // leaves room for borders & padding
    const idealXmm = 0.5;
    const quietZoneModules = 10; // both sides → 20 modules of blank space
    const totalUnitsWithQuiet = totalModules + 2 * quietZoneModules;
    let xMm = Math.min(idealXmm, maxSymbolWidthMm / totalUnitsWithQuiet);
    if (xMm < 0.25) xMm = 0.25; // floor — accept slight overflow for very long codes

    const heightMm = 18;
    const textGapMm = 4;
    const quietMm = quietZoneModules * xMm;

    // Layout bars in mm
    let cursorMm = quietMm;
    let bars = '';
    for (let i = 0; i < patterns.length; i++) {
      const widthMm = patterns[i] * xMm;
      const isBlack = i % 2 === 0;
      if (isBlack) {
        bars += `<rect x="${cursorMm.toFixed(3)}" y="0" width="${widthMm.toFixed(3)}" height="${heightMm}" fill="#000"/>`;
      }
      cursorMm += widthMm;
    }
    const totalWidthMm = cursorMm + quietMm;
    const totalHeightMm = heightMm + textGapMm;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidthMm.toFixed(2)}mm" height="${totalHeightMm.toFixed(2)}mm" viewBox="0 0 ${totalWidthMm.toFixed(2)} ${totalHeightMm.toFixed(2)}" shape-rendering="crispEdges">
      <rect width="${totalWidthMm.toFixed(2)}" height="${totalHeightMm.toFixed(2)}" fill="#fff"/>
      ${bars}
      <text x="${(totalWidthMm / 2).toFixed(2)}" y="${(heightMm + textGapMm - 0.7).toFixed(2)}" text-anchor="middle" font-family="monospace" font-size="3.2" font-weight="bold" fill="#000">${cleanText}</text>
    </svg>`;

  } catch (error) {
    console.error('Error generating Code 128 barcode:', error);
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
