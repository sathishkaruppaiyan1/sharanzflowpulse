
import React, { useState } from 'react';
import { Truck, Package, MapPin, Clock, CheckCircle, AlertTriangle, Search, Phone, MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useOrdersByStage, useUpdateOrderStage } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/types/database';
import { toast } from 'sonner';

const Delivery = () => {
  const { data: deliveryOrders = [], isLoading, error } = useOrdersByStage('delivery');
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
  const inTransit = deliveryOrders.filter(order => order.stage === 'delivery').length;
  const outForDelivery = deliveryOrders.filter(order => {
    // Orders out for delivery for more than 24 hours
    if (!order.shipped_at) return false;
    const hoursInTransit = (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60);
    return hoursInTransit > 24;
  }).length;
  
  const delayedOrders = deliveryOrders.filter(order => {
    // Orders delayed for more than 72 hours
    if (!order.shipped_at) return false;
    const hoursInTransit = (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60);
    return hoursInTransit > 72;
  }).length;

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

  return (
    <div className="flex flex-col h-full">
      <Header title="Delivery Monitoring" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Delivery Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inTransit}</div>
                <p className="text-xs text-muted-foreground">
                  orders in delivery
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{outForDelivery}</div>
                <p className="text-xs text-muted-foreground">
                  &gt;24h in transit
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delayed</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{delayedOrders}</div>
                <p className="text-xs text-muted-foreground">
                  &gt;72h delayed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{deliveryOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  in delivery stage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number, tracking number, or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No matching orders found' : 'No Orders in Delivery'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? 'Try adjusting your search criteria' 
                      : 'Orders will appear here once they are shipped and in transit for delivery.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const hoursInTransit = order.shipped_at 
                  ? (Date.now() - new Date(order.shipped_at).getTime()) / (1000 * 60 * 60)
                  : 0;
                
                const isDelayed = hoursInTransit > 72;
                const isOutForDelivery = hoursInTransit > 24;
                
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isDelayed ? 'bg-red-100' : isOutForDelivery ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            <Truck className={`h-5 w-5 ${
                              isDelayed ? 'text-red-600' : isOutForDelivery ? 'text-blue-600' : 'text-green-600'
                            }`} />
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
                          <Badge variant={isDelayed ? "destructive" : isOutForDelivery ? "secondary" : "default"}>
                            {isDelayed ? 'Delayed' : isOutForDelivery ? 'Out for Delivery' : 'In Transit'}
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
                          
                          <Button
                            onClick={() => handleMarkDelivered(order.id)}
                            disabled={updateOrderStageMutation.isPending}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Delivered
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Delivery;
