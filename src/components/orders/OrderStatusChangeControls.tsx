import React, { useMemo, useState } from 'react';
import { Loader2, MoveRight, PauseCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import type { Order } from '@/types/database';

type OrderQueueStatus = 'processing' | 'hold' | 'inprogress';

interface OrderStatusChangeControlsProps {
  order: Order;
  shopifyOrderId: string | number;
  currentStatus: OrderQueueStatus;
  onStatusChange?: () => void;
}

const statusMeta: Record<OrderQueueStatus, { label: string; color: string; icon: React.ReactNode }> = {
  processing: {
    label: 'Processing',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  hold: {
    label: 'Hold',
    color: 'bg-red-100 text-red-800',
    icon: <PauseCircle className="h-4 w-4" />,
  },
  inprogress: {
    label: 'In Progress',
    color: 'bg-amber-100 text-amber-800',
    icon: <Loader2 className="h-4 w-4" />,
  },
};

const OrderStatusChangeControls = ({
  order,
  shopifyOrderId,
  currentStatus,
  onStatusChange,
}: OrderStatusChangeControlsProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderQueueStatus | ''>('');

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
      if (newStatus === 'hold') {
        await supabaseOrderService.syncShopifyOrderStage(shopifyOrderId, 'hold');
        await supabaseOrderService.updateOrderStage(order.id, 'hold');
      } else if (newStatus === 'inprogress') {
        await supabaseOrderService.syncShopifyOrderStage(shopifyOrderId, 'inprogress');
        await supabaseOrderService.updateOrderStage(order.id, 'pending');
      } else if (newStatus === 'processing') {
        await supabaseOrderService.syncShopifyOrderStage(shopifyOrderId, 'pending');
        await supabaseOrderService.updateOrderStage(order.id, 'pending');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['shopify-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['shopify-held-order-ids'] }),
        queryClient.refetchQueries({ queryKey: ['orders'] }),
        queryClient.refetchQueries({ queryKey: ['shopify-orders'] }),
        queryClient.refetchQueries({ queryKey: ['shopify-held-order-ids'] }),
      ]);

      toast.success(`Order ${order.order_number || 'unknown'} moved to ${statusMeta[newStatus].label}.`);
      setSelectedStatus('');
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update Shopify order status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update Shopify order status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Current:</span>
          <Badge className={`${statusMeta[currentStatus].color} flex items-center gap-1`}>
            {statusMeta[currentStatus].icon}
            <span>{statusMeta[currentStatus].label}</span>
          </Badge>
        </div>
        <span className="text-xs text-gray-400">{order.order_number || 'Unknown'}</span>
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

      {currentStatus === 'inprogress' && (
        <p className="text-xs text-gray-500">
          In Progress comes from Shopify fulfillment state. From here you can release it back to Processing.
        </p>
      )}

      {isSubmitting && (
        <p className="text-xs text-blue-600 font-medium animate-pulse">Updating Shopify and local order status...</p>
      )}
    </div>
  );
};

export default OrderStatusChangeControls;
