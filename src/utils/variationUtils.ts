export interface VariationInfo {
  color?: string;
  size?: string;
  other?: string;
}

// Common color keywords to identify color variations
const COLOR_KEYWORDS = [
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'orange',
  'grey', 'gray', 'navy', 'maroon', 'olive', 'lime', 'aqua', 'teal', 'silver', 'gold',
  'beige', 'tan', 'khaki', 'coral', 'salmon', 'crimson', 'violet', 'indigo', 'cyan',
  'magenta', 'wine', 'cream', 'ivory', 'pearl', 'rose', 'mint', 'lavender', 'peach',
  'turquoise', 'emerald', 'ruby', 'sapphire', 'amber', 'bronze', 'copper', 'charcoal',
  'sky', 'sea', 'forest', 'royal', 'dark', 'light', 'bright', 'pastel', 'neon',
  'choco', 'chocolate', 'cocoa', 'coffee', 'mocha', 'espresso', 'caramel', 'vanilla'
];

// Common size keywords to identify size variations
const SIZE_KEYWORDS = [
  'xs', 'sm', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl', 'xxl', 'xxxl',
  'small', 'medium', 'large', 'extra small', 'extra large',
  '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50',
  '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26',
  'free size', 'one size', 'os', 'regular', 'plus'
];

export const parseVariationInfo = (variantTitle: string): VariationInfo => {
  if (!variantTitle || variantTitle.trim() === '') {
    return {};
  }

  const lowerTitle = variantTitle.toLowerCase();
  const parts = variantTitle.split(/[\/\-\,\s]+/).map(part => part.trim());
  
  const result: VariationInfo = {};

  // Try to identify color and size from the parts
  parts.forEach(part => {
    const lowerPart = part.toLowerCase();
    
    // Check if this part is a color
    if (COLOR_KEYWORDS.some(color => lowerPart.includes(color))) {
      result.color = part;
    }
    // Check if this part is a size
    else if (SIZE_KEYWORDS.some(size => lowerPart === size || lowerPart.includes(size))) {
      result.size = part;
    }
    // If it's neither color nor size, it might be other variation info
    else if (part.length > 0) {
      result.other = result.other ? `${result.other}, ${part}` : part;
    }
  });

  // If we couldn't identify color or size, try different approaches
  if (!result.color && !result.size) {
    // Check if the whole string looks like a color
    if (COLOR_KEYWORDS.some(color => lowerTitle.includes(color))) {
      result.color = variantTitle;
    }
    // Check if the whole string looks like a size
    else if (SIZE_KEYWORDS.some(size => lowerTitle === size || lowerTitle.includes(size))) {
      result.size = variantTitle;
    }
    // Otherwise, treat it as other variation info
    else {
      result.other = variantTitle;
    }
  }

  return result;
};

export const extractUniqueColors = (orders: any[]): string[] => {
  const colors = new Set<string>();
  
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item: any) => {
        if (item.variant_title) {
          const variationInfo = parseVariationInfo(item.variant_title);
          if (variationInfo.color) {
            colors.add(variationInfo.color);
          }
        }
      });
    }
  });
  
  return Array.from(colors).sort();
};

export const extractUniqueSizes = (orders: any[]): string[] => {
  const sizes = new Set<string>();
  
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item: any) => {
        if (item.variant_title) {
          const variationInfo = parseVariationInfo(item.variant_title);
          if (variationInfo.size) {
            sizes.add(variationInfo.size);
          }
        }
      });
    }
  });
  
  return Array.from(sizes).sort();
};

export const getColorsForProduct = (orders: any[], productName: string): string[] => {
  const colors = new Set<string>();
  
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item: any) => {
        const itemProductName = item.title || item.name;
        if (itemProductName === productName && item.variant_title) {
          const variationInfo = parseVariationInfo(item.variant_title);
          if (variationInfo.color) {
            colors.add(variationInfo.color);
          }
        }
      });
    }
  });
  
  return Array.from(colors).sort();
};

export const getSizesForProduct = (orders: any[], productName: string): string[] => {
  const sizes = new Set<string>();
  
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach((item: any) => {
        const itemProductName = item.title || item.name;
        if (itemProductName === productName && item.variant_title) {
          const variationInfo = parseVariationInfo(item.variant_title);
          if (variationInfo.size) {
            sizes.add(variationInfo.size);
          }
        }
      });
    }
  });
  
  return Array.from(sizes).sort();
};
