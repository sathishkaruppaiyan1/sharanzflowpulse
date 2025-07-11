
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { toast } from 'sonner';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: supabaseOrderService.fetchOrders,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useOrdersByStage = (stage: OrderStage) => {
  return useQuery({
    queryKey: ['orders', 'stage', stage],
    queryFn: () => supabaseOrderService.fetchOrdersByStage(stage),
    refetchInterval: 30000,
  });
};

export const useUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, stage }: { orderId: string; stage: OrderStage }) =>
      supabaseOrderService.updateOrderStage(orderId, stage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${data.order_number} moved to ${data.stage} stage`);
    },
    onError: (error) => {
      console.error('Error updating order stage:', error);
      toast.error('Failed to update order stage');
    },
  });
};

export const useUpdateTracking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, trackingNumber, carrier }: { 
      orderId: string; 
      trackingNumber: string; 
      carrier: CarrierType;
    }) => supabaseOrderService.updateTracking(orderId, trackingNumber, carrier),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${data.order_number} has been shipped! WhatsApp notification sent to customer.`);
    },
    onError: (error) => {
      console.error('Error updating tracking:', error);
      toast.error('Failed to update tracking information');
    },
  });
};

export const useSearchOrders = (query: string) => {
  return useQuery({
    queryKey: ['orders', 'search', query],
    queryFn: () => supabaseOrderService.searchOrders(query),
    enabled: query.length > 0,
  });
};

export const useCreateSampleOrders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: supabaseOrderService.createSampleOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Sample orders created successfully!');
    },
    onError: (error) => {
      console.error('Error creating sample orders:', error);
      toast.error('Failed to create sample orders');
    },
  });
};
