
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
      console.log('Updating item packed status:', itemId, 'to:', packed);
      
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
      toast.success(`${data.title} marked as ${data.packed ? 'packed' : 'unpacked'}`);
    },
    onError: (error) => {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    },
  });

  const scanItem = (sku: string) => {
    if (!currentOrder) {
      toast.error('No order loaded');
      return false;
    }

    if (scannerLocked) {
      toast.warning('Scanner is busy, please wait...');
      return false;
    }

    console.log('Scanning SKU:', sku, 'in order:', currentOrder.order_number);

    // Find matching item by SKU or title
    const matchingItem = currentOrder.order_items.find(item => 
      (item.sku && item.sku.toLowerCase() === sku.toLowerCase()) ||
      item.title.toLowerCase().includes(sku.toLowerCase())
    );

    if (!matchingItem) {
      toast.error(`❌ SKU "${sku}" not found in this order!`);
      return false;
    }

    if (matchingItem.packed) {
      toast.warning(`✅ ${matchingItem.title} already packed`);
      return true;
    }

    console.log('Item found, marking as packed:', matchingItem.title);
    
    setScannerLocked(true);
    updateItemPacked.mutate({ itemId: matchingItem.id, packed: true }, {
      onSettled: () => setScannerLocked(false)
    });
    
    return true;
  };

  const toggleItemPacked = (itemId: string, packed: boolean) => {
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
