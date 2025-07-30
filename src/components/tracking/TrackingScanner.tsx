
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Scan, Package, CheckCircle, X, Camera, Keyboard, Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

interface TrackingScannerProps {
  orders: any[];
  onOrderUpdated: (orderId: string) => void;
  onOrderSelected?: (order: any | null) => void;
}

const TrackingScanner = ({ orders, onOrderUpdated, onOrderSelected }: TrackingScannerProps) => {
  const [step, setStep] = useState<'order' | 'tracking'>('order');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedTrackingNumbers, setProcessedTrackingNumbers] = useState<Set<string>>(new Set());
  const [manualFocusMode, setManualFocusMode] = useState(false);
  
  const orderInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Auto-focus management - only when not in manual mode
  useEffect(() => {
    if (manualFocusMode) return;

    const focusTimer = setTimeout(() => {
      if (step === 'order' && orderInputRef.current) {
        orderInputRef.current.focus();
      } else if (step === 'tracking' && trackingInputRef.current) {
        trackingInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [step, manualFocusMode]);

  // Handle clicks on other UI elements - switch to manual focus mode
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Check if click is on buttons, but not on scanner inputs
      if (target?.closest('button') && !target?.closest('.scanner-input')) {
        setManualFocusMode(true);
        // Reset to auto mode after 3 seconds
        setTimeout(() => setManualFocusMode(false), 3000);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const findOrderByNumber = useCallback((orderNumber: string) => {
    return orders.find(order => 
      order.order_number?.toLowerCase() === orderNumber.toLowerCase()
    );
  }, [orders]);

  const handleOrderScan = async () => {
    if (!orderIdInput.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const order = findOrderByNumber(orderIdInput.trim());
      
      if (!order) {
        toast({
          title: "Order Not Found",
          description: `No order found with number: ${orderIdInput}`,
          variant: "destructive"
        });
        return;
      }

      if (order.stage !== 'tracking') {
        toast({
          title: "Order Not Ready",
          description: `Order ${order.order_number} is in ${order.stage} stage, not ready for tracking.`,
          variant: "destructive"
        });
        return;
      }

      if (order.tracking_number) {
        toast({
          title: "Already Has Tracking",
          description: `Order ${order.order_number} already has tracking number: ${order.tracking_number}`,
          variant: "default"
        });
        return;
      }

      setSelectedOrder(order);
      setProcessedTrackingNumbers(new Set()); // Reset processed tracking numbers for new order
      setStep('tracking');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} locked. Enter tracking number.`,
      });

      // Focus on tracking input after a short delay (only if not in manual mode)
      if (!manualFocusMode) {
        setTimeout(() => {
          trackingInputRef.current?.focus();
        }, 100);
      }

    } catch (error) {
      console.error('Error processing order scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrackingScan = async () => {
    if (!trackingInput.trim() || !selectedOrder) return;
    
    const trackingNumber = trackingInput.trim();
    
    // Check if this tracking number was already processed
    if (processedTrackingNumbers.has(trackingNumber)) {
      toast({
        title: "Already Processed",
        description: `Tracking number ${trackingNumber} was already processed for this order.`,
        variant: "default"
      });
      setTrackingInput('');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update the order with tracking number and move to delivery stage
      await supabaseOrderService.updateOrderTracking(selectedOrder.id, trackingNumber);
      
      // Add to processed set to prevent re-processing
      setProcessedTrackingNumbers(prev => new Set(prev).add(trackingNumber));
      
      onOrderUpdated(selectedOrder.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage', 'tracking'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'stage', 'delivery'] });

      toast({
        title: "Tracking Added! 🎉",
        description: `Order ${selectedOrder.order_number} updated with tracking ${trackingNumber} and moved to delivery stage.`,
      });

      resetScanner();

    } catch (error) {
      console.error('Error processing tracking scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to update tracking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setStep('order');
    setOrderIdInput('');
    setTrackingInput('');
    setSelectedOrder(null);
    setProcessedTrackingNumbers(new Set());
    setManualFocusMode(false);
    
    // Focus on order input (only if not in manual mode)
    if (!manualFocusMode) {
      setTimeout(() => {
        orderInputRef.current?.focus();
      }, 100);
    }
  };

  const handleOrderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  const handleTrackingKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTrackingScan();
    }
  };

  const handleInputFocus = () => {
    setManualFocusMode(false); // Reset to auto mode when user manually focuses
  };

  // Notify parent about selected order
  React.useEffect(() => {
    onOrderSelected?.(selectedOrder);
  }, [selectedOrder, onOrderSelected]);

  return (
    <div className="space-y-6">
      {/* Order ID Scanner */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Order ID Scanner</h3>
        <div className="flex space-x-2">
          <Input
            ref={orderInputRef}
            placeholder="Scan or enter Order ID"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            onKeyPress={handleOrderKeyPress}
            onFocus={handleInputFocus}
            disabled={isProcessing || step === 'tracking'}
            className="flex-1 scanner-input"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleOrderScan}
            disabled={!orderIdInput.trim() || isProcessing || step === 'tracking'}
            className="scanner-input"
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>
        {step === 'tracking' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetScanner}
              className="text-xs scanner-input"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Tracking Number Scanner - only show if order is selected */}
      {step === 'tracking' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Tracking Number Scanner</h3>
            <p className="text-sm text-gray-600">
              Order: {selectedOrder?.order_number} - Enter tracking number once
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Input
              ref={trackingInputRef}
              placeholder="Scan or enter tracking number"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyPress={handleTrackingKeyPress}
              onFocus={handleInputFocus}
              disabled={isProcessing}
              className="flex-1 scanner-input"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleTrackingScan}
              disabled={!trackingInput.trim() || isProcessing}
              className="scanner-input"
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>

          {/* Show processed tracking numbers */}
          {processedTrackingNumbers.size > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Processed Tracking Numbers:</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(processedTrackingNumbers).map((trackingNum) => (
                  <Badge key={trackingNum} variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    {trackingNum} ✓
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Order Details */}
          {selectedOrder && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Order Details:</h4>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Order:</span> {selectedOrder.order_number}
                  </div>
                  <div>
                    <span className="font-medium">Customer:</span> {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                  </div>
                  <div>
                    <span className="font-medium">Items:</span> {selectedOrder.order_items?.length || 0}
                  </div>
                  <div>
                    <span className="font-medium">Stage:</span> 
                    <Badge variant="outline" className="ml-1">
                      {selectedOrder.stage}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackingScanner;
