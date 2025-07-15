
import React from 'react';
import { ArrowLeft, ArrowRight, Package, Truck, CheckCircle, Eye, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { Order, OrderStage } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StageChangeControlsProps {
  order: Order;
  currentStage: OrderStage;
  onStageChange?: () => void;
}

const StageChangeControls = ({ order, currentStage, onStageChange }: StageChangeControlsProps) => {
  const updateOrderStage = useUpdateOrderStage();

  const stages: { value: OrderStage; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'pending', label: 'Pending', icon: <Eye className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
    { value: 'printing', label: 'Printing', icon: <Printer className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
    { value: 'packing', label: 'Packing', icon: <Package className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
    { value: 'tracking', label: 'Tracking', icon: <Truck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
    { value: 'shipped', label: 'Shipped', icon: <Truck className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    { value: 'delivered', label: 'Delivered', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  ];

  const handleStageChange = async (newStage: OrderStage) => {
    if (newStage === currentStage) return;

    console.log(`Changing order ${order.order_number} from ${currentStage} to ${newStage}`);

    try {
      // Handle special cases when moving to certain stages
      if (newStage === 'packing') {
        // When moving to packing, reset all items to unpacked and set printed_at
        await supabase
          .from('order_items')
          .update({ packed: false })
          .eq('order_id', order.id);
        
        // Update order with printed_at timestamp
        await supabase
          .from('orders')
          .update({ 
            stage: newStage,
            printed_at: new Date().toISOString(),
            packed_at: null, // Reset packed_at when going back to packing
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        toast.success(`🎉 Order ${order.order_number} moved to ${newStage} stage! All items marked as unpacked.`);
      } else if (newStage === 'tracking') {
        // When moving to tracking, set packed_at timestamp
        await supabase
          .from('orders')
          .update({ 
            stage: newStage,
            packed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        toast.success(`🎉 Order ${order.order_number} moved to ${newStage} stage!`);
      } else {
        // For other stages, use the mutation
        updateOrderStage.mutate(
          { orderId: order.id, stage: newStage },
          {
            onSuccess: () => {
              toast.success(`🎉 Order ${order.order_number} moved to ${newStage} stage!`);
              onStageChange?.();
            },
            onError: (error) => {
              console.error('Failed to update order stage:', error);
              toast.error(`Failed to move order to ${newStage} stage`);
            }
          }
        );
        return; // Exit early for regular stage changes
      }

      // For special cases, manually trigger the callback
      onStageChange?.();
      
    } catch (error) {
      console.error('Failed to update order stage:', error);
      toast.error(`Failed to move order to ${newStage} stage`);
    }
  };

  const getCurrentStageInfo = () => {
    return stages.find(stage => stage.value === currentStage);
  };

  const getPreviousStage = (): OrderStage | null => {
    const currentIndex = stages.findIndex(stage => stage.value === currentStage);
    return currentIndex > 0 ? stages[currentIndex - 1].value : null;
  };

  const getNextStage = (): OrderStage | null => {
    const currentIndex = stages.findIndex(stage => stage.value === currentStage);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1].value : null;
  };

  const currentStageInfo = getCurrentStageInfo();
  const previousStage = getPreviousStage();
  const nextStage = getNextStage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Current Stage:</span>
          {currentStageInfo && (
            <Badge className={currentStageInfo.color}>
              {currentStageInfo.icon}
              <span className="ml-1">{currentStageInfo.label}</span>
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500">Order: {order.order_number}</span>
      </div>

      {/* Quick Stage Navigation */}
      <div className="flex space-x-2">
        {previousStage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStageChange(previousStage)}
            disabled={updateOrderStage.isPending}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="text-xs">
              {stages.find(s => s.value === previousStage)?.label}
            </span>
          </Button>
        )}
        
        {nextStage && (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleStageChange(nextStage)}
            disabled={updateOrderStage.isPending}
            className="flex items-center space-x-1"
          >
            <span className="text-xs">
              {stages.find(s => s.value === nextStage)?.label}
            </span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown for Any Stage Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Move to specific stage:</label>
        <Select value={currentStage} onValueChange={handleStageChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stages.map((stage) => (
              <SelectItem 
                key={stage.value} 
                value={stage.value}
                disabled={stage.value === currentStage}
              >
                <div className="flex items-center space-x-2">
                  {stage.icon}
                  <span>{stage.label}</span>
                  {stage.value === currentStage && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {updateOrderStage.isPending && (
        <div className="text-xs text-blue-600 font-medium">
          Updating order stage...
        </div>
      )}
    </div>
  );
};

export default StageChangeControls;
