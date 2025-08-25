
import { useEffect, useRef } from 'react';
import { useShopifyOrderSync } from './useShopifyOrderSync';
import { useApiConfigs } from './useApiConfigs';

export const useShopifyAutoSync = (intervalMinutes: number = 5) => {
  const { syncShopifyOrders } = useShopifyOrderSync();
  const { apiConfigs } = useApiConfigs();
  const intervalRef = useRef<NodeJS.Timeout>();

  const isShopifyConfigured = Boolean(
    apiConfigs?.shopify?.enabled && 
    apiConfigs?.shopify?.shop_url && 
    apiConfigs?.shopify?.access_token
  );

  useEffect(() => {
    if (!isShopifyConfigured) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Initial sync when component mounts
    syncShopifyOrders().catch(console.error);

    // Set up auto-sync interval
    intervalRef.current = setInterval(() => {
      syncShopifyOrders().catch(console.error);
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [syncShopifyOrders, isShopifyConfigured, intervalMinutes]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
