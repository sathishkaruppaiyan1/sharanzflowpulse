
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // Read orders in the tracking stage and join whatever tracking rows we
  // already hold. This is now database-only — the Parcel Panel integration
  // that used to back-fill missing rows has been removed.
  const fetchTrackingOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, stage, updated_at')
        .eq('stage', 'tracking')
        .order('updated_at', { ascending: false })
        .limit(500);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setTrackingOrders([]);
        return;
      }

      const orderIds = orders.map(order => order.id);
      const { data: trackingDetails, error: trackingError } = await supabase
        .from('order_tracking_details')
        .select('order_id, tracking_number, courier_name, status, sub_status, last_updated')
        .in('order_id', orderIds);

      if (trackingError) {
        console.error('Error fetching tracking details:', trackingError);
        // Continue without tracking details if there's an error
      }

      const byOrderId = new Map(
        (trackingDetails || []).map(t => [t.order_id, t])
      );

      const combinedOrders: TrackingOrder[] = orders.map(order => {
        const tracking = byOrderId.get(order.id);
        return {
          id: order.id,
          order_number: order.order_number,
          stage: order.stage,
          updated_at: order.updated_at,
          tracking_number: tracking?.tracking_number,
          courier_name: tracking?.courier_name,
          tracking_status: tracking?.status,
          tracking_sub_status: tracking?.sub_status,
          tracking_last_updated: tracking?.last_updated,
        };
      });

      setTrackingOrders(combinedOrders);
    } catch (err: any) {
      console.error('Error fetching tracking orders:', err);
      setError(err.message || 'Failed to fetch tracking orders');
    } finally {
      setIsLoading(false);
    }
  };

  // "Refresh" is now just a re-read of what's stored.
  const refreshTracking = async () => {
    await fetchTrackingOrders();
  };

  useEffect(() => {
    fetchTrackingOrders();
  }, []);

  // Re-read every 5 minutes, but only while the tab is actually visible —
  // background tabs used to keep polling and burn request quota for nothing.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        fetchTrackingOrders();
      }
    };
    const interval = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    trackingOrders,
    isLoading,
    error,
    fetchTrackingOrders,
    refreshTracking,
  };
};
