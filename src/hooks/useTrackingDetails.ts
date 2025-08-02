
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

      // Transform the data to match our interface
      return {
        ...data,
        tracking_events: Array.isArray(data.tracking_events) 
          ? data.tracking_events.map((event: any) => ({
              time: event.time || '',
              description: event.description || '',
              location: event.location,
              status: event.status
            }))
          : []
      } as TrackingDetails;
    },
    enabled: Boolean(orderId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
