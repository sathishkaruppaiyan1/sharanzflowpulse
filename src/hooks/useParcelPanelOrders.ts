
import { useQuery } from '@tanstack/react-query';
import { useParcelPanelService, ParcelPanelOrderInfo } from '@/services/parcelPanelService';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export const useParcelPanelOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const { service, isConfigured } = useParcelPanelService();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['parcel-panel-orders', params?.page, params?.limit, params?.status],
    queryFn: async (): Promise<ParcelPanelOrderInfo[]> => {
      if (!service || !isConfigured) {
        throw new Error('Parcel Panel API is not configured');
      }

      const response = await service.fetchOrders(params);
      
      if (response.code !== 200 || !response.data) {
        throw new Error(response.message || 'Failed to fetch orders');
      }

      return response.data.orders;
    },
    enabled: isConfigured && Boolean(service),
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
