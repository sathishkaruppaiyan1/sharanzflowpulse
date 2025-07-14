
import React, { useState } from 'react';
import { Package, CheckCircle, ArrowRight, Truck, Square, CheckSquare, Phone, AlertTriangle, Hash, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Order } from '@/types/database';
import { useUpdateOrderStage } from '@/hooks/useOrders';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StageChangeControls from '@/components/common/StageChangeControls';

interface PackingQueueProps {
  orders: Order[];
  onItemPacked?: (orderId: string, itemId: string) => void;
}

const PackingQueue = ({ orders }: PackingQueueProps) => {
  const updateOrderStage = useUpdateOrderStage();
  const queryClient = useQueryClient();
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

  const updateItemPacked = useMutation({
    mutationFn: async ({ itemId, packed }: { itemId: string; packed: boolean }) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({ packed })
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${data.title} marked as ${data.packed ? 'packed' : 'unpacked'}`);
    },
    onError: (error) => {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    },
  });

  const handleToggleItemPacked = (itemId: string, packed: boolean) => {
    updateItemPacked.mutate({ itemId, packed });
  };

  const handleMoveToTracking = (orderId: string, orderNumber: string) => {
    updateOrderStage.mutate({ orderId, stage: 'tracking' });
  };

  const handleDialogChange = (orderId: string, open: boolean) => {
    setOpenDialogs(prev => ({
      ...prev,
      [orderId]: open
    }));
  };

  const isOrderReadyForShipping = (order: Order) => {
    return order.order_items.every(item => item.packed);
  };

  const packingStageOrders = orders.filter(order => order.stage === 'packing');

  return (
    <div className="space-y-4">
      {packingStageOrders.map((order) => {
        const packedItems = order.order_items.filter(item => item.packed).length;
        const totalItems = order.order_items.length;
        const isReady = isOrderReadyForShipping(order);
        
        return (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  <div className="text-sm text-gray-600">
                    <p>{order.customer?.first_name} {order.customer?.last_name}</p>
                    {order.customer?.phone ? (
                      <div className="flex items-center space-x-1 mt-1">
                        <Phone className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">{order.customer.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-red-500">No phone number</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className={`${isReady ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {isReady ? 'Ready for Dispatch' : `${packedItems}/${totalItems} Packed`}
                  </Badge>
                  <Dialog 
                    open={openDialogs[order.id] || false} 
                    onOpenChange={(open) => handleDialogChange(order.id, open)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Order Stage</DialogTitle>
                      </DialogHeader>
                      <StageChangeControls 
                        order={order} 
                        currentStage="packing"
                        onStageChange={() => {
                          handleDialogChange(order.id, false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Order Details</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">Items:</span> {order.order_items.length}</p>
                    <p><span className="text-gray-500">Total:</span> ₹{order.total_amount}</p>
                    <p><span className="text-gray-500">Stage:</span> <Badge variant="secondary">{order.stage}</Badge></p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Shipping Address</h4>
                  <div className="text-sm text-gray-600">
                    {order.shipping_address ? (
                      <div>
                        <p>{order.shipping_address.address_line_1}</p>
                        {order.shipping_address.address_line_2 && <p>{order.shipping_address.address_line_2}</p>}
                        <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                      </div>
                    ) : (
                      <p>No shipping address</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Items to Pack</h4>
                <div className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={item.packed || false}
                          onCheckedChange={(checked) => 
                            handleToggleItemPacked(item.id, checked as boolean)
                          }
                          disabled={updateItemPacked.isPending}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          {item.sku && (
                            <div className="flex items-center space-x-1 mt-1">
                              <Hash className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border">
                                {item.sku}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">x{item.quantity}</Badge>
                        {item.packed ? (
                          <CheckSquare className="h-4 w-4 text-green-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>{packedItems} of {totalItems} items packed</span>
                </div>
                
                <Button 
                  onClick={() => handleMoveToTracking(order.id, order.order_number)}
                  disabled={!isReady || updateOrderStage.isPending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Dispatch Order
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {packingStageOrders.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-gray-600 mb-2">No Orders in Packing Queue</CardTitle>
            <CardDescription>
              Orders from the printing stage will appear here for packing
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PackingQueue;
