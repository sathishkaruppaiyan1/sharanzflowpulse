import React from 'react';
import { Clock, Package, User, MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/database';
import { useUpdatePartialQuantity } from '@/hooks/usePartialPacking';

interface PendingOrdersQueueProps {
  orders: Order[];
}

const PendingOrdersQueue = ({ orders }: PendingOrdersQueueProps) => {
  const updatePartialQuantity = useUpdatePartialQuantity();

  // Filter orders that have pending quantities
  const pendingOrders = orders.filter(order => 
    order.order_items?.some(item => (item.pending_quantity || 0) > 0)
  );

  const handleMoveToPacking = (itemId: string, pendingQuantity: number) => {
    updatePartialQuantity.mutate({
      itemId,
      packedQuantity: 0,
      pendingQuantity: 0 // Move from pending back to available for packing
    });
  };

  if (pendingOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Pending Orders</h3>
          <p className="text-gray-500 text-center">
            No orders with pending quantities found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingOrders.map((order) => (
        <Card key={order.id} className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-base">Order #{order.order_number.replace('#', '')}</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  PENDING
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Customer Info */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>{order.customer?.first_name} {order.customer?.last_name}</span>
              </div>
              {order.shipping_address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{order.shipping_address.city}</span>
                </div>
              )}
            </div>

            {/* Pending Items */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Pending Items:</h4>
              <div className="space-y-2">
                {order.order_items
                  ?.filter(item => (item.pending_quantity || 0) > 0)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.title}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              Pending: {item.pending_quantity}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveToPacking(item.id, item.pending_quantity || 0)}
                              disabled={updatePartialQuantity.isPending}
                              className="text-xs px-2 py-1 h-6"
                            >
                              Move to Packing
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                        {item.sku && (
                          <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-orange-200">
              <span className="text-sm text-gray-600">
                Total pending items: {order.order_items?.reduce((sum, item) => sum + (item.pending_quantity || 0), 0)}
              </span>
              <span className="text-xs text-gray-500">
                Created: {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PendingOrdersQueue;