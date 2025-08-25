
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParcelPanelService } from '@/services/parcelPanelService';

export interface TrackingOrder {
  id: string;
  order_number: string;
  stage: string;
  tracking_number?: string;
  courier_name?: string;
  tracking_status?: string;
  tracking_sub_status?: string;
  tracking_last_updated?: string;
  updated_at: string;
}

export const useTrackingOrders = () => {
  const [trackingOrders, setTrackingOrders] = useState<TrackingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { service, isConfigured } = useParcelPanelService();

  // Fetch orders in tracking stage with their tracking details
  const fetchTrackingOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First get orders in tracking stage
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          stage,
          updated_at
        `)
        .eq('stage', 'tracking')
        .order('updated_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setTrackingOrders([]);
        return;
      }

      // Get tracking details for these orders
      const orderIds = orders.map(order => order.id);
      const { data: trackingDetails, error: trackingError } = await supabase
        .from('order_tracking_details')
        .select('*')
        .in('order_id', orderIds);

      if (trackingError) {
        console.error('Error fetching tracking details:', trackingError);
        // Continue without tracking details if there's an error
      }

      // Combine orders with their tracking details
      const combinedOrders: TrackingOrder[] = orders.map(order => {
        const tracking = trackingDetails?.find(t => t.order_id === order.id);
        return {
          id: order.id,
          order_number: order.order_number,
          stage: order.stage,
          updated_at: order.updated_at,
          tracking_number: tracking?.tracking_number,
          courier_name: tracking?.courier_name,
          tracking_status: tracking?.status,
          tracking_sub_status: tracking?.sub_status,
          tracking_last_updated: tracking?.last_updated
        };
      });

      setTrackingOrders(combinedOrders);

      // Auto-fetch tracking details for orders that don't have them yet
      if (service && isConfigured) {
        await autoFetchMissingTracking(combinedOrders);
      }

    } catch (err: any) {
      console.error('Error fetching tracking orders:', err);
      setError(err.message || 'Failed to fetch tracking orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch tracking details for orders without tracking information
  const autoFetchMissingTracking = async (orders: TrackingOrder[]) => {
    const ordersWithoutTracking = orders.filter(order => !order.tracking_status);
    
    if (ordersWithoutTracking.length === 0) return;

    console.log(`🔄 Auto-fetching tracking for ${ordersWithoutTracking.length} orders without tracking data`);

    for (const order of ordersWithoutTracking) {
      try {
        await service!.fetchAndStoreTrackingDetails(order.order_number, order.id);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to auto-fetch tracking for order ${order.order_number}:`, error);
      }
    }

    // Refresh the list after auto-fetching
    setTimeout(() => {
      fetchTrackingOrders();
    }, 2000);
  };

  // Refresh tracking data for all orders
  const refreshTracking = async () => {
    if (!service || !isConfigured) {
      setError('Parcel Panel API is not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('stage', 'tracking');

      if (ordersError) throw ordersError;

      if (orders && orders.length > 0) {
        console.log(`🔄 Refreshing tracking for ${orders.length} orders`);
        
        for (const order of orders) {
          try {
            await service.fetchAndStoreTrackingDetails(order.order_number, order.id);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Failed to refresh tracking for order ${order.order_number}:`, error);
          }
        }
      }

      // Refresh the displayed data
      await fetchTrackingOrders();
    } catch (err: any) {
      console.error('Error refreshing tracking:', err);
      setError(err.message || 'Failed to refresh tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load tracking orders on component mount
  useEffect(() => {
    fetchTrackingOrders();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrackingOrders();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    trackingOrders,
    isLoading,
    error,
    fetchTrackingOrders,
    refreshTracking
  };
};
