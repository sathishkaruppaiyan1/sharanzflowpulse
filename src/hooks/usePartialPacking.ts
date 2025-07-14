import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdatePartialQuantityParams {
  itemId: string;
  packedQuantity: number;
  pendingQuantity: number;
}

interface MergeOrderParams {
  orderId: string;
}

export const useUpdatePartialQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, packedQuantity, pendingQuantity }: UpdatePartialQuantityParams) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({
          packed_quantity: packedQuantity,
          pending_quantity: pendingQuantity,
          packed: packedQuantity > 0 // Update the legacy packed field for backward compatibility
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Item quantities updated successfully');
    },
    onError: (error) => {
      console.error('Error updating item quantities:', error);
      toast.error('Failed to update item quantities');
    }
  });
};

export const useMergeOrderFromTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId }: MergeOrderParams) => {
      // Get all items for this order and merge packed quantities back to pending
      const { data: items, error: fetchError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (fetchError) throw fetchError;

      // Update each item to merge packed quantity back to total quantity
      for (const item of items) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({
            packed_quantity: 0,
            pending_quantity: item.quantity, // Reset all quantity to pending
            packed: false
          })
          .eq('id', item.id);

        if (updateError) throw updateError;
      }

      // Update order stage to packing
      const { error: orderError } = await supabase
        .from('orders')
        .update({ stage: 'packing' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      return { orderId, merged: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order quantities merged successfully');
    },
    onError: (error) => {
      console.error('Error merging order:', error);
      toast.error('Failed to merge order quantities');
    }
  });
};