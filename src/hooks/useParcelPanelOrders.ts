
import { useQuery } from '@tanstack/react-query';
import { useParcelPanelService } from '@/services/parcelPanelService';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define a basic order info interface for stored data
export interface ParcelPanelOrderInfo {
  order_number: string;
  status: string;
  tracking_number?: string;
  courier_name?: string;
  last_updated: string;
}

export const useParcelPanelOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const { isConfigured } = useParcelPanelService();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['parcel-panel-orders', params?.page, params?.limit, params?.status],
    queryFn: async (): Promise<ParcelPanelOrderInfo[]> => {
      console.log('useParcelPanelOrders - Starting query with params:', params);
      console.log('useParcelPanelOrders - Is configured:', isConfigured);
      
      if (!isConfigured) {
        throw new Error('Parcel Panel API is not configured');
      }

      // Since we don't have a fetchOrders method, we'll fetch from stored tracking data
      let query = supabase
        .from('delivery_tracking_details')
        .select('order_number, status, tracking_number, courier_name, last_updated')
        .order('last_updated', { ascending: false });

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message || 'Failed to fetch orders');
      }

      console.log('useParcelPanelOrders - Orders found:', data?.length || 0);
      return data || [];
    },
    enabled: isConfigured,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (error.message?.includes('not configured')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle errors using useEffect
  useEffect(() => {
    if (query.error) {
      console.error('Error fetching Parcel Panel orders:', query.error);
      toast({
        title: "Error",
        description: `Failed to fetch orders: ${query.error.message}`,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
};

export const useParcelPanelOrdersByStatus = (status: string) => {
  return useParcelPanelOrders({
    status,
    limit: 100 // Adjust as needed
  });
};
