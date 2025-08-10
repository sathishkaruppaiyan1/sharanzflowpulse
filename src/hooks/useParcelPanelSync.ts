
import { useState } from 'react';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SyncProgress {
  stage: 'orders' | 'tracking' | 'couriers' | 'complete';
  progress: number;
  total: number;
  status: string;
}

export const useParcelPanelSync = () => {
  const { service, isConfigured } = useParcelPanelService();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const syncAllData = async () => {
    if (!service || !isConfigured) {
      toast({
        title: "Error",
        description: "Parcel Panel API is not configured",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    console.log('🚀 Starting comprehensive Parcel Panel data sync...');

    try {
      // Stage 1: Sync Orders
      setSyncProgress({
        stage: 'orders',
        progress: 0,
        total: 100,
        status: 'Fetching all orders from Parcel Panel...'
      });

      await syncOrders();

      // Stage 2: Sync Tracking Details
      setSyncProgress({
        stage: 'tracking',
        progress: 50,
        total: 100,
        status: 'Syncing tracking details...'
      });

      await syncTrackingDetails();

      // Stage 3: Sync Couriers
      setSyncProgress({
        stage: 'couriers',
        progress: 80,
        total: 100,
        status: 'Fetching courier information...'
      });

      await syncCouriers();

      // Complete
      setSyncProgress({
        stage: 'complete',
        progress: 100,
        total: 100,
        status: 'Sync completed successfully!'
      });

      toast({
        title: "Success",
        description: "All Parcel Panel data synced successfully",
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress(null), 3000);
    }
  };

  const syncOrders = async () => {
    console.log('📦 Syncing orders from Parcel Panel...');
    
    // Fetch orders in batches
    let page = 1;
    let hasMore = true;
    let totalOrders = 0;

    while (hasMore) {
      const response = await service!.fetchOrders({
        page,
        limit: 100
      });

      if (response.code === 200 && response.data?.orders) {
        const orders = response.data.orders;
        console.log(`📄 Processing page ${page} with ${orders.length} orders`);

        // Store orders in system_settings for now (you can create a dedicated table later)
        await supabase
          .from('system_settings')
          .upsert({
            key: `parcel_panel_orders_page_${page}`,
            value: {
              page,
              orders: orders,
              synced_at: new Date().toISOString()
            }
          });

        totalOrders += orders.length;
        hasMore = orders.length === 100; // Continue if we got a full page
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Synced ${totalOrders} orders total`);
  };

  const syncTrackingDetails = async () => {
    console.log('🚚 Syncing tracking details...');
    
    // Get all orders with tracking numbers from our database
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, tracking_number')
      .not('tracking_number', 'is', null);

    if (orders) {
      for (const order of orders) {
        try {
          if (order.tracking_number) {
            console.log(`🔍 Fetching tracking for order ${order.order_number}`);
            const trackingResponse = await service!.trackPackage(order.tracking_number);
            
            if (trackingResponse.code === 200 && trackingResponse.data) {
              // Store detailed tracking info
              await supabase
                .from('order_tracking_details')
                .upsert({
                  order_id: order.id,
                  tracking_number: trackingResponse.data.tracking_number,
                  courier_code: trackingResponse.data.courier_code,
                  courier_name: trackingResponse.data.courier_name,
                  status: trackingResponse.data.status,
                  sub_status: trackingResponse.data.sub_status,
                  origin_country: trackingResponse.data.origin_country,
                  destination_country: trackingResponse.data.destination_country,
                  estimated_delivery_date: trackingResponse.data.estimated_delivery_date,
                  delivered_at: trackingResponse.data.delivered_at,
                  shipped_at: trackingResponse.data.shipped_at,
                  tracking_events: trackingResponse.data.tracking_events,
                  last_updated: new Date().toISOString()
                }, {
                  onConflict: 'order_id'
                });
            }
          }
        } catch (error) {
          console.error(`❌ Failed to sync tracking for order ${order.order_number}:`, error);
        }
      }
    }
  };

  const syncCouriers = async () => {
    console.log('🚛 Syncing courier information...');
    
    try {
      const couriersResponse = await service!.getSupportedCouriers();
      
      // Store courier data
      await supabase
        .from('system_settings')
        .upsert({
          key: 'parcel_panel_couriers',
          value: {
            couriers: couriersResponse,
            synced_at: new Date().toISOString()
          }
        });

      console.log('✅ Couriers synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync couriers:', error);
    }
  };

  return {
    syncAllData,
    isSyncing,
    syncProgress,
    isConfigured
  };
};
