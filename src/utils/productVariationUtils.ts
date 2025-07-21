
import type { Order } from '@/types/database';

// Helper function to get variation display text from order item
export const getVariationDisplayText = (item: any): string => {
  // First check if we have variant_title from Supabase
  if (item.variant_title) {
    return item.variant_title;
  }
  
  // Then check if we have variant_options from Supabase
  if (item.variant_options && typeof item.variant_options === 'object') {
    const options = Object.entries(item.variant_options)
      .filter(([key, value]) => value && key !== 'name')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    if (options) {
      return options;
    }
  }
  
  // For Shopify orders, check variant_title directly
  if (item.variant_title) {
    return item.variant_title;
  }
  
  // For Shopify orders, check properties
  if (item.properties && Array.isArray(item.properties)) {
    const variations = item.properties
      .filter((prop: any) => prop.name && prop.value)
      .map((prop: any) => `${prop.name}: ${prop.value}`)
      .join(', ');
    
    if (variations) {
      return variations;
    }
  }
  
  // Fallback to SKU if no variations found
  return item.sku || 'No variations';
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
