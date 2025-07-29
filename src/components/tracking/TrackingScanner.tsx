
import React, { useState, useRef, useEffect } from 'react';
import { Scan, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface TrackingScannerProps {
  orders: any[];
  onOrderScanned?: (order: any) => void;
}

const TrackingScanner = ({ orders, onOrderScanned }: TrackingScannerProps) => {
  const [orderInput, setOrderInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [allowAutoFocus, setAllowAutoFocus] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial focus when component mounts
  useEffect(() => {
    if (inputRef.current && allowAutoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allowAutoFocus]);

  // Focus management - maintain focus unless user is interacting with other elements
  useEffect(() => {
    if (!allowAutoFocus) return;

    const handleFocusManagement = () => {
      const activeElement = document.activeElement;
      
      // Check if user is interacting with buttons, dialogs, or other interactive elements
      const isInteractingWithUI = activeElement?.tagName === 'BUTTON' || 
                                 activeElement?.getAttribute('role') === 'button' ||
                                 activeElement?.tagName === 'A' ||
                                 activeElement?.closest('[role="dialog"]') ||
                                 activeElement?.closest('[data-dialog-content]') ||
                                 activeElement?.closest('.manage-button') ||
                                 activeElement?.closest('[data-radix-collection-item]');

      // Don't interfere if user is actively using other UI elements
      if (isInteractingWithUI) {
        return;
      }

      // Only refocus to scanner input if no important UI interaction is happening
      if (inputRef.current && activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    const interval = setInterval(handleFocusManagement, 800);
    return () => clearInterval(interval);
  }, [allowAutoFocus]);

  // Handle button interactions - temporarily disable auto-focus when buttons are clicked
  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target?.closest('button') && !target?.closest('.scanner-input-container')) {
        setAllowAutoFocus(false);
        // Re-enable auto-focus after button interaction is complete
        setTimeout(() => setAllowAutoFocus(true), 1500);
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => document.removeEventListener('click', handleButtonClick);
  }, []);

  const findOrderByNumber = (orderNumber: string) => {
    return orders.find(order => 
      order.order_number?.toLowerCase() === orderNumber.toLowerCase()
    );
  };

  const handleOrderScan = async () => {
    if (!orderInput.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const order = findOrderByNumber(orderInput.trim());
      
      if (!order) {
        toast.error(`No order found with number: ${orderInput}`);
        setOrderInput('');
        setTimeout(() => {
          if (allowAutoFocus) {
            inputRef.current?.focus();
          }
        }, 100);
        return;
      }

      if (order.stage !== 'tracking') {
        toast.error(`Order ${order.order_number} is in ${order.stage} stage, not in tracking.`);
        setOrderInput('');
        setTimeout(() => {
          if (allowAutoFocus) {
            inputRef.current?.focus();
          }
        }, 100);
        return;
      }

      toast.success(`Order ${order.order_number} scanned successfully`);
      onOrderScanned?.(order);
      setOrderInput('');
      
      setTimeout(() => {
        if (allowAutoFocus) {
          inputRef.current?.focus();
        }
      }, 100);

    } catch (error) {
      console.error('Error processing order scan:', error);
      toast.error('Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-2">
          <Scan className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">Order Scanner</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="scanner-input-container">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                placeholder="Scan or enter Order ID"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setAllowAutoFocus(true)}
                disabled={isProcessing}
                className="flex-1"
                autoFocus
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleOrderScan}
                disabled={!orderInput.trim() || isProcessing}
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4" />
              <span>Scan order IDs to manage tracking information</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackingScanner;
