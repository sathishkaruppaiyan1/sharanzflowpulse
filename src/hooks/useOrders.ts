
import { useQuery } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { OrderStage } from '@/types/database';

export const useOrders = (stage?: OrderStage) => {
  const {
    data: orders = [],
    isLoading: loading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['orders', stage],
    queryFn: () => {
      if (stage) {
        return supabaseOrderService.fetchOrdersByStage(stage);
      }
      return supabaseOrderService.fetchOrders();
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
  });

  return {
    orders,
    loading: loading || isRefetching,
    error: error?.message || null,
    refetch
  };
};
