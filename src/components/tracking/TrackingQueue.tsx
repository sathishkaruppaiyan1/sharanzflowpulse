
import React, { useState } from 'react';
import { Truck, Eye, Package, ArrowRight, Phone, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrderDetails from '@/components/orders/OrderDetails';
import { useUpdateTracking } from '@/hooks/useOrders';
import { Order, CarrierType } from '@/types/database';
import { toast } from '@/hooks/use-toast';

interface TrackingQueueProps {
  orders: Order[];
}

const TrackingQueue = ({ orders }: TrackingQueueProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});
  const [carriers, setCarriers] = useState<Record<string, CarrierType>>({});
  const updateTracking = useUpdateTracking();

  const getProductDisplayName = (item: any) => {
    console.log('Processing item for display in tracking:', item);
    const name = item.title || 'Product';
    const variant = item.sku || '';
    const displayName = variant ? `${name} - ${variant}` : name;
    console.log(`Display name in tracking: ${displayName}`);
    return displayName;
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleTrackingNumberChange = (orderId: string, trackingNumber: string) => {
    setTrackingNumbers(prev => ({
      ...prev,
      [orderId]: trackingNumber
    }));
  };

  const handleCarrierChange = (orderId: string, carrier: CarrierType) => {
    setCarriers(prev => ({
      ...prev,
      [orderId]: carrier
    }));
  };

  const handleAddTracking = (order: Order) => {
    const trackingNumber = trackingNumbers[order.id]?.trim();
    const carrier = carriers[order.id];

    if (!trackingNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter a tracking number.",
        variant: "destructive"
      });
      return;
    }

    if (!carrier) {
      toast({
        title: "Missing Information", 
        description: "Please select a carrier.",
        variant: "destructive"
      });
      return;
    }

    updateTracking.mutate({
      orderId: order.id,
      trackingNumber,
      carrier
    });

    // Clear the form after successful submission
    setTrackingNumbers(prev => {
      const updated = { ...prev };
      delete updated[order.id];
      return updated;
    });
    setCarriers(prev => {
      const updated = { ...prev };
      delete updated[order.id];
      return updated;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Phone number copied to clipboard.",
    });
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No orders ready for tracking</p>
            <p className="text-sm mt-1">Orders will appear here after packing is complete</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => {
          const customerName = order.customer ? 
            `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 
            'Guest Customer';

          const totalItems = order.order_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;

          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      <span>{order.order_number}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-4 mt-1">
                      <span>Customer: {customerName}</span>
                      {order.customer?.phone ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{order.customer.phone}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(order.customer?.phone || '')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">No phone</span>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">
                    Ready for Tracking
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Order Summary */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Total Items:</span>
                      <span className="ml-2">{totalItems}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Amount:</span>
                      <span className="ml-2">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Product Details with Variations */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Products with Variations:</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => {
                        const displayName = getProductDisplayName(item);
                        return (
                          <div key={index} className="bg-green-50 border border-green-200 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{displayName}</div>
                                <div className="text-sm text-gray-600 mt-1 space-y-1">
                                  <p><span className="font-medium">SKU:</span> {item.sku || 'N/A'}</p>
                                  <p><span className="font-medium">Quantity:</span> {item.quantity}</p>
                                  {item.price && (
                                    <p><span className="font-medium">Price:</span> ₹{item.price}</p>
                                  )}
                                </div>
                              </div>
                              <Badge className="bg-green-100 text-green-800 ml-2">
                                Packed ✓
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tracking Information Form */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-700 mb-3">Add Tracking Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor={`tracking-${order.id}`} className="text-sm font-medium">
                          Tracking Number
                        </Label>
                        <Input
                          id={`tracking-${order.id}`}
                          placeholder="Enter tracking number"
                          value={trackingNumbers[order.id] || ''}
                          onChange={(e) => handleTrackingNumberChange(order.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`carrier-${order.id}`} className="text-sm font-medium">
                          Carrier
                        </Label>
                        <Select
                          value={carriers[order.id] || ''}
                          onValueChange={(value: CarrierType) => handleCarrierChange(order.id, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="frenchexpress">French Express</SelectItem>
                            <SelectItem value="delhivery">Delhivery</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </Button>
                    
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAddTracking(order)}
                      disabled={updateTracking.isPending || !trackingNumbers[order.id] || !carriers[order.id]}
                    >
                      {updateTracking.isPending ? (
                        'Processing...'
                      ) : (
                        <>
                          <Truck className="h-4 w-4 mr-1" />
                          Ship Order
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </>
  );
};

export default TrackingQueue;
