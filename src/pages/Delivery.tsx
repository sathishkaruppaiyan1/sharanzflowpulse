
import React, { useState } from 'react';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertTriangle, Search, Phone, MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useOrdersByStage, useUpdateOrderStage } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order } from '@/types/database';
import { toast } from 'sonner';

const Delivery = () => {
  const { data: deliveryOrders = [], isLoading, error } = useOrdersByStage('delivery');
  const { data: deliveredOrders = [] } = useOrdersByStage('delivered');
  const updateOrderStageMutation = useUpdateOrderStage();
  const [searchQuery, setSearchQuery] = useState('');

  const handleMarkDelivered = (orderId: string) => {
    updateOrderStageMutation.mutate({ orderId, stage: 'delivered' });
  };

  const filteredOrders = deliveryOrders.filter(order => 
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${order.customer?.first_name} ${order.customer?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate delivery stats
  const totalShipments = deliveryOrders.length + deliveredOrders.length;
  const delivered = deliveredOrders.length;
  const inTransit = deliveryOrders.filter(order => {
    if (!order.shipped_at) return false;
    const hoursInTransit = (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60);
    return hoursInTransit <= 72; // Not delayed
  }).length;
  
  const onTime = Math.round((delivered / (totalShipments || 1)) * 100);
  
  const delayed = deliveryOrders.filter(order => {
    if (!order.shipped_at) return false;
    const hoursInTransit = (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60);
    return hoursInTransit > 72;
  }).length;

  const allShipments = [...deliveryOrders, ...deliveredOrders];
  const delayedShipments = allShipments.filter(order => {
    if (!order.shipped_at) return false;
    const hoursInTransit = (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60);
    return hoursInTransit > 72;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Delivery Monitoring" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading delivery orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Delivery Monitoring" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderOrderCard = (order: Order) => {
    const hoursInTransit = order.shipped_at 
      ? (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60)
      : 0;
    
    const isDelayed = hoursInTransit > 72;
    const isDelivered = order.stage === 'delivered';
    
    return (
      <Card key={order.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDelivered ? 'bg-green-100' : isDelayed ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {isDelivered ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Truck className={`h-5 w-5 ${isDelayed ? 'text-red-600' : 'text-blue-600'}`} />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{order.order_number}</CardTitle>
                <p className="text-sm text-gray-600">
                  {order.customer?.first_name} {order.customer?.last_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">₹{order.total_amount}</p>
              <Badge variant={isDelivered ? "default" : isDelayed ? "destructive" : "secondary"}>
                {isDelivered ? 'Delivered' : isDelayed ? 'Delayed' : 'In Transit'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Delivery Address</h4>
              {order.shipping_address && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{order.shipping_address.address_line_1}</p>
                  {order.shipping_address.address_line_2 && (
                    <p>{order.shipping_address.address_line_2}</p>
                  )}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Tracking Information</h4>
              <div className="space-y-2">
                {order.tracking_number && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{order.tracking_number}</span>
                    <Badge variant="outline">
                      {order.carrier === 'frenchexpress' ? 'French Express' : 
                       order.carrier === 'delhivery' ? 'Delhivery' : 'Other'}
                    </Badge>
                  </div>
                )}
                {order.shipped_at && (
                  <div className="text-sm text-gray-600">
                    <p>Shipped: {new Date(order.shipped_at).toLocaleString()}</p>
                    <p>In transit: {Math.round(hoursInTransit)}h</p>
                  </div>
                )}
                {order.delivered_at && (
                  <div className="text-sm text-gray-600">
                    <p>Delivered: {new Date(order.delivered_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {order.customer?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">{order.customer.phone}</span>
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </div>
                )}
                {!order.customer?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">No contact number</span>
                  </div>
                )}
              </div>
              
              {!isDelivered && (
                <Button
                  onClick={() => handleMarkDelivered(order.id)}
                  disabled={updateOrderStageMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Delivery Monitoring" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Delivery Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Shipments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{totalShipments}</div>
                <p className="text-xs text-gray-500 mt-1">Active tracking</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{delivered}</div>
                <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{inTransit}</div>
                <p className="text-xs text-gray-500 mt-1">Currently shipping</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">On Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{onTime}%</div>
                <p className="text-xs text-gray-500 mt-1">delivery rate</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Delayed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{delayed}</div>
                <p className="text-xs text-gray-500 mt-1">Require attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Shipments</TabsTrigger>
              <TabsTrigger value="in-transit">In Transit</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="delayed">Delayed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">All Shipments</h3>
                  <p className="text-sm text-gray-600">Complete list of tracked orders</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
              
              {allShipments.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Shipments Found</h3>
                      <p className="text-gray-500">Shipments will appear here once orders are in delivery.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {allShipments.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-transit" className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">In Transit</h3>
                <p className="text-sm text-gray-600">Orders currently being delivered</p>
              </div>
              
              {deliveryOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders In Transit</h3>
                      <p className="text-gray-500">Orders in transit will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {deliveryOrders.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivered" className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">Delivered</h3>
                <p className="text-sm text-gray-600">Successfully delivered orders</p>
              </div>
              
              {deliveredOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Delivered Orders</h3>
                      <p className="text-gray-500">Delivered orders will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {deliveredOrders.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delayed" className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">Delayed</h3>
                <p className="text-sm text-gray-600">Orders that require attention</p>
              </div>
              
              {delayedShipments.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Delayed Orders</h3>
                      <p className="text-gray-500">Delayed orders will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {delayedShipments.map(renderOrderCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Delivery;
