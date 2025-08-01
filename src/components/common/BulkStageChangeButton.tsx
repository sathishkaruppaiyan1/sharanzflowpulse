import React, { useState } from 'react';
import { Truck, CheckCircle, Package, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBulkUpdateOrderStage } from '@/hooks/useOrders';
import { Order, OrderStage } from '@/types/database';
import { toast } from 'sonner';

interface BulkStageChangeButtonProps {
  orders: Order[];
  currentStage: OrderStage;
  targetStage: OrderStage;
  selectedOrderIds: Set<string>;
  onSuccess?: () => void;
  variant?: 'header' | 'stats' | 'list';
  disabled?: boolean;
}

const BulkStageChangeButton = ({ 
  orders, 
  currentStage, 
  targetStage, 
  selectedOrderIds, 
  onSuccess,
  variant = 'header',
  disabled = false
}: BulkStageChangeButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const bulkUpdateStage = useBulkUpdateOrderStage();

  // Get orders that are ready for the target stage
  const getReadyOrders = () => {
    if (targetStage === 'tracking') {
      // For tracking, only include orders where all items are packed
      return orders.filter(order => 
        order.order_items?.every((item: any) => item.packed)
      );
    }
    return orders;
  };

  const readyOrders = getReadyOrders();
  const selectedReadyOrders = readyOrders.filter(order => selectedOrderIds.has(order.id));
  const ordersToMove = selectedOrderIds.size > 0 ? selectedReadyOrders : readyOrders;
  const count = ordersToMove.length;

  const stageInfo = {
    tracking: { label: 'Tracking', icon: <Truck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
    shipped: { label: 'Shipped', icon: <Truck className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
    delivered: { label: 'Delivered', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  }[targetStage];

  const handleBulkMove = async () => {
    if (count === 0) {
      toast.error('No orders ready for movement');
      return;
    }

    try {
      await bulkUpdateStage.mutateAsync({
        orderIds: ordersToMove.map(order => order.id),
        stage: targetStage
      });
      
      setIsDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Bulk move failed:', error);
    }
  };

  const getButtonContent = () => {
    if (bulkUpdateStage.isPending) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Moving {count} orders...
        </>
      );
    }

    return (
      <>
        {stageInfo?.icon}
        <span className="ml-2">
          {selectedOrderIds.size > 0 
            ? `Move ${selectedReadyOrders.length} Selected to ${stageInfo?.label}`
            : `Move ${count} Ready to ${stageInfo?.label}`
          }
        </span>
        <ArrowRight className="h-4 w-4 ml-2" />
      </>
    );
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'header':
        return 'default';
      case 'stats':
        return 'outline';
      case 'list':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getButtonSize = () => {
    switch (variant) {
      case 'header':
        return 'default';
      case 'stats':
        return 'sm';
      case 'list':
        return 'sm';
      default:
        return 'default';
    }
  };

  if (count === 0 && selectedOrderIds.size === 0) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={getButtonVariant()}
          size={getButtonSize()}
          disabled={disabled || bulkUpdateStage.isPending || count === 0}
          className={variant === 'stats' ? 'w-full' : ''}
        >
          {getButtonContent()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {stageInfo?.icon}
            <span>Bulk Move Orders</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              {selectedOrderIds.size > 0 
                ? `Move ${selectedReadyOrders.length} selected orders from ${currentStage} to ${targetStage}?`
                : `Move ${count} ready orders from ${currentStage} to ${targetStage}?`
              }
            </p>
            <p className="mt-2 text-xs text-gray-500">
              This action will update all selected orders and set appropriate timestamps.
            </p>
          </div>

          {count > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Orders to move:</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {ordersToMove.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">{order.order_number}</span>
                    <span className="text-gray-500">
                      {order.customer?.first_name} {order.customer?.last_name}
                    </span>
                  </div>
                ))}
                {ordersToMove.length > 10 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    ... and {ordersToMove.length - 10} more orders
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={bulkUpdateStage.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkMove}
              disabled={bulkUpdateStage.isPending || count === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {bulkUpdateStage.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Moving...
                </>
              ) : (
                <>
                  {stageInfo?.icon}
                  <span className="ml-2">Move {count} Orders</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkStageChangeButton; 