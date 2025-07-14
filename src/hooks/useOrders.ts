import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { toast } from 'sonner';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching orders from Supabase...');
      const orders = await supabaseOrderService.fetchOrders();
      console.log('Fetched orders:', orders.length);
      orders.forEach(order => {
        console.log(`Order ${order.order_number}: items = ${order.order_items?.length || 0}, customer phone = ${order.customer?.phone}`);
        if (order.order_items) {
          order.order_items.forEach(item => {
            console.log(`  - Item: ${item.title}, qty: ${item.quantity}, packed: ${item.packed}`);
          });
        }
      });
      return orders;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useOrdersByStage = (stage: OrderStage) => {
  return useQuery({
    queryKey: ['orders', 'stage', stage],
    queryFn: async () => {
      console.log(`Fetching orders for stage: ${stage}`);
      const orders = await supabaseOrderService.fetchOrdersByStage(stage);
      console.log(`Orders in ${stage} stage:`, orders.length);
      orders.forEach(order => {
        console.log(`Order ${order.order_number} in ${stage}: items = ${order.order_items?.length || 0}, customer phone = ${order.customer?.phone}`);
        if (order.order_items) {
          const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
          const packedItems = order.order_items.filter(item => item.packed).length;
          console.log(`  - Total items: ${totalItems}, Packed items: ${packedItems}`);
        }
      });
      return orders;
    },
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
