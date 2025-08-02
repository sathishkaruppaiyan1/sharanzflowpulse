
import { useQuery } from '@tanstack/react-query';
import { useParcelPanelService } from '@/services/parcelPanelService';

export const useTrackingByOrderNumber = (orderNumber: string) => {
  const { service, isConfigured } = useParcelPanelService();

  return useQuery({
    queryKey: ['tracking-by-order-number', orderNumber],
    queryFn: async () => {
      if (!service || !isConfigured || !orderNumber) {
        throw new Error('Service not configured or order number missing');
      }

      const response = await service.fetchTrackingByOrderNumber(orderNumber);
      
      if (response.code !== 200 || !response.data) {
        throw new Error(response.message || 'Failed to fetch tracking details');
      }

      return response.data;
    },
    enabled: isConfigured && Boolean(service) && Boolean(orderNumber),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      if (error.message?.includes('not configured')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
