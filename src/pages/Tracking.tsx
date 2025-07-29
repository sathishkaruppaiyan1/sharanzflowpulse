
import React, { useState } from 'react';
import { Truck, Package, MapPin, Clock, CheckCircle, Settings, Phone } from 'lucide-react';
import Header from '@/components/layout/Header';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import TrackingScanner from '@/components/tracking/TrackingScanner';
import { useOrdersByStage, useUpdateOrderStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StageChangeControls from '@/components/common/StageChangeControls';
import { toast } from 'sonner';

const Tracking = () => {
  const { data: trackingOrders = [], isLoading, error } = useOrdersByStage('tracking');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [stageChangeDialogOpen, setStageChangeDialogOpen] = useState(false);
  const [selectedOrderForStageChange, setSelectedOrderForStageChange] = useState<string | null>(null);
  const updateOrderStage = useUpdateOrderStage();

  const handleOrderScanned = (order: any) => {
    setSelectedOrder(order);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tracking Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading tracking orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tracking Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
              <CardDescription>
                Unable to load tracking orders. Please try refreshing the page.
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
      <Header title="Tracking Stage" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Ready for Delivery</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {trackingOrders.filter(order => order.tracking_number).length}
                  </div>
                  <p className="text-xs text-gray-500">With tracking numbers</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Pending Tracking</h3>
                  <div className="text-2xl font-bold text-orange-600">
                    {trackingOrders.filter(order => !order.tracking_number).length}
                  </div>
                  <p className="text-xs text-gray-500">Need tracking numbers</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {trackingOrders.length}
                  </div>
                  <p className="text-xs text-gray-500">In tracking stage</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">Value</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    ₹{trackingOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Total order value</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner */}
            <TrackingScanner 
              orders={trackingOrders}
              onOrderScanned={handleOrderScanned}
            />

            {/* Order Details */}
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedOrder.order_number}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                      </p>
                      {selectedOrder.customer?.phone ? (
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="h-3 w-3 text-green-600" />
                          <p className="text-sm text-green-600 font-medium">{selectedOrder.customer.phone}</p>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="h-3 w-3 text-red-500" />
                          <p className="text-sm text-red-500">No phone number</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Items:</span>
                        <p className="font-medium">{selectedOrder.order_items?.length || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <p className="font-medium">₹{selectedOrder.total_amount || 0}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <Badge className="ml-1">
                          {selectedOrder.tracking_number ? 'Ready' : 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-500">Tracking:</span>
                        <p className="font-medium text-xs">
                          {selectedOrder.tracking_number || 'Not assigned'}
                        </p>
                      </div>
                    </div>

                    {selectedOrder.order_items && (
                      <div className="border-t pt-3">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Items:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedOrder.order_items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                              <div>
                                <p className="font-medium">{item.title || item.name}</p>
                                <p className="text-gray-500">SKU: {item.sku || 'N/A'}</p>
                              </div>
                              <Badge variant="outline">Qty: {item.quantity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Truck className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-2">No order selected</p>
                    <p className="text-sm text-gray-400">Scan an order ID to view tracking details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <Card className="bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Truck className="h-5 w-5 mr-2 text-blue-600" />
                Orders in Tracking
              </CardTitle>
              <CardDescription>
                {trackingOrders.length} orders waiting for tracking information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trackingOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
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
                            {order.order_items?.length || 0} items • ₹{order.total_amount || 0}
                          </p>
                          {order.tracking_number && (
                            <p className="text-xs text-blue-600 mt-1">
                              Tracking: {order.tracking_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {order.tracking_number ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrderForStageChange(order.id);
                          setStageChangeDialogOpen(true);
                        }}
                        className="manage-button"
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
                ))}
                
                {trackingOrders.length === 0 && (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No orders in tracking stage</p>
                    <p className="text-sm text-gray-400 mt-1">Orders from packing stage will appear here</p>
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
              order={trackingOrders.find(o => o.id === selectedOrderForStageChange)!} 
              currentStage="tracking"
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

export default Tracking;
