
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Scan, Package, Truck, CheckCircle, Search, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types/database';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import TrackingQueue from '@/components/tracking/TrackingQueue';
import TrackingStats from '@/components/tracking/TrackingStats';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const Tracking = () => {
  const [trackingInput, setTrackingInput] = useState('');
  const [courierInput, setCourierInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  
  const trackingInputRef = useRef<HTMLInputElement>(null);
  const courierInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { playErrorSound, playSuccessSound, playWarningSound } = useSoundNotifications();

  // Fetch tracking stage orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', 'stage', 'tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          order_items (
            id,
            title,
            sku,
            quantity,
            packed
          )
        `)
        .eq('stage', 'tracking')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracking orders:', error);
        throw error;
      }

      return data as Order[];
    },
  });

  // Initial focus management
  useEffect(() => {
    if (autoFocusEnabled && trackingInputRef.current) {
      const timer = setTimeout(() => {
        trackingInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocusEnabled]);

  // Focus management - only when auto focus is enabled
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const handleFocusManagement = () => {
      const activeElement = document.activeElement;
      const isClickableElement = activeElement?.tagName === 'BUTTON' || 
                                activeElement?.getAttribute('role') === 'button' ||
                                activeElement?.tagName === 'A' ||
                                activeElement?.closest('[role="dialog"]') ||
                                activeElement?.closest('[data-dialog-content]');

      // Don't steal focus from clickable elements or dialog content
      if (isClickableElement) {
        setAutoFocusEnabled(false);
        return;
      }

      // Only refocus to tracking input if focus is lost and no important UI is active
      if (trackingInputRef.current && activeElement !== trackingInputRef.current && !showTrackingForm) {
        trackingInputRef.current.focus();
      }
    };

    const interval = setInterval(handleFocusManagement, 500);
    return () => clearInterval(interval);
  }, [autoFocusEnabled, showTrackingForm]);

  // Handle clicks to deactivate auto focus
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target?.closest('button') && !target?.closest('.tracking-scanner')) {
        setAutoFocusEnabled(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber, courierName }: { orderId: string; trackingNumber: string; courierName: string }) => {
      console.log('Updating tracking for order:', orderId, 'with tracking:', trackingNumber, 'courier:', courierName);
      
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          tracking_number: trackingNumber,
          courier_name: courierName,
          stage: 'shipped'
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating tracking:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('Tracking updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage', 'tracking'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage', 'shipped'] });
      
      toast.success(`Order ${data.order_number} moved to shipped stage`);
      
      // Reset form
      setTrackingInput('');
      setCourierInput('');
      setCurrentOrder(null);
      setShowTrackingForm(false);
      setAutoFocusEnabled(true);
      
      // Focus back to tracking input
      setTimeout(() => {
        trackingInputRef.current?.focus();
      }, 100);
    },
    onError: (error) => {
      console.error('Error updating tracking:', error);
      playErrorSound();
      toast.error('Failed to update tracking information');
    }
  });

  const handleTrackingSubmit = async () => {
    if (!trackingInput.trim()) {
      playWarningSound();
      toast.warning('Please enter a tracking number');
      return;
    }

    setIsProcessing(true);

    try {
      // Check if input looks like an order number (not a tracking number)
      const foundOrder = orders.find(order => 
        order.order_number?.toLowerCase() === trackingInput.toLowerCase()
      );

      if (foundOrder) {
        playErrorSound();
        toast.error('❌ Please scan tracking number, not order ID!');
        setTrackingInput('');
        if (autoFocusEnabled) {
          trackingInputRef.current?.focus();
        }
        return;
      }

      // Check if tracking number already exists
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('*')
        .eq('tracking_number', trackingInput.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingOrder) {
        playWarningSound();
        toast.warning(`Tracking number ${trackingInput} already exists for order ${existingOrder.order_number}`);
        setTrackingInput('');
        if (autoFocusEnabled) {
          trackingInputRef.current?.focus();
        }
        return;
      }

      // If we have orders in tracking stage, show selection
      if (orders.length > 0) {
        setShowTrackingForm(true);
        setAutoFocusEnabled(false);
        playSuccessSound();
        toast.success('Select order to assign tracking number');
      } else {
        playWarningSound();
        toast.warning('No orders available in tracking stage');
        setTrackingInput('');
        if (autoFocusEnabled) {
          trackingInputRef.current?.focus();
        }
      }
    } catch (error) {
      console.error('Error processing tracking:', error);
      playErrorSound();
      toast.error('Failed to process tracking number');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrderSelection = (order: Order) => {
    setCurrentOrder(order);
    setTimeout(() => {
      courierInputRef.current?.focus();
    }, 100);
  };

  const handleFinalSubmit = () => {
    if (!currentOrder || !trackingInput.trim() || !courierInput.trim()) {
      playWarningSound();
      toast.warning('Please fill in all required fields');
      return;
    }

    updateTrackingMutation.mutate({
      orderId: currentOrder.id,
      trackingNumber: trackingInput.trim(),
      courierName: courierInput.trim()
    });
  };

  const handleInputFocus = () => {
    setAutoFocusEnabled(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTrackingSubmit();
    }
  };

  const resetForm = () => {
    setTrackingInput('');
    setCourierInput('');
    setCurrentOrder(null);
    setShowTrackingForm(false);
    setAutoFocusEnabled(true);
    setTimeout(() => {
      trackingInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tracking Management</h1>
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">
            {orders.length} orders ready for tracking
          </span>
        </div>
      </div>

      <TrackingStats orders={orders} />

      {/* Tracking Number Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scan className="h-5 w-5" />
            <span>Tracking Number Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                ref={trackingInputRef}
                placeholder="Scan or enter tracking number"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                disabled={isProcessing}
                className="flex-1 tracking-scanner"
              />
              <Button 
                onClick={handleTrackingSubmit}
                disabled={!trackingInput.trim() || isProcessing}
                className="tracking-scanner"
              >
                <Search className="h-4 w-4 mr-2" />
                Process
              </Button>
            </div>
            
            {showTrackingForm && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Assign Tracking: {trackingInput}</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetForm}
                    className="tracking-scanner"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Courier Name</label>
                    <Input
                      ref={courierInputRef}
                      placeholder="Enter courier name (e.g., BlueDart, DTDC)"
                      value={courierInput}
                      onChange={(e) => setCourierInput(e.target.value)}
                      onFocus={handleInputFocus}
                      className="tracking-scanner"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Order</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            currentOrder?.id === order.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleOrderSelection(order)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-gray-600">
                                {order.customer?.first_name} {order.customer?.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.order_items?.reduce((sum, item) => sum + item.quantity, 0)} items
                              </p>
                            </div>
                            <Badge variant="outline">
                              {order.stage}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleFinalSubmit}
                    disabled={!currentOrder || !trackingInput.trim() || !courierInput.trim() || updateTrackingMutation.isPending}
                    className="w-full tracking-scanner"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Assign Tracking & Move to Shipped
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TrackingQueue orders={orders} />
    </div>
  );
};

export default Tracking;
