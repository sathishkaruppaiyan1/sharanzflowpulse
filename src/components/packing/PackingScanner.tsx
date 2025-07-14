
import React, { useState, useRef, useCallback } from 'react';
import { Scan, Package, CheckCircle, X, Camera, Keyboard, Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabaseOrderService } from '@/services/supabaseOrderService';
import { useQueryClient } from '@tanstack/react-query';

interface PackingScannerProps {
  orders: any[];
  onItemPacked: (orderId: string, itemId: string) => void;
  onOrderSelected?: (order: any | null) => void;
}

const PackingScanner = ({ orders, onItemPacked, onOrderSelected }: PackingScannerProps) => {
  const [step, setStep] = useState<'order' | 'sku'>('order');
  const [orderIdInput, setOrderIdInput] = useState('');
  const [skuInput, setSkuInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedItem, setMatchedItem] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const orderInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const findOrderByNumber = useCallback((orderNumber: string) => {
    return orders.find(order => 
      order.order_number?.toLowerCase() === orderNumber.toLowerCase()
    );
  }, [orders]);

  const findItemBySKU = useCallback((sku: string, order: any) => {
    if (!order.order_items) return null;
    
    return order.order_items.find((item: any) => {
      return item.sku && item.sku.toLowerCase() === sku.toLowerCase();
    });
  }, []);

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

      if (order.stage !== 'packing') {
        toast({
          title: "Order Not Ready",
          description: `Order ${order.order_number} is in ${order.stage} stage, not ready for packing.`,
          variant: "destructive"
        });
        return;
      }

      // Check if all items are already packed
      const unpackedItems = order.order_items?.filter((item: any) => !item.packed) || [];
      if (unpackedItems.length === 0) {
        toast({
          title: "Order Complete",
          description: `All items in order ${order.order_number} are already packed.`,
          variant: "default"
        });
        return;
      }

      setSelectedOrder(order);
      setStep('sku');
      
      toast({
        title: "Order Selected",
        description: `Order ${order.order_number} locked. Now scan SKUs for this order.`,
      });

      // Focus on SKU input after a short delay
      setTimeout(() => {
        skuInputRef.current?.focus();
      }, 100);

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

  const handleSKUScan = async () => {
    if (!skuInput.trim() || !selectedOrder) return;
    
    setIsProcessing(true);
    
    try {
      const item = findItemBySKU(skuInput.trim(), selectedOrder);
      
      if (!item) {
        toast({
          title: "SKU Not Found",
          description: `No item found with SKU: ${skuInput} in order ${selectedOrder.order_number}`,
          variant: "destructive"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      if (item.packed) {
        toast({
          title: "Already Packed",
          description: `${item.title} is already marked as packed.`,
          variant: "default"
        });
        setSkuInput('');
        skuInputRef.current?.focus();
        return;
      }

      setMatchedItem(item);
      setShowConfirmDialog(true);

    } catch (error) {
      console.error('Error processing SKU scan:', error);
      toast({
        title: "Scan Error",
        description: "Failed to process SKU. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPacked = async () => {
    if (!selectedOrder || !matchedItem) return;

    try {
      await supabaseOrderService.updateOrderItemPacked(matchedItem.id, true);
      
      onItemPacked(selectedOrder.id, matchedItem.id);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast({
        title: "Item Packed",
        description: `${matchedItem.title} marked as packed successfully!`,
      });
      
      setShowConfirmDialog(false);
      setMatchedItem(null);
      setSkuInput('');

      // Check if all items in the order are now packed
      const updatedOrder = findOrderByNumber(selectedOrder.order_number);
      if (updatedOrder) {
        const unpackedItems = updatedOrder.order_items?.filter((item: any) => !item.packed && item.id !== matchedItem.id) || [];
        
        if (unpackedItems.length === 0) {
          toast({
            title: "Order Complete!",
            description: `All items in order ${selectedOrder.order_number} are now packed. Order will move to tracking.`,
          });
          // Reset to start
          resetScanner();
        } else {
          // Continue scanning for this order
          setTimeout(() => {
            skuInputRef.current?.focus();
          }, 100);
        }
      }

    } catch (error) {
      console.error('Error marking item as packed:', error);
      toast({
        title: "Error",
        description: "Failed to mark item as packed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetScanner = () => {
    setStep('order');
    setOrderIdInput('');
    setSkuInput('');
    setSelectedOrder(null);
    setMatchedItem(null);
    setShowConfirmDialog(false);
    
    setTimeout(() => {
      orderInputRef.current?.focus();
    }, 100);
  };

  const handleOrderKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderScan();
    }
  };

  const handleSKUKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSKUScan();
    }
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
            disabled={isProcessing || step === 'sku'}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleOrderScan}
            disabled={!orderIdInput.trim() || isProcessing || step === 'sku'}
          >
            <Scan className="h-4 w-4" />
          </Button>
        </div>
        {step === 'sku' && (
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

      {/* SKU Scanner - only show if order is selected */}
      {step === 'sku' && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Product SKU Scanner</h3>
          <div className="flex space-x-2">
            <Input
              ref={skuInputRef}
              placeholder="Scan or enter product SKU"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyPress={handleSKUKeyPress}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleSKUScan}
              disabled={!skuInput.trim() || isProcessing}
            >
              <Scan className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Confirm Item Packing</span>
            </DialogTitle>
          </DialogHeader>
          
          {matchedItem && selectedOrder && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-2">Item Found:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Product:</strong> {matchedItem.title}</p>
                  <p><strong>SKU:</strong> {matchedItem.sku || 'N/A'}</p>
                  <p><strong>Quantity:</strong> {matchedItem.quantity}</p>
                  <p><strong>Order:</strong> {selectedOrder.order_number}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleMarkAsPacked}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Packed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSkuInput('');
                    setTimeout(() => skuInputRef.current?.focus(), 100);
                  }}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackingScanner;
