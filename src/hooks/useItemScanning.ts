
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from '@/types/database';

interface ItemScanProgress {
  itemId: string;
  scannedCount: number;
  requiredCount: number;
  completed: boolean;
}

export const useItemScanning = (currentOrder: Order | null) => {
  const queryClient = useQueryClient();
  const [scanProgress, setScanProgress] = useState<Record<string, ItemScanProgress>>({});

  // Initialize scan progress when order changes
  const initializeScanProgress = (order: Order) => {
    const progress: Record<string, ItemScanProgress> = {};
    order.order_items.forEach(item => {
      progress[item.id] = {
        itemId: item.id,
        scannedCount: item.packed ? item.quantity : 0, // Use actual packed status from database
        requiredCount: item.quantity,
        completed: item.packed || false // Use actual packed status
      };
    });
    setScanProgress(progress);
    console.log('Initialized scan progress:', progress);
  };

  const updateItemScanCount = useMutation({
    mutationFn: async ({ itemId, increment }: { itemId: string; increment: boolean }) => {
      if (!currentOrder) throw new Error('No current order');
      
      const currentProgress = scanProgress[itemId];
      if (!currentProgress) throw new Error('Item not found in scan progress');

      let newScannedCount = currentProgress.scannedCount;
      if (increment && newScannedCount < currentProgress.requiredCount) {
        newScannedCount++;
      } else if (!increment && newScannedCount > 0) {
        newScannedCount--;
      }

      const isCompleted = newScannedCount === currentProgress.requiredCount;

      // Update local state first
      setScanProgress(prev => ({
        ...prev,
        [itemId]: {
          ...currentProgress,
          scannedCount: newScannedCount,
          completed: isCompleted
        }
      }));

      console.log('Updating database for item:', itemId, 'packed:', isCompleted);

      // Update database
      const { data, error } = await supabase
        .from('order_items')
        .update({ packed: isCompleted })
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database updated successfully:', data);
      return { data, newScannedCount, isCompleted };
    },
    onSuccess: async ({ newScannedCount, isCompleted }, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      const item = currentOrder?.order_items.find(i => i.id === itemId);
      if (item) {
        if (isCompleted) {
          toast.success(`✅ ${item.title} - All ${item.quantity} items scanned!`);
        } else {
          toast.success(`📦 ${item.title} - ${newScannedCount}/${item.quantity} scanned`);
        }
      }

      // Check if order is complete and automatically move to tracking stage
      if (currentOrder && isOrderComplete()) {
        try {
          console.log(`Order ${currentOrder.order_number} completed, moving to tracking stage automatically`);
          
          const { error } = await supabase
            .from('orders')
            .update({ 
              stage: 'tracking' as any,
              packed_at: new Date().toISOString()
            })
            .eq('id', currentOrder.id);

          if (error) {
            console.error('Error moving order to tracking:', error);
            toast.error('Failed to move order to tracking stage');
          } else {
            toast.success(`🎉 Order ${currentOrder.order_number} completed and moved to tracking stage!`, {
              duration: 5000
            });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
          }
        } catch (error) {
          console.error('Error in automatic stage progression:', error);
          toast.error('Failed to automatically progress order stage');
        }
      }
    },
    onError: (error) => {
      console.error('Error updating scan count:', error);
      toast.error('Failed to update scan count');
    },
  });

  const scanItem = (sku: string) => {
    if (!currentOrder) {
      toast.error('No order loaded');
      return false;
    }

    console.log('Scanning SKU:', sku, 'in order:', currentOrder.order_number);

    // Find matching item by SKU
    const matchingItem = currentOrder.order_items.find(item => 
      item.sku === sku || 
      item.title.toLowerCase().includes(sku.toLowerCase())
    );

    if (!matchingItem) {
      toast.error(`❌ SKU "${sku}" not found in this order!`);
      return false;
    }

    const progress = scanProgress[matchingItem.id];
    if (!progress) {
      toast.error('Item not found in progress tracking');
      return false;
    }

    if (progress.completed) {
      toast.warning(`✅ ${matchingItem.title} already completed (${progress.scannedCount}/${progress.requiredCount})`);
      return true;
    }

    console.log('Item found, updating scan count:', matchingItem.title, 'Current count:', progress.scannedCount);
    
    // Increment scan count
    updateItemScanCount.mutate({ itemId: matchingItem.id, increment: true });
    return true;
  };

  const isOrderComplete = () => {
    if (!currentOrder || Object.keys(scanProgress).length === 0) return false;
    const allCompleted = Object.values(scanProgress).every(progress => progress.completed);
    console.log('Checking if order complete:', allCompleted, 'Progress:', scanProgress);
    return allCompleted;
  };

  const getOrderProgress = () => {
    const totalItems = Object.values(scanProgress).reduce((sum, progress) => sum + progress.requiredCount, 0);
    const scannedItems = Object.values(scanProgress).reduce((sum, progress) => sum + progress.scannedCount, 0);
    return { scannedItems, totalItems };
  };

  return {
    scanProgress,
    initializeScanProgress,
    scanItem,
    isOrderComplete,
    getOrderProgress,
    updateItemScanCount,
    isScanning: updateItemScanCount.isPending
  };
};
