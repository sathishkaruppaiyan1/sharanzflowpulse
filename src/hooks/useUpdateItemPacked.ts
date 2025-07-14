
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useUpdateItemPacked = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, packed }: { itemId: string; packed: boolean }) => {
      console.log('Updating item packed status:', itemId, packed);
      
      const { data, error } = await supabase
        .from('order_items')
        .update({ packed })
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating item packed status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Item ${data.title} marked as ${data.packed ? 'packed' : 'unpacked'}`);
    },
    onError: (error) => {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    },
  });
};
