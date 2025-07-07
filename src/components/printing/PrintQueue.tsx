
import React from 'react';
import { Clock, Package, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/database';
import { useUpdateOrderStage } from '@/hooks/useOrders';

interface PrintQueueProps {
  orders: Order[];
}

const PrintQueue = ({ orders }: PrintQueueProps) => {
  const updateOrderStage = useUpdateOrderStage();

  const handleMoveToPackaging = (orderId: string) => {
    updateOrderStage.mutate({ orderId, stage: 'packing' });
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{order.order_number}</CardTitle>
                <CardDescription>
                  {order.customer?.first_name} {order.customer?.last_name}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <Clock className="h-3 w-3 mr-1" />
                Printing
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Order Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Items:</span> {order.order_items.length}</p>
                  <p><span className="text-gray-500">Total:</span> ₹{order.total_amount}</p>
                  <p><span className="text-gray-500">Created:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Items to Print</h4>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="truncate">{item.title}</span>
                      <Badge variant="secondary" className="ml-2">x{item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Package className="h-4 w-4" />
                <span>{order.order_items.length} items ready for printing</span>
              </div>
              
              <Button 
                onClick={() => handleMoveToPackaging(order.id)}
                disabled={updateOrderStage.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Printed
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
            <CardTitle className="text-gray-600 mb-2">No Orders in Print Queue</CardTitle>
            <CardDescription>
              Orders in the printing stage will appear here
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintQueue;
