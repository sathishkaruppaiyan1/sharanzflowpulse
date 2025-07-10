import React, { useState } from 'react';
import { Package, Scan, PackageCheck, Truck, Printer, BarChart3 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useOrdersByStage } from '@/hooks/useOrders';
import { useShopifyOrders } from '@/hooks/useShopifyOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const Packing = () => {
  const { data: packingOrders = [], isLoading: packingLoading } = useOrdersByStage('packing');
  const { data: trackingOrders = [], isLoading: trackingLoading } = useOrdersByStage('tracking');
  const { orders: shopifyOrders = [], loading: shopifyLoading } = useShopifyOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [scanInput, setScanInput] = useState('');

  const isLoading = packingLoading || trackingLoading || shopifyLoading;

  // Calculate stats
  const readyToPack = packingOrders.length;
  const readyForTracking = trackingOrders.length;
  const itemsScanned = selectedOrder ? selectedOrder.line_items?.length || 0 : 0;
  const readyForPrinting = shopifyOrders.filter(order => 
    order.fulfillment_status === 'unfulfilled' || order.fulfillment_status === null
  ).length;

  const handleScanOrder = () => {
    if (!scanInput.trim()) return;
    
    // Try to find order by order number or ID - fix type comparison
    const order = packingOrders.find(o => 
      o.order_number === scanInput || 
      o.id === scanInput ||
      o.order_number === `#${scanInput}` ||
      o.id === scanInput.toString()
    );
    
    if (order) {
      setSelectedOrder(order);
      setScanInput('');
    } else {
      alert('Order not found in packing queue');
    }
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
  };

  const getOrderPriority = (order: any) => {
    // Check if order is older than 24 hours for urgent priority
    const createdDate = new Date(order.created_at || order.updated_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated > 24 ? 'urgent' : 'normal';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading packing data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Packing" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ready to Pack</p>
                    <p className="text-3xl font-bold text-blue-600">{readyToPack}</p>
                    <p className="text-xs text-gray-500">Printed orders</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ready for Tracking</p>
                    <p className="text-3xl font-bold text-purple-600">{readyForTracking}</p>
                    <p className="text-xs text-gray-500">Packed orders</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Items Scanned</p>
                    <p className="text-3xl font-bold text-green-600">{itemsScanned}</p>
                    <p className="text-xs text-gray-500">Current order</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ready for Printing</p>
                    <p className="text-3xl font-bold text-orange-600">{readyForPrinting}</p>
                    <p className="text-xs text-gray-500">Awaiting labels</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Barcode Scanner */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Scan className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">Barcode Scanner</CardTitle>
                  </div>
                  <p className="text-sm text-gray-600">
                    Scan order ID or order number to load complete order details
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Order Scanner</label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Scan or enter Order ID/Number"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleScanOrder()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleScanOrder}
                        size="sm"
                        variant="outline"
                        className="px-3"
                      >
                        <Scan className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Order Number</p>
                          <p className="text-lg font-semibold">{selectedOrder.order_number}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Customer</p>
                          <p className="text-lg">
                            {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Items to Pack</p>
                        <div className="space-y-2">
                          {selectedOrder.order_items?.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm">{item.title || item.name}</span>
                              <Badge variant="secondary">x{item.quantity}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          // Handle complete packing logic here
                          alert('Packing completed!');
                          setSelectedOrder(null);
                        }}
                      >
                        <PackageCheck className="h-4 w-4 mr-2" />
                        Complete Packing
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No order selected</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Scan an order ID or number to start packing
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Orders Ready for Packing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Orders Ready for Packing</CardTitle>
                <p className="text-sm text-gray-600">
                  {readyToPack} orders waiting to be packed
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {packingOrders.map((order) => {
                    const priority = getOrderPriority(order);
                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="font-semibold text-sm">{order.order_number}</p>
                              <p className="text-xs text-gray-600">
                                {order.customer?.first_name} {order.customer?.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.order_items?.length || 0} items
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge 
                            className={priority === 'urgent' 
                              ? 'bg-red-100 text-red-800 border-red-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                            }
                            variant="outline"
                          >
                            {priority}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSelectOrder(order)}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {packingOrders.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No orders ready for packing</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Packing;
