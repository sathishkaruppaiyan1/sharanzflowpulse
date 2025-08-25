
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useToast } from '@/hooks/use-toast';
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

export const useOrdersByStage = (stage: OrderStage) => {
  return useOrders(stage);
};

export const useUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, stage }: { orderId: string; stage: OrderStage }) => {
      return supabaseOrderService.updateOrderStage(orderId, stage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Success",
        description: "Order stage updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order stage",
        variant: "destructive",
      });
    },
  });
};

export const useBulkUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderIds, stage }: { orderIds: string[]; stage: OrderStage }) => {
      const promises = orderIds.map(orderId => 
        supabaseOrderService.updateOrderStage(orderId, stage)
      );
      return Promise.all(promises);
    },
    onSuccess: (_, { orderIds, stage }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Success",
        description: `${orderIds.length} orders moved to ${stage} stage`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order stages",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTracking = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, trackingNumber, carrier }: { orderId: string; trackingNumber: string; carrier?: string }) => {
      return supabaseOrderService.updateOrderTracking(orderId, trackingNumber, carrier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: "Success",
        description: "Tracking information updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tracking information",
        variant: "destructive",
      });
    },
  });
};
