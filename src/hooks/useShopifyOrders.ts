
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApiConfigs } from './useApiConfigs';

export interface ShopifyOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: string;
  currency: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  line_items?: Array<{
    title?: string;
    name?: string;
    quantity?: number;
    variant_title?: string;
  }>;
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
  total_weight?: number;
  current_total_price?: string;
}

const fetchShopifyOrders = async (apiConfig: any): Promise<ShopifyOrder[]> => {
  if (!apiConfig.enabled || !apiConfig.shop_url || !apiConfig.access_token) {
    throw new Error('Shopify API not configured');
  }

  console.log('Fetching Shopify orders...');
  const { data, error: functionError } = await supabase.functions.invoke('fetch-shopify-orders');

  if (functionError) {
    throw new Error(functionError.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  const orders = data.orders || [];
  console.log(`Fetched ${orders.length} Shopify orders`);
  
  // Log phone number data for debugging
  orders.forEach((order: ShopifyOrder) => {
    const shippingPhone = order.shipping_address?.phone;
    const customerPhone = order.customer?.phone;
    console.log(`Shopify Order ${order.order_number}: shipping_address.phone = ${shippingPhone}, customer.phone = ${customerPhone}`);
  });

  return orders;
};

export const useShopifyOrders = () => {
  const { apiConfigs } = useApiConfigs();
  
  const isConfigured = Boolean(
    apiConfigs?.shopify?.enabled && 
    apiConfigs?.shopify?.shop_url && 
    apiConfigs?.shopify?.access_token
  );

  const {
    data: orders = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['shopify-orders', apiConfigs?.shopify?.shop_url, apiConfigs?.shopify?.access_token],
    queryFn: () => fetchShopifyOrders(apiConfigs?.shopify),
    enabled: isConfigured,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry if it's a configuration error
      if (error.message?.includes('not configured')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  return {
    orders,
    loading: loading || isRefetching,
    error: error?.message || null,
    refetch: () => refetch(),
    isConfigured
  };
};
