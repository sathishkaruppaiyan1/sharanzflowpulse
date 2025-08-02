
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrackingDetails {
  id: string;
  order_id: string;
  tracking_number: string;
  courier_code: string;
  courier_name: string;
  status: string;
  sub_status?: string;
  origin_country?: string;
  destination_country?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  shipped_at?: string;
  tracking_events: Array<{
    time: string;
    description: string;
    location?: string;
    status?: string;
  }>;
  last_updated: string;
}

export const useTrackingDetails = (orderId: string) => {
  return useQuery({
    queryKey: ['tracking-details', orderId],
    queryFn: async (): Promise<TrackingDetails | null> => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('order_tracking_details')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      // Transform the data to match our TrackingDetails interface with proper type casting
      const transformedData: TrackingDetails = {
        id: data.id,
        order_id: data.order_id,
        tracking_number: data.tracking_number || '',
        courier_code: data.courier_code || '',
        courier_name: data.courier_name || '',
        status: data.status || '',
        sub_status: data.sub_status || undefined,
        origin_country: data.origin_country || undefined,
        destination_country: data.destination_country || undefined,
        estimated_delivery_date: data.estimated_delivery_date || undefined,
        delivered_at: data.delivered_at || undefined,
        shipped_at: data.shipped_at || undefined,
        tracking_events: Array.isArray(data.tracking_events) 
          ? (data.tracking_events as any[]).map(event => ({
              time: event.time || '',
              description: event.description || '',
              location: event.location || undefined,
              status: event.status || undefined
            }))
          : [],
        last_updated: data.last_updated
      };

      return transformedData;
    },
    enabled: Boolean(orderId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
