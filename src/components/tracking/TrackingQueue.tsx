import React from 'react';
import { Package, Truck, MapPin, Calendar, ExternalLink, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateTracking, useUpdateOrderStage } from '@/hooks/useOrders';
import { Order, CarrierType } from '@/types/database';
import { detectCourierPartner, generateTrackingLink } from '@/services/interaktService';
import { useState } from 'react';
import StageChangeControls from '@/components/common/StageChangeControls';

interface TrackingQueueProps {
  orders: Order[];
  selectedOrderIds?: Set<string>;
  onOrderSelect?: (orderId: string, checked: boolean) => void;
}

const TrackingQueue = ({ orders, selectedOrderIds = new Set(), onOrderSelect }: TrackingQueueProps) => {
  const updateTrackingMutation = useUpdateTracking();
  const updateOrderStageMutation = useUpdateOrderStage();
  const [trackingData, setTrackingData] = useState<Record<string, { trackingNumber: string; carrier: CarrierType }>>({});
  const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

  const handleTrackingSubmit = (orderId: string) => {
    const data = trackingData[orderId];
    if (data?.trackingNumber) {
      // Auto-detect courier partner
      const detectedCarrier = detectCourierPartner(data.trackingNumber);
      
      updateTrackingMutation.mutate({
        orderId,
        trackingNumber: data.trackingNumber,
        carrier: detectedCarrier,
      });
    }
  };

  const handleTrackingNumberChange = (orderId: string, trackingNumber: string) => {
    // Auto-detect carrier when tracking number changes
    const detectedCarrier = detectCourierPartner(trackingNumber);
    
    setTrackingData(prev => ({
      ...prev,
      [orderId]: { trackingNumber, carrier: detectedCarrier }
    }));
  };

  const handleMarkShipped = (orderId: string) => {
    updateOrderStageMutation.mutate({ orderId, stage: 'shipped' });
  };

  const handleDialogChange = (orderId: string, open: boolean) => {
    setOpenDialogs(prev => ({
      ...prev,
      [orderId]: open
    }));
  };

  const getCourierDisplayName = (carrier: CarrierType) => {
    switch (carrier) {
      case 'frenchexpress':
        return 'Franch Express';
      case 'delhivery':
        return 'Delhivery';
      default:
        return 'Other';
    }
  };

  // Helper function to get phone number from customer
  const getPhoneNumber = (order: Order) => {
    return order.customer?.phone || null;
  };

  // Debug function to log customer data
  const debugCustomerData = (order: Order) => {
    console.log('Tracking - Customer data for order', order.order_number, ':', order.customer);
    console.log('Tracking - Customer phone:', order.customer?.phone);
    console.log('Tracking - Final phone number:', getPhoneNumber(order));
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Ready for Tracking</h3>
            <p className="text-gray-500">Orders will appear here once they are fully packed and ready for shipment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        // Debug log for each order
        debugCustomerData(order);
        const phoneNumber = getPhoneNumber(order);
        
        return (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Bulk Selection Checkbox */}
                  {onOrderSelect && (
                    <CheckboxUI
                      checked={selectedOrderIds.has(order.id)}
                      onCheckedChange={(checked) => onOrderSelect(order.id, checked as boolean)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  )}
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <div className="text-sm text-gray-600">
                      <p>{order.customer?.first_name} {order.customer?.last_name}</p>
                      {phoneNumber ? (
                        <p className="text-green-600">📱 {phoneNumber}</p>
                      ) : (
                        <p className="text-red-500">📱 No phone number available</p>
                      )}
                      {order.customer?.email && (
                        <p className="text-gray-500">✉️ {order.customer.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{order.total_amount}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
                        currentStage={order.stage || 'tracking'}
                        onStageChange={() => {
                          handleDialogChange(order.id, false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
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
                  <h4 className="font-medium mb-2">Items ({order.order_items.length})</h4>
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.title} × {item.quantity}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.packed ? 'Packed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {order.tracking_number ? (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-green-900">Tracking: {order.tracking_number}</span>
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            {getCourierDisplayName(order.carrier!)}
                          </Badge>
                        </div>
                        {order.carrier && (
                          <p className="text-sm text-green-700 mt-1">
                            Tracking Link: {generateTrackingLink(order.tracking_number, order.carrier)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {order.carrier && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(generateTrackingLink(order.tracking_number!, order.carrier!), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleMarkShipped(order.id)}
                        disabled={updateOrderStageMutation.isPending}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Mark Shipped
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-3">Add Tracking Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Label htmlFor={`tracking-${order.id}`}>Tracking Number</Label>
                      <Input
                        id={`tracking-${order.id}`}
                        placeholder="Enter tracking number (48... or 2158...)"
                        value={trackingData[order.id]?.trackingNumber || ''}
                        onChange={(e) => handleTrackingNumberChange(order.id, e.target.value)}
                      />
                      {trackingData[order.id]?.trackingNumber && (
                        <p className="text-sm text-green-600 mt-1">
                          Auto-detected: {getCourierDisplayName(trackingData[order.id].carrier)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        onClick={() => handleTrackingSubmit(order.id)}
                        disabled={
                          !trackingData[order.id]?.trackingNumber ||
                          updateTrackingMutation.isPending
                        }
                        className="w-full"
                      >
                        Add Tracking
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TrackingQueue;
