import React, { useState } from 'react';
import { Package, CheckCircle, ArrowRight, Truck, Square, CheckSquare, Phone, AlertTriangle, Hash, Settings, Shirt, ChevronRight } from 'lucide-react';
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
import { getPhoneNumber } from '@/lib/utils';
import { getVariationDisplayText, normalizeItemForDisplay } from '@/utils/productVariationUtils';

interface PackingQueueProps {
  orders: Order[];
  onItemPacked?: (orderId: string, itemId: string) => void;
  selectedOrderId?: string;
  onOrderUpdate?: () => void;
  showOrderHeader?: boolean;
  showBulkActions?: boolean;
}

const PackingQueue = ({ 
  orders, 
  selectedOrderId, 
  onOrderUpdate, 
  showOrderHeader = true,
  showBulkActions = false 
}: PackingQueueProps) => {
  const updateOrderStage = useUpdateOrderStage();
  const queryClient = useQueryClient();
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const updateItemPacked = useMutation({
    mutationFn: async ({ itemId, packed }: { itemId: string; packed: boolean }) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({ packed })
        .eq('id', itemId)
        .select('*, product:products(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      // Use the enhanced variation display logic with Supabase data
      const normalizedItem = normalizeItemForDisplay(data);
      const variationText = getVariationDisplayText(normalizedItem);
      
      console.log('Packing success - showing variation:', variationText);
      toast.success(`${data.title} (${variationText}) marked as ${data.packed ? 'packed' : 'unpacked'}`);
      onOrderUpdate?.();
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
      const readyOrders = packingStageOrders.filter(isOrderReadyForShipping);
      setSelectedOrders(new Set(readyOrders.map(order => order.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleBulkMoveToTracking = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to move');
      return;
    }

    setIsBulkProcessing(true);
    
    try {
      const promises = Array.from(selectedOrders).map(orderId => 
        supabase
          .from('orders')
          .update({ 
            stage: 'tracking',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
      );

      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Successfully moved ${selectedOrders.size} orders to tracking stage`);
      setSelectedOrders(new Set());
      onOrderUpdate?.();
    } catch (error) {
      console.error('Error moving orders to tracking:', error);
      toast.error('Failed to move some orders. Please try again.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const packingStageOrders = orders.filter(order => order.stage === 'packing');
  const readyOrders = packingStageOrders.filter(isOrderReadyForShipping);
  const allReadySelected = readyOrders.length > 0 && readyOrders.every(order => selectedOrders.has(order.id));

  // Enhanced debug function to log customer data
  const debugCustomerData = (order: Order) => {
    console.log('=== Packing Queue Phone Debug ===');
    console.log('Order:', order.order_number);
    console.log('Customer object:', order.customer);
    console.log('Customer ID:', order.customer_id);
    console.log('Customer phone from object:', order.customer?.phone);
    console.log('getPhoneNumber result:', getPhoneNumber(order));
    console.log('Has customer:', !!order.customer);
    console.log('=== End Debug ===');
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Header */}
      {showBulkActions && readyOrders.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={allReadySelected}
                  onCheckedChange={handleSelectAll}
                  className="border-blue-400"
                />
                <span className="text-sm font-medium text-blue-900">
                  Select All Ready Orders ({readyOrders.length} ready for dispatch)
                </span>
                {selectedOrders.size > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedOrders.size} selected
                  </Badge>
                )}
              </div>
              {selectedOrders.size > 0 && (
                <Button
                  onClick={handleBulkMoveToTracking}
                  disabled={isBulkProcessing}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Move to Tracking ({selectedOrders.size})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {packingStageOrders.map((order) => {
        const packedItems = order.order_items.filter(item => item.packed).length;
        const totalItems = order.order_items.length;
        const isReady = isOrderReadyForShipping(order);
        const phoneNumber = getPhoneNumber(order);
        const isSelected = selectedOrders.has(order.id);
        
        // Enhanced debug log for each order with variation data
        console.log('=== Packing Queue Order with Variations ===');
        console.log('Order:', order.order_number);
        console.log('Items with variation data:', order.order_items.map(item => ({
          id: item.id,
          title: item.title,
          sku: item.sku,
          variant_title: item.variant_title,
          variant_options: item.variant_options,
          shopify_variant_id: item.shopify_variant_id
        })));
        
        return (
          <Card key={order.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Bulk Select Checkbox - only show for ready orders when bulk actions enabled */}
                  {showBulkActions && isReady && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      className="border-blue-400"
                    />
                  )}
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <div className="text-sm text-gray-600">
                      <p>{order.customer?.first_name} {order.customer?.last_name}</p>
                      {phoneNumber ? (
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">{phoneNumber}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 mt-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-red-500 font-medium">No phone number</span>
                        </div>
                      )}
                      {/* Additional debug info for development */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-gray-400 mt-1">
                          Debug: Customer ID: {order.customer_id}, Has Customer: {order.customer ? 'Yes' : 'No'}
                        </div>
                      )}
                    </div>
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
                        currentStage={order.stage || 'packing'}
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
                <h4 className="font-medium text-sm text-gray-700 flex items-center">
                  <Shirt className="h-4 w-4 mr-2 text-blue-600" />
                  Items to Pack with Variations (from Supabase)
                </h4>
                <div className="space-y-2">
                  {order.order_items.map((item) => {
                    // Enhanced normalization with Supabase data
                    const normalizedItem = normalizeItemForDisplay(item);
                    const variationText = getVariationDisplayText(normalizedItem);
                    
                    console.log(`=== Packing Queue Item with Supabase Data ===`);
                    console.log(`Item ID: ${item.id}`);
                    console.log('Original item from Supabase:', item);
                    console.log('Supabase variant_title:', item.variant_title);
                    console.log('Supabase variant_options:', item.variant_options);
                    console.log('Normalized item:', normalizedItem);
                    console.log('Final variation text:', variationText);
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={item.packed || false}
                            onCheckedChange={(checked) => 
                              handleToggleItemPacked(item.id, checked as boolean)
                            }
                            disabled={updateItemPacked.isPending}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm text-blue-900">
                                {item.title}
                              </p>
                              {variationText && variationText !== 'No variations' && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-400">•</span>
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    {variationText}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                              <p>SKU: {item.sku || 'No SKU'}</p>
                              {item.variant_title && (
                                <p>Variant: {item.variant_title}</p>
                              )}
                              {item.shopify_variant_id && (
                                <p>Variant ID: {item.shopify_variant_id}</p>
                              )}
                              {/* Show success message if we have proper variation data */}
                              {variationText && variationText !== 'No variations' ? (
                                <p className="text-green-600 font-medium">✅ Variation loaded from Supabase</p>
                              ) : (
                                <p className="text-amber-600 font-medium">⚠️ Using fallback variation detection</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            Qty: {item.quantity}
                          </Badge>
                          {item.packed ? (
                            <CheckSquare className="h-4 w-4 text-green-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Package className="h-4 w-4" />
                  <span>{packedItems} of {totalItems} items packed</span>
                </div>
                
                {/* Individual dispatch button - hide if bulk actions enabled and order is selected */}
                {!(showBulkActions && isSelected) && (
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
                )}
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
