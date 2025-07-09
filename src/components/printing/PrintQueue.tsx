
import React, { useState } from 'react';
import { Clock, Package, ArrowRight, CheckCircle, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Order } from '@/types/database';
import { useUpdateOrderStage } from '@/hooks/useOrders';

interface PrintQueueProps {
  orders: Order[];
}

const PrintQueue = ({ orders }: PrintQueueProps) => {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const updateOrderStage = useUpdateOrderStage();

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handlePrintSingle = (orderId: string) => {
    updateOrderStage.mutate({ orderId, stage: 'packing' });
  };

  const handlePrintBulk = () => {
    selectedOrders.forEach(orderId => {
      updateOrderStage.mutate({ orderId, stage: 'packing' });
    });
    setSelectedOrders(new Set());
  };

  const getOrderStageColor = (stage: string) => {
    switch (stage) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'printing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'packing':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'tracking':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'shipped':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'delivered':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {orders.length > 0 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={selectedOrders.size === orders.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="font-medium">
              Select All ({selectedOrders.size} of {orders.length} selected)
            </span>
          </div>
          {selectedOrders.size > 0 && (
            <Button
              onClick={handlePrintBulk}
              disabled={updateOrderStage.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Selected ({selectedOrders.size})
            </Button>
          )}
        </div>
      )}

      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                />
                <div>
                  <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  <CardDescription>
                    {order.customer?.first_name} {order.customer?.last_name}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={getOrderStageColor(order.stage || 'pending')}>
                <Clock className="h-3 w-3 mr-1" />
                {order.stage || 'pending'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Order Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Items:</span> {order.order_items?.length || 0}</p>
                  <p><span className="text-gray-500">Total:</span> ₹{order.total_amount}</p>
                  <p><span className="text-gray-500">Created:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Items to Print</h4>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="truncate">{item.title}</span>
                      <Badge variant="secondary" className="ml-2">x{item.quantity}</Badge>
                    </div>
                  )) || <p className="text-sm text-gray-500">No items</p>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Package className="h-4 w-4" />
                <span>{order.order_items?.length || 0} items ready for printing</span>
              </div>
              
              <Button 
                onClick={() => handlePrintSingle(order.id)}
                disabled={updateOrderStage.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Print & Move to Packing
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {orders.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-gray-600 mb-2">No Orders Available</CardTitle>
            <CardDescription>
              No orders found in the system
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintQueue;
