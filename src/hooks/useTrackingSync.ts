
import { useEffect, useState } from 'react';
import { useShopifyOrders } from './useShopifyOrders';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { supabase } from '@/integrations/supabase/client';

export const useTrackingSync = () => {
  const { orders, loading: ordersLoading } = useShopifyOrders();
  const { service, isConfigured } = useParcelPanelService();
  const [syncStatus, setSyncStatus] = useState<{
    isSync: boolean;
    processed: number;
    total: number;
    currentOrder?: string;
  }>({
    isSync: false,
    processed: 0,
    total: 0
  });

  // Function to check if order needs tracking sync
  const needsTrackingSync = async (orderId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('order_tracking_details')
        .select('last_updated')
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking tracking sync status:', error);
        return true; // Assume needs sync on error
      }

      if (!data) {
        return true; // No tracking data, needs sync
      }

      // Check if data is older than 30 minutes (reduced from 1 hour for more frequent updates)
      const lastUpdated = new Date(data.last_updated);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      return lastUpdated < thirtyMinutesAgo;
    } catch (error) {
      console.error('Error checking tracking sync status:', error);
      return true;
    }
  };

  // Function to sync tracking details for latest orders
  const syncAllTrackingDetails = async () => {
    if (!service || !isConfigured || !orders || orders.length === 0) {
      console.log('Cannot sync: service not configured or no orders');
      return;
    }

    console.log(`🔄 Starting tracking sync for ${orders.length} latest orders`);
    setSyncStatus({
      isSync: true,
      processed: 0,
      total: orders.length
    });

    let processed = 0;

    for (const order of orders) {
      try {
        setSyncStatus(prev => ({
          ...prev,
          processed,
          currentOrder: order.order_number
        }));

        // Check if this order needs sync
        const needsSync = await needsTrackingSync(order.id);
        
        if (needsSync) {
          console.log(`🔄 Syncing tracking for order: ${order.order_number}`);
          await service.fetchAndStoreTrackingDetails(order.order_number, order.id);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay for faster sync
        } else {
          console.log(`⏭️ Skipping order ${order.order_number} - recently updated`);
        }

        processed++;
      } catch (error) {
        console.error(`❌ Error syncing order ${order.order_number}:`, error);
        processed++;
      }
    }

    setSyncStatus({
      isSync: false,
      processed,
      total: orders.length
    });

    console.log(`✅ Tracking sync completed: ${processed}/${orders.length} orders processed`);
  };

  // Auto-sync on component mount and when new orders are detected
  useEffect(() => {
    if (!ordersLoading && orders && orders.length > 0 && service && isConfigured) {
      // Start sync after a short delay
      const timer = setTimeout(() => {
        syncAllTrackingDetails();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [orders, service, isConfigured, ordersLoading]);

  // Auto-sync every 15 minutes (reduced from 30 minutes for more frequent updates)
  useEffect(() => {
    if (!service || !isConfigured) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-syncing tracking details for latest orders...');
      syncAllTrackingDetails();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [service, isConfigured]);

  return {
    syncStatus,
    syncAllTrackingDetails,
    isConfigured
  };
};
