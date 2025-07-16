import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Phone, User, MapPin, Calendar, DollarSign } from 'lucide-react';
import Header from '@/components/layout/Header';
import PackingQueue from '@/components/packing/PackingQueue';
import PackingScanner from '@/components/packing/PackingScanner';
import PackingStats from '@/components/packing/PackingStats';
import { useOrdersByStage } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

const Packing = () => {
  const { data: packingOrders = [], isLoading, refetch } = useOrdersByStage(['packing']);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    refetch();
    setRefreshKey(prev => prev + 1);
  };

  // Helper function to get phone number from order - simplified approach
  const getPhoneNumber = (order: any) => {
    // Check shipping address phone first (most reliable)
    if (order.shipping_address?.phone) {
      return order.shipping_address.phone;
    }
    
    // Check customer phone as fallback
    if (order.customer?.phone) {
      return order.customer.phone;
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!packingOrders) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Packing Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
              <CardDescription>
                Unable to load orders. Please check your connection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">An unexpected error occurred while loading orders.</p>
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
        <div className="max-w-7xl mx-auto">
          {/* Stats Section */}
          <PackingStats orders={packingOrders} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Scanner Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Barcode Scanner</span>
                  </CardTitle>
                  <CardDescription>Scan barcodes to mark items as packed</CardDescription>
                </CardHeader>
                <CardContent>
                  <PackingScanner
                    orders={packingOrders}
                    onOrderUpdate={handleRefresh}
                    key={refreshKey}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Orders and Details Section */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="orders" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="orders">Orders Ready for Packing</TabsTrigger>
                    <TabsTrigger value="details" disabled={!selectedOrder}>
                      Order Information
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </Button>
                </div>

                <TabsContent value="orders" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Orders ({packingOrders.length})</CardTitle>
                      <CardDescription>
                        Select an order to view details and start packing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {packingOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No orders ready for packing
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {packingOrders.map((order) => {
                            const phoneNumber = getPhoneNumber(order);
                            const packedItems = order.order_items?.filter((item: any) => item.packed).length || 0;
                            const totalItems = order.order_items?.length || 0;
                            const isComplete = packedItems === totalItems && totalItems > 0;

                            return (
                              <div
                                key={order.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedOrder?.id === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setSelectedOrder(order)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                                    <p className="text-sm text-gray-500">
                                      {order.customer?.first_name} {order.customer?.last_name}
                                      {phoneNumber ? (
                                        <span className="ml-2 text-green-600 font-medium">📱 {phoneNumber}</span>
                                      ) : (
                                        <span className="ml-2 text-red-500">📱 No phone</span>
                                      )}
                                      <span className="mx-2">•</span>
                                      {isComplete ? 'Complete' : `${packedItems}/${totalItems} packed`}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={isComplete ? "default" : "secondary"}>
                                      {isComplete ? 'Ready' : 'Packing'}
                                    </Badge>
                                    <Button size="sm" variant="outline">
                                      Select
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="mt-0">
                  {selectedOrder ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Details - {selectedOrder.order_number}</CardTitle>
                        <CardDescription>Complete order information and packing status</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Order Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Customer Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                              <User className="h-5 w-5 mr-2" />
                              Customer Information
                            </h3>
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Name:</span> {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {selectedOrder.customer?.email || 'Not provided'}
                              </p>
                              {(() => {
                                const phoneNumber = getPhoneNumber(selectedOrder);
                                return phoneNumber ? (
                                  <p className="text-sm text-green-600 font-medium">📱 {phoneNumber}</p>
                                ) : (
                                  <p className="text-sm text-red-500">📱 No phone number available</p>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Order Information */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                              <Package className="h-5 w-5 mr-2" />
                              Order Information
                            </h3>
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Order #:</span> {selectedOrder.order_number}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Total:</span> ₹{selectedOrder.total_amount}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Date:</span> {new Date(selectedOrder.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Stage:</span> 
                                <Badge className="ml-2" variant="secondary">{selectedOrder.stage}</Badge>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Shipping Address */}
                        {selectedOrder.shipping_address && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                              <MapPin className="h-5 w-5 mr-2" />
                              Shipping Address
                            </h3>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm">{selectedOrder.shipping_address.address_line_1}</p>
                              {selectedOrder.shipping_address.address_line_2 && (
                                <p className="text-sm">{selectedOrder.shipping_address.address_line_2}</p>
                              )}
                              <p className="text-sm">
                                {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postal_code}
                              </p>
                              <p className="text-sm">{selectedOrder.shipping_address.country}</p>
                            </div>
                          </div>
                        )}

                        {/* Order Items */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
                          <PackingQueue
                            orders={[selectedOrder]}
                            selectedOrderId={selectedOrder.id}
                            onOrderUpdate={handleRefresh}
                            showOrderHeader={false}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8">
                        <div className="text-center text-gray-500">
                          Select an order from the list to view details
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Packing;
