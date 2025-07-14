
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from '@/types/database';

export const usePackingScanner = (currentOrder: Order | null) => {
  const queryClient = useQueryClient();
  const [scannerLocked, setScannerLocked] = useState(false);

  const updateItemPacked = useMutation({
    mutationFn: async ({ itemId, packed }: { itemId: string; packed: boolean }) => {
      console.log('=== Starting item update ===');
      console.log('Item ID:', itemId);
      console.log('Packed status:', packed);
      
      try {
        const { data, error } = await supabase
          .from('order_items')
          .update({ packed })
          .eq('id', itemId)
          .select('*')
          .single();

        if (error) {
          console.error('Supabase error updating item:', error);
          throw error;
        }

        console.log('Item update successful:', data);
        return data;
      } catch (error) {
        console.error('Error in updateItemPacked mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Item update mutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage', 'packing'] });
      toast.success(`${data.title} marked as ${data.packed ? 'packed' : 'unpacked'}`);
    },
    onError: (error) => {
      console.error('Item update mutation error:', error);
      toast.error('Failed to update item status');
    },
  });

  const scanItem = (sku: string) => {
    console.log('=== Starting SKU scan ===');
    console.log('SKU input:', sku);
    console.log('Current order:', currentOrder?.order_number);
    console.log('Scanner locked:', scannerLocked);

    if (!currentOrder) {
      console.log('No order loaded');
      toast.error('No order loaded');
      return false;
    }

    if (scannerLocked) {
      console.log('Scanner is busy');
      toast.warning('Scanner is busy, please wait...');
      return false;
    }

    console.log('Order items:', currentOrder.order_items?.length || 0);
    console.log('Searching for SKU or title match...');

    // Find matching item by SKU or title
    const matchingItem = currentOrder.order_items.find(item => {
      const skuMatch = item.sku && item.sku.toLowerCase() === sku.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(sku.toLowerCase());
      console.log(`Item: ${item.title}, SKU: ${item.sku}, SKU match: ${skuMatch}, Title match: ${titleMatch}`);
      return skuMatch || titleMatch;
    });

    if (!matchingItem) {
      console.log('No matching item found');
      toast.error(`❌ SKU "${sku}" not found in this order!`);
      return false;
    }

    console.log('Matching item found:', matchingItem.title);
    console.log('Item already packed:', matchingItem.packed);

    if (matchingItem.packed) {
      toast.warning(`✅ ${matchingItem.title} already packed`);
      return true;
    }

    console.log('Marking item as packed...');
    setScannerLocked(true);
    updateItemPacked.mutate({ itemId: matchingItem.id, packed: true }, {
      onSettled: () => {
        console.log('Item update settled, unlocking scanner');
        setScannerLocked(false);
      }
    });
    
    return true;
  };

  const toggleItemPacked = (itemId: string, packed: boolean) => {
    console.log('=== Manual toggle item packed ===');
    console.log('Item ID:', itemId);
    console.log('New packed status:', packed);

    if (scannerLocked) {
      toast.warning('Scanner is busy, please wait...');
      return;
    }

    setScannerLocked(true);
    updateItemPacked.mutate({ itemId, packed }, {
      onSettled: () => setScannerLocked(false)
    });
  };

  const getOrderProgress = () => {
    if (!currentOrder) return { packedItems: 0, totalItems: 0, percentage: 0 };
    
    const totalItems = currentOrder.order_items.reduce((sum, item) => sum + item.quantity, 0);
    const packedItems = currentOrder.order_items
      .filter(item => item.packed)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      packedItems,
      totalItems,
      percentage: totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
    };
  };

  const isOrderComplete = () => {
    if (!currentOrder) return false;
    return currentOrder.order_items.every(item => item.packed);
  };

  return {
    scanItem,
    toggleItemPacked,
    getOrderProgress,
    isOrderComplete,
    isScanning: updateItemPacked.isPending || scannerLocked
  };
};
