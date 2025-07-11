
import React, { useState } from 'react';
import { Truck, Scan, Package, MapPin } from 'lucide-react';
import Header from '@/components/layout/Header';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import { useOrdersByStage, useUpdateTracking } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/database';
import { detectCourierPartner } from '@/services/watiService';
import { toast } from 'sonner';

const Tracking = () => {
  const { data: trackingOrders = [], isLoading, error } = useOrdersByStage('tracking');
  const updateTrackingMutation = useUpdateTracking();
  
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [detectedCarrier, setDetectedCarrier] = useState<string>('');
  const [isOrderLocked, setIsOrderLocked] = useState(false);

  const handleOrderScan = () => {
    if (!orderIdInput.trim()) return;
    
    // Find order by order number or ID
    const order = trackingOrders.find(o => 
      o.order_number === orderIdInput || 
      o.id === orderIdInput ||
      o.order_number === `#${orderIdInput}` ||
      o.order_number.replace('#', '') === orderIdInput
    );
    
    if (order) {
      setCurrentOrder(order);
      setIsOrderLocked(true);
      toast.success(`Order ${order.order_number} loaded`);
      console.log('Order found:', order.order_number);
    } else {
      toast.error('Order not found in tracking queue');
      setCurrentOrder(null);
      setIsOrderLocked(false);
    }
  };

  const handleTrackingNumberScan = async () => {
    if (!trackingNumberInput.trim() || !currentOrder) return;
    
    // Auto-detect carrier based on tracking number pattern
    const trackingNumber = trackingNumberInput.trim();
    const carrier = detectCourierPartner(trackingNumber);
    
    let carrierDisplayName = '';
    switch (carrier) {
      case 'frenchexpress':
        carrierDisplayName = 'French Express';
        break;
      case 'delhivery':
        carrierDisplayName = 'Delhivery';
        break;
      default:
        carrierDisplayName = 'Other';
    }
    
    setDetectedCarrier(carrierDisplayName);
    
    try {
      await updateTrackingMutation.mutateAsync({
        orderId: currentOrder.id,
        trackingNumber: trackingNumber,
        carrier: carrier
      });
      
      // Reset form after successful update
      setOrderIdInput('');
      setTrackingNumberInput('');
      setCurrentOrder(null);
      setDetectedCarrier('');
      setIsOrderLocked(false);
      
      toast.success(`Tracking added successfully for order ${currentOrder.order_number}`);
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.error('Failed to update tracking information');
    }
  };

  const handleResetOrder = () => {
    setOrderIdInput('');
    setTrackingNumberInput('');
    setCurrentOrder(null);
    setDetectedCarrier('');
    setIsOrderLocked(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tracking Stage" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading tracking queue...</p>
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
          
          {/* Tracking Stats */}
          <TrackingStats orders={trackingOrders} />

          {/* Main Tracking Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column - Tracking Assignment Scanner */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Scan className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">Tracking Assignment Scanner</CardTitle>
                  </div>
                  {isOrderLocked && (
                    <Button
                      onClick={handleResetOrder}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Scan order ID first, then scan tracking number barcode
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Order ID Scanner */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Order ID Scanner</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Scan or enter Order ID"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isOrderLocked && handleOrderScan()}
                      className="flex-1"
                      disabled={isOrderLocked}
                    />
                    <Button 
                      onClick={handleOrderScan}
                      size="sm"
                      variant="outline"
                      className="px-3"
                      disabled={isOrderLocked || !orderIdInput.trim()}
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                  {isOrderLocked && currentOrder && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Order {currentOrder.order_number} locked and ready
                    </p>
                  )}
                </div>

                {/* Tracking Number Scanner - Only show when order is selected */}
                {isOrderLocked && currentOrder && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Tracking Number Scanner</label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Scan tracking number barcode"
                        value={trackingNumberInput}
                        onChange={(e) => {
                          setTrackingNumberInput(e.target.value);
                          if (e.target.value.length > 8) {
                            const carrier = detectCourierPartner(e.target.value);
                            let carrierDisplayName = '';
                            switch (carrier) {
                              case 'frenchexpress':
                                carrierDisplayName = 'French Express';
                                break;
                              case 'delhivery':
                                carrierDisplayName = 'Delhivery';
                                break;
                              default:
                                carrierDisplayName = 'Other';
                            }
                            setDetectedCarrier(carrierDisplayName);
                          }
                        }}
                        onKeyPress={(e) => e.key === 'Enter' && handleTrackingNumberScan()}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleTrackingNumberScan}
                        size="sm"
                        variant="default"
                        className="px-3"
                        disabled={!trackingNumberInput.trim() || updateTrackingMutation.isPending}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                    {detectedCarrier && (
                      <p className="text-sm text-green-600">
                        Detected carrier: {detectedCarrier}
                      </p>
                    )}
                    {updateTrackingMutation.isPending && (
                      <p className="text-sm text-blue-600">
                        Adding tracking information...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                {currentOrder ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{currentOrder.order_number}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Locked
                      </span>
                    </div>
                    
                    {currentOrder.customer && (
                      <div>
                        <p className="font-medium">
                          {currentOrder.customer.first_name} {currentOrder.customer.last_name}
                        </p>
                        {currentOrder.customer.email && (
                          <p className="text-sm text-gray-600">{currentOrder.customer.email}</p>
                        )}
                      </div>
                    )}
                    
                    {currentOrder.shipping_address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="text-sm text-gray-600">
                          <p>{currentOrder.shipping_address.address_line_1}</p>
                          {currentOrder.shipping_address.address_line_2 && (
                            <p>{currentOrder.shipping_address.address_line_2}</p>
                          )}
                          <p>
                            {currentOrder.shipping_address.city}, {currentOrder.shipping_address.state} {currentOrder.shipping_address.postal_code}
                          </p>
                          <p>{currentOrder.shipping_address.country}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-500">Total Items</p>
                        <p className="font-semibold">{currentOrder.order_items.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="font-semibold">₹{currentOrder.total_amount}</p>
                      </div>
                    </div>

                    {detectedCarrier && trackingNumberInput && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Ready to Add</h4>
                        <div className="text-sm text-blue-800">
                          <p><strong>Tracking Number:</strong> {trackingNumberInput}</p>
                          <p><strong>Courier:</strong> {detectedCarrier}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Scan className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No order selected</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scan an order ID to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders Ready for Tracking - Full Width List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders Ready for Tracking</CardTitle>
              <p className="text-sm text-gray-600">
                {trackingOrders.length} orders waiting for tracking numbers
              </p>
            </CardHeader>
            <CardContent>
              <TrackingQueue orders={trackingOrders} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
