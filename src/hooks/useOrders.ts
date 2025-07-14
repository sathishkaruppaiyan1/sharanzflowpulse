
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { Order, OrderStage, CarrierType } from '@/types/database';
import { toast } from 'sonner';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('=== Fetching all orders ===');
      try {
        const orders = await supabaseOrderService.fetchOrders();
        console.log('Successfully fetched orders:', orders.length);
        
        orders.forEach(order => {
          console.log(`Order ${order.order_number}: stage=${order.stage}, items=${order.order_items?.length || 0}`);
          if (order.order_items) {
            order.order_items.forEach(item => {
              console.log(`  - ${item.title}: qty=${item.quantity}, packed=${item.packed}`);
            });
          }
        });
        
        return orders;
      } catch (error) {
        console.error('Error in useOrders:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
  });
};

export const useOrdersByStage = (stage: OrderStage) => {
  return useQuery({
    queryKey: ['orders', 'stage', stage],
    queryFn: async () => {
      console.log(`=== Fetching orders for stage: ${stage} ===`);
      try {
        const orders = await supabaseOrderService.fetchOrdersByStage(stage);
        console.log(`Successfully fetched ${orders.length} orders for stage ${stage}`);
        
        orders.forEach(order => {
          console.log(`\n--- Order ${order.order_number} Debug ---`);
          console.log('Stage:', order.stage);
          console.log('Order items count:', order.order_items?.length || 0);
          console.log('Customer phone:', order.customer?.phone);
          
          if (order.order_items && order.order_items.length > 0) {
            let totalQty = 0;
            let packedQty = 0;
            order.order_items.forEach(item => {
              const qty = Number(item.quantity) || 0;
              totalQty += qty;
              if (item.packed) {
                packedQty += qty;
              }
              console.log(`  Item: ${item.title}, qty: ${qty}, packed: ${item.packed}, SKU: ${item.sku || 'N/A'}`);
            });
            console.log(`  Total qty: ${totalQty}, Packed qty: ${packedQty}`);
          } else {
            console.log('  WARNING: No order items found!');
          }
        });
        
        return orders;
      } catch (error) {
        console.error(`Error fetching orders for stage ${stage}:`, error);
        throw error;
      }
    },
    refetchInterval: 30000,
  });
};

export const useUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, stage }: { orderId: string; stage: OrderStage }) => {
      console.log(`=== Updating order stage ===`);
      console.log('Order ID:', orderId);
      console.log('New stage:', stage);
      
      try {
        const result = await supabaseOrderService.updateOrderStage(orderId, stage);
        console.log('Order stage update successful:', result);
        return result;
      } catch (error) {
        console.error('Error in updateOrderStage mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Order stage mutation success:', data.order_number, '->', data.stage);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage'] });
      toast.success(`Order ${data.order_number} moved to ${data.stage} stage`);
    },
    onError: (error) => {
      console.error('Order stage mutation error:', error);
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
