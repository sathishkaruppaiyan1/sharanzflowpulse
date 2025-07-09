
import { useState, useEffect } from 'react';
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
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would call your backend API or Shopify directly
      // For now, we'll simulate some sample data
      const mockOrders: ShopifyOrder[] = [
        {
          id: '1001',
          order_number: '#1001',
          customer_name: 'John Doe',
          total_amount: '99.99',
          currency: 'USD',
          created_at: new Date().toISOString(),
          financial_status: 'paid',
          fulfillment_status: 'unfulfilled'
        },
        {
          id: '1002',
          order_number: '#1002',
          customer_name: 'Jane Smith',
          total_amount: '149.50',
          currency: 'USD',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          financial_status: 'paid',
          fulfillment_status: 'partial'
        },
        {
          id: '1003',
          order_number: '#1003',
          customer_name: 'Bob Johnson',
          total_amount: '79.25',
          currency: 'USD',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          financial_status: 'pending',
          fulfillment_status: 'unfulfilled'
        }
      ];

      setOrders(mockOrders);
    } catch (err) {
      setError('Failed to fetch Shopify orders');
      console.error('Error fetching Shopify orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiConfigs.shopify.enabled) {
      fetchShopifyOrders();
    }
  }, [apiConfigs.shopify.enabled, apiConfigs.shopify.shop_url, apiConfigs.shopify.access_token]);

  return {
    orders,
    loading,
    error,
    refetch: fetchShopifyOrders
  };
};
