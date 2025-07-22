import type { Order } from '@/types/database';

// Helper function to get variation display text from order item
export const getVariationDisplayText = (item: any): string => {
  console.log('Getting variation display for item:', {
    id: item.id,
    title: item.title,
    variant_title: item.variant_title,
    variant_options: item.variant_options,
    sku: item.sku
  });

  // First check if we have variant_title from Supabase
  if (item.variant_title && item.variant_title.trim() !== '') {
    console.log('Using variant_title:', item.variant_title);
    return item.variant_title;
  }
  
  // Then check if we have variant_options from Supabase
  if (item.variant_options && typeof item.variant_options === 'object') {
    const options = Object.entries(item.variant_options)
      .filter(([key, value]) => value && key !== 'name' && key !== 'title')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    if (options) {
      console.log('Using variant_options:', options);
      return options;
    }
  }
  
  // For Shopify orders, check properties
  if (item.properties && Array.isArray(item.properties)) {
    const variations = item.properties
      .filter((prop: any) => prop.name && prop.value && prop.name !== '_' && prop.value !== '')
      .map((prop: any) => `${prop.name}: ${prop.value}`)
      .join(', ');
    
    if (variations) {
      console.log('Using properties:', variations);
      return variations;
    }
  }
  
  // Check if there are any meaningful variation attributes in the item itself
  const variationFields = ['size', 'color', 'style', 'material', 'variant'];
  for (const field of variationFields) {
    if (item[field] && item[field].trim() !== '') {
      console.log(`Using ${field}:`, item[field]);
      return `${field}: ${item[field]}`;
    }
  }
  
  // Only fallback to SKU if it's meaningful (not just a number or generic code)
  if (item.sku && item.sku.trim() !== '' && item.sku !== 'N/A') {
    // Check if SKU contains variation info (like size, color indicators)
    if (item.sku.includes('-') || item.sku.includes('_') || /[a-zA-Z]/.test(item.sku)) {
      console.log('Using meaningful SKU:', item.sku);
      return `SKU: ${item.sku}`;
    }
  }
  
  console.log('No variations found, using default');
  return 'Standard variant';
};

// Helper function to normalize item for display (works for both Shopify and Supabase orders)
export const normalizeItemForDisplay = (item: any) => {
  const variationText = getVariationDisplayText(item);
  
  return {
    ...item,
    displayName: `${item.title || item.name || 'Unknown Product'}`,
    variationText: variationText,
    quantity: item.quantity || 1,
    price: item.price || 0
  };
};

// Helper function to get detailed product info with variations
export const getDetailedProductInfo = (order: Order) => {
  if (!order.order_items || order.order_items.length === 0) {
    return [];
  }

  return order.order_items.map(item => normalizeItemForDisplay(item));
};
