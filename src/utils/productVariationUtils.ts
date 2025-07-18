
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
  if (item.sku && typeof item.sku === 'string') {
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
  
  // Method 5: Create a placeholder variation for items that should have variations
  if (item.shopify_variant_id && item.shopify_variant_id !== item.product?.shopify_product_id) {
    // For products that clearly have variants but we don't have the variation data
    // We'll show a placeholder that indicates missing variation data
    console.log('Creating placeholder for missing variation data');
    return `${baseTitle} - Variation Required`;
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
