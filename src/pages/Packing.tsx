
import React, { useState } from 'react';
import { Package, Scan, CheckSquare, Settings, Phone } from 'lucide-react';
import Header from '@/components/layout/Header';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingStats from '@/components/packing/PackingStats';
import PackingScanner from '@/components/packing/PackingScanner';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StageChangeControls from '@/components/common/StageChangeControls';

const Packing = () => {
  const { data: packingOrders = [], isLoading, error } = useOrdersByStage('packing');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false);
  const [selectedOrderForStageChange, setSelectedOrderForStageChange] = useState<string | null>(null);

  const handleItemPacked = (orderId: string, itemId: string) => {
    console.log('Item packed:', { orderId, itemId });
    // Force a refresh of the data
    setRefreshKey(prev => prev + 1);
  };

  // Helper function to get product display name with variation
  const getProductDisplayName = (item: any) => {
    console.log('Processing item for display in packing:', item);
    const name = item.title || 'Product';
    const variant = item.sku || '';
    const displayName = variant ? `${name} - ${variant}` : name;
    console.log(`Display name in packing: ${displayName}`);
    return displayName;
  };

  // Helper function to get customer phone number
  const getCustomerPhone = (order: any) => {
    // Check customer phone first, then shipping address phone
    return order.customer?.phone || order.shipping_address?.phone || null;
  };

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
                  <h3 className="text-sm font-medium text-gray-600">Ready for Packing</h3>
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
                <CardTitle className="text-lg">Order Information</CardTitle>
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
                        {(() => {
                          const customerPhone = getCustomerPhone(selectedOrder);
                          return customerPhone ? (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="h-3 w-3 text-green-600" />
                              <span className="text-green-600 font-medium">{customerPhone}</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="h-3 w-3 text-red-500" />
                              <span className="text-red-500">No phone number</span>
                            </div>
                          );
                        })()}
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
                      <h4 className="font-medium text-sm text-gray-700 mb-3">Items to Pack:</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {selectedOrder.order_items?.map((item: any) => {
                          const displayName = getProductDisplayName(item);
                          return (
                            <div key={item.id} className={`p-3 rounded-lg border ${
                              item.packed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 text-sm">{displayName}</h5>
                                  </div>
                                  <Badge variant={item.packed ? "default" : "secondary"} className="text-xs ml-2">
                                    {item.packed ? "Packed" : "Pending"}
                                  </Badge>
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
                                  {item.price && (
                                    <div className="col-span-2">
                                      <span className="font-medium">Price:</span>
                                      <p className="text-gray-800">₹{item.price}</p>
                                    </div>
                                  )}
                                </div>
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
              <CardTitle className="text-lg">Orders Ready for Packing</CardTitle>
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
                  const customerPhone = getCustomerPhone(order);
                  
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>
                                {order.customer?.first_name} {order.customer?.last_name}
                              </span>
                              {customerPhone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3 text-green-600" />
                                  <span className="text-green-600">{customerPhone}</span>
                                </div>
                              )}
                              <span>•</span>
                              <span>{isComplete ? 'Complete' : `${packedItems}/${totalItems} packed`}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isComplete ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Ready for Packing
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
                        <Button variant="outline" size="sm">
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
