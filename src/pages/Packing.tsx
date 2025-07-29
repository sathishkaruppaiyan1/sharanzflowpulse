
import React, { useState } from 'react';
import { Package, Scan, CheckSquare, Settings, Shirt, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingStats from '@/components/packing/PackingStats';
import PackingScanner from '@/components/packing/PackingScanner';
import { useOrdersByStage, useUpdateOrderStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import StageChangeControls from '@/components/common/StageChangeControls';
import { getVariationDisplayText, normalizeItemForDisplay } from '@/utils/productVariationUtils';
import { toast } from 'sonner';

const Packing = () => {
  const { data: packingOrders = [], isLoading, error } = useOrdersByStage('packing');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false);
  const [selectedOrderForStageChange, setSelectedOrderForStageChange] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const updateOrderStage = useUpdateOrderStage();

  const handleItemPacked = (orderId: string, itemId: string) => {
    console.log('Item packed:', { orderId, itemId });
    // Force a refresh of the data
    setRefreshKey(prev => prev + 1);
  };

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select orders that are ready for dispatch (all items packed)
      const readyOrders = packingOrders.filter(order => 
        order.order_items?.every((item: any) => item.packed)
      );
      setSelectedOrderIds(readyOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleBulkMoveToNextStage = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select orders to move');
      return;
    }

    // Check if all selected orders are ready for dispatch
    const selectedOrders = packingOrders.filter(order => selectedOrderIds.includes(order.id));
    const unreadyOrders = selectedOrders.filter(order => 
      !order.order_items?.every((item: any) => item.packed)
    );

    if (unreadyOrders.length > 0) {
      toast.error(`${unreadyOrders.length} selected orders are not fully packed yet`);
      return;
    }

    try {
      console.log(`Moving ${selectedOrderIds.length} orders to tracking stage`);
      
      // Move all selected orders to tracking stage
      const promises = selectedOrderIds.map(orderId => 
        updateOrderStage.mutateAsync({ orderId, stage: 'tracking' })
      );
      
      await Promise.all(promises);
      
      toast.success(`Successfully moved ${selectedOrderIds.length} orders to tracking stage`);
      setSelectedOrderIds([]);
      setRefreshKey(prev => prev + 1);
      
    } catch (error) {
      console.error('Error moving orders to tracking:', error);
      toast.error('Failed to move some orders to tracking stage');
    }
  };

  const readyOrdersCount = packingOrders.filter(order => 
    order.order_items?.every((item: any) => item.packed)
  ).length;

  const allReadyOrdersSelected = readyOrdersCount > 0 && selectedOrderIds.length === readyOrdersCount;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading packing orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
              <CardDescription>
                Unable to load packing orders. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Packing Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Ready for Dispatch</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {packingOrders.filter(order => 
                      order.order_items?.every((item: any) => item.packed)
                    ).length}
                  </div>
                  <p className="text-xs text-gray-500">Packed orders</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {packingOrders.filter(order => 
                      order.order_items?.some((item: any) => item.packed) &&
                      !order.order_items?.every((item: any) => item.packed)
                    ).length}
                  </div>
                  <p className="text-xs text-gray-500">Partially packed</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Ready for Packing</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    {packingOrders.filter(order => 
                      !order.order_items?.some((item: any) => item.packed)
                    ).length}
                  </div>
                  <p className="text-xs text-gray-500">Printed orders</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Items Today</h3>
                  <div className="text-2xl font-bold text-orange-600">
                    {packingOrders.reduce((total, order) => {
                      return total + (order.order_items?.filter((item: any) => item.packed).length || 0);
                    }, 0)}
                  </div>
                  <p className="text-xs text-gray-500">Items packed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions Bar */}
          {readyOrdersCount > 0 && (
            <Card className="bg-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={allReadyOrdersSelected}
                        onCheckedChange={handleSelectAll}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">
                        Select All Ready Orders ({readyOrdersCount})
                      </span>
                    </div>
                    {selectedOrderIds.length > 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {selectedOrderIds.length} selected
                      </Badge>
                    )}
                  </div>
                  
                  {selectedOrderIds.length > 0 && (
                    <Button 
                      onClick={handleBulkMoveToNextStage}
                      disabled={updateOrderStage.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Move to Tracking ({selectedOrderIds.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Scanner Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Card */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Scan className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Packing Assignment Scanner</CardTitle>
                </div>
                <CardDescription>
                  Scan order ID first, then scan product SKU barcode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PackingScanner 
                  orders={packingOrders} 
                  onItemPacked={handleItemPacked}
                  onOrderSelected={setSelectedOrder}
                />
              </CardContent>
            </Card>

            {/* Order Information Card */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Shirt className="h-5 w-5 mr-2 text-blue-600" />
                  Order Details with Product Variations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{selectedOrder.order_number}</h3>
                        <p className="text-sm text-gray-500">
                          {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                        </p>
                        {selectedOrder.customer?.phone ? (
                          <p className="text-sm text-green-600 font-medium">📱 {selectedOrder.customer.phone}</p>
                        ) : (
                          <p className="text-sm text-red-500">📱 No phone number</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total Items:</span>
                          <p className="font-medium">{selectedOrder.order_items?.length || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Packed:</span>
                          <p className="font-medium text-green-600">
                            {selectedOrder.order_items?.filter((item: any) => item.packed).length || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Remaining:</span>
                          <p className="font-medium text-orange-600">
                            {selectedOrder.order_items?.filter((item: any) => !item.packed).length || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Amount:</span>
                          <p className="font-medium">₹{selectedOrder.total_amount || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                        <Shirt className="h-4 w-4 mr-2 text-blue-600" />
                        Product Variations:
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedOrder.order_items?.map((item: any) => {
                          // Normalize item for proper variation display
                          const normalizedItem = normalizeItemForDisplay(item);
                          const variationText = getVariationDisplayText(normalizedItem);
                          
                          return (
                            <div key={item.id} className={`p-3 rounded border text-xs ${
                              item.packed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-sm text-blue-900">
                                      {item.title || item.name}
                                    </span>
                                    {variationText && variationText !== 'No variations' && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        {variationText}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-gray-500 space-y-1">
                                    <p>Qty: {item.quantity}</p>
                                    <p>SKU: {item.sku || 'No SKU'}</p>
                                    {item.shopify_variant_id && (
                                      <p>Variant ID: {item.shopify_variant_id}</p>
                                    )}
                                    {!(variationText && variationText !== 'No variations') && item.shopify_variant_id && (
                                      <p className="text-amber-600 font-medium">⚠️ Variation data needed</p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant={item.packed ? "default" : "secondary"} className="text-xs ml-2">
                                  {item.packed ? "Packed" : "Pending"}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <CheckSquare className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">No order selected</p>
                    <p className="text-sm text-gray-400">Scan an order ID to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders Ready for Packing */}
          <Card className="bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Shirt className="h-5 w-5 mr-2 text-blue-600" />
                Orders Ready for Packing
              </CardTitle>
              <CardDescription>
                {packingOrders.length} orders waiting for packing completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {packingOrders.map((order) => {
                  const packedItems = order.order_items?.filter((item: any) => item.packed).length || 0;
                  const totalItems = order.order_items?.length || 0;
                  const isComplete = packedItems === totalItems;
                  
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        {/* Checkbox for bulk selection - only show for ready orders */}
                        {isComplete && (
                          <Checkbox
                            checked={selectedOrderIds.includes(order.id)}
                            onCheckedChange={(checked) => handleOrderSelection(order.id, checked as boolean)}
                            className="h-4 w-4"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                              <p className="text-sm text-gray-500">
                                {order.customer?.first_name} {order.customer?.last_name}
                                {order.customer?.phone && (
                                  <span className="ml-2 text-green-600">📱 {order.customer.phone}</span>
                                )}
                                <span className="mx-2">•</span>
                                {isComplete ? 'Complete' : `${packedItems}/${totalItems} packed`}
                              </p>
                              
                              {/* Show first few items with proper variations */}
                              <div className="mt-1 text-xs">
                                <span className="font-medium text-gray-600">Items: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {order.order_items?.slice(0, 3).map((item: any, index: number) => {
                                    const normalizedItem = normalizeItemForDisplay(item);
                                    const variationText = getVariationDisplayText(normalizedItem);
                                    
                                    return (
                                      <div key={item.id} className="flex items-center space-x-1">
                                        <span className="text-blue-700 font-medium">
                                          {item.title || item.name}
                                        </span>
                                        {variationText && variationText !== 'No variations' && (
                                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                            {variationText}
                                          </Badge>
                                        )}
                                        {index < Math.min(order.order_items?.length || 0, 3) - 1 && (
                                          <span className="text-gray-400">,</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {(order.order_items?.length || 0) > 3 && (
                                    <span className="text-gray-500"> + {(order.order_items?.length || 0) - 3} more</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isComplete ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Ready for Dispatch
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                            In Progress
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForStageChange(order.id);
                            setStageChangeDialogOpen(true);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {packingOrders.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No orders ready for packing</p>
                    <p className="text-sm text-gray-400 mt-1">Orders from printing stage will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={stageChangeDialogOpen} onOpenChange={setStageChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Order Stage</DialogTitle>
          </DialogHeader>
          {selectedOrderForStageChange && (
            <StageChangeControls 
              order={packingOrders.find(o => o.id === selectedOrderForStageChange)!} 
              currentStage="packing"
              onStageChange={() => {
                setRefreshKey(prev => prev + 1);
                setStageChangeDialogOpen(false);
                setSelectedOrderForStageChange(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Packing;
