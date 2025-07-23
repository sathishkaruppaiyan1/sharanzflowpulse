
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStage } from '@/types/database';
import { toast } from 'sonner';
import { supabaseOrderService } from '@/services/supabaseOrderService';

export const useOrdersByStage = (stages: string | string[]) => {
  const stageArray = Array.isArray(stages) ? stages : [stages];
  
  return useQuery({
    queryKey: ['orders', 'by-stage', stageArray],
    queryFn: async () => {
      console.log('Fetching orders for stages:', stageArray);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          shipping_address:addresses!orders_shipping_address_id_fkey(*),
          order_items(*)
        `)
        .in('stage', stageArray as OrderStage[])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders by stage:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} orders for stage ${stageArray.join(', ')}`);
      console.log('Successfully fetched', data?.length || 0, 'orders for stage', stageArray.join(', '));

      // Debug log for each order
      data?.forEach(order => {
        console.log(`\n--- Order ${order.order_number} Debug ---`);
        console.log('Stage:', order.stage);
        console.log('Order items count:', order.order_items?.length || 0);
        console.log('Customer phone:', order.customer?.phone);
        console.log('Shipping address exists:', !!order.shipping_address);
        
        order.order_items?.forEach(item => {
          console.log(`  Item: ${item.title}, qty: ${item.quantity}, packed: ${item.packed}, SKU: ${item.sku || 'N/A'}`);
        });
        
        const totalQty = order.order_items?.length || 0;
        const packedQty = order.order_items?.filter(item => item.packed).length || 0;
        console.log(`  Total qty: ${totalQty}, Packed qty: ${packedQty}`);
      });

      console.log('Total unique orders fetched:', data?.length || 0);
      
      return (data as Order[]) || [];
    },
  });
};

// Add the missing useOrders export that other components depend on
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      console.log('Fetching all orders');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          shipping_address:addresses!orders_shipping_address_id_fkey(*),
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all orders:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} total orders`);
      return (data as Order[]) || [];
    },
  });
};

export const useUpdateOrderStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, stage }: { orderId: string; stage: string }) => {
      console.log(`Updating order ${orderId} to stage ${stage}`);
      
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          stage: stage as OrderStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order stage:', error);
        throw error;
      }

      console.log(`Successfully updated order ${orderId} to stage ${stage}`);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all order queries to refresh the data
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
    mutationFn: async ({ 
      orderId, 
      trackingNumber, 
      carrier 
    }: { 
      orderId: string; 
      trackingNumber: string; 
      carrier: string; 
    }) => {
      console.log(`🚀 Starting tracking update for order ${orderId}: ${trackingNumber} via ${carrier}`);
      
      // Use the supabaseOrderService to handle the complete tracking update including Shopify
      const updatedOrder = await supabaseOrderService.updateTracking(orderId, trackingNumber, carrier as any);
      
      console.log(`✅ Successfully updated tracking for order ${orderId} with Shopify integration`);
      return updatedOrder;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`🎉 Tracking added for order ${data.order_number} and synced to Shopify!`);
    },
    onError: (error) => {
      console.error('❌ Error updating tracking:', error);
      toast.error('Failed to add tracking information');
    },
  });
};
