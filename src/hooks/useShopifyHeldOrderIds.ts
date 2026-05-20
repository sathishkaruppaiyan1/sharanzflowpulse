import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApiConfigs } from './useApiConfigs';
import type { ShopifyOrder } from './useShopifyOrders';

interface HeldOrdersResponse {
  held_order_ids?: string[];
  orders?: ShopifyOrder[];
  in_progress_order_ids?: string[];
  in_progress_orders?: ShopifyOrder[];
  error?: string;
}

const fetchHeldOrders = async (): Promise<HeldOrdersResponse> => {
  const { data, error } = await supabase.functions.invoke<HeldOrdersResponse>(
    'shopify-held-orders'
  );
  if (error) throw new Error(error.message || 'Failed to fetch held orders');
  if (data?.error) throw new Error(data.error);
  return data || {};
};

export const useShopifyHeldOrderIds = () => {
  const { apiConfigs } = useApiConfigs();
  const shopUrl = apiConfigs?.shopify?.shop_url || '';
  const accessToken = apiConfigs?.shopify?.access_token || '';
  const clientId = apiConfigs?.shopify?.client_id || '';
  const clientSecret = apiConfigs?.shopify?.client_secret || '';
  const enabled = Boolean(
    apiConfigs?.shopify?.enabled &&
      shopUrl &&
      (accessToken || (clientId && clientSecret))
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shopify-held-order-ids', shopUrl, accessToken, clientId, clientSecret],
    queryFn: fetchHeldOrders,
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    heldIds: new Set((data?.held_order_ids || []).map(String)),
    heldOrders: data?.orders || [],
    inProgressIds: new Set((data?.in_progress_order_ids || []).map(String)),
    inProgressOrders: data?.in_progress_orders || [],
    isLoading,
    error: error?.message || null,
    refetch,
  };
};
