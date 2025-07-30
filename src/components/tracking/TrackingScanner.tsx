
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Scan, Truck, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

interface TrackingScannerProps {
  orders: any[];
  onOrderTracked: (orderId: string) => void;
  onOrderSelected?: (order: any | null) => void;
}

const TrackingScanner = ({ orders, onOrderTracked, onOrderSelected }: TrackingScannerProps) => {
  const [step, setStep] = useState<'order' | 'tracking'>('order');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [processedTrackingNumbers, setProcessedTrackingNumbers] = useState<Set<string>>(new Set());
  
  const orderInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { playErrorSound, playSuccessSound, playWarningSound, playCompleteSound } = useSoundNotifications();

  // Auto-focus management when auto-focus is enabled
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const focusActiveInput = () => {
      if (step === 'order' && orderInputRef.current) {
        orderInputRef.current.focus();
      } else if (step === 'tracking' && trackingInputRef.current) {
        trackingInputRef.current.focus();
      }
    };

    // Initial focus
    const timer = setTimeout(focusActiveInput, 100);

    // Periodic refocus if auto-focus is enabled
    const interval = setInterval(() => {
      if (autoFocusEnabled && document.activeElement !== orderInputRef.current && document.activeElement !== trackingInputRef.current) {
        focusActiveInput();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [step, autoFocusEnabled]);

  // Handle button clicks to disable auto-focus temporarily
  const handleButtonClick = useCallback(() => {
    setAutoFocusEnabled(false);
  }, []);

  // Re-enable auto-focus when user manually clicks on input
  const handleInputFocus = useCallback(() => {
    setAutoFocusEnabled(true);
  }, []);

  // Add click listener to all buttons to disable auto-focus
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target?.closest('button') && !target?.closest('.scanner-input')) {
        handleButtonClick();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [handleButtonClick]);

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
        playErrorSound();
        toast({
          title: "Order Not Found",
          description: `No order found with number: ${orderIdInput}`,
          variant: "destructive"
        });
        return;
      }

      if (order.stage !== 'tracking') {
        playErrorSound();
        toast({
          title: "Order Not Ready",
          description: `Order ${order.order_number} is in ${order.stage} stage, not ready for tracking.`,
          variant: "destructive"
        });
        return;
      }

      if (order.tracking_number) {
        playWarningSound();
        toast({
          title: "Order Already Tracked",
          description: `Order ${order.order_number} already has tracking number: ${order.tracking_number}`,
          variant: "default"
        });
        return;
      }

      playSuccessSound();
      setSelectedOrder(order);
      setStep('tracking');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} ready for tracking number input.`,
      });

    } catch (error) {
      console.error('Error processing order scan:', error);
      playErrorSound();
      toast({
        title: "Scan Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrackingNumberScan = async () => {
    if (!trackingInput.trim() || !selectedOrder) return;
    
    const trackingNumber = trackingInput.trim();
    
    // Check if this tracking number was already processed for this order
    const orderTrackingKey = `${selectedOrder.id}-${trackingNumber}`;
    if (processedTrackingNumbers.has(orderTrackingKey)) {
      playWarningSound();
      toast({
        title: "Already Processed",
        description: `Tracking number ${trackingNumber} already processed for this order.`,
        variant: "default"
      });
      setTrackingInput('');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await supabaseOrderService.updateOrderTracking(selectedOrder.id, trackingNumber);
      
      // Mark this tracking number as processed for this order
      setProcessedTrackingNumbers(prev => new Set(prev).add(orderTrackingKey));
      
      playCompleteSound();
      toast({
        title: "Tracking Added! 🎉",
        description: `Order ${selectedOrder.order_number} updated with tracking: ${trackingNumber}`,
      });

      onOrderTracked(selectedOrder.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      resetScanner();

    } catch (error) {
      console.error('Error updating tracking:', error);
      playErrorSound();
      toast({
        title: "Update Error",
        description: "Failed to update tracking number. Please try again.",
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
    setAutoFocusEnabled(true);
  };

  const handleOrderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  const handleTrackingKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTrackingNumberScan();
    }
  };

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
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Tracking Number Scanner */}
      {step === 'tracking' && selectedOrder && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Tracking Number Scanner</h3>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Order: <span className="font-medium">{selectedOrder.order_number}</span>
                </p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Customer: {selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}
              </p>
            </div>
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
              onClick={handleTrackingNumberScan}
              disabled={!trackingInput.trim() || isProcessing}
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingScanner;
