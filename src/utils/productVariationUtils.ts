
// Utility functions for extracting and formatting product variations
export const extractProductVariation = (item: any): string => {
  console.log('=== Extracting Product Variation ===');
  console.log('Item:', item);
  
  const baseTitle = item.title || 'Product';
  
  // Method 1: Check if title already contains variation info in parentheses
  const parenthesisMatch = baseTitle.match(/^(.+?)\s*\((.+)\)$/);
  if (parenthesisMatch && parenthesisMatch[2]) {
    const productName = parenthesisMatch[1].trim();
    const variation = parenthesisMatch[2].trim();
    console.log('Found variation in parentheses:', variation);
    return `${productName} - ${variation}`;
  }
  
  // Method 2: Check if title contains variation after dash
  const dashMatch = baseTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch && dashMatch[2]) {
    const productName = dashMatch[1].trim();
    const variation = dashMatch[2].trim();
    console.log('Found variation after dash:', variation);
    return `${productName} - ${variation}`;
  }
  
  // Method 3: Extract from SKU if it contains variation info
  if (item.sku && typeof item.sku === 'string' && item.sku.trim()) {
    // Look for patterns like "PRODUCT-COLOR-SIZE" or "PRODUCT/COLOR/SIZE"
    const skuParts = item.sku.split(/[-/_]/);
    if (skuParts.length >= 3) {
      const variation = skuParts.slice(-2).join('/'); // Take last 2 parts as variation
      console.log('Extracted variation from SKU:', variation);
      return `${baseTitle} - ${variation}`;
    }
  }
  
  // Method 4: If we have variant_title from Shopify data, use it
  if (item.variant_title && item.variant_title !== 'Default Title') {
    console.log('Using variant_title:', item.variant_title);
    return `${baseTitle} - ${item.variant_title}`;
  }
  
  // Method 5: Try to extract variation from title patterns like "ProductName Color Size"
  const titleWords = baseTitle.trim().split(/\s+/);
  if (titleWords.length >= 3) {
    // Common patterns: "ProductName Color Size" or "Product Name Color Size"
    const lastTwoWords = titleWords.slice(-2);
    const possibleColorSize = lastTwoWords.join('/');
    
    // Check if the last words might be color/size (simple heuristic)
    const colorSizePattern = /^[a-zA-Z]+\/[a-zA-Z0-9]+$/;
    if (colorSizePattern.test(possibleColorSize)) {
      const productName = titleWords.slice(0, -2).join(' ');
      console.log('Extracted variation from title pattern:', possibleColorSize);
      return `${productName} - ${possibleColorSize}`;
    }
  }
  
  // Method 6: If we have shopify_variant_id, show it as a last resort
  if (item.shopify_variant_id) {
    console.log('Using shopify_variant_id as variation:', item.shopify_variant_id);
    return `${baseTitle} - Variant #${item.shopify_variant_id}`;
  }
  
  console.log('No variation found, returning base title');
  return baseTitle;
};

export const getVariationDisplay = (item: any): { 
  productName: string; 
  variation: string | null; 
  fullDisplay: string;
  hasVariation: boolean;
} => {
  const fullDisplay = extractProductVariation(item);
  
  // Check if the display contains a variation
  const variationMatch = fullDisplay.match(/^(.+?)\s*-\s*(.+)$/);
  
  if (variationMatch) {
    return {
      productName: variationMatch[1].trim(),
      variation: variationMatch[2].trim(),
      fullDisplay,
      hasVariation: true
    };
  }
  
  return {
    productName: fullDisplay,
    variation: null,
    fullDisplay,
    hasVariation: false
  };
};
