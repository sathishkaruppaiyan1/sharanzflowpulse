import React, { useState } from 'react';
import { Package, Truck, CheckCircle, Eye, Printer, MoveRight, PauseCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { Order, OrderStage } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseOrderService } from '@/services/supabaseOrderService';

interface StageChangeControlsProps {
  order: Order;
  currentStage: OrderStage;
  onStageChange?: () => void;
}

const StageChangeControls = ({ order, currentStage, onStageChange }: StageChangeControlsProps) => {
  const updateOrderStage = useUpdateOrderStage();
  const queryClient = useQueryClient();
  const [selectKey, setSelectKey] = useState(0);

  if (!order) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-gray-500">Loading order details...</div>
        </div>
      </div>
    );
  }

  const stages: { value: OrderStage; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'pending', label: 'Pending', icon: <Eye className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
    { value: 'hold', label: 'Hold', icon: <PauseCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
    { value: 'printing', label: 'Printing', icon: <Printer className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    { value: 'packing', label: 'Packing', icon: <Package className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
    { value: 'tracking', label: 'Tracking', icon: <Truck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
    { value: 'delivered', label: 'Delivered', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  ];

  // Stage transitions: orders must flow through printing before tracking.
  // hold and printing cannot jump directly to tracking — printed_at must be set first.
  const allowedStageMap: Partial<Record<OrderStage, OrderStage[]>> = {
    pending: ['hold', 'printing'],
    hold: ['pending', 'printing'],
    printing: ['hold', 'packing'],
    packing: ['hold', 'printing', 'tracking'],
    tracking: ['hold', 'printing', 'packing'],
  };

  const allowedStages = allowedStageMap[currentStage] ?? stages.map((stage) => stage.value);
  const availableStages = allowedStages
    .filter((stage) => stage !== currentStage)
    .map((stage) => stages.find((item) => item.value === stage))
    .filter((stage): stage is (typeof stages)[number] => Boolean(stage));

  const handleStageChange = async (newStage: OrderStage) => {
    if (newStage === currentStage || !order.id) return;

    try {
      if (
        order.shopify_order_id &&
        (newStage === 'hold' || newStage === 'pending' || newStage === 'printing')
      ) {
        await supabaseOrderService.syncShopifyOrderStage(order.shopify_order_id, newStage);
      }

      if (newStage === 'packing') {
        const { error: itemsErr } = await supabase.from('order_items').update({ packed: false }).eq('order_id', order.id);
        if (itemsErr) throw itemsErr;

        const { error: updErr } = await supabase
          .from('orders')
          .update({
            stage: newStage,
            printed_at: new Date().toISOString(),
            packed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        if (updErr) throw updErr;

        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.refetchQueries({ queryKey: ['orders', 'by-stage'] });

        toast.success(`Order ${order.order_number || 'unknown'} moved to ${newStage} stage. All items marked as unpacked.`);
      } else if (newStage === 'tracking') {
        // The enforce_printed_before_tracking DB trigger rejects this update
        // when printed_at is NULL (legacy/manual orders that never went through
        // printing). Backfill it from the existing row if needed.
        const updateData: Record<string, unknown> = {
          stage: newStage,
          packed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (!order.printed_at) {
          updateData.printed_at = new Date().toISOString();
        }
        const { error: updErr } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id);
        if (updErr) throw updErr;

        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.refetchQueries({ queryKey: ['orders', 'by-stage'] });

        toast.success(`Order ${order.order_number || 'unknown'} moved to ${newStage} stage.`);
      } else {
        updateOrderStage.mutate(
          { orderId: order.id, stage: newStage },
          {
            onSuccess: async () => {
              await queryClient.refetchQueries({ queryKey: ['orders', 'by-stage'] });
              toast.success(`Order ${order.order_number || 'unknown'} moved to ${newStage} stage.`);
              onStageChange?.();
            },
            onError: (error: any) => {
              console.error('Failed to update order stage:', error);
              const msg = error?.message || `Failed to move order to ${newStage} stage`;
              toast.error(msg);
            },
          }
        );
        return;
      }

      onStageChange?.();
    } catch (error: any) {
      console.error('Failed to update order stage:', error);
      const msg = error?.message || `Failed to move order to ${newStage} stage`;
      toast.error(msg);
    }
  };

  const currentStageInfo = stages.find((stage) => stage.value === currentStage);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Current:</span>
          {currentStageInfo && (
            <Badge className={`${currentStageInfo.color} flex items-center gap-1`}>
              {currentStageInfo.icon}
              <span>{currentStageInfo.label}</span>
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-400">{order.order_number || 'Unknown'}</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
          <MoveRight className="h-3 w-3" /> Move to stage
        </label>
        <Select
          key={selectKey}
          onValueChange={(value) => {
            handleStageChange(value as OrderStage);
            setTimeout(() => setSelectKey((key) => key + 1), 300);
          }}
          disabled={updateOrderStage.isPending}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={updateOrderStage.isPending ? 'Moving...' : 'Select a stage...'} />
          </SelectTrigger>
          <SelectContent>
            {availableStages.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                <div className="flex items-center gap-2">
                  {stage.icon}
                  <span>{stage.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {updateOrderStage.isPending && (
        <p className="text-xs text-blue-600 font-medium animate-pulse">Updating order stage...</p>
      )}
    </div>
  );
};

export default StageChangeControls;
