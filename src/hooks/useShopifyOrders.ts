
import { useState, useEffect } from 'react';
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
}

export const useShopifyOrders = () => {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiConfigs } = useApiConfigs();

  const fetchShopifyOrders = async () => {
    if (!apiConfigs.shopify.enabled || !apiConfigs.shopify.shop_url || !apiConfigs.shopify.access_token) {
      setError('Shopify API not configured');
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('fetch-shopify-orders');

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setOrders(data.orders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Shopify orders';
      setError(errorMessage);
      console.error('Error fetching Shopify orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiConfigs.shopify.enabled) {
      fetchShopifyOrders();
    } else {
      setOrders([]);
      setError(null);
    }
  }, [apiConfigs.shopify.enabled, apiConfigs.shopify.shop_url, apiConfigs.shopify.access_token]);

  return {
    orders,
    loading,
    error,
    refetch: fetchShopifyOrders
  };
};
