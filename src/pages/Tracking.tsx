import React, { useState, useEffect, useRef } from 'react';
import { Truck, Scan, Package, MapPin, CheckCircle, XCircle, MessageCircle, Settings, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import { useOrdersByStage, useUpdateTracking } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Order } from '@/types/database';
import { detectCourierPartner } from '@/services/interaktService';
import { sendOrderShippedNotification } from '@/services/interakt/orderNotificationService';
import { toast } from 'sonner';
import StageChangeControls from '@/components/common/StageChangeControls';
import { getPhoneNumber } from '@/lib/utils';

const Tracking = () => {
  const { data: trackingOrders = [], isLoading, error } = useOrdersByStage('tracking');
  const updateTrackingMutation = useUpdateTracking();
  
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [detectedCarrier, setDetectedCarrier] = useState<string>('');
  const [isOrderLocked, setIsOrderLocked] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [shopifyStatus, setShopifyStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

  const orderInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);

  // Keep order input focused when order is not locked
  useEffect(() => {
    if (!isOrderLocked && orderInputRef.current) {
      orderInputRef.current.focus();
    }
  }, [isOrderLocked]);

  // Re-focus order input when it loses focus (only when not locked)
  useEffect(() => {
    if (!isOrderLocked) {
      const handleFocus = () => {
        if (orderInputRef.current && document.activeElement !== orderInputRef.current) {
          orderInputRef.current.focus();
        }
      };

      const interval = setInterval(handleFocus, 100);
      return () => clearInterval(interval);
    }
  }, [isOrderLocked]);

  // Keep tracking input focused when order is locked
  useEffect(() => {
    if (isOrderLocked && trackingInputRef.current) {
      trackingInputRef.current.focus();
    }
  }, [isOrderLocked]);

  // Re-focus tracking input when it loses focus (only when order is locked)
  useEffect(() => {
    if (isOrderLocked) {
      const handleFocus = () => {
        if (trackingInputRef.current && document.activeElement !== trackingInputRef.current) {
          trackingInputRef.current.focus();
        }
      };

      const interval = setInterval(handleFocus, 100);
      return () => clearInterval(interval);
    }
  }, [isOrderLocked]);

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
      setWhatsappStatus(null);
      setShopifyStatus(null);
      toast.success(`Order ${order.order_number} loaded`);
      console.log('Order found:', order.order_number);
      console.log('Customer phone:', order.customer?.phone);
      console.log('Final phone:', getPhoneNumber(order));
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
        carrierDisplayName = 'Franch Express';
        break;
      case 'delhivery':
        carrierDisplayName = 'Delhivery';
        break;
      default:
        carrierDisplayName = 'Other';
    }
    
    setDetectedCarrier(carrierDisplayName);
    setWhatsappStatus('pending');
    setShopifyStatus('pending');
    
    try {
      console.log('🚀 Starting tracking update process...');
      
      // The updateTrackingMutation now handles both database update and Shopify sync
      await updateTrackingMutation.mutateAsync({
        orderId: currentOrder.id,
        trackingNumber: trackingNumber,
        carrier: carrier
      });
      
      // Automatically send WhatsApp notification
      console.log('📱 Automatically sending WhatsApp notification for tracking update...');
      const phoneNumber = getPhoneNumber(currentOrder);
      
      if (phoneNumber) {
        try {
          const whatsappSuccess = await sendOrderShippedNotification(
            currentOrder, 
            trackingNumber, 
            carrier
          );
          
          if (whatsappSuccess) {
            setWhatsappStatus('success');
            console.log('✅ WhatsApp notification sent successfully');
          } else {
            setWhatsappStatus('failed');
            console.log('❌ WhatsApp notification failed');
          }
        } catch (whatsappError) {
          console.error('Error sending WhatsApp notification:', whatsappError);
          setWhatsappStatus('failed');
        }
      } else {
        setWhatsappStatus('failed');
        console.log('❌ No phone number available for WhatsApp notification');
      }
      
      // Set Shopify status based on whether order has Shopify ID
      // The actual Shopify update is handled by the service layer
      if (currentOrder.shopify_order_id) {
        setShopifyStatus('success');
        console.log('✅ Shopify update completed (or attempted)');
      } else {
        setShopifyStatus('failed');
        console.log('⚠️ No Shopify order ID found, skipping Shopify update');
      }
      
      // Reset form after successful update
      setOrderIdInput('');
      setTrackingNumberInput('');
      setCurrentOrder(null);
      setDetectedCarrier('');
      setIsOrderLocked(false);
      
      // Reset status indicators after a delay
      setTimeout(() => {
        setWhatsappStatus(null);
        setShopifyStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error updating tracking:', error);
      setWhatsappStatus('failed');
      setShopifyStatus('failed');
      toast.error('Failed to update tracking information');
    }
  };

  const handleResetOrder = () => {
    setOrderIdInput('');
    setTrackingNumberInput('');
    setCurrentOrder(null);
    setDetectedCarrier('');
    setIsOrderLocked(false);
    setWhatsappStatus(null);
    setShopifyStatus(null);
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

          {/* Status Indicators */}
          {(whatsappStatus || shopifyStatus) && (
            <div className="space-y-3">
              {/* WhatsApp Status */}
              {whatsappStatus && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">WhatsApp Notification</span>
                          {whatsappStatus === 'pending' && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Sending...
                            </Badge>
                          )}
                          {whatsappStatus === 'success' && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Sent Successfully
                              </Badge>
                            </div>
                          )}
                          {whatsappStatus === 'failed' && (
                            <div className="flex items-center space-x-1">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Failed to Send
                              </Badge>
                            </div>
                          )}
                        </div>
                        {whatsappStatus === 'success' && (
                          <p className="text-sm text-green-600 mt-1">
                            Customer has been automatically notified about the shipment via WhatsApp
                          </p>
                        )}
                        {whatsappStatus === 'failed' && (
                          <p className="text-sm text-red-600 mt-1">
                            Could not send WhatsApp notification - check customer phone number
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shopify Status */}
              {shopifyStatus && (
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <ExternalLink className="h-5 w-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Shopify Order Update</span>
                          {shopifyStatus === 'pending' && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Updating...
                            </Badge>
                          )}
                          {shopifyStatus === 'success' && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Updated Successfully
                              </Badge>
                            </div>
                          )}
                          {shopifyStatus === 'failed' && (
                            <div className="flex items-center space-x-1">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                Update Failed
                              </Badge>
                            </div>
                          )}
                        </div>
                        {shopifyStatus === 'success' && (
                          <p className="text-sm text-green-600 mt-1">
                            Order has been marked as fulfilled in Shopify with tracking details
                          </p>
                        )}
                        {shopifyStatus === 'failed' && (
                          <p className="text-sm text-red-600 mt-1">
                            Could not update Shopify order - order may not be from Shopify
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

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
                  Scan order ID first, then scan tracking number barcode (auto-sends WhatsApp & syncs Shopify)
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Order ID Scanner */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Order ID Scanner</label>
                  <div className="flex space-x-2">
                    <Input
                      ref={orderInputRef}
                      placeholder="Scan or enter Order ID"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isOrderLocked && handleOrderScan()}
                      className="flex-1"
                      disabled={isOrderLocked}
                      autoFocus
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
                        ref={trackingInputRef}
                        placeholder="Scan tracking number barcode"
                        value={trackingNumberInput}
                        onChange={(e) => {
                          setTrackingNumberInput(e.target.value);
                          if (e.target.value.length > 8) {
                            const carrier = detectCourierPartner(e.target.value);
                            let carrierDisplayName = '';
                            switch (carrier) {
                              case 'frenchexpress':
                                carrierDisplayName = 'Franch Express';
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
                        autoFocus
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
                        Adding tracking, sending WhatsApp & syncing Shopify...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Order Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order Information</CardTitle>
                  {currentOrder && (
                    <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
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
                          order={currentOrder} 
                          currentStage={currentOrder.stage || 'tracking'}
                          onStageChange={() => {
                            setStageDialogOpen(false);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
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
                        {(() => {
                          const phoneNumber = getPhoneNumber(currentOrder);
                          return phoneNumber ? (
                            <div className="flex items-center space-x-2 mt-1">
                              <MessageCircle className="h-4 w-4 text-green-600" />
                              <p className="text-sm text-green-600 font-medium">WhatsApp: {phoneNumber}</p>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 mt-1">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <p className="text-sm text-red-600 font-medium">No phone number - WhatsApp unavailable</p>
                            </div>
                          );
                        })()}
                        {currentOrder.shopify_order_id && (
                          <div className="flex items-center space-x-2 mt-1">
                            <ExternalLink className="h-4 w-4 text-purple-600" />
                            <p className="text-sm text-purple-600 font-medium">Shopify ID: {currentOrder.shopify_order_id}</p>
                          </div>
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
                          <p className="text-xs text-blue-600 mt-1">
                            📱 WhatsApp will be sent automatically when you add tracking
                          </p>
                          <p className="text-xs text-blue-600">
                            🛍️ Shopify will be updated automatically if order is from Shopify
                          </p>
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
