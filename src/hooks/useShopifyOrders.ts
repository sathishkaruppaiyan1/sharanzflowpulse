
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
  phone?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    id?: string;
  };
  line_items?: Array<{
    title?: string;
    name?: string;
    quantity?: number;
    variant_title?: string;
    price?: number;
    sku?: string;
    variant_id?: number;
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

type ShopifyOrderQueryOptions = {
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean | 'always';
  refetchOnMount?: boolean | 'always';
  refetchOnReconnect?: boolean | 'always';
};

const fetchShopifyOrders = async (apiConfig: any): Promise<ShopifyOrder[]> => {
    const hasToken = Boolean(apiConfig.access_token)
  const hasCreds = Boolean(apiConfig.client_id && apiConfig.client_secret)
  if (!apiConfig.enabled || !apiConfig.shop_url || (!hasToken && !hasCreds)) {
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
  console.log(`✅ Fetched ${orders.length} Shopify orders`);
  
  // Ensure phone number is available at order level
  orders.forEach((order: ShopifyOrder) => {
    if (!order.phone) {
      order.phone = order.shipping_address?.phone || order.customer?.phone || null;
    }
  });

  return orders;
};

export const useShopifyOrders = (options: ShopifyOrderQueryOptions = {}) => {
  const { apiConfigs } = useApiConfigs();
  
  const hasAccessToken = Boolean(apiConfigs?.shopify?.access_token)
  const hasClientCredentials = Boolean(
    apiConfigs?.shopify?.client_id && apiConfigs?.shopify?.client_secret
  )
  const isConfigured = Boolean(
    apiConfigs?.shopify?.enabled &&
    apiConfigs?.shopify?.shop_url &&
    (hasAccessToken || hasClientCredentials)
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
    staleTime: options.staleTime ?? 2 * 60 * 1000,
    gcTime: options.gcTime ?? 10 * 60 * 1000,
    refetchInterval: options.refetchInterval ?? 5 * 60 * 1000,
    refetchIntervalInBackground: options.refetchIntervalInBackground,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? true,
    refetchOnMount: options.refetchOnMount,
    refetchOnReconnect: options.refetchOnReconnect,
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
