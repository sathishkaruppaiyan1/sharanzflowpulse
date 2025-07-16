
import React, { useState } from 'react';
import { Package, Eye, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import OrderDetails from '@/components/orders/OrderDetails';
import PackingScanner from '@/components/packing/PackingScanner';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { Order } from '@/types/database';

interface PackingQueueProps {
  orders: Order[];
}

const PackingQueue = ({ orders }: PackingQueueProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const updateOrderStage = useUpdateOrderStage();

  const getProductDisplayName = (item: any) => {
    const name = item.title || 'Product';
    const variant = item.sku || '';
    return variant ? `${name} - ${variant}` : name;
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleStartPacking = (order: Order) => {
    setSelectedOrder(order);
    setShowScanner(true);
  };

  const handleMoveToTracking = (order: Order) => {
    updateOrderStage.mutate({ orderId: order.id, stage: 'tracking' });
  };

  const handleItemPacked = (orderId: string, itemId: string) => {
    console.log('Item packed:', { orderId, itemId });
    // The PackingScanner will handle the actual update
  };

  const getPackingProgress = (order: Order): { packed: number; total: number; percentage: number } => {
    if (!order.order_items || order.order_items.length === 0) {
      return { packed: 0, total: 0, percentage: 0 };
    }

    let totalItems = 0;
    let packedItems = 0;

    order.order_items.forEach(item => {
      const quantity = item.quantity || 1;
      totalItems += quantity;
      if (item.packed) {
        packedItems += quantity;
      }
    });

    const percentage = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;
    return { packed: packedItems, total: totalItems, percentage };
  };

  const isOrderComplete = (order: Order): boolean => {
    const progress = getPackingProgress(order);
    return progress.percentage === 100;
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No orders in packing queue</p>
            <p className="text-sm mt-1">Orders will appear here after printing labels</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => {
          const progress = getPackingProgress(order);
          const isComplete = isOrderComplete(order);
          const customerName = order.customer ? 
            `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 
            'Guest Customer';

          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>{order.order_number}</span>
                      {isComplete && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Customer: {customerName}
                      {order.customer?.phone && (
                        <span className="ml-2 text-blue-600">📞 {order.customer.phone}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={isComplete ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {isComplete ? 'Ready for Tracking' : 'In Progress'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Packing Progress</span>
                      <span className="text-gray-600">
                        {progress.packed}/{progress.total} items ({Math.round(progress.percentage)}%)
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>

                  {/* Order Items with Variations */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Items to Pack:</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => {
                        const displayName = getProductDisplayName(item);
                        return (
                          <div key={index} className={`p-3 rounded-lg border ${item.packed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{displayName}</div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {item.packed ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Packed
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                                <div>
                                  <span className="font-medium">SKU:</span>
                                  <p className="text-gray-800">{item.sku || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Quantity:</span>
                                  <p className="text-gray-800">{item.quantity}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Details</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleStartPacking(order)}
                        className="flex items-center space-x-1"
                        disabled={isComplete}
                      >
                        <Package className="h-4 w-4" />
                        <span>{isComplete ? 'Packing Complete' : 'Start Packing'}</span>
                      </Button>
                    </div>
                    
                    {isComplete && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleMoveToTracking(order)}
                        disabled={updateOrderStage.isPending}
                      >
                        Move to Tracking
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Packing Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Packing Scanner</DialogTitle>
          </DialogHeader>
          <PackingScanner
            orders={orders}
            onItemPacked={handleItemPacked}
            onOrderSelected={(order) => setSelectedOrder(order)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackingQueue;
