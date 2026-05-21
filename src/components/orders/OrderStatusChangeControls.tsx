import React, { useMemo, useState } from 'react';
import { MoveRight, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { Order } from '@/types/database';

type OrderQueueStatus = 'processing' | 'hold' | 'inprogress';

interface OrderStatusChangeControlsProps {
  internalOrder: Order | null;
  shopifyOrder?: any;
  shopifyOrderId: string | number;
  currentStatus: OrderQueueStatus;
  onStatusChange?: () => void;
}

const statusMeta: Record<OrderQueueStatus, { label: string; icon: React.ReactNode }> = {
  processing: {
    label: 'Processing',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  hold: {
    label: 'Hold',
    icon: <PauseCircle className="h-4 w-4" />,
  },
  inprogress: {
    label: 'In Progress',
    icon: <PlayCircle className="h-4 w-4" />,
  },
};

const OrderStatusChangeControls = ({
  internalOrder,
  shopifyOrder,
  shopifyOrderId,
  currentStatus,
  onStatusChange,
}: OrderStatusChangeControlsProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderQueueStatus | ''>('');

  const orderNumber =
    internalOrder?.order_number ||
    shopifyOrder?.order_number ||
    shopifyOrder?.name ||
    String(shopifyOrderId);

  const availableStatuses = useMemo(() => {
    switch (currentStatus) {
      case 'processing':
        return ['inprogress', 'hold'] as OrderQueueStatus[];
      case 'hold':
        return ['processing', 'inprogress'] as OrderQueueStatus[];
      case 'inprogress':
        return ['processing', 'hold'] as OrderQueueStatus[];
      default:
        return [];
    }
  }, [currentStatus]);

  const handleStatusChange = async (newStatus: OrderQueueStatus) => {
    if (newStatus === currentStatus || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const localStage = newStatus === 'hold' ? 'hold' : 'pending';
      const shopifyTarget =
        newStatus === 'hold' ? 'hold' : newStatus === 'inprogress' ? 'inprogress' : 'pending';

      // Ensure the order exists locally so we can persist the stage. If the
      // user is editing a Shopify-only order (never touched by us yet), the
      // RPC upserts it on the fly.
      let dbOrderId = internalOrder?.id ?? null;
      if (!dbOrderId) {
        if (!shopifyOrder) {
          throw new Error('Order is not synced locally and no Shopify data was provided.');
        }
        dbOrderId = await supabaseOrderService.createOrderFromShopify(shopifyOrder, 'pending');
      }

      const localPromise = supabaseOrderService.updateOrderStage(dbOrderId, localStage);
      const shopifyPromise = supabaseOrderService.syncShopifyOrderStage(shopifyOrderId, shopifyTarget);

      shopifyPromise
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['shopify-orders'] });
          queryClient.invalidateQueries({ queryKey: ['shopify-held-order-ids'] });
        })
        .catch((err: unknown) => {
          console.error('Background Shopify sync failed:', err);
          toast.error(err instanceof Error ? err.message : 'Shopify sync failed');
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['shopify-orders'] });
          queryClient.invalidateQueries({ queryKey: ['shopify-held-order-ids'] });
        });

      await localPromise;

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${orderNumber} moved to ${statusMeta[newStatus].label}.`);
      setSelectedStatus('');
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update order status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-400">{orderNumber}</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
          <MoveRight className="h-3 w-3" /> Change order status
        </label>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as OrderQueueStatus)}
          disabled={isSubmitting || availableStatuses.length === 0}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={isSubmitting ? 'Updating...' : 'Select a status...'} />
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                <div className="flex items-center gap-2">
                  {statusMeta[status].icon}
                  <span>{statusMeta[status].label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        disabled={isSubmitting || !selectedStatus}
        onClick={() => void handleStatusChange(selectedStatus as OrderQueueStatus)}
      >
        {isSubmitting ? 'Updating...' : 'Update Status'}
      </Button>

      {isSubmitting && (
        <p className="text-xs text-blue-600 font-medium animate-pulse">Updating Shopify and local order status...</p>
      )}
    </div>
  );
};

export default OrderStatusChangeControls;
