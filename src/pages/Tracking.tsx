import React, { useState, useEffect, useRef } from 'react';
import { Truck, Scan, Package, MapPin, CheckCircle, XCircle, MessageCircle, Settings, ExternalLink } from 'lucide-react';
import Header from '@/components/layout/Header';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import BulkStageChangeButton from '@/components/common/BulkStageChangeButton';
import { useOrdersByStage, useUpdateTracking } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox as CheckboxUI } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Order } from '@/types/database';
import { detectCourierPartner } from '@/services/interaktService';
import { toast } from 'sonner';
import StageChangeControls from '@/components/common/StageChangeControls';
import { getPhoneNumber } from '@/lib/utils';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

const Tracking = () => {
  const { data: allTrackingOrders = [], isLoading, error } = useOrdersByStage('tracking');
  const updateTrackingMutation = useUpdateTracking();
  const { playErrorSound, playSuccessSound, playWarningSound, playCompleteSound } = useSoundNotifications();
  
  // Filter orders to only show those without tracking numbers (waiting for tracking assignment)
  const trackingOrders = allTrackingOrders.filter(order => !order.tracking_number);
  
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [detectedCarrier, setDetectedCarrier] = useState<string>('');
  const [isOrderLocked, setIsOrderLocked] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [shopifyStatus, setShopifyStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  
  // Add state for duplicate prevention
  const [lastProcessedTrackingNumber, setLastProcessedTrackingNumber] = useState<string>('');
  const [isProcessingTracking, setIsProcessingTracking] = useState(false);
  const lastScanTimeRef = useRef<number>(0);

  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const orderInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);

  // Helper function to check if input looks like a tracking number
  const looksLikeTrackingNumber = (input: string) => {
    const cleanInput = input.trim();
    // Common tracking number patterns
    const trackingPatterns = [
      /^48\d{13}$/,        // Franch express pattern
      /^2158\d{10}$/,      // Delhivery pattern
      /^[A-Z]{2}\d{9}[A-Z]{2}$/, // International tracking
      /^\d{10,22}$/,       // Generic numeric tracking (10-22 digits)
      /^[A-Z0-9]{8,30}$/   // Alphanumeric tracking codes
    ];
    
    return trackingPatterns.some(pattern => pattern.test(cleanInput));
  };

  // Helper function to check if input looks like an order ID
  const looksLikeOrderId = (input: string) => {
    const cleanInput = input.trim();
    // Order ID patterns - typically shorter and different format
    return (
      cleanInput.startsWith('#') ||           // Order numbers with #
      /^[A-Z0-9]{1,10}$/.test(cleanInput) ||  // Short alphanumeric IDs
      /^\d{1,8}$/.test(cleanInput) ||         // Short numeric IDs
      cleanInput.includes('ORDER') ||         // Contains ORDER keyword
      cleanInput.includes('ORD')              // Contains ORD keyword
    );
  };

  // Enhanced focus management for order input
  useEffect(() => {
    if (!isOrderLocked && orderInputRef.current && !focusLocked && autoFocusEnabled) {
      orderInputRef.current.focus();
    }
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced focus management for tracking input
  useEffect(() => {
    if (isOrderLocked && trackingInputRef.current && !focusLocked && autoFocusEnabled) {
      trackingInputRef.current.focus();
    }
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced focus management with better button click detection
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const handleFocusManagement = () => {
      const activeElement = document.activeElement;
      
      // Check if user is interacting with any clickable element
      const isClickableElement = activeElement?.tagName === 'BUTTON' || 
                                activeElement?.getAttribute('role') === 'button' ||
                                activeElement?.tagName === 'A' ||
                                activeElement?.closest('[role="dialog"]') ||
                                activeElement?.closest('[data-dialog-content]') ||
                                activeElement?.closest('.manage-button') ||
                                activeElement?.closest('[data-radix-popper-content-wrapper]') ||
                                activeElement?.closest('[data-radix-dialog-content]');

      // Don't steal focus from clickable elements or dialog content
      if (isClickableElement) {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        // Re-enable auto-focus after a longer delay when user stops interacting
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 3000);
        return;
      }

      // Only refocus to scanner inputs if focus is lost and auto-focus is enabled
      if (autoFocusEnabled && !focusLocked) {
        if (!isOrderLocked && orderInputRef.current && activeElement !== orderInputRef.current) {
          orderInputRef.current.focus();
        } else if (isOrderLocked && trackingInputRef.current && activeElement !== trackingInputRef.current) {
          trackingInputRef.current.focus();
        }
      }
    };

    const interval = setInterval(handleFocusManagement, 500);
    return () => clearInterval(interval);
  }, [isOrderLocked, focusLocked, autoFocusEnabled]);

  // Enhanced user interaction detection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Check if user clicked on any button or interactive element
      if (target?.closest('button') || 
          target?.closest('[role="button"]') ||
          target?.closest('a') ||
          target?.closest('[data-radix-popper-content-wrapper]') ||
          target?.closest('[data-radix-dialog-content]') ||
          target?.closest('.manage-button')) {
        
        // Don't disable auto-focus for scanner-specific buttons
        if (!target?.closest('.scanner-input')) {
          setFocusLocked(true);
          setAutoFocusEnabled(false);
          
          // Re-enable auto-focus after user stops interacting
          setTimeout(() => {
            setFocusLocked(false);
            setAutoFocusEnabled(true);
          }, 3000);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable auto-focus when user presses Tab or other navigation keys
      if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'F1' || e.key === 'F2') {
        setFocusLocked(true);
        setAutoFocusEnabled(false);
        
        setTimeout(() => {
          setFocusLocked(false);
          setAutoFocusEnabled(true);
        }, 2000);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOrderScan = () => {
    if (!orderIdInput.trim()) return;
    
    const cleanInput = orderIdInput.trim();
    
    // Check if input looks like a tracking number instead of order ID
    if (looksLikeTrackingNumber(cleanInput)) {
      playErrorSound();
      toast.error('This looks like a tracking number, not an order ID. Please scan the order barcode first.');
      setOrderIdInput('');
      return;
    }
    
    // Find order by order number or ID - only from orders waiting for tracking
    const order = trackingOrders.find(o => 
      o.order_number === cleanInput || 
      o.id === cleanInput ||
      o.order_number === `#${cleanInput}` ||
      o.order_number.replace('#', '') === cleanInput
    );
    
    if (order) {
      playSuccessSound();
      setCurrentOrder(order);
      setIsOrderLocked(true);
      setWhatsappStatus(null);
      setShopifyStatus(null);
      // Reset duplicate prevention when new order is selected
      setLastProcessedTrackingNumber('');
      setIsProcessingTracking(false);
      toast.success(`Order ${order.order_number} loaded - ready for tracking assignment`);
      console.log('Order found:', order.order_number);
      console.log('Customer phone:', order.customer?.phone);
      console.log('Final phone:', getPhoneNumber(order));
    } else {
      playErrorSound();
      toast.error('Order not found in tracking queue or already has tracking assigned');
      setCurrentOrder(null);
      setIsOrderLocked(false);
    }
  };

  const handleTrackingNumberScan = async () => {
    if (!trackingNumberInput.trim() || !currentOrder) return;
    
    const trackingNumber = trackingNumberInput.trim();
    const currentTime = Date.now();
    
    // Prevent duplicate scans - check if same tracking number was processed recently
    if (trackingNumber === lastProcessedTrackingNumber && (currentTime - lastScanTimeRef.current) < 2000) {
      playWarningSound();
      toast.warning('This tracking number was just processed. Please wait before scanning again.');
      console.log('🔄 Duplicate tracking number scan prevented:', trackingNumber);
      return;
    }
    
    // Prevent processing if already in progress
    if (isProcessingTracking) {
      playWarningSound();
      toast.warning('Tracking assignment already in progress. Please wait...');
      console.log('⏳ Tracking assignment already in progress');
      return;
    }
    
    // Check if input looks like an order ID instead of tracking number
    if (looksLikeOrderId(trackingNumber)) {
      playErrorSound();
      toast.error('This looks like an order ID, not a tracking number. Please scan the tracking barcode.');
      setTrackingNumberInput('');
      return;
    }
    
    // Auto-detect carrier based on tracking number pattern
    const carrier = detectCourierPartner(trackingNumber);
    
    let carrierDisplayName = '';
    switch (carrier) {
      case 'frenchexpress':
        carrierDisplayName = 'Franch express';
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
    setIsProcessingTracking(true);
    setLastProcessedTrackingNumber(trackingNumber);
    lastScanTimeRef.current = currentTime;
    
    try {
      console.log('🚀 Starting tracking update process...');
      
      // Update tracking information (this automatically moves order to shipped stage)
      await updateTrackingMutation.mutateAsync({
        orderId: currentOrder.id,
        trackingNumber: trackingNumber,
        carrier: carrier
      });
      
      // Play success sound for successful tracking update
      playCompleteSound();
      
      // The mutation already handles WhatsApp notification and Shopify sync
      // So we just need to update the status indicators based on the order
      const phoneNumber = getPhoneNumber(currentOrder);
      
      if (phoneNumber) {
        setWhatsappStatus('success');
        console.log('✅ WhatsApp notification sent successfully');
      } else {
        setWhatsappStatus('failed');
        console.log('❌ No phone number available for WhatsApp notification');
      }
      
      // Set Shopify status based on whether order has Shopify ID
      if (currentOrder.shopify_order_id) {
        setShopifyStatus('success');
        console.log('✅ Shopify update completed (or attempted)');
      } else {
        setShopifyStatus('failed');
        console.log('⚠️ No Shopify order ID found, skipping Shopify update');
      }
      
      toast.success(`Order ${currentOrder.order_number} tracking assigned and moved to shipped!`);
      
      // Reset form after successful update
      setOrderIdInput('');
      setTrackingNumberInput('');
      setCurrentOrder(null);
      setDetectedCarrier('');
      setIsOrderLocked(false);
      setIsProcessingTracking(false);
      setLastProcessedTrackingNumber('');
      
      // Reset status indicators after a delay
      setTimeout(() => {
        setWhatsappStatus(null);
        setShopifyStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error updating tracking:', error);
      playErrorSound();
      setWhatsappStatus('failed');
      setShopifyStatus('failed');
      setIsProcessingTracking(false);
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
    setFocusLocked(false);
    setAutoFocusEnabled(true);
    setIsProcessingTracking(false);
    setLastProcessedTrackingNumber('');
  };

  // Handle individual order selection
  const handleOrderSelect = (orderId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedOrderIds);
    if (checked) {
      newSelectedIds.add(orderId);
    } else {
      newSelectedIds.delete(orderId);
    }
    setSelectedOrderIds(newSelectedIds);
    setSelectAll(newSelectedIds.size === trackingOrders.length);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(trackingOrders.map(order => order.id));
      setSelectedOrderIds(allIds);
      setSelectAll(true);
    } else {
      setSelectedOrderIds(new Set());
      setSelectAll(false);
    }
  };

  // Handle bulk operation success
  const handleBulkOperationSuccess = () => {
    playSuccessSound();
    setSelectedOrderIds(new Set());
    setSelectAll(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tracking Assignment" showSearch={false} />
        <div className="flex-1 p-6 bg-gray-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Truck className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-500">Loading orders waiting for tracking...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tracking Assignment" showSearch={false} />
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
      <Header 
        title="Tracking Assignment" 
        showSearch={false}
      >
        {/* Header Bulk Action Button - Move back to Packing for orders without tracking */}
        {trackingOrders.length > 0 && (
          <div className="flex items-center space-x-2">
            <BulkStageChangeButton
              orders={trackingOrders}
              currentStage="tracking"
              targetStage="packing"
              selectedOrderIds={selectedOrderIds}
              onSuccess={handleBulkOperationSuccess}
              variant="header"
              direction="previous"
            />
          </div>
        )}
      </Header>
      
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
                      className="text-red-600 border-red-300 hover:bg-red-50 scanner-input"
                    >
                      Reset
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Scan order ID first, then assign tracking number (automatically moves to shipped & sends notifications)
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Order ID Scanner */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Order ID Scanner</label>
                  <div className="flex space-x-2">
                    <Input
                      ref={orderInputRef}
                      placeholder="Scan or enter Order ID (not tracking number)"
                      value={orderIdInput}
                      onChange={(e) => setOrderIdInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isOrderLocked && handleOrderScan()}
                      onFocus={() => {
                        setFocusLocked(false);
                        setAutoFocusEnabled(true);
                      }}
                      className="flex-1"
                      disabled={isOrderLocked}
                      autoFocus
                    />
                    <Button 
                      onClick={handleOrderScan}
                      size="sm"
                      variant="outline"
                      className="px-3 scanner-input"
                      disabled={isOrderLocked || !orderIdInput.trim()}
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                  {isOrderLocked && currentOrder && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Order {currentOrder.order_number} ready for tracking assignment
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
                        placeholder="Scan tracking number barcode (not order ID)"
                        value={trackingNumberInput}
                        onChange={(e) => {
                          setTrackingNumberInput(e.target.value);
                          if (e.target.value.length > 8) {
                            const carrier = detectCourierPartner(e.target.value);
                            let carrierDisplayName = '';
                            switch (carrier) {
                              case 'frenchexpress':
                                carrierDisplayName = 'Franch express';
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
                        onFocus={() => {
                          setFocusLocked(false);
                          setAutoFocusEnabled(true);
                        }}
                        className="flex-1"
                        disabled={isProcessingTracking}
                        autoFocus
                      />
                      <Button 
                        onClick={handleTrackingNumberScan}
                        size="sm"
                        variant="default"
                        className="px-3 scanner-input"
                        disabled={!trackingNumberInput.trim() || updateTrackingMutation.isPending || isProcessingTracking}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </div>
                    {detectedCarrier && (
                      <p className="text-sm text-green-600">
                        Detected carrier: {detectedCarrier}
                      </p>
                    )}
                    {(updateTrackingMutation.isPending || isProcessingTracking) && (
                      <p className="text-sm text-blue-600">
                        Assigning tracking & moving to shipped...
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
                        <Button variant="ghost" size="sm" className="scanner-input">
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
                      Scan an order ID to assign tracking
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders Waiting for Tracking Assignment */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">Orders Waiting for Tracking Assignment</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Bulk Selection Controls */}
                  {trackingOrders.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <CheckboxUI
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <span className="text-sm text-gray-600">
                          {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} selected` : 'Select all'}
                        </span>
                      </div>
                      
                      {/* List Bulk Action Button - Move back to Packing */}
                      {selectedOrderIds.size > 0 && (
                        <div className="flex items-center space-x-2">
                          <BulkStageChangeButton
                            orders={trackingOrders}
                            currentStage="tracking"
                            targetStage="packing"
                            selectedOrderIds={selectedOrderIds}
                            onSuccess={handleBulkOperationSuccess}
                            variant="list"
                            direction="previous"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {trackingOrders.length} orders completed packing and waiting for tracking assignment
              </p>
            </CardHeader>
            <CardContent>
              <TrackingQueue 
                orders={trackingOrders} 
                selectedOrderIds={selectedOrderIds}
                onOrderSelect={handleOrderSelect}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
