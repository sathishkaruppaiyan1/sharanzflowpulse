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
  
  // Method 3: If we have variant_title from Shopify data, use it (priority over SKU)
  if (item.variant_title && item.variant_title !== 'Default Title' && item.variant_title.trim()) {
    console.log('Using variant_title:', item.variant_title);
    return `${baseTitle} - ${item.variant_title}`;
  }
  
  // Method 4: Extract from SKU if it contains variation info (improved logic)
  if (item.sku && typeof item.sku === 'string' && item.sku.trim()) {
    // Look for patterns like "PRODUCT-COLOR-SIZE" or "PRODUCT/COLOR/SIZE" or "COLOR SIZE" format
    const sku = item.sku.trim();
    
    // Pattern 1: SKU with separators like "hakoba-wine-xl" or "hakoba/wine/xl"
    const skuParts = sku.split(/[-/_\s]+/);
    if (skuParts.length >= 2) {
      // If SKU starts with product name, use the remaining parts as variation
      const lowerTitle = baseTitle.toLowerCase();
      const lowerFirstPart = skuParts[0].toLowerCase();
      
      if (lowerTitle.includes(lowerFirstPart) || lowerFirstPart.includes(lowerTitle.split(' ')[0].toLowerCase())) {
        // SKU starts with product name, use remaining parts
        const variation = skuParts.slice(1).join('/');
        if (variation) {
          console.log('Extracted variation from SKU (product-based):', variation);
          return `${baseTitle} - ${variation}`;
        }
      } else {
        // SKU doesn't start with product name, treat as color/size combination
        if (skuParts.length === 2) {
          const variation = skuParts.join('/');
          console.log('Extracted variation from SKU (color/size):', variation);
          return `${baseTitle} - ${variation}`;
        }
      }
    }
    
    // Pattern 2: SKU as "wine xl" or "wine-xl" format (color size)
    const colorSizeMatch = sku.match(/^([a-zA-Z]+)\s*[-_\s]\s*([a-zA-Z0-9]+)$/i);
    if (colorSizeMatch) {
      const variation = `${colorSizeMatch[1]}/${colorSizeMatch[2]}`;
      console.log('Extracted color/size variation from SKU:', variation);
      return `${baseTitle} - ${variation}`;
    }
    
    // Pattern 3: Simple space-separated format like "wine xl"
    const spaceSeparated = sku.split(/\s+/);
    if (spaceSeparated.length === 2 && spaceSeparated.every(part => /^[a-zA-Z0-9]+$/i.test(part))) {
      const variation = spaceSeparated.join('/');
      console.log('Extracted space-separated variation from SKU:', variation);
      return `${baseTitle} - ${variation}`;
    }
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
  
  // Method 6: If we have shopify_variant_id, show it as a last resort only if no other variation found
  if (item.shopify_variant_id && !item.sku) {
    console.log('Using shopify_variant_id as variation (last resort):', item.shopify_variant_id);
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

// Helper function to ensure consistent variation display across stages
export const normalizeItemForDisplay = (item: any): any => {
  const variationInfo = getVariationDisplay(item);
  
  return {
    ...item,
    // Ensure title shows the full variation info
    title: variationInfo.fullDisplay,
    // Keep original data intact
    original_title: item.title,
    original_sku: item.sku,
    // Add computed variation info
    computed_variation: variationInfo.variation,
    has_variation: variationInfo.hasVariation
  };
};
