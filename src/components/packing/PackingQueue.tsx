
import React from 'react';
import { useOrdersByStage, useDeleteOrder, useCleanupDatabase } from '@/hooks/useOrders';
import { useUpdateItemPacked } from '@/hooks/useOrderItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Database } from 'lucide-react';
import StageChangeControls from '@/components/common/StageChangeControls';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const PackingQueue = () => {
  const { data: packingOrders, isLoading, error } = useOrdersByStage('packing');
  const updateItemPacked = useUpdateItemPacked();
  const deleteOrder = useDeleteOrder();
  const cleanupDatabase = useCleanupDatabase();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">Error loading packing orders</div>;

  console.log('PackingQueue - Orders:', packingOrders?.length || 0);
  
  const filteredOrders = packingOrders?.filter(order => {
    const isPacking = order.stage === 'packing';
    console.log(`Order ${order.order_number} stage: ${order.stage} isPacking: ${isPacking}`);
    return isPacking;
  }) || [];

  console.log('Filtered packing orders:', filteredOrders.length);

  const handleItemPackedChange = (itemId: string, packed: boolean) => {
    updateItemPacked.mutate({ itemId, packed });
  };

  const handleDeleteOrder = (orderId: string, orderNumber: string) => {
    if (window.confirm(`Are you sure you want to delete order ${orderNumber}?`)) {
      console.log('User confirmed deletion of order:', orderNumber, 'with ID:', orderId);
      deleteOrder.mutate(orderId);
    }
  };

  const handleCleanupDatabase = () => {
    if (window.confirm('Are you sure you want to cleanup the database? This will remove orphaned records and test data.')) {
      cleanupDatabase.mutate();
    }
  };

  // Check if all items in an order are packed
  const isOrderReadyForShipping = (order: any) => {
    if (!order.order_items || order.order_items.length === 0) return false;
    const allPacked = order.order_items.every((item: any) => item.packed === true);
    console.log(`Order ${order.order_number} ready for shipping: ${allPacked}`);
    return allPacked;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Packing Queue</h2>
        <Button 
          onClick={handleCleanupDatabase}
          variant="outline"
          size="sm"
          disabled={cleanupDatabase.isPending}
        >
          <Database className="h-4 w-4 mr-2" />
          {cleanupDatabase.isPending ? 'Cleaning...' : 'Cleanup Database'}
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">No orders in packing queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-4">
                  <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                  <Badge variant={isOrderReadyForShipping(order) ? "default" : "secondary"}>
                    {isOrderReadyForShipping(order) ? 'Ready to Ship' : 'In Progress'}
                  </Badge>
                  {order.order_number === 'BS1843-P1752418767061' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteOrder(order.id, order.order_number)}
                      disabled={deleteOrder.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteOrder.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <StageChangeControls 
                    order={order}
                    currentStage="packing"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">
                        {order.customer?.first_name} {order.customer?.last_name}
                      </p>
                      {order.customer?.phone && (
                        <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Address</p>
                      <div className="text-sm">
                        <p>{order.shipping_address?.address_line_1}</p>
                        {order.shipping_address?.address_line_2 && (
                          <p>{order.shipping_address.address_line_2}</p>
                        )}
                        <p>
                          {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Items to Pack</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-3 p-2 border rounded">
                          <Checkbox
                            id={`item-${item.id}`}
                            checked={item.packed || false}
                            onCheckedChange={(checked) => 
                              handleItemPackedChange(item.id, checked as boolean)
                            }
                            disabled={updateItemPacked.isPending}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} {item.sku && `| SKU: ${item.sku}`}
                            </p>
                          </div>
                          <Badge variant={item.packed ? "default" : "secondary"}>
                            {item.packed ? 'Packed' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PackingQueue;
